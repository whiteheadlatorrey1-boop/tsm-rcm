/**
 * TSM Case Engine v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #10 — Universal Case Object. The "Case →
 * Exception → Action → Approval → Audit" framework: one normalized case
 * shape that every vertical can produce and consume, instead of each
 * vertical inventing its own work-item/ticket/queue-entry shape.
 *
 * TSMCase (the class below) already existed in this file as a plain data
 * shape with no factory, no persistence, and nothing in the codebase ever
 * instantiated it — dead code. This file keeps that same field set
 * (nothing removed, so anything that assumed the old shape still works)
 * and adds the missing lifecycle: persistence, transitions, and a real
 * manager API, following the exact same conventions already proven in
 * tsm-exceptions.js (Roadmap #3) — localStorage persistence with an
 * in-memory fallback, subscribe()/notify(), P1/P2/P3 priority, and
 * best-effort bridges to sibling engines that are silent no-ops if those
 * engines aren't loaded on the page.
 *
 * Relationship to TSMExceptions: a Case does not duplicate exception
 * storage. createFromException() reads one TSMExceptions record and wraps
 * it in a Case (adding the work-queue/approval/execution/audit lifecycle
 * TSMExceptions itself doesn't have); the case keeps only a reference
 * (exceptionId) plus a denormalized snapshot for display, and closing a
 * case best-effort calls TSMExceptions.resolve() on that same id so the
 * two stay in sync without a second source of truth.
 *
 * Relationship to TSMHitlGate (Roadmap #4): recordApproval() uses a
 * shared 'CASE' gate (created once, lazily) if tsm-hitl-gate.js is loaded,
 * so every vertical's case approvals land in the same standardized
 * decision log described in that file's header — same additive,
 * best-effort-if-loaded pattern as the TSMExceptions/TSMMemory bridge.
 *
 * Exposes:
 *   TSMCaseManager.create(data) -> TSMCase, stored
 *   TSMCaseManager.createFromException(exceptionRecord, extra?) -> TSMCase
 *     built from a real TSMExceptions record (see field mapping below)
 *   TSMCaseManager.getAll(vertical?) -> TSMCase[] sorted P1..P3
 *   TSMCaseManager.getById(caseId) -> TSMCase | null
 *   TSMCaseManager.update(caseId, patch) -> TSMCase | null, logs an audit entry
 *   TSMCaseManager.addArtifact(caseId, artifact) -> TSMCase | null
 *   TSMCaseManager.requestApproval(caseId, opts?) -> TSMCase | null
 *   TSMCaseManager.recordApproval(caseId, decision, actor, meta?) -> TSMCase | null
 *     decision: 'APPROVED' | 'REJECTED'
 *   TSMCaseManager.markExecuted(caseId, outcome?) -> TSMCase | null,
 *     closes the case and best-effort resolves the linked exception
 *   TSMCaseManager.subscribe(callback) -> unsubscribe fn
 *   TSMCaseManager.clear() -> wipes storage (testing/reset only)
 *   TSMCaseManager.summarize(vertical?) -> rollup, same shape family as
 *     TSMExceptions.summarize() (byStatus instead of byPriority, since a
 *     case's lifecycle status is usually what a manager view wants first)
 * ========================================================================== */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'tsm_cases_v1';
  var listeners = [];

  /**
   * TSMCase — same field set as the original stub, extended (additively,
   * nothing renamed/removed) with the fields the Case->Exception->Action->
   * Approval->Audit framework needs: client, process, source, documentSet,
   * detectedExceptions, priority, deadline, requiredEvidence, assignedQueue,
   * generatedArtifacts, approvalStatus, executionStatus, outcome.
   * `timeline` doubles as the audit history the framework calls for — every
   * lifecycle transition below pushes one entry to it.
   */
  function TSMCase(data) {
    data = data || {};
    this.caseId = data.caseId || makeId();
    this.sector = data.sector || 'general';
    this.vertical = data.vertical || data.sector || '';
    this.client = data.client || '';
    this.process = data.process || '';
    this.source = data.source || '';
    this.documentId = data.documentId || '';
    this.documentType = data.documentType || '';
    this.documentSet = data.documentSet || [];

    this.title = data.title || '';
    this.anomalyType = data.anomalyType || '';
    this.description = data.description || '';
    this.detectedExceptions = data.detectedExceptions || [];

    this.owner = data.owner || '';
    this.assignedQueue = data.assignedQueue || '';
    this.pressure = data.pressure || 'MEDIUM';
    this.priority = data.priority || null;
    this.exposure = typeof data.exposure === 'number' ? data.exposure : null;
    this.deadline = data.deadline || null;
    this.requiredEvidence = data.requiredEvidence || [];

    this.status = data.status || 'OPEN';
    this.approvalStatus = data.approvalStatus || 'NOT_REQUESTED';
    this.executionStatus = data.executionStatus || 'NOT_STARTED';
    this.outcome = data.outcome || null;

    this.detectedAt = data.detectedAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    this.fields = data.fields || {};
    this.missingFields = data.missingFields || [];
    this.recommendedApps = data.recommendedApps || [];
    this.recommendedActions = data.recommendedActions || [];
    this.generatedArtifacts = data.generatedArtifacts || [];
    this.memoryMatches = data.memoryMatches || [];
    this.relayTargets = data.relayTargets || [];
    this.autonomousActions = data.autonomousActions || [];
    this.executiveSummary = data.executiveSummary || {};
    this.timeline = data.timeline || [];
    this.relays = data.relays || [];
  }

  function makeId() {
    return 'CASE-' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function loadAll() {
    try {
      if (typeof global.localStorage === 'undefined') return [];
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw).map(function (d) { return new TSMCase(d); });
    } catch (e) {
      return [];
    }
  }

  function persist(records) {
    try {
      if (typeof global.localStorage === 'undefined') return;
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {}
  }

  var _records = loadAll();

  function notify() {
    listeners.forEach(function (cb) {
      try { cb(); } catch (e) {}
    });
  }

  function logAudit(rec, action, detail) {
    rec.timeline.push({ at: new Date().toISOString(), action: action, detail: detail || null });
  }

  function priorityFor(severity, confidence) {
    if (global.TSMExceptions && typeof global.TSMExceptions.priorityFor === 'function') {
      return global.TSMExceptions.priorityFor(severity, confidence);
    }
    var conf = typeof confidence === 'number' ? confidence : 0;
    if (severity === 'high' && conf >= 90) return 'P1';
    if (severity === 'high' || (severity === 'med' && conf >= 85)) return 'P2';
    return 'P3';
  }

  function create(data) {
    var rec = new TSMCase(data);
    if (!rec.priority) rec.priority = priorityFor((data && data.severity) || null, (data && data.confidence) || null);
    logAudit(rec, 'CREATED', rec.title || rec.caseId);
    _records.push(rec);
    persist(_records);
    notify();
    return rec;
  }

  function createFromException(exceptionRecord, extra) {
    if (!exceptionRecord) return null;
    extra = extra || {};
    var data = Object.assign({
      sector: exceptionRecord.sector || 'general',
      vertical: exceptionRecord.sector || 'general',
      title: exceptionRecord.title || 'Untitled case',
      description: exceptionRecord.detail || '',
      priority: exceptionRecord.priority || null,
      exposure: typeof exceptionRecord.exposure === 'number' ? exceptionRecord.exposure : null,
      recommendedActions: exceptionRecord.recommendedAction ? [exceptionRecord.recommendedAction] : [],
      detectedExceptions: [{
        exceptionId: exceptionRecord.exceptionId,
        title: exceptionRecord.title,
        severity: exceptionRecord.severity || null,
        confidence: typeof exceptionRecord.confidence === 'number' ? exceptionRecord.confidence : null
      }]
    }, extra);
    var rec = create(data);
    logAudit(rec, 'LINKED_EXCEPTION', exceptionRecord.exceptionId);
    persist(_records);
    return rec;
  }

  function getAll(vertical) {
    var tierRank = { P1: 1, P2: 2, P3: 3 };
    return _records
      .filter(function (r) { return !vertical || r.sector === vertical || r.vertical === vertical; })
      .slice()
      .sort(function (a, b) { return (tierRank[a.priority] || 4) - (tierRank[b.priority] || 4); });
  }

  function getById(caseId) {
    return _records.filter(function (r) { return r.caseId === caseId; })[0] || null;
  }

  function touch(rec) {
    rec.updatedAt = new Date().toISOString();
  }

  function update(caseId, patch) {
    var rec = getById(caseId);
    if (!rec) return null;
    patch = patch || {};
    var changedKeys = Object.keys(patch);
    Object.assign(rec, patch);
    touch(rec);
    logAudit(rec, 'UPDATED', changedKeys.join(', '));
    persist(_records);
    notify();
    return rec;
  }

  function addArtifact(caseId, artifact) {
    var rec = getById(caseId);
    if (!rec) return null;
    var entry = Object.assign({ generatedAt: new Date().toISOString() }, artifact || {});
    rec.generatedArtifacts.push(entry);
    touch(rec);
    logAudit(rec, 'ARTIFACT_GENERATED', entry.title || entry.type || 'artifact');
    persist(_records);
    notify();
    return rec;
  }

  function requestApproval(caseId, opts) {
    var rec = getById(caseId);
    if (!rec) return null;
    opts = opts || {};
    rec.approvalStatus = 'PENDING';
    rec.status = 'AWAITING_APPROVAL';
    touch(rec);
    logAudit(rec, 'APPROVAL_REQUESTED', opts.note || null);
    persist(_records);
    notify();
    return rec;
  }

  var _hitlGate = null;
  function getHitlGate() {
    if (_hitlGate) return _hitlGate;
    var Hitl = global.TSMHitlGate || (typeof require !== 'undefined' ? tryRequireHitlGate() : null);
    if (!Hitl || typeof Hitl.createGate !== 'function') return null;
    _hitlGate = Hitl.createGate('CASE');
    return _hitlGate;
  }
  function tryRequireHitlGate() {
    try { return require('./tsm-hitl-gate.js'); } catch (e) { return null; }
  }

  function recordApproval(caseId, decision, actor, meta) {
    var rec = getById(caseId);
    if (!rec) return null;
    rec.approvalStatus = decision;
    rec.status = decision === 'APPROVED' ? 'APPROVED' : 'OPEN';
    touch(rec);
    logAudit(rec, 'APPROVAL_' + decision, (actor || 'unknown actor') + (meta && meta.reason ? ' — ' + meta.reason : ''));

    var gate = getHitlGate();
    if (gate) {
      try {
        gate.recordDecision({ entityId: caseId, entityType: 'case', decision: decision, actor: actor || 'unknown', meta: meta || {} });
      } catch (e) {}
    }

    persist(_records);
    notify();
    return rec;
  }

  function markExecuted(caseId, outcome) {
    var rec = getById(caseId);
    if (!rec) return null;
    rec.executionStatus = 'EXECUTED';
    rec.status = 'CLOSED';
    rec.outcome = outcome || rec.outcome;
    touch(rec);
    logAudit(rec, 'EXECUTED', typeof outcome === 'string' ? outcome : (outcome ? JSON.stringify(outcome) : null));

    if (global.TSMExceptions && typeof global.TSMExceptions.resolve === 'function') {
      rec.detectedExceptions.forEach(function (ex) {
        try { global.TSMExceptions.resolve(ex.exceptionId); } catch (e) {}
      });
    }

    persist(_records);
    notify();
    return rec;
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return function () {};
    listeners.push(callback);
    return function unsubscribe() {
      var idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function clear() {
    _records = [];
    _hitlGate = null;
    persist(_records);
    notify();
  }

  function summarize(vertical) {
    var all = getAll(vertical);
    var byStatus = {};
    var exposureTotal = 0, exposureCount = 0, unestimatedCount = 0;
    all.forEach(function (r) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (typeof r.exposure === 'number') { exposureTotal += r.exposure; exposureCount++; }
      else unestimatedCount++;
    });
    return {
      total: all.length,
      byStatus: byStatus,
      exposureTotal: exposureTotal,
      exposureCount: exposureCount,
      unestimatedCount: unestimatedCount
    };
  }

  var TSMCaseManager = {
    create: create,
    createFromException: createFromException,
    getAll: getAll,
    getById: getById,
    update: update,
    addArtifact: addArtifact,
    requestApproval: requestApproval,
    recordApproval: recordApproval,
    markExecuted: markExecuted,
    subscribe: subscribe,
    clear: clear,
    summarize: summarize
  };

  global.TSMCase = TSMCase;
  global.TSMCaseManager = TSMCaseManager;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMCaseManager;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-case-manager.js`) ──────────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Cases = module.exports;

  var exceptionRecord = {
    exceptionId: 'exc_test_1',
    title: 'CLM-1001 denied for medical necessity',
    detail: 'Missing physician documentation.',
    recommendedAction: 'Retrieve authorization and resubmit.',
    severity: 'high',
    confidence: 94,
    priority: 'P1',
    sector: 'healthcare',
    exposure: 1250
  };

  var c = Cases.createFromException(exceptionRecord, { client: 'Acme Health System', process: 'denial_recovery', deadline: '2026-08-20' });
  console.log('[createFromException]', JSON.stringify(c, null, 2));

  Cases.addArtifact(c.caseId, { type: 'appeal_letter', title: 'Payer Appeal — CLM-1001' });
  Cases.requestApproval(c.caseId, { note: 'Ready for supervisor sign-off' });
  Cases.recordApproval(c.caseId, 'APPROVED', 'Jane Analyst', { reason: 'Evidence checklist complete' });
  Cases.markExecuted(c.caseId, 'Appeal submitted to payer, $1,250 recovered pending response.');

  console.log('[final]', JSON.stringify(Cases.getById(c.caseId), null, 2));
  console.log('[summarize]', JSON.stringify(Cases.summarize('healthcare'), null, 2));
}
