// Microsoft Graph adapter for L1 Copilot (Intune managed devices).
//
// Real HTTP calls against Microsoft Graph — no hardcoded per-client logic.
// Auth is OAuth2 client-credentials flow against Azure AD (Entra ID); every
// customer supplies their own tenant + app registration via env vars (or a
// config object for multi-tenant use).
//
// PREREQUISITE (blocking, not code): this adapter is inert until an Azure
// AD admin has:
//   1. Registered an app in the Entra admin center
//   2. Granted admin consent for the DeviceManagementManagedDevices.Read.All
//      application permission (delegated permissions don't work for a
//      client-credentials/service flow)
//   3. Generated a client secret (or cert) for the app
// See html/l1-copilot/l1-copilot-backend-spec.md for the full contract.
//
// SCOPE NOTE: this first pass covers device compliance/status lookup only.
// BitLocker recovery-key retrieval (Graph's informationProtection/bitlocker
// endpoints) needs the separate, more sensitive BitLockerKey.Read.All
// permission — Microsoft flags that scope for extra tenant-admin scrutiny
// on purpose. Deliberately not wired up here; add it as an explicit,
// separately-consented follow-up once a tenant admin decides to grant it,
// not bundled into the same app registration by default.
//
// This module has NO dependency on express/server.js — it can be required
// and unit-tested standalone (see tests/unit/l1-copilot/graph-intune-adapter.test.js).

'use strict';

class GraphNotConfiguredError extends Error {
  constructor() {
    super('Microsoft Graph is not configured for this environment (missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET).');
    this.name = 'GraphNotConfiguredError';
    this.code = 'GRAPH_NOT_CONFIGURED';
  }
}

/** Reads config from env vars unless an explicit config object is passed (multi-tenant callers pass their own). */
function loadConfigFromEnv() {
  const tenantId = process.env.AZURE_TENANT_ID || '';
  const clientId = process.env.AZURE_CLIENT_ID || '';
  const clientSecret = process.env.AZURE_CLIENT_SECRET || '';
  if (!tenantId || !clientId || !clientSecret) return null;
  return {
    tenantId,
    clientId,
    clientSecret,
    // Overridable for tests; production callers never set these.
    tokenUrl: process.env.AZURE_TOKEN_URL || `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    graphBaseUrl: process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com/v1.0'
  };
}

function isConfigured(config) {
  const cfg = config || loadConfigFromEnv();
  return !!(cfg && cfg.tenantId && cfg.clientId && cfg.clientSecret);
}

// In-memory token cache, keyed by tenantId+clientId — avoids a token round
// trip on every request. Cleared implicitly on process restart, which is
// fine since tokens are short-lived anyway.
const tokenCache = new Map();

async function getAccessToken(cfg) {
  const cacheKey = `${cfg.tenantId}:${cfg.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30000) return cached.token;

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch (e) { throw new Error(`Azure AD token endpoint returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok) {
    const msg = (json && (json.error_description || json.error)) || `Azure AD token request failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  const token = json.access_token;
  const expiresAt = Date.now() + (Number(json.expires_in || 3600) * 1000);
  tokenCache.set(cacheKey, { token, expiresAt });
  return token;
}

async function graphRequest(cfg, method, path, { query } = {}) {
  if (!isConfigured(cfg)) throw new GraphNotConfiguredError();
  const token = await getAccessToken(cfg);
  const url = new URL(cfg.graphBaseUrl + path);
  if (query) Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });

  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch (e) { throw new Error(`Graph returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok) {
    const msg = (json && json.error && json.error.message) || `Graph HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

function normalizeDevice(record) {
  if (!record) return null;
  return {
    deviceId: record.id,
    deviceName: record.deviceName,
    userPrincipalName: record.userPrincipalName || null,
    complianceState: record.complianceState || null,
    managementState: record.managementState || null,
    operatingSystem: record.operatingSystem || null,
    osVersion: record.osVersion || null,
    isEncrypted: record.isEncrypted != null ? record.isEncrypted : null,
    lastSyncDateTime: record.lastSyncDateTime || null,
    manufacturer: record.manufacturer || null,
    model: record.model || null,
    autopilotEnrolled: record.autopilotEnrolled != null ? record.autopilotEnrolled : null,
    raw: record
  };
}

/**
 * getDevice(deviceIdOrName, config?) -> normalized managed-device record or null if not found
 * If given something that looks like a Graph object ID (GUID), queries directly by ID.
 * Otherwise treats it as a deviceName and filters for a match.
 */
async function getDevice(identifier, config) {
  const cfg = config || loadConfigFromEnv();
  const looksLikeGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  if (looksLikeGuid) {
    try {
      const record = await graphRequest(cfg, 'GET', `/deviceManagement/managedDevices/${identifier}`);
      return normalizeDevice(record);
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  const data = await graphRequest(cfg, 'GET', '/deviceManagement/managedDevices', {
    query: { '$filter': `deviceName eq '${identifier.replace(/'/g, "''")}'` }
  });
  const record = (data.value || [])[0];
  return record ? normalizeDevice(record) : null;
}

module.exports = {
  GraphNotConfiguredError,
  loadConfigFromEnv,
  isConfigured,
  getDevice,
  // exported for tests only
  _internal: { getAccessToken, graphRequest, normalizeDevice, tokenCache }
};
