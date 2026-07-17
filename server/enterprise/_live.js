'use strict';

/**
 * Shared self-fetch helper for enterprise capability modules.
 *
 * Each capability module (o2c.js, crm.js, etc.) runs inside the same Node
 * process as server.js, but the real state it needs (WIP_TASKS,
 * GOVERNANCE_RISK_REGISTER, MDM_SEED_DATA, the capability-bridge stores,
 * etc.) lives in module-scoped variables inside server.js / other route
 * files, not exported anywhere. Rather than refactor server.js's internals,
 * this follows the same pattern already used by
 * routes/enterprise-capability-bridge.js's capability-sweep endpoint: an
 * internal HTTP call, same host, to the real already-mounted route.
 *
 * context.baseUrl is injected by enterprise-router.js from the incoming
 * request (req.protocol + '://' + req.get('host')) so this works in any
 * environment without hardcoding a port.
 */

async function getJSON(baseUrl, path) {
  if (!baseUrl) {
    throw new Error(`baseUrl missing from context — cannot reach live endpoint ${path}`);
  }
  const res = await fetch(baseUrl + path);
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(`${path} returned ${res.status}: ${data.error || 'unknown error'}`);
  }
  return data;
}

module.exports = { getJSON };
