// GCP Cloud Ops adapter for L1 Copilot (Compute Engine).
//
// Real Compute Engine instance status lookups via the official Google
// Cloud SDK (@google-cloud/compute). Scope is intentionally narrow and
// read-only for a first pass: look up an instance by name across all
// zones in a project, surface its status and basic metadata so L1 can
// diagnose "is this box even up" without needing console access. No
// start/stop/delete actions are exposed here on purpose — this is
// diagnostic read access only. Same shape/intent as the AWS adapter
// (server/l1-copilot/cloud-ops-adapter.js) and the Graph/Intune adapter.
//
// Auth is a service account key, supplied either as the standard
// GOOGLE_APPLICATION_CREDENTIALS file-path env var (SDK default) or as
// inline JSON via GCP_SERVICE_ACCOUNT_KEY_JSON (useful when the runtime
// has no writable filesystem for a credentials file, e.g. Fly.io secrets).
// GCP_PROJECT_ID is required either way since instance lookups are
// project-scoped and aggregatedList needs it explicitly.
//
// This module has no dependency on express/server.js — it can be required
// and unit-tested standalone (see tests/unit/l1-copilot/gcp-adapter.test.js).

'use strict';

const { InstancesClient } = require('@google-cloud/compute');

class GcpNotConfiguredError extends Error {
  constructor() {
    super('Cloud Ops (GCP) is not configured for this environment (missing GCP_PROJECT_ID / GCP_SERVICE_ACCOUNT_KEY_JSON).');
    this.name = 'GcpNotConfiguredError';
    this.code = 'GCP_NOT_CONFIGURED';
  }
}

/** Reads GCP config from env vars unless an explicit config object is passed (multi-tenant callers pass their own). */
function loadConfigFromEnv() {
  const projectId = process.env.GCP_PROJECT_ID || '';
  const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY_JSON || '';
  // GOOGLE_APPLICATION_CREDENTIALS (file path) is also valid auth and is
  // picked up automatically by the SDK's ADC chain — don't require inline
  // JSON if that's set instead.
  const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  if (!projectId) return null;
  if (!keyJson && !adcPath) return null;

  let credentials = null;
  if (keyJson) {
    try {
      credentials = JSON.parse(keyJson);
    } catch (e) {
      return null; // malformed key JSON — treat as unconfigured, not a crash
    }
  }
  return { projectId, credentials };
}

function isConfigured(config) {
  const cfg = config || loadConfigFromEnv();
  return !!(cfg && cfg.projectId && (cfg.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS));
}

/** Builds (or reuses a passed-in) InstancesClient. Exposed as a separate function so tests can inject a fake client. */
function buildClient(cfg) {
  const opts = {};
  if (cfg.credentials) opts.credentials = cfg.credentials;
  return new InstancesClient(opts);
}

function normalizeInstance(instance, zone) {
  if (!instance) return null;
  const machineTypeShort = instance.machineType ? instance.machineType.split('/').pop() : null;
  const netIface = (instance.networkInterfaces || [])[0] || {};
  const accessConfig = (netIface.accessConfigs || [])[0] || {};
  return {
    instanceId: instance.id != null ? String(instance.id) : null,
    name: instance.name,
    zone: zone || (instance.zone ? instance.zone.split('/').pop() : null),
    status: instance.status,
    machineType: machineTypeShort,
    privateIp: netIface.networkIP || null,
    publicIp: accessConfig.natIP || null,
    creationTimestamp: instance.creationTimestamp || null,
    raw: instance
  };
}

/**
 * getInstance(name, config?, client?) -> normalized instance record or null if not found
 * Searches across all zones in the configured project via aggregatedListAsync
 * and returns the first instance matching the given name.
 * `client` param is for test injection only — production callers omit it.
 */
async function getInstance(name, config, client) {
  const cfg = config || loadConfigFromEnv();
  if (!isConfigured(cfg)) throw new GcpNotConfiguredError();
  const instances = client || buildClient(cfg);

  const aggListRequest = {
    project: cfg.projectId,
    filter: `name = "${name}"`
  };

  const iterable = instances.aggregatedListAsync(aggListRequest);
  for await (const [zoneKey, scopedList] of iterable) {
    const list = (scopedList && scopedList.instances) || [];
    if (list.length > 0) {
      const zoneName = zoneKey && zoneKey.startsWith('zones/') ? zoneKey.slice('zones/'.length) : zoneKey;
      return normalizeInstance(list[0], zoneName);
    }
  }
  return null;
}

module.exports = {
  GcpNotConfiguredError,
  loadConfigFromEnv,
  isConfigured,
  buildClient,
  getInstance,
  // exported for tests only
  _internal: { normalizeInstance }
};
