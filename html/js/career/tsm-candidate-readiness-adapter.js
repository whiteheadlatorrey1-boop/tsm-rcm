/* Phase 8B-1 — 7C readiness profile -> 8B-0 candidate match input. Pure, unwired.
   Takes the OUTPUT of 7C project() as data; does not import 7C or the Registry.
   Only dimensions actually informed by evidence are emitted (7C reports 0 for
   uninformed dimensions, which must not be read as a real zero score).
   Competency scores are NOT derived: 7C evidence carries dimensions, not competencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tsm-candidate-match-input.js'));
  } else {
    root.TSMCandidateReadinessAdapter = factory(root.TSMCandidateMatchInput);
  }
}(typeof self !== 'undefined' ? self : this, function (MatchInput) {
  'use strict';

  function toMatchInput(ref, profile) {
    var r = ref || {};
    if (!profile || typeof profile !== 'object') throw new Error('readiness profile required');
    var basis = Array.isArray(profile.readinessBasis) ? profile.readinessBasis : [];

    var informed = {};
    basis.forEach(function (b) {
      if (b && Array.isArray(b.dimensions)) {
        b.dimensions.forEach(function (d) { if (typeof d === 'string' && d) informed[d] = true; });
      }
    });

    var src = profile.dimensions && typeof profile.dimensions === 'object' ? profile.dimensions : {};
    var dimensions = [];
    Object.keys(src).sort().forEach(function (d) {
      var v = src[d];
      if (informed[d] && typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) {
        dimensions.push({ dimensionId: d, score: v / 100 });
      }
    });

    var evidence = basis.filter(function (b) { return b && typeof b === 'object'; }).map(function (b, i) {
      return {
        evidenceId: String(r.candidateId) + ':basis:' + (i + 1),
        kind: b.kind,
        competencyRef: null,
        verified: b.verified,
        source: b.category
      };
    });

    return MatchInput.createCandidateMatchInput({
      candidateId: r.candidateId,
      roleId: r.roleId,
      readiness: { dimensions: dimensions, competencies: {} },
      evidence: evidence
    });
  }

  return { toMatchInput: toMatchInput };
}));
