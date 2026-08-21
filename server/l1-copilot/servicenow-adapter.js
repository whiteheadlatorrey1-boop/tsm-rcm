// ServiceNow Table API adapter for L1 Ticket Copilot.
//
// Implements the adapter interface documented in
// html/l1-copilot/l1-copilot-backend-spec.md §3 — real HTTP calls against a
// customer's own ServiceNow instance, no hardcoded per-client logic. Every
// customer supplies their own instance URL + credentials via env vars (or a
// config object passed in for multi-tenant use); field mapping for
// non-standard CMDB fields is also config, not code.
//
// This module has NO dependency on express/server.js — it can be required
// and unit-tested standalone (see tests/unit/l1-copilot/servicenow-adapter.test.js).

'use strict';

/**
 * @typedef {Object} ServiceNowConfig
 * @property {string} instanceUrl   e.g. "https://acme.service-now.com"
 * @property {string} [username]    basic-auth username (used if oauthToken absent)
 * @property {string} [password]    basic-auth password
 * @property {string} [oauthToken]  bearer token, preferred over basic auth if present
 * @property {Object} [fieldMap]    optional per-customer field-name overrides, see DEFAULT_FIELD_MAP
 */

const DEFAULT_FIELD_MAP = {
  // sys_id/table field name -> the name l1-copilot's own contract uses.
  asset: {
    tag: 'asset_tag',
    manufacturer: 'manufacturer.name',
    model: 'model_id.display_name',
    warranty: 'warranty_expiration',
    owner: 'assigned_to.name',
    department: 'department.name',
    purchaseDate: 'purchase_date',
    status: 'install_status'
  },
  incident: {
    number: 'number',
    priority: 'priority',
    requester: 'caller_id.name',
    description: 'short_description',
    assignmentGroup: 'assignment_group.name',
    state: 'state',
    asset: 'cmdb_ci.asset_tag'
  }
};

class ServiceNowNotConfiguredError extends Error {
  constructor() {
    super('ServiceNow is not configured for this environment (missing SERVICENOW_INSTANCE_URL / credentials).');
    this.name = 'ServiceNowNotConfiguredError';
    this.code = 'SERVICENOW_NOT_CONFIGURED';
  }
}

/** Reads config from env vars unless an explicit config object is passed (multi-tenant callers pass their own). */
function loadConfigFromEnv() {
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL || '';
  if (!instanceUrl) return null;
  return {
    instanceUrl: instanceUrl.replace(/\/+$/, ''),
    username: process.env.SERVICENOW_USERNAME || '',
    password: process.env.SERVICENOW_PASSWORD || '',
    oauthToken: process.env.SERVICENOW_OAUTH_TOKEN || '',
    fieldMap: DEFAULT_FIELD_MAP
  };
}

function isConfigured(config) {
  const cfg = config || loadConfigFromEnv();
  if (!cfg || !cfg.instanceUrl) return false;
  return !!(cfg.oauthToken || (cfg.username && cfg.password));
}

function authHeader(cfg) {
  if (cfg.oauthToken) return { Authorization: `Bearer ${cfg.oauthToken}` };
  const basic = Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
  return { Authorization: `Basic ${basic}` };
}

/** Reads a possibly-dotted display path (e.g. "manufacturer.name") off a ServiceNow record. */
function readField(record, dottedPath) {
  if (!record || !dottedPath) return null;
  // ServiceNow reference fields come back as { value, display_value } when
  // sysparm_display_value=all is used; dotted paths in our field map are for
  // our own readability and map to the flattened top-level key ServiceNow
  // actually returns for dot-walked fields in a Table API query
  // (e.g. cmdb_ci.asset_tag becomes a literal dotted key in some configs, but
  // by default ServiceNow flattens reference display values onto the base
  // field). We handle both shapes defensively.
  const base = dottedPath.split('.')[0];
  const val = record[dottedPath] !== undefined ? record[dottedPath] : record[base];
  if (val === undefined || val === null) return null;
  if (typeof val === 'object') return val.display_value !== undefined ? val.display_value : (val.value ?? null);
  return val;
}

async function snRequest(cfg, method, path, { query, body } = {}) {
  if (!isConfigured(cfg)) throw new ServiceNowNotConfiguredError();
  const url = new URL(cfg.instanceUrl + path);
  url.searchParams.set('sysparm_display_value', 'all');
  if (query) Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeader(cfg)
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch (e) { throw new Error(`ServiceNow returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`); }

  if (!res.ok) {
    const msg = (json && json.error && (json.error.message || json.error.detail)) || `ServiceNow HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

/**
 * getAsset(assetTag, config?) -> normalized asset record or null if not found
 * Queries cmdb_ci_hardware by asset_tag, per the backend spec's documented mapping.
 */
async function getAsset(assetTag, config) {
  const cfg = config || loadConfigFromEnv();
  const fm = (cfg && cfg.fieldMap && cfg.fieldMap.asset) || DEFAULT_FIELD_MAP.asset;
  const data = await snRequest(cfg, 'GET', '/api/now/table/cmdb_ci_hardware', {
    query: { sysparm_query: `asset_tag=${assetTag}`, sysparm_limit: '1' }
  });
  const record = data.result && data.result[0];
  if (!record) return null;
  return {
    assetTag: readField(record, fm.tag) || assetTag,
    manufacturer: readField(record, fm.manufacturer),
    model: readField(record, fm.model),
    warrantyStatus: readField(record, fm.warranty),
    owner: readField(record, fm.owner),
    department: readField(record, fm.department),
    purchaseDate: readField(record, fm.purchaseDate),
    status: readField(record, fm.status),
    raw: record
  };
}

/**
 * getTicket(incidentNumberOrSysId, config?) -> normalized incident record or null
 */
async function getTicket(incidentId, config) {
  const cfg = config || loadConfigFromEnv();
  const fm = (cfg && cfg.fieldMap && cfg.fieldMap.incident) || DEFAULT_FIELD_MAP.incident;
  const looksLikeSysId = /^[0-9a-f]{32}$/i.test(incidentId);
  const data = await snRequest(cfg, 'GET', '/api/now/table/incident', {
    query: looksLikeSysId
      ? { sysparm_query: `sys_id=${incidentId}`, sysparm_limit: '1' }
      : { sysparm_query: `number=${incidentId}`, sysparm_limit: '1' }
  });
  const record = data.result && data.result[0];
  if (!record) return null;
  return {
    number: readField(record, fm.number),
    priority: readField(record, fm.priority),
    requester: readField(record, fm.requester),
    description: readField(record, fm.description),
    assignmentGroup: readField(record, fm.assignmentGroup),
    state: readField(record, fm.state),
    asset: readField(record, fm.asset),
    sysId: record.sys_id && (record.sys_id.value || record.sys_id),
    raw: record
  };
}

/**
 * searchAssetsByUser(userIdOrName, config?) -> array of asset tags assigned to that user
 */
async function searchAssetsByUser(userIdentifier, config) {
  const cfg = config || loadConfigFromEnv();
  const fm = (cfg && cfg.fieldMap && cfg.fieldMap.asset) || DEFAULT_FIELD_MAP.asset;
  const data = await snRequest(cfg, 'GET', '/api/now/table/cmdb_ci_hardware', {
    query: { sysparm_query: `assigned_to.nameLIKE${userIdentifier}^ORassigned_to.user_nameLIKE${userIdentifier}`, sysparm_limit: '25' }
  });
  return (data.result || []).map(r => readField(r, fm.tag)).filter(Boolean);
}

/**
 * writeWorkNote(incidentId, note, config?) -> { success }
 * PATCHes the incident's work_notes field (ServiceNow appends journal-field
 * updates rather than overwriting — this is a real append, not a replace).
 */
async function writeWorkNote(incidentId, note, config) {
  const cfg = config || loadConfigFromEnv();
  const ticket = await getTicket(incidentId, cfg);
  if (!ticket) throw new Error(`No incident found for "${incidentId}" — cannot write work note.`);
  await snRequest(cfg, 'PATCH', `/api/now/table/incident/${ticket.sysId}`, {
    body: { work_notes: note }
  });
  return { success: true };
}

/**
 * updateTicketStatus(incidentId, state, config?) -> { success }
 * `state` should be the ServiceNow incident state label or numeric code the
 * customer's instance uses (e.g. "Resolved"/6, "In Progress"/2) — this is
 * intentionally left as passthrough since state values are customer-configurable.
 */
async function updateTicketStatus(incidentId, state, config) {
  const cfg = config || loadConfigFromEnv();
  const ticket = await getTicket(incidentId, cfg);
  if (!ticket) throw new Error(`No incident found for "${incidentId}" — cannot update status.`);
  await snRequest(cfg, 'PATCH', `/api/now/table/incident/${ticket.sysId}`, {
    body: { state }
  });
  return { success: true };
}

module.exports = {
  DEFAULT_FIELD_MAP,
  ServiceNowNotConfiguredError,
  loadConfigFromEnv,
  isConfigured,
  getAsset,
  getTicket,
  searchAssetsByUser,
  writeWorkNote,
  updateTicketStatus,
  // exported for tests only
  _internal: { readField, snRequest, authHeader }
};
