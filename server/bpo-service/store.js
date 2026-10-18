'use strict';

/**
 * Generic BPO-service persistence and audit trail, shared across every
 * vertical plug-in (see ../bpo-service/plugin-registry.js).
 *
 * This is the generalized sibling of server/construction-bpo/store.js --
 * same shape conventions (weekly report keyed by client+week, append-only
 * audit, fail-closed publish, per-flag review gate), but every document
 * id and query is scoped by `vertical` (a plug-in's `id`) so every
 * vertical's data lives in ONE shared set of collections rather than one
 * collection family per vertical. construction-bpo's OWN collections
 * (construction_bpo_weekly_reports etc.) are untouched and keep serving
 * the existing /api/construction-bpo/* routes exactly as before -- this
 * is a parallel system for the new /api/bpo-service/:vertical/* routes,
 * not a migration of the old data.
 */

const tsmLedger = require('../tsm-ledger-service');

const REPORTS_COLLECTION = 'bpo_service_weekly_reports';
const AUDIT_COLLECTION = 'bpo_service_audit_logs';
const ENGAGEMENTS_COLLECTION = 'bpo_service_engagements';
const CONTROLLER_TIME_COLLECTION = 'bpo_service_controller_time';

function reportId(vertical, clientId, weekEnding) {
  return vertical + '__' + clientId + '__' + weekEnding;
}
function engagementId(vertical, clientId) {
  return vertical + '__' + clientId;
}
function controllerTimeId(vertical, clientId, week) {
  return vertical + '__' + clientId + '__' + week;
}

async function reportsCollection(getDb) {
  const db = await (getDb ? getDb() : tsmLedger.getDb());
  return db.collection(REPORTS_COLLECTION);
}
async function auditCollection(getDb) {
  const db = await (getDb ? getDb() : tsmLedger.getDb());
  return db.collection(AUDIT_COLLECTION);
}
async function engagementsCollection(getDb) {
  const db = await (getDb ? getDb() : tsmLedger.getDb());
  return db.collection(ENGAGEMENTS_COLLECTION);
}
async function controllerTimeCollection(getDb) {
  const db = await (getDb ? getDb() : tsmLedger.getDb());
  return db.collection(CONTROLLER_TIME_COLLECTION);
}

/**
 * upsertDraftReport(vertical, draft, opts?) -> the stored document.
 * Refuses (.code = 'ALREADY_PUBLISHED') to overwrite a report already
 * published for this vertical+clientId+weekEnding.
 */
async function upsertDraftReport(vertical, draft, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const _id = reportId(vertical, draft.clientId, draft.weekEnding);
  const existing = await col.findOne({ _id });
  if (existing && existing.status === 'published') {
    const err = new Error('a published report already exists for ' + _id);
    err.code = 'ALREADY_PUBLISHED';
    throw err;
  }
  const doc = Object.assign({ _id, vertical }, draft);
  await col.updateOne({ _id }, { $set: doc }, { upsert: true });
  return doc;
}

async function getReport(vertical, clientId, weekEnding, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  return col.findOne({ _id: reportId(vertical, clientId, weekEnding) });
}

/** getReportById(id, opts?) -> the document, or null. Callers that care which vertical issued the request should also check doc.vertical themselves (routes.js does). */
async function getReportById(id, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  return col.findOne({ _id: id });
}

/**
 * listReports(vertical, { clientId?, status? }, opts?) -> array, newest
 * weekEnding first. Always scoped to `vertical` -- never returns another
 * plug-in's reports even if clientId/status are omitted.
 */
async function listReports(vertical, filter = {}, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const query = { vertical };
  if (filter.clientId) query.clientId = filter.clientId;
  if (filter.status) query.status = filter.status;
  return col.find(query).sort({ weekEnding: -1 }).toArray();
}

/**
 * publishWeeklyReport(id, { publishedBy }, opts?) -> the published document.
 * .code: 'NOT_FOUND' | 'ALREADY_PUBLISHED' | 'FLAGS_PENDING' (+ .pendingCount).
 */
async function publishWeeklyReport(id, { publishedBy }, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const existing = await col.findOne({ _id: id });
  if (!existing) { const err = new Error('no report ' + id); err.code = 'NOT_FOUND'; throw err; }
  if (existing.status === 'published') { const err = new Error('report ' + id + ' is already published'); err.code = 'ALREADY_PUBLISHED'; throw err; }
  const pendingCount = (existing.flags || []).filter((f) => f.status === 'pending').length;
  if (pendingCount > 0) {
    const err = new Error(pendingCount + ' flag(s) on report ' + id + ' are still pending review');
    err.code = 'FLAGS_PENDING';
    err.pendingCount = pendingCount;
    throw err;
  }
  const publishedAt = new Date().toISOString();
  await col.updateOne({ _id: id }, { $set: { status: 'published', publishedBy, publishedAt } });
  return Object.assign({}, existing, { status: 'published', publishedBy, publishedAt });
}

/** revertToDraft(id, opts?) -> void. Used only when publish's own audit write fails -- see routes.js's PUBLISH FAIL-CLOSED. */
async function revertToDraft(id, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  await col.updateOne({ _id: id }, { $set: { status: 'draft', publishedBy: null, publishedAt: null } });
}

/**
 * updateFlagStatus(id, flagId, { status, note, reviewedBy }, opts?) ->
 * the updated report document. .code: 'NOT_FOUND' | 'ALREADY_PUBLISHED' | 'FLAG_NOT_FOUND'.
 *
 * Walks the top-level `flags` array AND every array named in
 * `reportSections` on the document (report[section][i].flags) -- a flag's
 * data is duplicated across both at draft-build time (report-builder.js),
 * and a Mongo round-trip deep-clones them apart, so both copies must be
 * found and patched by flagId rather than relying on object identity.
 * reportSections is read from the document itself (every stored report
 * carries the section key names it was built with), not passed in by the
 * caller, so this function needs no knowledge of any particular plug-in.
 */
async function updateFlagStatus(id, flagId, patch, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const report = await col.findOne({ _id: id });
  if (!report) { const err = new Error('no report ' + id); err.code = 'NOT_FOUND'; throw err; }
  if (report.status === 'published') { const err = new Error('report ' + id + ' is already published -- flags are frozen'); err.code = 'ALREADY_PUBLISHED'; throw err; }

  const reviewedAt = new Date().toISOString();
  let found = false;
  const applyToFlag = (flag) => {
    if (flag && flag.flagId === flagId) {
      found = true;
      flag.status = patch.status;
      flag.note = patch.note !== undefined ? patch.note : null;
      flag.reviewedBy = patch.reviewedBy;
      flag.reviewedAt = reviewedAt;
    }
  };
  (report.flags || []).forEach(applyToFlag);
  const sectionKeys = Array.isArray(report.reportSections) ? report.reportSections : [];
  for (const key of sectionKeys) {
    for (const entity of report[key] || []) (entity.flags || []).forEach(applyToFlag);
  }

  if (!found) { const err = new Error('no flag ' + flagId + ' on report ' + id); err.code = 'FLAG_NOT_FOUND'; throw err; }

  const update = { flags: report.flags };
  for (const key of sectionKeys) update[key] = report[key];
  await col.updateOne({ _id: id }, { $set: update });
  return report;
}

async function recordAudit(vertical, entry, opts = {}) {
  const col = await auditCollection(opts.getDb);
  const doc = {
    id: 'BPOSVC-AUDIT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    vertical,
    eventType: entry.eventType,
    actor: entry.actor,
    entityId: entry.entityId,
    metadata: entry.metadata || {},
    timestamp: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return doc;
}

async function listAudit(vertical, filter = {}, opts = {}) {
  const col = await auditCollection(opts.getDb);
  const query = { vertical };
  if (filter.entityId) query.entityId = filter.entityId;
  return col.find(query).sort({ timestamp: -1 }).limit(filter.limit || 200).toArray();
}

// ─────────────────────────── engagements ──────────────────────────────────

async function createEngagement(vertical, engagement, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  const _id = engagementId(vertical, engagement.clientId);
  const existing = await col.findOne({ _id });
  if (existing) { const err = new Error('an engagement for ' + _id + ' already exists'); err.code = 'ALREADY_EXISTS'; throw err; }
  const now = new Date().toISOString();
  const doc = Object.assign({ _id, vertical, createdAt: now, updatedAt: now }, engagement);
  await col.updateOne({ _id }, { $set: doc }, { upsert: true });
  return doc;
}

async function getEngagement(vertical, clientId, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  return col.findOne({ _id: engagementId(vertical, clientId) });
}

async function listEngagements(vertical, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  return col.find({ vertical }).sort({ clientId: 1 }).toArray();
}

async function updateEngagement(vertical, clientId, patch, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  const _id = engagementId(vertical, clientId);
  const existing = await col.findOne({ _id });
  if (!existing) { const err = new Error('no engagement for ' + _id); err.code = 'NOT_FOUND'; throw err; }
  const doc = Object.assign({}, existing, patch, { _id, vertical, clientId, updatedAt: new Date().toISOString() });
  await col.updateOne({ _id }, { $set: doc });
  return doc;
}

async function deleteEngagement(vertical, clientId, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  const _id = engagementId(vertical, clientId);
  const existing = await col.findOne({ _id });
  if (!existing) { const err = new Error('no engagement for ' + _id); err.code = 'NOT_FOUND'; throw err; }
  await col.deleteOne({ _id });
  return existing;
}

// ───────────────────────── controller time ────────────────────────────────

async function upsertControllerTime(vertical, clientId, week, minutes, recordedBy, opts = {}) {
  const col = await controllerTimeCollection(opts.getDb);
  const _id = controllerTimeId(vertical, clientId, week);
  const doc = { _id, vertical, clientId, week, minutes, recordedBy, recordedAt: new Date().toISOString() };
  await col.updateOne({ _id }, { $set: doc }, { upsert: true });
  return doc;
}

async function listControllerTime(vertical, clientId, opts = {}) {
  const col = await controllerTimeCollection(opts.getDb);
  return col.find({ vertical, clientId }).sort({ week: 1 }).toArray();
}

module.exports = {
  REPORTS_COLLECTION, AUDIT_COLLECTION, ENGAGEMENTS_COLLECTION, CONTROLLER_TIME_COLLECTION,
  reportId, engagementId, controllerTimeId,
  upsertDraftReport, getReport, getReportById, listReports, publishWeeklyReport, revertToDraft, updateFlagStatus,
  recordAudit, listAudit,
  createEngagement, getEngagement, listEngagements, updateEngagement, deleteEngagement,
  upsertControllerTime, listControllerTime,
};
