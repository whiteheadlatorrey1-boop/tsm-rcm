'use strict';

/*
 * TSM Phase 10A — Microsoft 365 Academy Contract
 *
 * Pure contract layer.
 * No Registry writes.
 * No API calls.
 * No UI mutations.
 * Existing Career Training remains authoritative.
 */

var VERSION = '10A.0';

var ACADEMY = 'microsoft_365_academy';

var VALID_STATES = [
  'not_started',
  'in_progress',
  'practice',
  'verification',
  'verified',
  'completed'
];

var VALID_TRACKS = [
  'm365_foundations',
  'm365_productivity',
  'm365_collaboration',
  'm365_data',
  'm365_workflow',
  'm365_administration'
];

function clean(v) {
  return String(v == null ? '' : v).trim();
}

function normalizeCandidate(candidate) {
  candidate = candidate || {};

  return {
    candidateId: clean(candidate.candidateId || candidate.id),
    firstName: clean(candidate.firstName),
    lastName: clean(candidate.lastName),
    email: clean(candidate.email)
  };
}

function normalizeModule(module) {
  module = module || {};

  return {
    moduleId: clean(module.moduleId),
    trackId: clean(module.trackId),
    title: clean(module.title),
    product: clean(module.product),
    level: clean(module.level || 'foundational'),
    competencies: Array.isArray(module.competencies)
      ? module.competencies.map(clean).filter(Boolean)
      : [],
    prerequisites: Array.isArray(module.prerequisites)
      ? module.prerequisites.map(clean).filter(Boolean)
      : []
  };
}

function createEmptyProgress() {
  return {
    state: 'not_started',
    startedAt: null,
    completedAt: null,
    practiceAttempts: 0,
    verificationAttempts: 0,
    verified: false,
    evidenceRefs: []
  };
}

function createContract(input) {
  input = input || {};

  var candidate = normalizeCandidate(input.candidate);
  var modules = Array.isArray(input.modules)
    ? input.modules.map(normalizeModule)
    : [];

  var progress = input.progress || {};

  return {
    contract: ACADEMY,
    version: VERSION,
    candidate: candidate,
    academy: {
      academyId: ACADEMY,
      name: 'Microsoft 365 Academy',
      trackId: clean(input.trackId),
      trackName: clean(input.trackName)
    },
    modules: modules,
    progress: progress,
    completion: {
      completedModules: Number(input.completedModules || 0),
      totalModules: modules.length,
      completionPercent: modules.length
        ? Math.round((Number(input.completedModules || 0) / modules.length) * 100)
        : 0
    },
    evidenceRefs: Array.isArray(input.evidenceRefs)
      ? input.evidenceRefs.slice()
      : [],
    provenance: {
      source: 'microsoft_365_academy',
      academyVersion: VERSION,
      evidenceCount: Array.isArray(input.evidenceRefs)
        ? input.evidenceRefs.length
        : 0
    }
  };
}

function createEmptyContract(candidateId) {
  return createContract({
    candidate: { candidateId: candidateId },
    modules: []
  });
}

module.exports = {
  VERSION: VERSION,
  ACADEMY: ACADEMY,
  VALID_STATES: VALID_STATES.slice(),
  VALID_TRACKS: VALID_TRACKS.slice(),
  normalizeCandidate: normalizeCandidate,
  normalizeModule: normalizeModule,
  createEmptyProgress: createEmptyProgress,
  createContract: createContract,
  createEmptyContract: createEmptyContract
};
