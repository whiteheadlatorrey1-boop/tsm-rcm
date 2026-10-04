/* Phase 8B — Match ONE normalized job (8A) against ONE candidate input (8B-0).
   Pure and deterministic. Produces per-requirement coverage/gap results and an
   audit record. No cross-candidate ranking, no overall score, no decision. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tsm-employer-job-model.js'));
  } else {
    root.TSMJobCandidateMatch = factory(root.TSMEmployerJobModel);
  }
}(typeof self !== 'undefined' ? self : this, function (Model) {
  'use strict';

  var MATCHER_VERSION = '1.0.0';
  var STATUSES = ['met', 'present', 'gap', 'no-candidate-data', 'unmapped'];

  function round4(n) { return Math.round(n * 10000) / 10000; }
  function has(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }

  function stable(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) {
      return JSON.stringify(k) + ':' + stable(v[k]);
    }).join(',') + '}';
  }

  // FNV-1a 32-bit. A change-detection fingerprint, NOT a cryptographic hash.
  function fingerprint(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function assertInputs(job, cand) {
    if (!job || typeof job !== 'object' || typeof job.jobId !== 'string' || !job.jobId) throw new Error('job with jobId required');
    if (!Array.isArray(job.requirements)) throw new Error('job.requirements must be an array');
    if (!cand || typeof cand !== 'object' || typeof cand.candidateId !== 'string' || !cand.candidateId) throw new Error('candidate with candidateId required');
    Model.assertNoProtected(job, 'job');
    Model.assertNoProtected(cand, 'candidate');
  }

  function matchRequirement(req, cand) {
    var out = {
      requirementId: req.requirementId,
      competencyRef: req.competencyRef || null,
      necessity: req.necessity || null,
      requiredLevel: typeof req.level === 'number' ? req.level : null,
      candidateScore: null,
      gap: null,
      status: 'unmapped',
      supportingEvidence: [],
      evidenceKindMatch: null,
      rawText: req.rawText || null
    };
    if (req.status !== 'mapped' || !req.competencyRef) {
      out.supportingEvidence = Object.freeze([]);
      return Object.freeze(out);
    }

    var evidence = Array.isArray(cand.evidence) ? cand.evidence : [];
    var support = evidence.filter(function (e) { return e && e.competencyRef === req.competencyRef; })
      .map(function (e) {
        return Object.freeze({
          evidenceId: e.evidenceId,
          kind: e.kind === undefined ? null : e.kind,
          verified: e.verified === undefined ? null : e.verified
        });
      })
      .sort(function (a, b) { return a.evidenceId < b.evidenceId ? -1 : (a.evidenceId > b.evidenceId ? 1 : 0); });
    out.supportingEvidence = Object.freeze(support);

    var kinds = Array.isArray(req.evidenceKinds) ? req.evidenceKinds : [];
    if (kinds.length > 0) {
      out.evidenceKindMatch = support.some(function (e) { return kinds.indexOf(e.kind) !== -1; });
    }

    // Competency-level scores only. No fallback to dimension scores (that would be inference).
    var score = has(cand.competencies, req.competencyRef) ? cand.competencies[req.competencyRef] : null;
    if (typeof score !== 'number') {
      out.status = 'no-candidate-data'; // absent data is NOT treated as a zero score
    } else {
      out.candidateScore = score;
      if (out.requiredLevel === null) {
        out.status = 'present';
      } else if (score >= out.requiredLevel) {
        out.status = 'met';
        out.gap = 0;
      } else {
        out.status = 'gap';
        out.gap = round4(out.requiredLevel - score);
      }
    }
    return Object.freeze(out);
  }

  function ratio(n, d) { return d > 0 ? round4(n / d) : null; }

  function summarize(results) {
    var by = {};
    STATUSES.forEach(function (s) { by[s] = 0; });
    results.forEach(function (r) { by[r.status] += 1; });

    var mapped = results.length - by.unmapped;
    var required = results.filter(function (r) { return r.necessity === 'required'; });
    var reqMapped = required.filter(function (r) { return r.status !== 'unmapped'; });
    var reqCovered = reqMapped.filter(function (r) { return r.status === 'met' || r.status === 'present'; });

    return Object.freeze({
      total: results.length,
      mapped: mapped,
      byStatus: Object.freeze(by),
      coverage: ratio(by.met + by.present, mapped),
      requiredTotal: required.length,
      requiredMapped: reqMapped.length,
      requiredCoverage: ratio(reqCovered.length, reqMapped.length),
      requiredGaps: Object.freeze(reqMapped.filter(function (r) {
        return r.status === 'gap' || r.status === 'no-candidate-data';
      }).map(function (r) { return r.requirementId; })),
      unspecifiedNecessity: results.filter(function (r) { return r.necessity === null; }).length
    });
  }

  function matchCandidateToJob(job, candidate) {
    assertInputs(job, candidate);
    var results = job.requirements.map(function (r) { return matchRequirement(r || {}, candidate); });
    var taxonomyVersion = typeof job.taxonomyVersion === 'string' ? job.taxonomyVersion : null;

    return Object.freeze({
      matcherVersion: MATCHER_VERSION,
      jobId: job.jobId,
      candidateId: candidate.candidateId,
      taxonomyVersion: taxonomyVersion,
      requirements: Object.freeze(results),
      summary: summarize(results),
      review: Object.freeze({ humanReviewRequired: true, automatedDecision: false }),
      audit: Object.freeze({
        matcherVersion: MATCHER_VERSION,
        jobId: job.jobId,
        candidateId: candidate.candidateId,
        taxonomyVersion: taxonomyVersion,
        requirementCount: job.requirements.length,
        candidateBasis: candidate.basis || null,
        inputFingerprint: fingerprint(stable({ job: job, candidate: candidate }))
      })
    });
  }

  return { MATCHER_VERSION: MATCHER_VERSION, matchCandidateToJob: matchCandidateToJob };
}));
