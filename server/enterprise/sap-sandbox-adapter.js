'use strict';

/**
 * SAP Business Accelerator Hub -- sandbox adapter (read-only).
 *
 * Talks to the public SAP sandbox gateway at sandbox.api.sap.com, which
 * serves canned/mocked sample OData responses (no real tenant data, no
 * real S/4HANA system) authenticated with a single `APIKey` header -- not
 * OAuth, not Basic auth. Two services wired here, both GET-only:
 *   - API_BUSINESS_PARTNER (A_BusinessPartner)
 *   - API_SALES_ORDER_SRV (A_SalesOrder)
 *
 * No write function exists in this module at all -- not gated, not a
 * stub, simply never implemented, since the only approved use here is
 * read-only sandbox acceptance. If a real SAP integration is ever wanted
 * beyond the sandbox, that's a deliberate, separate decision.
 *
 * SAP_INTEGRATION_ENABLED is the same on/off switch convention used by
 * server/l1-copilot/servicenow-adapter.js's SERVICENOW_INTEGRATION_ENABLED:
 * a SAP_SANDBOX_API_KEY can exist in the environment without the
 * integration actually being live. Until the flag is "true", this module
 * is fully inert.
 */

const SANDBOX_BASE_URL = 'https://sandbox.api.sap.com';
const BUSINESS_PARTNER_PATH = '/s4hanacloud/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner';
const SALES_ORDER_PATH = '/s4hanacloud/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder';

class SapNotConfiguredError extends Error {
  constructor() {
    super('SAP sandbox integration is not configured for this environment (missing SAP_INTEGRATION_ENABLED or SAP_SANDBOX_API_KEY).');
    this.name = 'SapNotConfiguredError';
    this.code = 'SAP_NOT_CONFIGURED';
  }
}

/**
 * Reads config from env vars unless an explicit config object is passed.
 * Same two-gate pattern as servicenow-adapter.js's loadConfigFromEnv: the
 * key can be present without the integration being live.
 */
function loadConfigFromEnv() {
  if (process.env.SAP_INTEGRATION_ENABLED !== 'true') return null;
  const apiKey = process.env.SAP_SANDBOX_API_KEY || '';
  if (!apiKey) return null;
  return { apiKey, baseUrl: SANDBOX_BASE_URL };
}

function isConfigured(config) {
  const cfg = config || loadConfigFromEnv();
  return !!(cfg && cfg.apiKey);
}

async function sapRequest(cfg, path, { top } = {}) {
  if (!isConfigured(cfg)) throw new SapNotConfiguredError();
  const url = new URL(cfg.baseUrl + path);
  url.searchParams.set('$format', 'json');
  if (top !== undefined && top !== null) url.searchParams.set('$top', String(top));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      APIKey: cfg.apiKey,
    },
  });

  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch (e) { throw new Error(`SAP sandbox returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`); }

  if (!res.ok) {
    const msg = (json && json.error && (json.error.message && (json.error.message.value || json.error.message))) || `SAP sandbox HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

// A_BusinessPartner OData rows come back under d.results in the sandbox's
// OData v2 shape.
function extractResults(json) {
  if (json && json.d && Array.isArray(json.d.results)) return json.d.results;
  if (Array.isArray(json && json.value)) return json.value; // OData v4 shape, just in case
  return [];
}

function normalizeBusinessPartner(row) {
  return {
    businessPartner: row.BusinessPartner || null,
    businessPartnerFullName: row.BusinessPartnerFullName || null,
    businessPartnerCategory: row.BusinessPartnerCategory || null,
    organizationBPName1: row.OrganizationBPName1 || null,
    raw: row,
  };
}

function normalizeSalesOrder(row) {
  return {
    salesOrder: row.SalesOrder || null,
    soldToParty: row.SoldToParty || null,
    salesOrderType: row.SalesOrderType || null,
    totalNetAmount: row.TotalNetAmount || null,
    transactionCurrency: row.TransactionCurrency || null,
    raw: row,
  };
}

/** getBusinessPartners(opts?, config?) -> normalized array (read-only) */
async function getBusinessPartners({ top = 10 } = {}, config) {
  const cfg = config || loadConfigFromEnv();
  const json = await sapRequest(cfg, BUSINESS_PARTNER_PATH, { top });
  return extractResults(json).map(normalizeBusinessPartner);
}

/** getSalesOrders(opts?, config?) -> normalized array (read-only) */
async function getSalesOrders({ top = 10 } = {}, config) {
  const cfg = config || loadConfigFromEnv();
  const json = await sapRequest(cfg, SALES_ORDER_PATH, { top });
  return extractResults(json).map(normalizeSalesOrder);
}

module.exports = {
  loadConfigFromEnv,
  isConfigured,
  getBusinessPartners,
  getSalesOrders,
  SapNotConfiguredError,
  _internal: { sapRequest, extractResults, BUSINESS_PARTNER_PATH, SALES_ORDER_PATH, SANDBOX_BASE_URL },
};
