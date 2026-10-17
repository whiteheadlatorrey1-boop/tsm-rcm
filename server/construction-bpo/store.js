'use strict';

/**
 * Construction BPO: weekly-report persistence and audit trail.
 *
 * Mongo-backed (same shared client as the rest of the app -- see
 * server/tsm-ledger-service.js). A weekly report is keyed by
 * clientId+weekEnding (one draft/published report per client per week;
 * re-submitting the same client+week upserts the draft, EXCEPT once
 * published -- see publishWeeklyReport/upsertDraftReport below, which
 * refuse to silently overwrite a published report).
 *
 * Audit is append-only and recorded for every state-changing action
 * (draft generated, published) -- same shape convention as
 * server/construction-recovery/audit-store.js's file-based log, but
 * Mongo-backed here since this service's reports themselves are
 * Mongo-backed (so a live-Mongo acceptance test can exercise the whole
 * path against a real database, not a file on disk).
 */

const tsmLedger = require('../tsm-ledger-service');

const REPORTS_COLLECTION = 'construction_bpo_weekly_reports';
const AUDIT_COLLECTION = 'construction_bpo_audit_logs';
const ENGAGEMENTS_COLLECTION = 'construction_bpo_engagements';
const CONTROLLER_TIME_COLLECTION = 'construction_bpo_controller_time';

function reportId(clientId, weekEnding) {
  return clientId + '__' + weekEnding;
}
function controllerTimeId(clientId, week) {
  return clientId + '__' + week;
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
 * upsertDraftReport(draft, opts?) -> the stored document.
 * Refuses (throws with .code = 'ALREADY_PUBLISHED') to overwrite a report
 * that has already been published for this clientId+weekEnding -- a new
 * import/regeneration for a week that's already gone to the client must
 * not silently rewrite what they were shown.
 */
async function upsertDraftReport(draft, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const _id = reportId(draft.clientId, draft.weekEnding);
  const existing = await col.findOne({ _id });
  if (existing && existing.status === 'published') {
    const err = new Error('a published report already exists for ' + draft.clientId + '/' + draft.weekEnding);
    err.code = 'ALREADY_PUBLISHED';
    throw err;
  }
  const doc = Object.assign({ _id }, draft);
  await col.updateOne({ _id }, { $set: doc }, { upsert: true });
  return doc;
}

async function getReport(clientId, weekEnding, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  return col.findOne({ _id: reportId(clientId, weekEnding) });
}

async function getReportById(id, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  return col.findOne({ _id: id });
}

/**
 * listReports({ clientId? }, opts?) -> array of reports, newest weekEnding first.
 * clientId omitted: every client's reports (internal/staff use only --
 * route layer must gate this by role, not rely on the store to scope it).
 */
async function listReports(filter = {}, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const query = {};
  if (filter.clientId) query.clientId = filter.clientId;
  if (filter.status) query.status = filter.status;
  return col.find(query).sort({ weekEnding: -1 }).toArray();
}

/**
 * publishWeeklyReport(id, { publishedBy }, opts?) -> the published document.
 * Throws .code = 'NOT_FOUND' if no such report, .code = 'ALREADY_PUBLISHED'
 * if it's already published (publishing is a one-way, one-time transition),
 * .code = 'FLAGS_PENDING' (with .pendingCount) if any flag on the report
 * hasn't been explicitly approved or dismissed yet -- a client must never
 * see a report an analyst hasn't finished reviewing flag-by-flag.
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

/**
 * updateFlagStatus(reportId, flagId, { status, note, reviewedBy }, opts?) ->
 * the updated report document.
 * Throws .code = 'NOT_FOUND' (no such report), .code = 'ALREADY_PUBLISHED'
 * (flags on a published report are frozen -- review happens before
 * publish, which is the whole point of the gate), or .code =
 * 'FLAG_NOT_FOUND' (no flag with that id on this report).
 *
 * A flag's data is duplicated across the top-level `flags` array AND the
 * per-entity array it came from (jobs[].flags / changeOrders[].flags /
 * retainage[].flags / lienWaivers[].flags) -- they were the SAME object
 * references when weekly-report.js built the draft, but a Mongo
 * read/write round-trip deep-clones everything, so both copies have to be
 * found and updated by flagId explicitly; relying on object identity
 * after storage would silently update only one of them.
 */
async function updateFlagStatus(reportId, flagId, patch, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const report = await col.findOne({ _id: reportId });
  if (!report) { const err = new Error('no report ' + reportId); err.code = 'NOT_FOUND'; throw err; }
  if (report.status === 'published') { const err = new Error('report ' + reportId + ' is already published -- flags are frozen'); err.code = 'ALREADY_PUBLISHED'; throw err; }

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
  (report.jobs || []).forEach((j) => (j.flags || []).forEach(applyToFlag));
  (report.changeOrders || []).forEach((c) => (c.flags || []).forEach(applyToFlag));
  (report.retainage || []).forEach((r) => (r.flags || []).forEach(applyToFlag));
  (report.lienWaivers || []).forEach((w) => (w.flags || []).forEach(applyToFlag));

  if (!found) { const err = new Error('no flag ' + flagId + ' on report ' + reportId); err.code = 'FLAG_NOT_FOUND'; throw err; }

  await col.updateOne({ _id: reportId }, { $set: {
    flags: report.flags, jobs: report.jobs, changeOrders: report.changeOrders, retainage: report.retainage, lienWaivers: report.lienWaivers,
  } });
  return report;
}

async function recordAudit(entry, opts = {}) {
  const col = await auditCollection(opts.getDb);
  const doc = {
    id: 'CBPO-AUDIT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    eventType: entry.eventType,
    actor: entry.actor,
    entityId: entry.entityId,
    metadata: entry.metadata || {},
    timestamp: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return doc;
}

async function listAudit(filter = {}, opts = {}) {
  const col = await auditCollection(opts.getDb);
  const query = {};
  if (filter.entityId) query.entityId = filter.entityId;
  return col.find(query).sort({ timestamp: -1 }).limit(filter.limit || 200).toArray();
}

// ─────────────────────────── engagements ──────────────────────────────────
// Per-client standing configuration (thresholds, change-order SLA hours,
// and import defaults) so an analyst doesn't have to re-type a client's
// deal terms into every weekly-report/import request. One engagement per
// clientId -- keyed by clientId itself, same convention as a report being
// keyed by clientId+weekEnding.

/**
 * createEngagement(engagement, opts?) -> the stored document.
 * Throws .code = 'ALREADY_EXISTS' if an engagement for this clientId is
 * already on file -- use updateEngagement to change it.
 */
async function createEngagement(engagement, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  const existing = await col.findOne({ _id: engagement.clientId });
  if (existing) { const err = new Error('an engagement for ' + engagement.clientId + ' already exists'); err.code = 'ALREADY_EXISTS'; throw err; }
  const now = new Date().toISOString();
  const doc = Object.assign({ _id: engagement.clientId, createdAt: now, updatedAt: now }, engagement);
  await col.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
  return doc;
}

async function getEngagement(clientId, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  return col.findOne({ _id: clientId });
}

async function listEngagements(opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  return col.find({}).sort({ clientId: 1 }).toArray();
}

/**
 * updateEngagement(clientId, patch, opts?) -> the updated document.
 * Merges patch fields into the existing engagement; throws .code =
 * 'NOT_FOUND' if none exists yet (use createEngagement first).
 */
async function updateEngagement(clientId, patch, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  const existing = await col.findOne({ _id: clientId });
  if (!existing) { const err = new Error('no engagement for ' + clientId); err.code = 'NOT_FOUND'; throw err; }
  const doc = Object.assign({}, existing, patch, { _id: clientId, clientId, updatedAt: new Date().toISOString() });
  await col.updateOne({ _id: clientId }, { $set: doc });
  return doc;
}

async function deleteEngagement(clientId, opts = {}) {
  const col = await engagementsCollection(opts.getDb);
  const existing = await col.findOne({ _id: clientId });
  if (!existing) { const err = new Error('no engagement for ' + clientId); err.code = 'NOT_FOUND'; throw err; }
  await col.deleteOne({ _id: clientId });
  return existing;
}

// ───────────────────────── controller time ────────────────────────────────
// One entry per clientId+week, upserted (re-logging the same week corrects
// it rather than double-counting) -- same upsert convention as a weekly
// report draft.

/** upsertControllerTime(clientId, week, minutes, recordedBy, opts?) -> the stored document. */
async function upsertControllerTime(clientId, week, minutes, recordedBy, opts = {}) {
  const col = await controllerTimeCollection(opts.getDb);
  const _id = controllerTimeId(clientId, week);
  const doc = { _id, clientId, week, minutes, recordedBy, recordedAt: new Date().toISOString() };
  await col.updateOne({ _id }, { $set: doc }, { upsert: true });
  return doc;
}

async function listControllerTime(clientId, opts = {}) {
  const col = await controllerTimeCollection(opts.getDb);
  return col.find({ clientId }).sort({ week: 1 }).toArray();
}

module.exports = {
  REPORTS_COLLECTION, AUDIT_COLLECTION, ENGAGEMENTS_COLLECTION, CONTROLLER_TIME_COLLECTION, reportId,
  upsertDraftReport, getReport, getReportById, listReports, publishWeeklyReport, updateFlagStatus,
  recordAudit, listAudit,
  createEngagement, getEngagement, listEngagements, updateEngagement, deleteEngagement,
  upsertControllerTime, listControllerTime,
};
