// tsm-workflow-stage.js
//
// Precise workflow-stage signal writer/reader for the HC War Room ->
// Anomaly Advisor / BNCA -> HC Node -> Strategist -> Exec Portal chain.
//
// Every real transition point in that chain calls
// TSMWorkflowStage.write(stageId, meta) the moment it actually happens
// (engine completion, checklist completion, context injection, escalation,
// export). tsm-hc-workflow-guide.js reads TSMWorkflowStage.read() first and
// only falls back to its old "guess from which relay keys exist" heuristic
// when no precise signal has been written yet (e.g. a page not wired in).
//
// This module never blocks a caller: every write/read is wrapped so a
// storage failure (private browsing, quota) degrades to a no-op rather than
// breaking the page that called it.
(function (global) {
  'use strict';

  var KEY = 'tsm-workflow-stage';
  var HISTORY_KEY = KEY + '-history';
  var HISTORY_LIMIT = 25;

  function safeGet(store, k) {
    try { return store.getItem(k); } catch (e) { return null; }
  }
  function safeSet(store, k, v) {
    try { store.setItem(k, v); return true; } catch (e) { return false; }
  }
  function safeRemove(store, k) {
    try { store.removeItem(k); } catch (e) {}
  }

  function write(stage, meta) {
    if (!stage) return null;
    var record = {
      stage: stage,
      meta: meta || {},
      page: (global.location && global.location.pathname) || '',
      ts: Date.now()
    };
    var json = JSON.stringify(record);
    // Both stores: sessionStorage so a fresh tab doesn't inherit a stale
    // stage from a previous session, localStorage as a fallback for pages
    // that read across a fresh navigation before sessionStorage carries over.
    safeSet(sessionStorage, KEY, json);
    safeSet(localStorage, KEY, json);

    try {
      var hist = [];
      var raw = safeGet(localStorage, HISTORY_KEY);
      if (raw) hist = JSON.parse(raw);
      hist.push(record);
      if (hist.length > HISTORY_LIMIT) hist = hist.slice(-HISTORY_LIMIT);
      safeSet(localStorage, HISTORY_KEY, JSON.stringify(hist));
    } catch (e) { /* history is best-effort, never blocks a write */ }

    return record;
  }

  function read() {
    var raw = safeGet(sessionStorage, KEY) || safeGet(localStorage, KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function history() {
    var raw = safeGet(localStorage, HISTORY_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function clear() {
    safeRemove(sessionStorage, KEY);
    safeRemove(localStorage, KEY);
  }

  global.TSMWorkflowStage = {
    write: write,
    read: read,
    history: history,
    clear: clear
  };
})(window);
