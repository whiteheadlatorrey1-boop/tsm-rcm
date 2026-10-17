'use strict';

/**
 * Construction BPO: weekly GC financial review service.
 *
 * Endpoints:
 *   POST /api/construction-bpo/import
 *     Staff-only. Multipart 'file' (CSV/XLSX), optional 'source' field
 *     (sage|foundation|procore|quickbooks) and 'columnMap' field (JSON
 *     string, client-specific header overrides). Stateless: returns
 *     parsed jobs + a validation report, does not persist anything --
 *     the analyst reviews/corrects in the workbench before a weekly
 *     report is generated from them.
 *   POST /api/construction-bpo/weekly-reports
 *     Staff-only. Builds a draft report (weekly-report.js) from the
 *     supplied jobs/changeOrders/retainage/lienWaivers and stores it.
 *     Refuses (409) to overwrite a report already published for that
 *     clientId+weekEnding.
 *   GET  /api/construction-bpo/weekly-reports[?clientId=]
 *     Any signed-in session. Staff sees every report (optionally
 *     filtered by ?clientId); a client session is forced to its own
 *     clientId and to status=published only.
 *   GET  /api/construction-bpo/weekly-reports/:id
 *     Any signed-in session. A client requesting another client's
 *     report, or a draft (not yet published) report, gets 404 -- never
 *     403, so the response doesn't confirm a report with that id exists
 *     for someone else.
 *   POST /api/construction-bpo/weekly-reports/:id/publish
 *     Staff-only (analyst/manager/admin). One-way: publishing an
 *     already-published report is 409, not a silent no-op.
 *   GET  /api/construction-bpo/audit
 *     Staff-only.
 *
 * Audit is written after the state change succeeds (draft stored /
 * report published) and is best-effort -- see server/construction-bpo/
 * store.js header for why reports and audit share the same Mongo-backed
 * store rather than this being a file-based log like construction-recovery's.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAnyAuth } = require('../middleware/require-auth');
const importer = require('../server/construction-bpo/import');
const { buildWeeklyReportDraft } = require('../server/construction-bpo/weekly-report');
const store = require('../server/construction-bpo/store');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// requireAnyAuth puts the signed session on req.tsmSession (not req.session).
const sess = (req) => req.tsmSession || {};
const actorOf = (req) => sess(req).label || sess(req).staffId || sess(req).role || 'unknown';
// A BPO client access code is also a valid session and must never see
// another client's data or act as an analyst.
const STAFF_ROLES = ['admin', 'manager', 'analyst'];
const staffOnly = (req, res) => {
  if (STAFF_ROLES.includes(sess(req).role)) return false;
  res.status(403).json({ ok: false, error: 'staff_only' });
  return true;
};

router.post('/api/construction-bpo/import', requireAnyAuth, upload.single('file'), (req, res) => {
  if (staffOnly(req, res)) return;
  if (!req.file) return res.status(400).json({ ok: false, error: 'no file uploaded (expected multipart field "file")' });

  let columnMap;
  if (req.body.columnMap) {
    try { columnMap = JSON.parse(req.body.columnMap); }
    catch (e) { return res.status(400).json({ ok: false, error: 'columnMap must be valid JSON' }); }
  }

  let result;
  try { result = importer.parseWorkbookBuffer(req.file.buffer, { source: req.body.source, columnMap }); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }

  res.json({ ok: true, jobs: result.jobs, report: result.report });
});

router.post('/api/construction-bpo/weekly-reports', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const { clientId, weekEnding, jobs, changeOrders, retainage, lienWaivers, thresholds, asOf } = req.body || {};
  if (typeof clientId !== 'string' || !clientId.trim()) return res.status(400).json({ ok: false, error: 'clientId is required' });
  if (typeof weekEnding !== 'string' || !weekEnding.trim()) return res.status(400).json({ ok: false, error: 'weekEnding is required' });

  let draft;
  try { draft = buildWeeklyReportDraft({ clientId, weekEnding, asOf, jobs, changeOrders, retainage, lienWaivers }, thresholds || {}); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }

  let stored;
  try { stored = await store.upsertDraftReport(draft); }
  catch (e) {
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit({ eventType: 'WEEKLY_REPORT_DRAFTED', actor: actorOf(req), entityId: stored._id, metadata: { clientId, weekEnding, flagCount: draft.flags.length } }); }
  catch (e) { /* best-effort */ }

  res.json({ ok: true, report: stored });
});

router.get('/api/construction-bpo/weekly-reports', requireAnyAuth, async (req, res) => {
  const s = sess(req);
  const isStaff = STAFF_ROLES.includes(s.role);
  const filter = {};
  if (isStaff) {
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;
  } else {
    filter.clientId = s.clientId;
    filter.status = 'published';
  }
  try { res.json({ ok: true, reports: await store.listReports(filter) }); }
  catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.get('/api/construction-bpo/weekly-reports/:id', requireAnyAuth, async (req, res) => {
  const s = sess(req);
  let report;
  try { report = await store.getReportById(req.params.id); }
  catch (e) { return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
  if (!report) return res.status(404).json({ ok: false, error: 'not_found' });

  const isStaff = STAFF_ROLES.includes(s.role);
  if (!isStaff && (report.clientId !== s.clientId || report.status !== 'published')) {
    return res.status(404).json({ ok: false, error: 'not_found' });
  }
  res.json({ ok: true, report });
});

router.post('/api/construction-bpo/weekly-reports/:id/publish', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  let published;
  try { published = await store.publishWeeklyReport(req.params.id, { publishedBy: actorOf(req) }); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit({ eventType: 'WEEKLY_REPORT_PUBLISHED', actor: actorOf(req), entityId: req.params.id, metadata: { clientId: published.clientId, weekEnding: published.weekEnding } }); }
  catch (e) { /* best-effort */ }

  res.json({ ok: true, report: published });
});

router.get('/api/construction-bpo/audit', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  try { res.json({ ok: true, entries: await store.listAudit({ entityId: req.query.entityId, limit: req.query.limit ? Number(req.query.limit) : undefined }) }); }
  catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

module.exports = router;
