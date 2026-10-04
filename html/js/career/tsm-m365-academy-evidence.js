'use strict';

/*
 * TSM Phase 10D — Microsoft 365 Academy Evidence Adapter
 *
 * Produces readiness-compatible evidence without writing to the Registry.
 * Candidate Registry remains the canonical persistence layer.
 */

var VERSION = '10D.0';
var SOURCE = 'microsoft_365_academy';

function clean(v) {
  return String(v == null ? '' : v).trim();
}

function normalize(record, index) {
  record = record || {};
  index = Number(index || 0);

  var candidateId = clean(record.candidateId);

  return {
    evidenceId: clean(record.evidenceId) ||
      candidateId + ':m365:' + (index + 1),
    candidateId: candidateId,
    kind: 'training',
    moduleId: clean(record.moduleId),
    product: clean(record.product),
    competencyRefs: Array.isArray(record.competencyRefs)
      ? record.competencyRefs.map(clean).filter(Boolean)
      : [],
    dimensions: Array.isArray(record.dimensions)
      ? record.dimensions.map(clean).filter(Boolean)
      : [],
    stage: clean(record.stage),
    verified: record.verified === true,
    source: SOURCE,
    provenance: {
      source: SOURCE,
      moduleId: clean(record.moduleId),
      stage: clean(record.stage)
    }
  };
}

function aggregate(records, candidateId) {
  var id = clean(candidateId);
  var seen = {};
  var evidence = [];

  (Array.isArray(records) ? records : []).forEach(function (record, index) {
    var normalized = normalize(record, index);

    if (!normalized.candidateId || normalized.candidateId !== id) return;
    if (seen[normalized.evidenceId]) return;

    seen[normalized.evidenceId] = true;
    evidence.push(normalized);
  });

  return {
    source: SOURCE,
    candidateId: id,
    evidence: evidence,
    evidenceCount: evidence.length,
    verifiedEvidenceCount: evidence.filter(function (item) {
      return item.verified;
    }).length,
    modulesCompleted: evidence.filter(function (item) {
      return item.stage === 'VERIFY' && item.verified;
    }).length,
    provenance: evidence.map(function (item) {
      return item.provenance;
    })
  };
}

module.exports = {
  VERSION: VERSION,
  SOURCE: SOURCE,
  normalize: normalize,
  aggregate: aggregate
};
