/* Phase 8B-0 — Candidate match input contract. Pure, read-only adapter.
   Takes an already-projected readiness object (7C output) + evidence refs and
   returns a frozen, PII-free shape for matching. Does not import 7C or the Registry. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tsm-employer-job-model.js'));
  } else {
    root.TSMCandidateMatchInput = factory(root.TSMEmployerJobModel);
  }
}(typeof self !== 'undefined' ? self : this, function (Model) {
  'use strict';

  var IDENTITY_KEYS = ['name', 'fullname', 'firstname', 'lastname', 'email', 'phone', 'ssn', 'linkedin'];

  function nk(k) { return String(k).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function assertNoIdentity(value, path) {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(function (v, i) { assertNoIdentity(v, path + '[' + i + ']'); }); return; }
    Object.keys(value).forEach(function (k) {
      if (IDENTITY_KEYS.indexOf(nk(k)) !== -1) throw new Error('identity field not allowed: ' + path + '.' + k);
      assertNoIdentity(value[k], path + '.' + k);
    });
  }

  // Canonical 0-1. Values <= 1 read as 0-1 scale; (1, 100] as 0-100. Same convention as 7C/8A.
  function normScore(v) {
    if (typeof v === 'string' && v.trim() !== '') v = Number(v);
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100) return null;
    return v <= 1 ? v : v / 100;
  }

  function readMap(src, idKeys, valKeys) {
    var out = {};
    if (Array.isArray(src)) {
      src.forEach(function (row) {
        if (!row || typeof row !== 'object') return;
        var id = null, val = null, i;
        for (i = 0; i < idKeys.length; i++) if (typeof row[idKeys[i]] === 'string' && row[idKeys[i]]) { id = row[idKeys[i]]; break; }
        for (i = 0; i < valKeys.length; i++) if (row[valKeys[i]] !== undefined) { val = normScore(row[valKeys[i]]); break; }
        if (id && val !== null) out[id] = val;
      });
    } else if (src && typeof src === 'object') {
      Object.keys(src).forEach(function (id) {
        var v = src[id];
        var val = normScore(v && typeof v === 'object' ? (v.score !== undefined ? v.score : v.value) : v);
        if (val !== null) out[id] = val;
      });
    }
    var sorted = {};
    Object.keys(out).sort().forEach(function (k) { sorted[k] = out[k]; });
    return Object.freeze(sorted);
  }

  function readEvidence(list) {
    return Object.freeze((Array.isArray(list) ? list : []).filter(function (e) {
      return e && typeof e.evidenceId === 'string' && e.evidenceId;
    }).map(function (e) {
      return Object.freeze({
        evidenceId: e.evidenceId,
        kind: typeof e.kind === 'string' && e.kind ? e.kind : null,
        competencyRef: typeof e.competencyRef === 'string' && e.competencyRef ? e.competencyRef : null,
        verified: e.verified === true ? true : (e.verified === false ? false : null),
        source: typeof e.source === 'string' && e.source ? e.source : null
      });
    }));
  }

  function createCandidateMatchInput(input) {
    var i = input || {};
    Model.assertNoProtected(i, 'candidate');
    assertNoIdentity(i, 'candidate');
    if (typeof i.candidateId !== 'string' || !i.candidateId.trim()) throw new Error('candidateId required');
    var readiness = i.readiness && typeof i.readiness === 'object' ? i.readiness : {};
    var dimensions = readMap(readiness.dimensions, ['dimensionId', 'id', 'dimension'], ['score', 'value', 'level']);
    var competencies = readMap(readiness.competencies, ['competencyId', 'competencyRef', 'id'], ['score', 'value', 'level']);
    var evidence = readEvidence(i.evidence);
    return Object.freeze({
      candidateId: i.candidateId,
      roleId: typeof i.roleId === 'string' && i.roleId ? i.roleId : null,
      dimensions: dimensions,
      competencies: competencies,
      evidence: evidence,
      basis: Object.freeze({
        evidenceCount: evidence.length,
        dimensionCount: Object.keys(dimensions).length,
        competencyCount: Object.keys(competencies).length,
        hasReadiness: Object.keys(dimensions).length + Object.keys(competencies).length > 0
      })
    });
  }

  return { normScore: normScore, createCandidateMatchInput: createCandidateMatchInput };
}));
