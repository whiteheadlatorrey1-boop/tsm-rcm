// tsm-workflow-stage.js (BPO)
//
// Precise workflow-stage signal writer/reader for the BPO War Room ->
// Strategist -> Executive Portal chain. Same module as
// /html/healthcare/js/tsm-workflow-stage.js -- kept as a per-vertical copy
// (matching this repo's existing convention of per-vertical js/ folders)
// rather than a shared cross-vertical import, so each vertical's script
// includes stay self-contained and one vertical's page can't 404 because
// another vertical's folder moved.
//
// Every real transition point in the BPO chain calls
// TSMWorkflowStage.write(stageId, meta) the moment it actually happens
// (extraction engine completion, strategist hydration, escalation, export).
// tsm-bpo-workflow-guide.js reads TSMWorkflowStage.read() to show the EU
// exactly which of the six pipeline stages (intake, assess & score, process
// & act, QA, deliver, outcome & bill) they're actually in.
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
