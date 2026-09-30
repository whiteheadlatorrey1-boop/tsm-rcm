'use strict';

/**
 * L1 Copilot Operational Metrics Store — Phase 11.2
 *
 * Durable aggregate metrics for governed L1 activity.
 *
 * This module has no ServiceNow, AI, Express, or authentication dependency.
 * It records explicit operational events supplied by callers.
 *
 * Metrics are aggregate operational counters, not technician evidence.
 * Audit records remain the detailed source of execution history.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data'
  : path.join(__dirname, '..', '..', 'data');

const METRICS_FILE = path.join(
  DATA_DIR,
  'l1-copilot-metrics.json'
);

const EVENT_TYPES = Object.freeze([
  'ACTION_GENERATED',
  'ACTION_PREVIEWED',
  'ACTION_CONFIRMED',
  'ACTION_EXECUTED',
  'ACTION_REJECTED',
  'ACTION_FAILED'
]);

const ACTION_TYPES = Object.freeze([
  'RESOLUTION_WRITE',
  'RETURN_TO_INVENTORY',
  'CREATE_REPLACEMENT',
  'HARDWARE_SWAP',
  'LOANER_RETURN',
  'WARRANTY_DEPOT_RETURN',
  'DEVICE_REASSIGNMENT',
  'DISPOSITION_RECOMMENDATION',
  'DISPOSITION_APPROVAL',
  'DISPOSITION_SANITIZATION',
  'DISPOSITION_COMPLETION',
  'LOST_STOLEN_REPORT',
  'LOST_STOLEN_ESCALATION',
  'LOST_STOLEN_SECURITY_ACTION',
  'LOST_STOLEN_RECONCILED',
  'ESCALATION',
  'CLOUD_OPS_HANDOFF'
]);

function requireString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    const err = new Error(`${name} required`);
    err.code = 'MISSING_REQUIRED_FIELD';
    throw err;
  }

  return value.trim();
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadMetrics() {
  ensureDataDir();

  if (!fs.existsSync(METRICS_FILE)) {
    return {
      type: 'L1_COPILOT_METRICS',
      version: 1,
      totals: {
        generated: 0,
        previewed: 0,
        confirmed: 0,
        executed: 0,
        rejected: 0,
        failed: 0
      },
      byActionType: {},
      byTechnician: {},
      lastEventAt: null
    };
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(METRICS_FILE, 'utf8')
    );

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid metrics store format');
    }

    return parsed;
  } catch (err) {
    const wrapped = new Error(
      `Unable to load L1 metrics store: ${err.message}`
    );
    wrapped.code = 'METRICS_STORE_LOAD_FAILED';
    throw wrapped;
  }
}

function saveMetrics(metrics) {
  ensureDataDir();

  const tempFile = `${METRICS_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(metrics, null, 2),
    'utf8'
  );

  fs.renameSync(tempFile, METRICS_FILE);
}

function eventCounter(eventType) {
  const map = {
    ACTION_GENERATED: 'generated',
    ACTION_PREVIEWED: 'previewed',
    ACTION_CONFIRMED: 'confirmed',
    ACTION_EXECUTED: 'executed',
    ACTION_REJECTED: 'rejected',
    ACTION_FAILED: 'failed'
  };

  return map[eventType];
}

/**
 * recordMetric(input)
 *
 * Required:
 *   eventType
 *   actionType
 *   technician.id
 *
 * Optional:
 *   sourceIncident
 *   metadata
 */
function recordMetric(input = {}) {
  const eventType = requireString(
    input.eventType,
    'eventType'
  );

  const actionType = requireString(
    input.actionType,
    'actionType'
  );

  const technician = input.technician;

  if (
    !technician ||
    typeof technician !== 'object' ||
    !technician.id
  ) {
    const err = new Error(
      'technician: { id } required'
    );
    err.code = 'MISSING_TECHNICIAN';
    throw err;
  }

  if (!EVENT_TYPES.includes(eventType)) {
    const err = new Error(
      `Unknown event type "${eventType}"`
    );
    err.code = 'UNKNOWN_EVENT_TYPE';
    throw err;
  }

  if (!ACTION_TYPES.includes(actionType)) {
    const err = new Error(
      `Unknown action type "${actionType}"`
    );
    err.code = 'UNKNOWN_ACTION_TYPE';
    throw err;
  }

  const metrics = loadMetrics();
  const counter = eventCounter(eventType);

  metrics.totals[counter] =
    Number(metrics.totals[counter] || 0) + 1;

  metrics.byActionType[actionType] =
    metrics.byActionType[actionType] || {
      generated: 0,
      previewed: 0,
      confirmed: 0,
      executed: 0,
      rejected: 0,
      failed: 0
    };

  metrics.byActionType[actionType][counter] += 1;

  const technicianId = String(
    technician.id
  );

  metrics.byTechnician[technicianId] =
    metrics.byTechnician[technicianId] || {
      generated: 0,
      previewed: 0,
      confirmed: 0,
      executed: 0,
      rejected: 0,
      failed: 0
    };

  metrics.byTechnician[technicianId][counter] += 1;

  metrics.lastEventAt =
    new Date().toISOString();

  saveMetrics(metrics);

  return {
    eventType,
    actionType,
    technician: {
      id: technicianId,
      label: technician.label || null
    },
    sourceIncident:
      input.sourceIncident || null,
    counter,
    totals: {
      ...metrics.totals
    },
    createdAt: metrics.lastEventAt
  };
}

function getMetrics() {
  return loadMetrics();
}

function resetMetrics() {
  try {
    fs.unlinkSync(METRICS_FILE);
  } catch (_) {}

  try {
    fs.unlinkSync(`${METRICS_FILE}.tmp`);
  } catch (_) {}
}

module.exports = {
  EVENT_TYPES,
  ACTION_TYPES,
  recordMetric,
  getMetrics,
  resetMetrics,
  METRICS_FILE
};
