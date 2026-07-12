/**
 * TSM Exceptions Engine v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #3 — Autonomous Exception Management, prioritized
 * by impact rather than a flat list.
 *
 * This is the missing half of an already-built UI: html/js/widgets/
 * tsm-exception-widget.js (formerly duplicated under a malformed
 * "html/js/core/, html/js/widgets/" path — see cleanup note below) has
 * called global.TSMExceptions.getAll()/.resolve()/.subscribe() since it was
 * written, but nothing in the codebase ever defined TSMExceptions itself —
 * the widget has been rendering a "TSMExceptions not found" warning and a
 * static empty state the whole time. This file defines that engine.
 *
 * Priority model mirrors the one already proven in
 * html/mdm-suite/mdm-mission-queue.js (P1/P2/P3 from risk + confidence,
 * honest null exposure when no dollar figure is estimable) rather than
 * inventing a second scheme — same principle as tsm-quality-score-engine.js
 * generalizing MDM's scoring instead of reinventing it.
 *
 * Load order: this file, then tsm-agent-registry.js / tsm-quality-score-
 * engine.js if you want agent-tagged or scored input (optional — add()
 * accepts a plain exception object too), then the widget
 * (tsm-exception-widget.js) last.
 *
 * Exposes:
 *   TSMExceptions.add(exception) -> stored record
 *   TSMExceptions.fromExplainItems(items, opts) -> adds one exception per
 *     open finding, deriving priority the same way mission-queue does
 *   TSMExceptions.getAll(sector?) -> record[] (open + resolved), sorted P1..P3
 *   TSMExceptions.resolve(id) -> marks resolved, notifies subscribers
 *   TSMExceptions.subscribe(callback) -> unsubscribe fn; callback fires on
 *     every add()/resolve()
 *   TSMExceptions.clear() -> wipes storage (testing/reset only)
 * ========================================================================== */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'tsm_exceptions_v1';
  var RISK_WEIGHT = { high: 3, med: 2, low: 1 };
  var listeners = [];

  function loadAll() {
    try {
      if (typeof global.localStorage === 'undefined') return [];
      var raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function persist(records) {
    try {
      if (typeof global.localStorage === 'undefined') return;
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      // storage unavailable/full — stays in-memory for this session
    }
  }

  var _records = loadAll();

  function makeId() {
    return 'exc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function notify() {
    listeners.forEach(function (cb) {
      try { cb(); } catch (e) { /* a bad subscriber shouldn't break the others */ }
    });
  }

  /** Same P1/P2/P3 rule as mdm-mission-queue.js's computePriority, generalized to any severity+confidence pair. */
  function priorityFor(severity, confidence) {
    var conf = typeof confidence === 'number' ? confidence : 0;
    if (severity === 'high' && conf >= 90) return 'P1';
    if (severity === 'high' || (severity === 'med' && conf >= 85)) return 'P2';
    return 'P3';
  }

  function add(exception) {
    exception = exception || {};
    var priority = exception.priority || priorityFor(exception.severity, exception.confidence);
    var entry = Object.assign({
      exceptionId: makeId(),
      createdAt: new Date().toISOString(),
      status: 'open',
      exposure: null // honest null unless caller supplies a real dollar figure — never guessed
    }, exception, { priority: priority });

    _records.push(entry);
    persist(_records);
    notify();
    return entry;
  }

  /**
   * fromExplainItems(items, opts)
   * items: the shared getExplainItems() contract (same array Quality Score
   *   and Agent Registry consume) — one exception is added per item.
   * opts.sector: tag for getAll(sector) filtering.
   * opts.exposureFor(item): optional fn returning a dollar figure for an
   *   item; if omitted, exposure stays honestly null (no fabricated total).
   */
  function fromExplainItems(items, opts) {
    opts = opts || {};
    var list = Array.isArray(items) ? items : [];
    return list.filter(function (it) { return it && it.claim; }).map(function (it) {
      var exposure = typeof opts.exposureFor === 'function' ? opts.exposureFor(it) : null;
      return add({
        title: it.claim,
        detail: it.rationale || null,
        recommendedAction: it.recommendedAction || null,
        severity: it.severity || 'med',
        confidence: it.confidence != null ? it.confidence : null,
        sector: opts.sector || null,
        agentLabel: it.agentLabel || null, // flows through automatically if items came via TSMAgentRegistry.run()
        exposure: typeof exposure === 'number' ? exposure : null
      });
    });
  }

  function getAll(sector) {
    var tierRank = { P1: 0, P2: 1, P3: 2 };
    return _records
      .filter(function (r) { return !sector || r.sector === sector; })
      .slice()
      .sort(function (a, b) { return (tierRank[a.priority] || 2) - (tierRank[b.priority] || 2); });
  }

  function resolve(exceptionId) {
    var rec = _records.filter(function (r) { return r.exceptionId === exceptionId; })[0];
    if (!rec) return null;
    rec.status = 'resolved';
    rec.resolvedAt = new Date().toISOString();
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
    persist(_records);
    notify();
  }

  /** Rollup for an executive-outcome-style "why it matters" tile — total exposure, honestly partial if some items have no estimate. */
  function summarize(sector) {
    var open = getAll(sector).filter(function (r) { return r.status === 'open'; });
    var byPriority = { P1: 0, P2: 0, P3: 0 };
    var exposureTotal = 0, exposureCount = 0, unestimatedCount = 0;
    open.forEach(function (r) {
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
      if (typeof r.exposure === 'number') { exposureTotal += r.exposure; exposureCount++; }
      else unestimatedCount++;
    });
    return {
      total: open.length,
      byPriority: byPriority,
      exposureTotal: exposureTotal,
      exposureCount: exposureCount,
      unestimatedCount: unestimatedCount
    };
  }

  var TSMExceptions = {
    add: add,
    fromExplainItems: fromExplainItems,
    getAll: getAll,
    resolve: resolve,
    subscribe: subscribe,
    clear: clear,
    summarize: summarize,
    priorityFor: priorityFor
  };

  global.TSMExceptions = TSMExceptions;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMExceptions;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-exceptions.js`) ────────────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Exceptions = module.exports;

  var sampleItems = [
    { id: 'f1', claim: 'CLM-1001 denied for medical necessity', severity: 'high', confidence: 94, rationale: 'Missing physician documentation.' },
    { id: 'f2', claim: 'CPT 99215 coding mismatch on CLM-1002', severity: 'med', confidence: 80 },
    { id: 'f3', claim: 'HIPAA audit flag on record access log', severity: 'high', confidence: 88 }
  ];

  var added = Exceptions.fromExplainItems(sampleItems, {
    sector: 'healthcare',
    exposureFor: function (it) { return it.claim.indexOf('CLM-1001') !== -1 ? 1250 : null; }
  });
  console.log('[fromExplainItems]', JSON.stringify(added, null, 2));

  console.log('[getAll]', JSON.stringify(Exceptions.getAll('healthcare').map(function (r) { return { title: r.title, priority: r.priority, status: r.status }; }), null, 2));

  var unsub = Exceptions.subscribe(function () { console.log('[subscribe] change notified'); });
  Exceptions.resolve(added[0].exceptionId);
  unsub();

  console.log('[summarize]', JSON.stringify(Exceptions.summarize('healthcare'), null, 2));
}