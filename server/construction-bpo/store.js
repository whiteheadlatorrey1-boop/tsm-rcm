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

function reportId(clientId, weekEnding) {
  return clientId + '__' + weekEnding;
}

async function reportsCollection(getDb) {
  const db = await (getDb ? getDb() : tsmLedger.getDb());
  return db.collection(REPORTS_COLLECTION);
}

async function auditCollection(getDb) {
  const db = await (getDb ? getDb() : tsmLedger.getDb());
  return db.collection(AUDIT_COLLECTION);
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
 * if it's already published (publishing is a one-way, one-time transition).
 */
async function publishWeeklyReport(id, { publishedBy }, opts = {}) {
  const col = await reportsCollection(opts.getDb);
  const existing = await col.findOne({ _id: id });
  if (!existing) { const err = new Error('no report ' + id); err.code = 'NOT_FOUND'; throw err; }
  if (existing.status === 'published') { const err = new Error('report ' + id + ' is already published'); err.code = 'ALREADY_PUBLISHED'; throw err; }
  const publishedAt = new Date().toISOString();
  await col.updateOne({ _id: id }, { $set: { status: 'published', publishedBy, publishedAt } });
  return Object.assign({}, existing, { status: 'published', publishedBy, publishedAt });
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

module.exports = {
  REPORTS_COLLECTION, AUDIT_COLLECTION, reportId,
  upsertDraftReport, getReport, getReportById, listReports, publishWeeklyReport,
  recordAudit, listAudit,
};
