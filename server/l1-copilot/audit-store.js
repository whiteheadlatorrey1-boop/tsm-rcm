'use strict';

/**
 * L1 Copilot Governance Audit Store — Phase 10.2
 *
 * Durable, append-only operational audit records for L1 governed actions.
 *
 * This module:
 *   - does not call ServiceNow
 *   - does not execute actions
 *   - does not authorize actions
 *   - does not change ticket state
 *   - records technician/governance evidence supplied by callers
 *
 * The Action Gate remains the authorization boundary.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data'
  : path.join(__dirname, '..', '..', 'data');

const FILE_PATH = path.join(DATA_DIR, 'l1-copilot-audit.json');
const MAX_RECORDS = 5000;

function loadRecords() {
  try {
    if (!fs.existsSync(FILE_PATH)) return [];

    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    if (!raw.trim()) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error(`Unable to load L1 audit records: ${err.message}`);
  }
}

function saveRecords(records) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const tempPath = `${FILE_PATH}.tmp`;

  fs.writeFileSync(
    tempPath,
    JSON.stringify(records, null, 2),
    'utf8'
  );

  fs.renameSync(tempPath, FILE_PATH);
}

function requireString(value, field) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    const err = new Error(`${field} required`);
    err.code = 'MISSING_AUDIT_FIELD';
    throw err;
  }

  return value.trim();
}

/**
 * recordAudit(input)
 *
 * Creates one immutable audit event.
 *
 * Required:
 *   eventType
 *   actionType
 *   sourceIncident
 *   technician.id
 *
 * The caller may provide:
 *   state
 *   references
 *   confirmed
 *   executed
 *   executionResult
 *   governed
 *   metadata
 */
function recordAudit(input = {}) {
  const eventType = requireString(input.eventType, 'eventType');
  const actionType = requireString(input.actionType, 'actionType');
  const sourceIncident = requireString(
    input.sourceIncident,
    'sourceIncident'
  );

  if (
    !input.technician ||
    typeof input.technician !== 'object' ||
    !input.technician.id
  ) {
    const err = new Error('technician.id required');
    err.code = 'MISSING_AUDIT_FIELD';
    throw err;
  }

  const records = loadRecords();

  const record = Object.freeze({
    id: `L1-AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'L1_COPILOT_AUDIT',
    eventType,
    actionType,
    sourceIncident,
    technician: {
      id: input.technician.id,
      label: input.technician.label || null
    },
    state: input.state || null,
    confirmed: input.confirmed === true,
    executed: input.executed === true,
    references: input.references || null,
    executionResult: input.executionResult || null,
    governed: {
      serviceNowStateWrite:
        input.governed?.serviceNowStateWrite === true,
      ticketStateChanged:
        input.governed?.ticketStateChanged === true,
      ticketClosureRequested:
        input.governed?.ticketClosureRequested === true,
      autonomousExecutionAllowed:
        input.governed?.autonomousExecutionAllowed === true
    },
    metadata: input.metadata || null,
    createdAt: new Date().toISOString()
  });

  records.push(record);

  const retained = records.length > MAX_RECORDS
    ? records.slice(-MAX_RECORDS)
    : records;

  saveRecords(retained);

  return record;
}

function getAudit(id) {
  if (!id) return null;

  return loadRecords().find(
    record => record.id === id
  ) || null;
}

function listAudit(filters = {}) {
  let records = loadRecords();

  if (filters.sourceIncident) {
    records = records.filter(
      record => record.sourceIncident === filters.sourceIncident
    );
  }

  if (filters.actionType) {
    records = records.filter(
      record => record.actionType === filters.actionType
    );
  }

  if (filters.technicianId) {
    records = records.filter(
      record => record.technician?.id === filters.technicianId
    );
  }

  if (filters.eventType) {
    records = records.filter(
      record => record.eventType === filters.eventType
    );
  }

  return records.slice().reverse();
}

function countAudit() {
  return loadRecords().length;
}

module.exports = {
  FILE_PATH,
  recordAudit,
  getAudit,
  listAudit,
  countAudit
};
