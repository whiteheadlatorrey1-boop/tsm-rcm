/* Phase 8B-2 — OPT-IN dimension-level proxy for requirements 8B could not score.
   STOPGAP, internal only. Upgrades 'no-candidate-data' requirements to
   'dimension-proxy' when a mapped 7C dimension has an evidence-informed score.
   Never changes met/gap/unmapped, never alters the original summary or coverage.
   Pure, deterministic, unwired. Does not import 7C, 8B or the Registry. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMDimensionProxyMatch = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PROXY_VERSION = '1.0.0';
  var MAP_VERSION = '1.0.0-provisional';

  // PROVISIONAL judgment calls. Values are 7C dimension IDs. Review before relying on them.
  var DEFAULT_MAP = Object.freeze({
    'it.l1.ticket-triage': 'technicalCompetency',
    'it.servicenow.fundamentals': 'technicalCompetency',
    'healthcare.rcm.claims-follow-up': 'domainCompetency',
    'healthcare.rcm.denials-management': 'domainCompetency',
    'enterprise.sap.fundamentals': 'domainCompetency',
    'workplace.communication': 'communication'
  });

  function has(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
  function round4(n) { return Math.round(n * 10000) / 10000; }

  function applyDimensionProxy(matchResult, candidate, opts) {
    if (!matchResult || typeof matchResult !== 'object' || typeof matchResult.jobId !== 'string' || !Array.isArray(matchResult.requirements)) {
      throw new Error('match result required');
    }
    if (!candidate || typeof candidate !== 'object' || typeof candidate.candidateId !== 'string' || !candidate.candidateId) {
      throw new Error('candidate required');
    }
    if (candidate.candidateId !== matchResult.candidateId) throw new Error('candidate does not match result');

    var custom = !!(opts && opts.map);
    var map = custom ? opts.map : DEFAULT_MAP;
    var mapVersion = custom ? ((opts && opts.mapVersion) || 'custom') : MAP_VERSION;
    var dims = candidate.dimensions && typeof candidate.dimensions === 'object' ? candidate.dimensions : {};

    var applied = 0;
    var reqs = matchResult.requirements.map(function (r) {
      if (!r || r.status !== 'no-candidate-data') return r;
      var dim = has(map, r.competencyRef) ? map[r.competencyRef] : null;
      if (!dim || !has(dims, dim) || typeof dims[dim] !== 'number') return r;
      var score = dims[dim];
      var gap = typeof r.requiredLevel === 'number' ? Math.max(0, round4(r.requiredLevel - score)) : null;
      applied += 1;
      return Object.freeze(Object.assign({}, r, {
        status: 'dimension-proxy',
        candidateScore: score,
        gap: gap,
        proxyDimension: dim,
        proxyBasis: 'dimension-level score; not competency evidence'
      }));
    });

    return Object.freeze({
      proxyVersion: PROXY_VERSION,
      employerFacing: false,
      jobId: matchResult.jobId,
      candidateId: matchResult.candidateId,
      taxonomyVersion: matchResult.taxonomyVersion === undefined ? null : matchResult.taxonomyVersion,
      requirements: Object.freeze(reqs),
      summary: matchResult.summary,
      proxySummary: Object.freeze({
        applied: applied,
        remainingNoData: reqs.filter(function (r) { return r && r.status === 'no-candidate-data'; }).length,
        mapVersion: mapVersion
      }),
      review: matchResult.review,
      audit: Object.freeze(Object.assign({}, matchResult.audit || {}, {
        proxyVersion: PROXY_VERSION,
        proxyMapVersion: mapVersion,
        proxyApplied: applied
      }))
    });
  }

  return { PROXY_VERSION: PROXY_VERSION, MAP_VERSION: MAP_VERSION, DEFAULT_MAP: DEFAULT_MAP, applyDimensionProxy: applyDimensionProxy };
}));
