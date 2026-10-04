(function (global) {
  'use strict';

  /*
   * TSM Phase 7C
   *
   * Unified Evidence -> Professional Readiness projection.
   *
   * PURE / UNWIRED:
   * - no API calls
   * - no Registry writes
   * - no UI mutations
   * - no persistence
   *
   * The Candidate Registry remains the canonical evidence store.
   */

  var VERSION = '7C';

  var DIMENSIONS = [
    'technicalCompetency',
    'domainCompetency',
    'workflowExecution',
    'communication',
    'documentation',
    'professionalReliability'
  ];

  var ALIASES = {
    technical: 'technicalCompetency',
    technical_competency: 'technicalCompetency',

    domain: 'domainCompetency',
    domain_competency: 'domainCompetency',

    workflow: 'workflowExecution',
    workflow_execution: 'workflowExecution',

    communication: 'communication',

    documentation: 'documentation',

    reliability: 'professionalReliability',
    professional_reliability: 'professionalReliability'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function finite(value, fallback) {
    return (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) ? value : fallback;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function normalizeScore(value) {
    var score = finite(value, 0);

    if (score > 1 && score <= 100) {
      score = score / 100;
    }

    return clamp01(score);
  }

  function normalizeDimension(value) {
    if (!value) return null;

    var key = String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    return ALIASES[key] ||
      (DIMENSIONS.indexOf(value) >= 0 ? value : null);
  }

  function createEmptyProfile() {
    return {
      version: VERSION,

      /*
       * Backward-compatible numeric summary.
       * Existing readiness contracts can continue to consume this
       * without changing their current storage semantics.
       */
      readinessScore: 0,

      readinessBasis: [],

      dimensions: {
        technicalCompetency: 0,
        domainCompetency: 0,
        workflowExecution: 0,
        communication: 0,
        documentation: 0,
        professionalReliability: 0
      },

      evidenceCount: 0,
      verifiedEvidenceCount: 0,

      provenance: [],

      roleReadiness: {}
    };
  }

  function normalizeEvidence(record) {
    if (
      !record ||
      typeof record !== 'object' ||
      Array.isArray(record)
    ) {
      throw new TypeError('Evidence must be an object.');
    }

    var dimensions = Array.isArray(record.dimensions)
      ? record.dimensions.slice()
      : [];

    var single = normalizeDimension(record.dimension);

    dimensions = dimensions
      .map(normalizeDimension)
      .filter(Boolean);

    if (single && dimensions.indexOf(single) < 0) {
      dimensions.push(single);
    }

    return {
      category: record.category || 'uncategorized',
      kind: record.kind || 'evidence',
      score: normalizeScore(
        record.score != null
          ? record.score
          : record.value
      ),
      weight: Math.max(
        0,
        finite(record.weight, 1)
      ),
      dimensions: dimensions,
      verified: record.verified === true,
      provenance: record.provenance || null,
      role: record.role || null
    };
  }

  function weightedAverage(records) {
    var weighted = 0;
    var totalWeight = 0;

    records.forEach(function (record) {
      var weight = Math.max(
        0,
        finite(record.weight, 1)
      );

      if (!weight) return;

      weighted += normalizeScore(record.score) * weight;
      totalWeight += weight;
    });

    return totalWeight
      ? weighted / totalWeight
      : 0;
  }

  function toPercent(value) {
    return Math.round(value * 1000) / 10;
  }

  function project(evidenceRecords, options) {
    var profile = createEmptyProfile();

    var records = Array.isArray(evidenceRecords)
      ? evidenceRecords
      : [];

    var normalized = records.map(normalizeEvidence);

    profile.evidenceCount = normalized.length;

    profile.verifiedEvidenceCount = normalized.filter(
      function (record) {
        return record.verified;
      }
    ).length;

    profile.readinessScore = toPercent(
      weightedAverage(normalized)
    );

    DIMENSIONS.forEach(function (dimension) {
      var matching = normalized.filter(
        function (record) {
          return record.dimensions.indexOf(dimension) >= 0;
        }
      );

      profile.dimensions[dimension] = toPercent(
        weightedAverage(matching)
      );
    });

    profile.readinessBasis = normalized.map(
      function (record) {
        return {
          category: record.category,
          kind: record.kind,
          score: toPercent(record.score),
          dimensions: record.dimensions.slice(),
          verified: record.verified
        };
      }
    );

    profile.provenance = normalized
      .filter(function (record) {
        return record.provenance != null;
      })
      .map(function (record) {
        return clone(record.provenance);
      });

    var roles = options && Array.isArray(options.roles)
      ? options.roles
      : [];

    roles.forEach(function (role) {
      var roleName = String(role || '').trim();

      if (!roleName) return;

      var roleRecords = normalized.filter(
        function (record) {
          return !record.role || record.role === roleName;
        }
      );

      profile.roleReadiness[roleName] = toPercent(
        weightedAverage(roleRecords)
      );
    });

    return profile;
  }

  global.TSMProfessionalReadinessProjection = {
    VERSION: VERSION,
    DIMENSIONS: DIMENSIONS.slice(),
    createEmptyProfile: createEmptyProfile,
    normalizeEvidence: normalizeEvidence,
    project: project
  };

})(typeof window !== 'undefined' ? window : globalThis);
