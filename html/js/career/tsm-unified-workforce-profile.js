'use strict';

/*
 * TSM Phase 8E
 * Unified Workforce Profile
 *
 * Purpose:
 *   Compose the existing candidate/readiness/evidence/competency
 *   foundation into ONE deterministic workforce profile.
 *
 * Design rules:
 *   - pure / deterministic
 *   - no API calls
 *   - no Registry writes
 *   - no localStorage/sessionStorage
 *   - no UI mutations
 *   - no inferred skills
 *   - no fabricated verification
 *   - preserves source provenance
 *   - preserves existing readiness semantics
 */

var VERSION = '8E';

var PROFILE_SECTIONS = Object.freeze([
  'identity',
  'lifecycle',
  'readiness',
  'competencies',
  'evidence',
  'roles',
  'domains',
  'provenance'
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeScore(value) {
  if (!finiteNumber(value)) return null;

  if (value >= 0 && value <= 1) {
    return value;
  }

  if (value >= 0 && value <= 100) {
    return value / 100;
  }

  return null;
}

function cleanString(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
}

function uniqueStrings(values) {
  var seen = Object.create(null);
  var output = [];

  (Array.isArray(values) ? values : []).forEach(function (value) {
    var normalized = cleanString(value);

    if (!normalized || seen[normalized]) return;

    seen[normalized] = true;
    output.push(normalized);
  });

  return output;
}

function normalizeIdentity(candidate) {
  candidate = candidate || {};

  return {
    candidateId:
      cleanString(candidate.candidateId) ||
      cleanString(candidate.id),

    firstName: cleanString(candidate.firstName),
    lastName: cleanString(candidate.lastName),
    fullName:
      cleanString(candidate.fullName) ||
      cleanString(candidate.name),

    email: cleanString(candidate.email),

    phone:
      cleanString(candidate.phone) ||
      cleanString(candidate.phoneNumber)
  };
}

function normalizeLifecycle(candidate) {
  candidate = candidate || {};

  return {
    status:
      cleanString(candidate.status) ||
      cleanString(candidate.lifecycleStatus) ||
      'unknown',

    createdAt: cleanString(candidate.createdAt),
    updatedAt: cleanString(candidate.updatedAt)
  };
}

function normalizeReadiness(readiness) {
  readiness = readiness || {};

  var score = normalizeScore(readiness.readinessScore);

  return {
    version:
      cleanString(readiness.version) || null,

    readinessScore:
      score === null ? 0 : score * 100,

    readinessBasis: Array.isArray(readiness.readinessBasis)
      ? clone(readiness.readinessBasis)
      : [],

    evidenceCount:
      finiteNumber(readiness.evidenceCount)
        ? readiness.evidenceCount
        : 0,

    verifiedEvidenceCount:
      finiteNumber(readiness.verifiedEvidenceCount)
        ? readiness.verifiedEvidenceCount
        : 0,

    dimensions:
      readiness.dimensions && typeof readiness.dimensions === 'object'
        ? clone(readiness.dimensions)
        : {},

    roleReadiness:
      readiness.roleReadiness &&
      typeof readiness.roleReadiness === 'object'
        ? clone(readiness.roleReadiness)
        : {}
  };
}

function normalizeCompetencies(competencies) {
  competencies = competencies || {};

  /*
   * Supports the 8D scorer's competency map without inventing
   * competencies from free-form candidate text.
   */
  var scores = {};

  Object.keys(competencies).forEach(function (id) {
    var entry = competencies[id];

    if (finiteNumber(entry)) {
      var direct = normalizeScore(entry);

      if (direct !== null) {
        scores[id] = direct * 100;
      }

      return;
    }

    if (!entry || typeof entry !== 'object') return;

    var score = normalizeScore(
      entry.score !== undefined
        ? entry.score
        : entry.value
    );

    if (score !== null) {
      scores[id] = {
        score: score * 100,
        evidenceCount:
          finiteNumber(entry.evidenceCount)
            ? entry.evidenceCount
            : 0,
        verifiedEvidenceCount:
          finiteNumber(entry.verifiedEvidenceCount)
            ? entry.verifiedEvidenceCount
            : 0,
        provenance: Array.isArray(entry.provenance)
          ? clone(entry.provenance)
          : []
      };
    }
  });

  return scores;
}

function normalizeEvidence(evidence) {
  return (Array.isArray(evidence) ? evidence : [])
    .filter(function (record) {
      return record && typeof record === 'object';
    })
    .map(function (record) {
      return {
        id:
          cleanString(record.id) ||
          cleanString(record.eventId) ||
          null,

        category: cleanString(record.category),
        kind: cleanString(record.kind),

        score:
          normalizeScore(
            record.score !== undefined
              ? record.score
              : record.value
          ),

        weight:
          finiteNumber(record.weight)
            ? record.weight
            : 1,

        verified:
          record.verified === true,

        dimensions: Array.isArray(record.dimensions)
          ? uniqueStrings(record.dimensions)
          : [],

        competency:
          cleanString(record.competency),

        role:
          cleanString(record.role),

        provenance:
          record.provenance &&
          typeof record.provenance === 'object'
            ? clone(record.provenance)
            : null
      };
    });
}

function collectCompetencyIds(competencies) {
  return Object.keys(competencies || {});
}

function collectDomains(evidence, candidate) {
  var domains = [];

  if (candidate && Array.isArray(candidate.domains)) {
    domains = domains.concat(candidate.domains);
  }

  evidence.forEach(function (record) {
    if (record.category) domains.push(record.category);
    if (record.kind) domains.push(record.kind);
  });

  return uniqueStrings(domains);
}

function collectRoles(readiness, evidence, candidate) {
  var roles = [];

  if (candidate && Array.isArray(candidate.roles)) {
    roles = roles.concat(candidate.roles);
  }

  if (
    readiness &&
    readiness.roleReadiness &&
    typeof readiness.roleReadiness === 'object'
  ) {
    roles = roles.concat(Object.keys(readiness.roleReadiness));
  }

  evidence.forEach(function (record) {
    if (record.role) roles.push(record.role);
  });

  return uniqueStrings(roles);
}

function collectProvenance(readiness, competencies, evidence) {
  var output = [];

  if (readiness && Array.isArray(readiness.provenance)) {
    output = output.concat(clone(readiness.provenance));
  }

  Object.keys(competencies || {}).forEach(function (id) {
    var entry = competencies[id];

    if (
      entry &&
      typeof entry === 'object' &&
      Array.isArray(entry.provenance)
    ) {
      output = output.concat(clone(entry.provenance));
    }
  });

  evidence.forEach(function (record) {
    if (record.provenance) {
      output.push(clone(record.provenance));
    }
  });

  return output;
}

function createEmptyProfile() {
  return {
    version: VERSION,

    identity: {
      candidateId: null,
      firstName: null,
      lastName: null,
      fullName: null,
      email: null,
      phone: null
    },

    lifecycle: {
      status: 'unknown',
      createdAt: null,
      updatedAt: null
    },

    readiness: {
      version: null,
      readinessScore: 0,
      readinessBasis: [],
      evidenceCount: 0,
      verifiedEvidenceCount: 0,
      dimensions: {},
      roleReadiness: {}
    },

    competencies: {},

    evidence: [],

    roles: [],

    domains: [],

    provenance: []
  };
}

function compose(input) {
  input = input || {};

  var candidate = input.candidate || {};
  var readiness = normalizeReadiness(input.readiness);
  var competencies = normalizeCompetencies(
    input.competencies
  );
  var evidence = normalizeEvidence(
    input.evidence
  );

  var profile = createEmptyProfile();

  profile.identity = normalizeIdentity(candidate);
  profile.lifecycle = normalizeLifecycle(candidate);
  profile.readiness = readiness;
  profile.competencies = competencies;
  profile.evidence = evidence;

  profile.roles = collectRoles(
    readiness,
    evidence,
    candidate
  );

  profile.domains = collectDomains(
    evidence,
    candidate
  );

  profile.provenance = collectProvenance(
    readiness,
    competencies,
    evidence
  );

  return profile;
}

function summarize(profile) {
  profile = profile || createEmptyProfile();

  var competencyIds = collectCompetencyIds(
    profile.competencies
  );

  return {
    version: VERSION,
    candidateId:
      profile.identity &&
      profile.identity.candidateId,

    readinessScore:
      profile.readiness &&
      finiteNumber(profile.readiness.readinessScore)
        ? profile.readiness.readinessScore
        : 0,

    competencyCount: competencyIds.length,

    evidenceCount:
      Array.isArray(profile.evidence)
        ? profile.evidence.length
        : 0,

    verifiedEvidenceCount:
      Array.isArray(profile.evidence)
        ? profile.evidence.filter(function (record) {
            return record.verified === true;
          }).length
        : 0,

    roleCount:
      Array.isArray(profile.roles)
        ? profile.roles.length
        : 0,

    domainCount:
      Array.isArray(profile.domains)
        ? profile.domains.length
        : 0
  };
}

module.exports = Object.freeze({
  VERSION: VERSION,
  PROFILE_SECTIONS: PROFILE_SECTIONS,
  createEmptyProfile: createEmptyProfile,
  compose: compose,
  summarize: summarize,
  normalizeIdentity: normalizeIdentity,
  normalizeLifecycle: normalizeLifecycle,
  normalizeReadiness: normalizeReadiness,
  normalizeCompetencies: normalizeCompetencies,
  normalizeEvidence: normalizeEvidence
});
