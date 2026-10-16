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
 *
 * Retention: every record is kept forever. Records rotate into one file per
 * calendar day (l1-copilot-audit-YYYY-MM-DD.json) instead of accumulating in
 * a single ever-growing file -- today's writes go to today's file, and the
 * next calendar day's writes start a new one. Nothing is ever dropped the
 * way the old single-file MAX_RECORDS=5000 cap used to drop the oldest
 * records once the file passed that size; this is pure audit evidence, so
 * silently discarding old entries was never actually acceptable.
 *
 * A pre-existing single-file l1-copilot-audit.json (this module's shape
 * before rotation) is still read -- it holds whatever records accumulated
 * under the old scheme and is never written to again, only included when
 * aggregating across all dated files.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data'
  : path.join(__dirname, '..', '..', 'data');

const LEGACY_FILE_PATH = path.join(DATA_DIR, 'l1-copilot-audit.json');
const DATED_FILE_PREFIX = 'l1-copilot-audit-';
const DATED_FILE_SUFFIX = '.json';

function datedFilePath(date) {
  const iso = (date || new Date()).toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(DATA_DIR, `${DATED_FILE_PREFIX}${iso}${DATED_FILE_SUFFIX}`);
}

// Exported for test/introspection convenience -- today's dated file, the
// one new records are currently being written into. Computed once here
// (not re-evaluated per call) the same way the old single FILE_PATH
// constant was; recordAudit() itself always computes the current day
// fresh so a long-running process correctly rotates at midnight even if
// this module was required the day before.
const FILE_PATH = datedFilePath();

function allAuditFilePaths() {
  let datedFiles = [];
  try {
    datedFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith(DATED_FILE_PREFIX) && f.endsWith(DATED_FILE_SUFFIX))
      .sort() // YYYY-MM-DD sorts lexicographically == chronologically
      .map(f => path.join(DATA_DIR, f));
  } catch (err) {
    // DATA_DIR doesn't exist yet -- no files to read, not an error.
  }

  // Legacy single file holds the oldest records (pre-rotation); read it
  // first so aggregated listings stay oldest-to-newest before listAudit()
  // reverses them for display.
  return fs.existsSync(LEGACY_FILE_PATH) ? [LEGACY_FILE_PATH, ...datedFiles] : datedFiles;
}

function loadRecordsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error(`Unable to load L1 audit records from ${filePath}: ${err.message}`);
  }
}

function loadAllRecords() {
  return allAuditFilePaths().flatMap(loadRecordsFromFile);
}

function saveRecordsToFile(filePath, records) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const tempPath = `${filePath}.tmp`;

  fs.writeFileSync(
    tempPath,
    JSON.stringify(records, null, 2),
    'utf8'
  );

  fs.renameSync(tempPath, filePath);
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
 * Creates one immutable audit event, appended to today's dated file.
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

  const filePath = datedFilePath();
  const records = loadRecordsFromFile(filePath);

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

  // No cap, no drop -- the only thing bounding an individual file's size is
  // the daily rotation above.
  saveRecordsToFile(filePath, records);

  return record;
}

function getAudit(id) {
  if (!id) return null;

  return loadAllRecords().find(
    record => record.id === id
  ) || null;
}

function listAudit(filters = {}) {
  let records = loadAllRecords();

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
  return loadAllRecords().length;
}

module.exports = {
  FILE_PATH,
  LEGACY_FILE_PATH,
  datedFilePath,
  allAuditFilePaths,
  recordAudit,
  getAudit,
  listAudit,
  countAudit
};
