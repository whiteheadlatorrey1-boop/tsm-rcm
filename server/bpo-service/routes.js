'use strict';

/**
 * Generic BPO-service routes, mounted at /api/bpo-service/:vertical/...
 * for every registered plug-in (server/bpo-service/plugins/index.js) --
 * runs ALONGSIDE the existing /api/construction-bpo/* routes
 * (routes/construction-bpo.js), which are untouched and keep working
 * exactly as before. This file is the generalized version of that one;
 * see its header for the endpoint-by-endpoint behavior this mirrors
 * (per-flag review gate, publish fail-closed on its own audit write,
 * client sanitizing, scope guards, engagements, pilot metrics, PDF
 * export) -- the only new concept here is `:vertical`, resolved to a
 * plug-in via plugin-registry.js; an unknown vertical is 404
 * unknown_vertical before anything else runs.
 */

require('./plugins'); // side-effect: registers every built-in plug-in

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAnyAuth } = require('../../middleware/require-auth');
const store = require('./store');
const importEngine = require('./import-engine');
const { buildReportDraft } = require('./report-builder');
const { sanitizeReportForClient } = require('./sanitize');
const { renderReportPdf } = require('./pdf');
const { buildPilotMetrics } = require('./metrics');
const { getPlugin } = require('./plugin-registry');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const sess = (req) => req.tsmSession || {};
const actorOf = (req) => sess(req).label || sess(req).staffId || sess(req).role || 'unknown';
const STAFF_ROLES = ['admin', 'manager', 'analyst'];
const staffOnly = (req, res) => {
  if (STAFF_ROLES.includes(sess(req).role)) return false;
  res.status(403).json({ ok: false, error: 'staff_only' });
  return true;
};
const clientScopeOrForbidden = (req, res) => {
  const s = sess(req);
  if (STAFF_ROLES.includes(s.role)) return false;
  if (typeof s.clientId === 'string' && s.clientId.trim()) return false;
  res.status(403).json({ ok: false, error: 'forbidden' });
  return true;
};

/** Resolves :vertical to a registered plug-in, or responds 404 unknown_vertical and returns null. */
function resolvePlugin(req, res) {
  const plugin = getPlugin(req.params.vertical);
  if (!plugin) { res.status(404).json({ ok: false, error: 'unknown_vertical' }); return null; }
  return plugin;
}

/** A report fetched by id might (in principle) belong to a different vertical than the URL names -- defense in depth on top of the id already being vertical-scoped. */
function belongsToVertical(report, plugin) {
  return !!report && report.vertical === plugin.id;
}

// ──────────────────────────────── import ──────────────────────────────────

router.post('/api/bpo-service/:vertical/import', requireAnyAuth, upload.single('file'), async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;
  if (!req.file) return res.status(400).json({ ok: false, error: 'no file uploaded (expected multipart field "file")' });

  const fileTypeKey = req.body.fileType || (plugin.fileTypes[0] && plugin.fileTypes[0].key);
  const spec = plugin.fileTypes.find((ft) => ft.key === fileTypeKey);
  if (!spec) return res.status(400).json({ ok: false, error: 'unknown or unsupported fileType "' + fileTypeKey + '" for ' + plugin.id });

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
    try { engagement = await store.getEngagement(plugin.id, clientId); }
    catch (e) { /* store hiccup -- import still works from the request body alone */ }
  }
  if (engagement) {
    if (!sourceOverride && engagement.source) source = engagement.source;
    if (!columnMapOverride && engagement.columnMap) columnMap = engagement.columnMap;
  }

  let result;
  try { result = importEngine.parseWorkbookBuffer(req.file.buffer, { source, columnMap }, spec); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }

  if (clientId) {
    try {
      await store.recordAudit(plugin.id, {
        eventType: 'IMPORT', actor: actorOf(req), entityId: clientId,
        metadata: { fileType: fileTypeKey, source: source || null, sourceOverride, columnMapOverride, importedRows: result.report.importedRows },
      });
    } catch (e) { /* best-effort */ }
  }

  res.json({ ok: true, items: result.items, report: result.report });
});

// ───────────────────────────── weekly reports ─────────────────────────────

router.post('/api/bpo-service/:vertical/weekly-reports', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  const { clientId, weekEnding, thresholds, asOf, ...sectionInputs } = req.body || {};
  if (typeof clientId !== 'string' || !clientId.trim()) return res.status(400).json({ ok: false, error: 'clientId is required' });
  if (typeof weekEnding !== 'string' || !weekEnding.trim()) return res.status(400).json({ ok: false, error: 'weekEnding is required' });

  let engagement = null;
  try { engagement = await store.getEngagement(plugin.id, clientId); }
  catch (e) { /* no engagement on file / store hiccup -- fall through to request-body thresholds alone */ }

  const thresholdOverride = thresholds !== undefined && thresholds !== null;
  let effectiveThresholds = engagement && engagement.thresholds ? Object.assign({}, engagement.thresholds) : {};
  if (thresholdOverride) effectiveThresholds = Object.assign({}, effectiveThresholds, thresholds);

  let draft;
  try { draft = buildReportDraft(plugin, { clientId, weekEnding, asOf, ...sectionInputs }, effectiveThresholds); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }

  let stored;
  try { stored = await store.upsertDraftReport(plugin.id, draft); }
  catch (e) {
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try {
    await store.recordAudit(plugin.id, {
      eventType: 'WEEKLY_REPORT_DRAFTED', actor: actorOf(req), entityId: stored._id,
      metadata: { clientId, weekEnding, flagCount: draft.flags.length, engagementApplied: !!engagement, thresholdOverride },
    });
  } catch (e) { /* best-effort */ }

  res.json({ ok: true, report: stored });
});

router.patch('/api/bpo-service/:vertical/weekly-reports/:id/flags/:flagId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  const { status, note } = req.body || {};
  if (status !== 'approved' && status !== 'dismissed') {
    return res.status(400).json({ ok: false, error: 'status must be "approved" or "dismissed"' });
  }
  if (note !== undefined && note !== null && typeof note !== 'string') {
    return res.status(400).json({ ok: false, error: 'note must be a string' });
  }

  let existing;
  try { existing = await store.getReportById(req.params.id); }
  catch (e) { return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
  if (!belongsToVertical(existing, plugin)) return res.status(404).json({ ok: false, error: 'not_found' });

  let updated;
  try { updated = await store.updateFlagStatus(req.params.id, req.params.flagId, { status, note: note ?? null, reviewedBy: actorOf(req) }); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    if (e.code === 'FLAG_NOT_FOUND') return res.status(404).json({ ok: false, error: 'flag_not_found' });
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try {
    await store.recordAudit(plugin.id, {
      eventType: 'FLAG_REVIEWED', actor: actorOf(req), entityId: req.params.id,
      metadata: { flagId: req.params.flagId, status, hasNote: !!note },
    });
  } catch (e) { /* best-effort */ }

  res.json({ ok: true, report: updated });
});

router.get('/api/bpo-service/:vertical/weekly-reports', requireAnyAuth, async (req, res) => {
  if (clientScopeOrForbidden(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

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
    const reports = await store.listReports(plugin.id, filter);
    res.json({ ok: true, reports: isStaff ? reports : reports.map((r) => sanitizeReportForClient(r, plugin.reportSections)) });
  } catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.get('/api/bpo-service/:vertical/weekly-reports/:id', requireAnyAuth, async (req, res) => {
  if (clientScopeOrForbidden(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  const s = sess(req);
  let report;
  try { report = await store.getReportById(req.params.id); }
  catch (e) { return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
  if (!belongsToVertical(report, plugin)) return res.status(404).json({ ok: false, error: 'not_found' });

  const isStaff = STAFF_ROLES.includes(s.role);
  if (!isStaff && (report.clientId !== s.clientId || report.status !== 'published')) {
    return res.status(404).json({ ok: false, error: 'not_found' });
  }
  res.json({ ok: true, report: isStaff ? report : sanitizeReportForClient(report, plugin.reportSections) });
});

router.get('/api/bpo-service/:vertical/weekly-reports/:id/export.pdf', requireAnyAuth, async (req, res) => {
  if (clientScopeOrForbidden(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  const s = sess(req);
  const isStaff = STAFF_ROLES.includes(s.role);
  let report;
  try { report = await store.getReportById(req.params.id); }
  catch (e) { return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
  if (!belongsToVertical(report, plugin)) return res.status(404).json({ ok: false, error: 'not_found' });
  if (!isStaff && (report.clientId !== s.clientId || report.status !== 'published')) {
    return res.status(404).json({ ok: false, error: 'not_found' });
  }
  if (report.status !== 'published') return res.status(409).json({ ok: false, error: 'not_published' });

  renderReportPdf(res, isStaff ? report : sanitizeReportForClient(report, plugin.reportSections));
});

router.post('/api/bpo-service/:vertical/weekly-reports/:id/publish', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  let existing;
  try { existing = await store.getReportById(req.params.id); }
  catch (e) { return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
  if (!belongsToVertical(existing, plugin)) return res.status(404).json({ ok: false, error: 'not_found' });

  let published;
  try { published = await store.publishWeeklyReport(req.params.id, { publishedBy: actorOf(req) }); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    if (e.code === 'ALREADY_PUBLISHED') return res.status(409).json({ ok: false, error: 'already_published' });
    if (e.code === 'FLAGS_PENDING') return res.status(409).json({ ok: false, error: 'flags_pending', pendingCount: e.pendingCount });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }

  // PUBLISH FAIL-CLOSED: a published report with no audit record proving
  // it happened must never exist -- same rule as routes/construction-
  // bpo.js. If the audit write fails, roll the report back to 'draft'
  // and return 503, never 200 either way.
  try {
    await store.recordAudit(plugin.id, {
      eventType: 'WEEKLY_REPORT_PUBLISHED', actor: actorOf(req), entityId: req.params.id,
      metadata: { clientId: published.clientId, weekEnding: published.weekEnding },
    });
  } catch (auditErr) {
    try { await store.revertToDraft(req.params.id); }
    catch (rollbackErr) { /* best-effort cleanup -- either way, this request must still fail below */ }
    return res.status(503).json({ ok: false, error: 'audit_write_failed', detail: auditErr.message });
  }

  res.json({ ok: true, report: published });
});

router.get('/api/bpo-service/:vertical/audit', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;
  try {
    res.json({ ok: true, entries: await store.listAudit(plugin.id, { entityId: req.query.entityId, limit: req.query.limit ? Number(req.query.limit) : undefined }) });
  } catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

// ────────────────────────────── engagements ───────────────────────────────

router.post('/api/bpo-service/:vertical/engagements', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  const { clientId, name, thresholds, columnMap, source } = req.body || {};
  if (typeof clientId !== 'string' || !clientId.trim()) return res.status(400).json({ ok: false, error: 'clientId is required' });

  let stored;
  try { stored = await store.createEngagement(plugin.id, { clientId, name, thresholds, columnMap, source }); }
  catch (e) {
    if (e.code === 'ALREADY_EXISTS') return res.status(409).json({ ok: false, error: 'already_exists' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit(plugin.id, { eventType: 'ENGAGEMENT_CREATED', actor: actorOf(req), entityId: clientId, metadata: {} }); } catch (e) { /* best-effort */ }
  res.json({ ok: true, engagement: stored });
});

router.get('/api/bpo-service/:vertical/engagements', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;
  try { res.json({ ok: true, engagements: await store.listEngagements(plugin.id) }); }
  catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.get('/api/bpo-service/:vertical/engagements/:clientId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;
  try {
    const engagement = await store.getEngagement(plugin.id, req.params.clientId);
    if (!engagement) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, engagement });
  } catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.patch('/api/bpo-service/:vertical/engagements/:clientId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  const patch = {};
  for (const field of ['name', 'thresholds', 'columnMap', 'source']) {
    if (req.body && req.body[field] !== undefined) patch[field] = req.body[field];
  }
  let updated;
  try { updated = await store.updateEngagement(plugin.id, req.params.clientId, patch); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit(plugin.id, { eventType: 'ENGAGEMENT_UPDATED', actor: actorOf(req), entityId: req.params.clientId, metadata: { fields: Object.keys(patch) } }); } catch (e) { /* best-effort */ }
  res.json({ ok: true, engagement: updated });
});

router.delete('/api/bpo-service/:vertical/engagements/:clientId', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;
  try { await store.deleteEngagement(plugin.id, req.params.clientId); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ ok: false, error: 'not_found' });
    return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message });
  }
  try { await store.recordAudit(plugin.id, { eventType: 'ENGAGEMENT_DELETED', actor: actorOf(req), entityId: req.params.clientId, metadata: {} }); } catch (e) { /* best-effort */ }
  res.json({ ok: true });
});

// ──────────────────────── pilot metrics / controller time ─────────────────

router.get('/api/bpo-service/:vertical/engagements/:clientId/metrics', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;
  try {
    const clientId = req.params.clientId;
    const [reports, controllerTimeEntries] = await Promise.all([
      store.listReports(plugin.id, { clientId }),
      store.listControllerTime(plugin.id, clientId),
    ]);
    res.json({ ok: true, metrics: buildPilotMetrics({ clientId, reports, controllerTimeEntries }) });
  } catch (e) { res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
});

router.post('/api/bpo-service/:vertical/engagements/:clientId/controller-time', requireAnyAuth, async (req, res) => {
  if (staffOnly(req, res)) return;
  const plugin = resolvePlugin(req, res);
  if (!plugin) return;

  const { week, minutes } = req.body || {};
  if (typeof week !== 'string' || !week.trim()) return res.status(400).json({ ok: false, error: 'week is required' });
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    return res.status(400).json({ ok: false, error: 'minutes must be a non-negative number' });
  }

  let stored;
  try { stored = await store.upsertControllerTime(plugin.id, req.params.clientId, week, minutes, actorOf(req)); }
  catch (e) { return res.status(503).json({ ok: false, error: 'store_unavailable', detail: e.message }); }
  try { await store.recordAudit(plugin.id, { eventType: 'CONTROLLER_TIME_LOGGED', actor: actorOf(req), entityId: req.params.clientId, metadata: { week, minutes } }); } catch (e) { /* best-effort */ }
  res.json({ ok: true, entry: stored });
});

module.exports = router;
