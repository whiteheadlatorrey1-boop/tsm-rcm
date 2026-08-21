// AWS Cloud Ops adapter for L1 Copilot.
//
// Real EC2 instance status lookups via the official AWS SDK v3
// (@aws-sdk/client-ec2). Scope is intentionally narrow and read-only for a
// first pass: describe an instance by ID or Name tag, surface its state,
// health checks, and basic metadata so L1 can diagnose "is this box even
// up" without needing console access. No start/stop/terminate actions are
// exposed here on purpose — this is diagnostic read access only.
//
// Auth is standard AWS credential chain (env vars here, but the SDK will
// also pick up ~/.aws/credentials or an instance role if present) — no
// custom signing code, no per-client logic. Azure/GCP follow the same
// shape but are not implemented in this first pass; see the TODO at the
// bottom for the extension point.
//
// This module has no dependency on express/server.js — it can be required
// and unit-tested standalone.

'use strict';

const { EC2Client, DescribeInstancesCommand, DescribeInstanceStatusCommand } = require('@aws-sdk/client-ec2');

class CloudOpsNotConfiguredError extends Error {
  constructor(provider) {
    super(`Cloud Ops (${provider || 'AWS'}) is not configured for this environment (missing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION).`);
    this.name = 'CloudOpsNotConfiguredError';
    this.code = 'CLOUD_OPS_NOT_CONFIGURED';
  }
}

/** Reads AWS config from env vars unless an explicit config object is passed (multi-tenant callers pass their own). */
function loadConfigFromEnv() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  const region = process.env.AWS_REGION || '';
  if (!accessKeyId || !secretAccessKey || !region) return null;
  return { accessKeyId, secretAccessKey, region, sessionToken: process.env.AWS_SESSION_TOKEN || undefined };
}

function isConfigured(config) {
  const cfg = config || loadConfigFromEnv();
  return !!(cfg && cfg.accessKeyId && cfg.secretAccessKey && cfg.region);
}

/** Builds (or reuses a passed-in) EC2Client. Exposed as a separate function so tests can inject a fake client. */
function buildClient(cfg) {
  return new EC2Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      sessionToken: cfg.sessionToken
    }
  });
}

function normalizeInstance(instance, statusRecord) {
  if (!instance) return null;
  const nameTag = (instance.Tags || []).find(t => t.Key === 'Name');
  return {
    instanceId: instance.InstanceId,
    name: nameTag ? nameTag.Value : null,
    state: instance.State && instance.State.Name,
    instanceType: instance.InstanceType,
    availabilityZone: instance.Placement && instance.Placement.AvailabilityZone,
    privateIp: instance.PrivateIpAddress || null,
    publicIp: instance.PublicIpAddress || null,
    launchTime: instance.LaunchTime || null,
    systemStatus: statusRecord && statusRecord.SystemStatus && statusRecord.SystemStatus.Status,
    instanceStatus: statusRecord && statusRecord.InstanceStatus && statusRecord.InstanceStatus.Status,
    raw: instance
  };
}

/**
 * getInstance(instanceIdOrName, config?, client?) -> normalized instance record or null if not found
 * If given something that looks like an instance ID (i-xxxxxxxx), queries directly by ID.
 * Otherwise treats it as a Name tag and searches for a match.
 * `client` param is for test injection only — production callers omit it.
 */
async function getInstance(identifier, config, client) {
  const cfg = config || loadConfigFromEnv();
  if (!isConfigured(cfg)) throw new CloudOpsNotConfiguredError('AWS');
  const ec2 = client || buildClient(cfg);

  const looksLikeInstanceId = /^i-[0-9a-f]{8,17}$/i.test(identifier);
  const describeParams = looksLikeInstanceId
    ? { InstanceIds: [identifier] }
    : { Filters: [{ Name: 'tag:Name', Values: [identifier] }] };

  const data = await ec2.send(new DescribeInstancesCommand(describeParams));
  const instance = (data.Reservations || [])
    .flatMap(r => r.Instances || [])[0];
  if (!instance) return null;

  let statusRecord = null;
  try {
    const statusData = await ec2.send(new DescribeInstanceStatusCommand({
      InstanceIds: [instance.InstanceId],
      IncludeAllInstances: true
    }));
    statusRecord = (statusData.InstanceStatuses || [])[0] || null;
  } catch (e) {
    // Status check is best-effort — a stopped instance won't have one, that's not an error.
  }

  return normalizeInstance(instance, statusRecord);
}

module.exports = {
  CloudOpsNotConfiguredError,
  loadConfigFromEnv,
  isConfigured,
  buildClient,
  getInstance,
  // exported for tests only
  _internal: { normalizeInstance }
};

// TODO (next providers, same shape as this file):
// - Azure: use @azure/arm-compute + @azure/identity (ClientSecretCredential),
//   config from AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_SUBSCRIPTION_ID.
// - GCP: use @google-cloud/compute, config from GOOGLE_APPLICATION_CREDENTIALS
//   (service account JSON) or GCP_PROJECT_ID + inline key env vars.
