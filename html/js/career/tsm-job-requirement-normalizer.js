/* Phase 8A — Raw job input -> normalized job with competency references. Pure. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tsm-competency-taxonomy.js'), require('./tsm-employer-job-model.js'));
  } else {
    root.TSMJobRequirementNormalizer = factory(root.TSMCompetencyTaxonomy, root.TSMEmployerJobModel);
  }
}(typeof self !== 'undefined' ? self : this, function (Taxonomy, Model) {
  'use strict';

  // Values <= 1 are read as the 0-1 scale; values in (1, 100] as 0-100. Canonical form is 0-1.
  function normalizeLevel(v) {
    if (typeof v === 'string' && v.trim() !== '') v = Number(v);
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100) return null;
    return v <= 1 ? v : v / 100;
  }

  function normalizeJob(raw, opts) {
    var r = raw || {};
    var taxonomy = (opts && opts.taxonomy) || Taxonomy.defaultTaxonomy;
    Model.assertNoProtected(r, 'job');
    var jobId = r.jobId;
    var rawReqs = Array.isArray(r.requirements) ? r.requirements : [];

    var requirements = rawReqs.map(function (q, idx) {
      var item = q || {};
      Model.assertNoProtected(item, 'requirement');
      var ref = item.competencyId || item.competency || item.text;
      var hit = taxonomy.get(item.competencyId) || taxonomy.resolve(ref);
      return {
        requirementId: jobId + ':req:' + (idx + 1),
        jobId: jobId,
        status: hit ? 'mapped' : 'unmapped',
        competencyRef: hit ? hit.competencyId : null,
        level: normalizeLevel(item.level),
        necessity: item.necessity === 'required' || item.necessity === 'preferred' ? item.necessity : null,
        evidenceKinds: item.evidenceKinds,
        rawText: typeof item.rawText === 'string' ? item.rawText : (typeof item.text === 'string' ? item.text : null)
      };
    });

    var job = Model.createJob({
      jobId: jobId,
      employerId: r.employerId,
      title: r.title,
      verticalId: r.verticalId,
      roleId: r.roleId,
      status: r.status,
      provenance: r.provenance,
      capturedAt: r.capturedAt,
      taxonomyVersion: taxonomy.version,
      requirements: requirements
    });

    var mapped = job.requirements.filter(function (x) { return x.status === 'mapped'; });
    return Object.freeze({
      job: job,
      summary: Object.freeze({
        total: job.requirements.length,
        mapped: mapped.length,
        unmapped: job.requirements.length - mapped.length,
        scorable: mapped.filter(function (x) { return x.level !== null; }).length
      })
    });
  }

  return { normalizeLevel: normalizeLevel, normalizeJob: normalizeJob };
}));
