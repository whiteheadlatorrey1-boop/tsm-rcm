/**
 * TSM EVIDENCE LEDGER
 * ------------------------------------------------------------
 * Append-only in-memory (localStorage-backed) log of decision
 * evidence records. Additive, no-op if window/localStorage absent.
 * Exposes: window.TSM.evidenceLedger.add(record) -> record
 *          window.TSM.evidenceLedger.all() -> record[]
 *          window.TSM.evidenceLedger.forDomain(domain) -> record[]
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'tsm_evidence_ledger_v1';

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
      // storage unavailable/full — ledger stays in-memory for this session
    }
  }

  var _records = loadAll();

  function makeId() {
    return 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  var EvidenceLedger = {
    add: function (record) {
      var entry = Object.assign({
        id: makeId(),
        recordedAt: new Date().toISOString()
      }, record);
      _records.push(entry);
      persist(_records);
      return entry;
    },
    all: function () {
      return _records.slice();
    },
    forDomain: function (domain) {
      return _records.filter(function (r) { return r.domain === domain; });
    },
    clear: function () {
      _records = [];
      persist(_records);
    }
  };

  global.TSM = global.TSM || {};
  Object.assign(global.TSM, { evidenceLedger: EvidenceLedger });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvidenceLedger;
  }
})(typeof window !== 'undefined' ? window : global);
