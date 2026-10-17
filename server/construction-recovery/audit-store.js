'use strict';
// Durable, append-only audit store for the Construction recovery demo.
// Same persistence pattern as server/l1-copilot/audit-store.js (dated files,
// atomic write, nothing ever dropped) but with its own record type, so
// Construction decisions never appear in the L1 trail. Event shape follows
// server/vertical-control-plane/audit.js. Fails closed: if a day's file
// cannot be parsed, recordAudit throws instead of overwriting it.
const fs = require('fs');
const path = require('path');

const PREFIX = 'construction-recovery-audit-';
const SUFFIX = '.json';

function dataDir() {
  if (process.env.CONSTRUCTION_AUDIT_DIR) return process.env.CONSTRUCTION_AUDIT_DIR;
  return process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '..', '..', 'data');
}

function datedFilePath(date) {
  const iso = (date || new Date()).toISOString().slice(0, 10);
  return path.join(dataDir(), PREFIX + iso + SUFFIX);
}

function allFiles() {
  try {
    return fs.readdirSync(dataDir())
      .filter(f => f.startsWith(PREFIX) && f.endsWith(SUFFIX))
      .sort()
      .map(f => path.join(dataDir(), f));
  } catch (e) { return []; }
}

function loadFile(fp) {
  if (!fs.existsSync(fp)) return [];
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch (e) { const err = new Error('audit file unreadable: ' + path.basename(fp)); err.code = 'AUDIT_CORRUPT'; throw err; }
  if (!Array.isArray(parsed)) { const err = new Error('audit file malformed: ' + path.basename(fp)); err.code = 'AUDIT_CORRUPT'; throw err; }
  return parsed;
}

function saveFile(fp, records) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const tmp = fp + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2));
  fs.renameSync(tmp, fp);
}

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    const err = new Error(field + ' required');
    err.code = 'MISSING_AUDIT_FIELD';
    throw err;
  }
  return value.trim();
}

function recordAudit(input = {}) {
  const eventType = requireString(input.eventType, 'eventType');
  const actor = requireString(input.actor, 'actor');
  const entityId = requireString(input.entityId, 'entityId');
  const fp = datedFilePath();
  const records = loadFile(fp);
  const record = Object.freeze({
    id: 'CON-AUDIT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    type: 'CONSTRUCTION_RECOVERY_AUDIT',
    eventType,
    vertical: 'construction',
    actor,
    entityId,
    decisionId: input.decisionId || null,
    before: input.before === undefined ? null : input.before,
    after: input.after === undefined ? null : input.after,
    metadata: input.metadata || {},
    timestamp: new Date().toISOString()
  });
  records.push(record);
  saveFile(fp, records);
  return record;
}

function loadAll() {
  return allFiles().reduce((acc, f) => acc.concat(loadFile(f)), []);
}

function listAudit(filters = {}) {
  let rows = loadAll();
  if (filters.entityId) rows = rows.filter(r => r.entityId === filters.entityId);
  rows = rows.reverse();
  return rows.slice(0, filters.limit || 100);
}

function countAudit() { return loadAll().length; }

module.exports = { recordAudit, listAudit, countAudit, datedFilePath };
