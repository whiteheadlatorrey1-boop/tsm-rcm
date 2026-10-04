'use strict';

/*
 * TSM Phase 9C — Professional Readiness Evidence Aggregator
 *
 * Pure aggregation layer.
 * Candidate Registry remains canonical.
 * Staffing placement evidence is explicitly excluded.
 */

var VERSION = '9C.0';

var ALLOWED_KINDS = [
  'training',
  'assessment',
  'simulation',
  'interview_prep',
  'sector_application'
];

var EXCLUDED_KINDS = [
  'staffing_submission',
  'staffing_interview',
  'staffing_offer',
  'staffing_placement',
  'staffing_placement_outcome',
  'staffing_stage_transition',
  'staffing_audit'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isExcludedKind(kind) {
  return EXCLUDED_KINDS.indexOf(clean(kind)) !== -1;
}

function isAllowedKind(kind) {
  return ALLOWED_KINDS.indexOf(clean(kind)) !== -1;
}

function normalizeEvidence(record, index) {
  if (!record || typeof record !== 'object') return null;

  var kind = clean(
    record.kind ||
    record.type ||
    record.evidenceType
  );

  if (!isAllowedKind(kind) || isExcludedKind(kind)) {
    return null;
  }

  var evidenceId = clean(
    record.evidenceId ||
    record.id
  );

  if (!evidenceId) {
    evidenceId = 'AGG-EVIDENCE-' + String(index + 1);
  }

  var dimensions = Array.isArray(record.dimensions)
    ? record.dimensions.map(clean).filter(Boolean)
    : [];

  var competencyRef = clean(
    record.competencyRef ||
    record.competencyId ||
    record.competency
  );

  return {
    evidenceId: evidenceId,
    kind: kind,
    source: clean(record.source) || null,
    category: clean(record.category) || null,
    competencyRef: competencyRef || null,
    dimensions: dimensions,
    verified: record.verified === true,
    candidateId: clean(record.candidateId) || null,
    roleId: clean(record.roleId) || null,
    role: clean(record.role) || null,
    timestamp: clean(
      record.timestamp ||
      record.createdAt ||
      record.completedAt
    ) || null
  };
}

function aggregate(records, options) {
  options = options || {};

  var input = Array.isArray(records) ? records : [];
  var candidateId = clean(options.candidateId) || null;

  var seen = {};
  var evidence = [];

  input.forEach(function (record, index) {
    var normalized = normalizeEvidence(record, index);

    if (!normalized) return;

    if (
      candidateId &&
      normalized.candidateId &&
      normalized.candidateId !== candidateId
    ) {
      return;
    }

    if (seen[normalized.evidenceId]) return;

    seen[normalized.evidenceId] = true;
    evidence.push(normalized);
  });

  var countsByKind = {};

  evidence.forEach(function (item) {
    countsByKind[item.kind] =
      (countsByKind[item.kind] || 0) + 1;
  });

  var competencyRefs = [];
  var dimensions = [];

  evidence.forEach(function (item) {
    if (
      item.competencyRef &&
      competencyRefs.indexOf(item.competencyRef) === -1
    ) {
      competencyRefs.push(item.competencyRef);
    }

    item.dimensions.forEach(function (dimension) {
      if (dimensions.indexOf(dimension) === -1) {
        dimensions.push(dimension);
      }
    });
  });

  return {
    contract: 'professional_readiness_evidence_aggregation',
    version: VERSION,
    candidateId: candidateId,
    evidence: evidence,

    summary: {
      evidenceCount: evidence.length,
      verifiedEvidenceCount: evidence.filter(function (item) {
        return item.verified === true;
      }).length,
      countsByKind: countsByKind,
      competencyRefs: competencyRefs.sort(),
      dimensions: dimensions.sort()
    },

    boundaries: {
      staffingPlacementEvidenceExcluded: true,
      excludedKinds: EXCLUDED_KINDS.slice(),
      allowedKinds: ALLOWED_KINDS.slice()
    },

    provenance: {
      generatedBy:
        'TSMProfessionalReadinessEvidenceAggregator',
      sourceCount: input.length,
      aggregatedCount: evidence.length
    }
  };
}

function aggregateFromSources(sources, options) {
  sources = sources || {};

  var records = [];

  ALLOWED_KINDS.forEach(function (kind) {
    var sourceRecords = Array.isArray(sources[kind])
      ? sources[kind]
      : [];

    sourceRecords.forEach(function (record) {
      var copy = clone(record || {});
      copy.kind = copy.kind || kind;
      records.push(copy);
    });
  });

  return aggregate(records, options);
}

var API = {
  VERSION: VERSION,
  ALLOWED_KINDS: ALLOWED_KINDS.slice(),
  EXCLUDED_KINDS: EXCLUDED_KINDS.slice(),
  isExcludedKind: isExcludedKind,
  isAllowedKind: isAllowedKind,
  normalizeEvidence: normalizeEvidence,
  aggregate: aggregate,
  aggregateFromSources: aggregateFromSources
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}

if (typeof globalThis !== 'undefined') {
  globalThis.TSMProfessionalReadinessEvidenceAggregator = API;
}
