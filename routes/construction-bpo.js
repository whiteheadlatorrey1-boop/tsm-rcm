'use strict';

/**
 * Construction BPO: weekly GC financial review service.
 *
 * Endpoints:
 *   POST /api/construction-bpo/import
 *     Staff-only. Multipart 'file' (CSV/XLSX), optional 'clientId' (looks
 *     up that client's saved engagement for default source/columnMap --
 *     see ENGAGEMENTS below), optional 'source'/'columnMap' fields that
 *     override the engagement's defaults for this one request (audited
 *     as IMPORT, only when clientId is given). Stateless otherwise:
 *     returns parsed jobs + a validation report, does not persist
 *     anything -- the analyst reviews/corrects in the workbench before a
 *     weekly report is generated from them.
 *   POST /api/construction-bpo/weekly-reports
 *     Staff-only. Builds a draft report (weekly-report.js) from the
 *     supplied jobs/changeOrders/retainage/lienWaivers, using the
 *     client's saved engagement thresholds/SLA hours unless the request
 *     body supplies its own `thresholds` (an override, audited in the
 *     WEEKLY_REPORT_DRAFTED entry's metadata). Refuses (409) to
 *     overwrite a report already published for that clientId+weekEnding.
 *   POST/GET/PATCH/DELETE /api/construction-bpo/engagements[/:clientId]
 *     Staff-only CRUD for a client's standing config: { clientId, name,
 *     thresholds, coSlaHours, columnMap, source }. One engagement per
 *     clientId.
 *   GET  /api/construction-bpo/engagements/:clientId/metrics
 *     Staff-only. Weeks delivered/on-time/late (on time = published by
 *     Wed 23:59 America/Phoenix of the week after weekEnding -- see
 *     server/construction-bpo/metrics.js), flag approve/dismiss/pending
 *     counts across every report on file for the client, and
 *     controller-time totals.
 *   POST /api/construction-bpo/engagements/:clientId/controller-time
 *     Staff-only, audited. { week, minutes } -- upserted per
 *     clientId+week (re-logging the same week corrects it).
 *   PATCH /api/construction-bpo/weekly-reports/:id/flags/:flagId
 *     Staff-only. Per-flag review gate: { status: 'approved'|'dismissed',
 *     note? }. Refused (409) once the report is published -- flags are
 *     frozen at that point, review happens before publish.
 *   GET  /api/construction-bpo/weekly-reports[?clientId=]
 *     Any signed-in session. Staff sees every report (optionally
 *     filtered by ?clientId); a client session is forced to its own
 *     clientId and to status=published only, and every flag array in the
 *     response is stripped to approved-only with notes removed (see
 *     SANITIZING below).
 *   GET  /api/construction-bpo/weekly-reports/:id
 *     Any signed-in session. A client requesting another client's
 *     report, or a draft (not yet published) report, gets 404 -- never
 *     403, so the response doesn't confirm a report with that id exists
 *     for someone else.
 *   POST /api/construction-bpo/weekly-reports/:id/publish
 *     Staff-only (analyst/manager/admin). One-way: publishing an
 *     already-published report is 409, not a silent no-op. Refused (409
 *     flags_pending) while any flag on the report is still 'pending'
 *     review -- a client must never see a report an analyst hasn't
 *     finished going through flag by flag.
 *   GET  /api/construction-bpo/audit
 *     Staff-only.
 *
 * SANITIZING: a client must never see a flag an analyst hasn't approved,
 * or any analyst note (approved or not) -- sanitizeReportForClient()
 * strips both, applied to every report a non-staff session can reach
 * (the list and get-by-id routes above).
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
const { buildPilotMetrics } = require('../server/construction-bpo/metrics');
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

function sanitizeFlagsForClient(flags) {
  return (flags || [])
    .filter((f) => f.status === 'approved')
    .map((f) => { const { note, ...rest } = f; return rest; });
}
/** Deep-clones a report and strips every flag array to approved-only, notes removed. */
function sanitizeReportForClient(report) {
  const clone = JSON.parse(JSON.stringify(report));
  clone.flags = sanitizeFlagsForClient(clone.flags);
  for (const j of clone.jobs || []) j.flags = sanitizeFlagsForClient(j.flags);
  for (const c of clone.changeOrders || []) c.flags = sanitizeFlagsForClient(c.flags);
  for (const r of clone.retainage || []) r.flags = sanitizeFlagsForClient(r.flags);
  for (const w of clone.lienWaivers || []) w.flags = sanitizeFlagsForClient(w.flags);
  return clone;
}

router.post('/api/construction-bpo/import', requireAnyAuth, upload.single('file'), async (req, res) => {
  if (staffOnly(req, res)) return;
  if (!req.file) return res.status(400).json({ ok: false, error: 'no file uploaded (expected multipart field "file")' });

  let columnMap;
  if (req.body.columnMap) {
    try { columnMap = JSON.parse(req.body.columnMap); }
    catch (e) { return res.status(400).json({ ok: false, error: 'columnMap must be valid JSON' }); }
  }
  let source = req.body.source;
  const sourceOverride = source !== undefined && source !== '';
  const columnMapOverride = columnMap !== undefined;
  const clientId = typeof req.body.clientId === 'string' && req.body.clientId.trim() ? req.body.clientId.trim() : null;

  let engagement = null;
  if (clientId) {
    try { engagement = await store.getEngagement(clientId); }
    catch (e) { /* store hiccup -- import still works from the request body alone */ }
  }
  if (engagement) {
    if (!sourceOverride && engagement.source) source = engagement.source;
    if (!columnMapOverride && engagement.columnMap) columnMap = engagement.columnMap;
  }

  let result;
  try { result = importer.parseWorkbookBuffer(req.file.buffer, { source, columnMap }); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }

  if (clientId) {
    try {
      await store.recordAudit({
        eventType: 'IMPORT', actor: actorOf(req), entityId: clientId,
        metadata: { source: source || null, sourceOverride, columnMapOverride, importedRows: result.report.importedRows },
      });
    } catch (e) { /* best-effort */ }
  }

  res.json({ ok: true, jobs: result.jobs, report: result.report });
});

router.post('/api/construction-bpo/weekly-reports', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const { clientId, weekEnding, jobs, changeOrders, retainage, lienWaivers, thresholds, asOf } = req.body || {};
  if (typeof clientId !== 'string' || !clientId.trim()) return res.status(400).json({ ok: false, error: 'clientId is required' });
  if (typeof weekEnding !== 'string' || !weekEnding.trim()) return res.status(400).json({ ok: false, error: 'weekEnding is required' });

  let engagement = null;
  try { engagement = await store.getEngagement(clientId); }
  catch (e) { /* no engagement on file / store hiccup -- fall through to request-body thresholds alone */ }

  const thresholdOverride = thresholds !== undefined && thresholds !== null;
  let effectiveThresholds = {};
  if (engagement) {
    effectiveThresholds = Object.assign({}, engagement.thresholds || {});
    if (engagement.coSlaHours !== undefined) effectiveThresholds.slaHours = engagement.coSlaHours;
  }
  if (thresholdOverride) effectiveThresholds = Object.assign({}, effectiveThresholds, thresholds);

  let draft;
  try { draft = buildWeeklyReportDraft({ clientId, weekEnding, asOf, jobs, changeOrders, retainage, lienWaivers }, effectiveThresholds); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }

  let stored;
  try { stored = await store.upsertDraftReport(draft); }
  catch (e) {
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try {
    await store.recordAudit({
      eventType: 'WEEKLY_REPORT_DRAFTED', actor: actorOf(req), entityId: stored._id,
      metadata: { clientId, weekEnding, flagCount: draft.flags.length, engagementApplied: !!engagement, thresholdOverride },
    });
  } catch (e) { /* best-effort */ }

  res.json({ ok: true, report: stored });
});

router.patch('/api/construction-bpo/weekly-reports/:id/flags/:flagId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const { status, note } = req.body || {};
  if (status !== 'approved' && status !== 'dismissed') {
    return res.status(400).json({ ok: false, error: 'status must be "approved" or "dismissed"' });
  }
  if (note !== undefined && note !== null && typeof note !== 'string') {
    return res.status(400).json({ ok: false, error: 'note must be a string' });
  }

  let updated;
  try { updated = await store.updateFlagStatus(req.params.id, req.params.flagId, { status, note: note ?? null, reviewedBy: actorOf(req) }); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    if (e.code === 'FLAG_NOT_FOUND') return res.status(404).json({ ok: false, error: 'flag_not_found' });
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try {
    await store.recordAudit({
      eventType: 'FLAG_REVIEWED', actor: actorOf(req), entityId: req.params.id,
      metadata: { flagId: req.params.flagId, status, hasNote: !!note },
    });
  } catch (e) { /* best-effort */ }

  res.json({ ok: true, report: updated });
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
  try {
    const reports = await store.listReports(filter);
    res.json({ ok: true, reports: isStaff ? reports : reports.map(sanitizeReportForClient) });
  } catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
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
  res.json({ ok: true, report: isStaff ? report : sanitizeReportForClient(report) });
});

router.post('/api/construction-bpo/weekly-reports/:id/publish', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  let published;
  try { published = await store.publishWeeklyReport(req.params.id, { publishedBy: actorOf(req) }); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    if (e.code === 'FLAGS_PENDING') return res.status(409).json({ ok: false, error: 'flags_pending', pendingCount: e.pendingCount });
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

// ────────────────────────────── engagements ───────────────────────────────

router.post('/api/construction-bpo/engagements', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const { clientId, name, thresholds, coSlaHours, columnMap, source } = req.body || {};
  if (typeof clientId !== 'string' || !clientId.trim()) return res.status(400).json({ ok: false, error: 'clientId is required' });

  let stored;
  try { stored = await store.createEngagement({ clientId, name, thresholds, coSlaHours, columnMap, source }); }
  catch (e) {
    if (e.code === 'ALREADY_EXISTS') return res.status(409).json({ ok: false, error: 'already_exists' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit({ eventType: 'ENGAGEMENT_CREATED', actor: actorOf(req), entityId: clientId, metadata: {} }); } catch (e) { /* best-effort */ }
  res.json({ ok: true, engagement: stored });
});

router.get('/api/construction-bpo/engagements', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  try { res.json({ ok: true, engagements: await store.listEngagements() }); }
  catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.get('/api/construction-bpo/engagements/:clientId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  try {
    const engagement = await store.getEngagement(req.params.clientId);
    if (!engagement) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, engagement });
  } catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.patch('/api/construction-bpo/engagements/:clientId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const patch = {};
  for (const field of ['name', 'thresholds', 'coSlaHours', 'columnMap', 'source']) {
    if (req.body && req.body[field] !== undefined) patch[field] = req.body[field];
  }
  let updated;
  try { updated = await store.updateEngagement(req.params.clientId, patch); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit({ eventType: 'ENGAGEMENT_UPDATED', actor: actorOf(req), entityId: req.params.clientId, metadata: { fields: Object.keys(patch) } }); } catch (e) { /* best-effort */ }
  res.json({ ok: true, engagement: updated });
});

router.delete('/api/construction-bpo/engagements/:clientId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  try { await store.deleteEngagement(req.params.clientId); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit({ eventType: 'ENGAGEMENT_DELETED', actor: actorOf(req), entityId: req.params.clientId, metadata: {} }); } catch (e) { /* best-effort */ }
  res.json({ ok: true });
});

// ──────────────────────── pilot metrics / controller time ─────────────────

router.get('/api/construction-bpo/engagements/:clientId/metrics', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  try {
    const clientId = req.params.clientId;
    const [reports, controllerTimeEntries] = await Promise.all([
      store.listReports({ clientId }),
      store.listControllerTime(clientId),
    ]);
    res.json({ ok: true, metrics: buildPilotMetrics({ clientId, reports, controllerTimeEntries }) });
  } catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.post('/api/construction-bpo/engagements/:clientId/controller-time', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const { week, minutes } = req.body || {};
  if (typeof week !== 'string' || !week.trim()) return res.status(400).json({ ok: false, error: 'week is required' });
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    return res.status(400).json({ ok: false, error: 'minutes must be a non-negative number' });
  }

  let stored;
  try { stored = await store.upsertControllerTime(req.params.clientId, week, minutes, actorOf(req)); }
  catch (e) { return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
  try { await store.recordAudit({ eventType: 'CONTROLLER_TIME_LOGGED', actor: actorOf(req), entityId: req.params.clientId, metadata: { week, minutes } }); } catch (e) { /* best-effort */ }
  res.json({ ok: true, entry: stored });
});

module.exports = router;
