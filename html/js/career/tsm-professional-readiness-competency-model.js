'use strict';

/*
 * TSM Phase 9B — Professional Readiness Competency Model
 *
 * Purpose:
 *   Establish a stable, explainable competency vocabulary that can be
 *   referenced by Professional Readiness without replacing the existing
 *   7C readiness projection or Phase 8 staffing contracts.
 *
 * Design:
 *   - Pure data/model layer.
 *   - No Registry writes.
 *   - No API calls.
 *   - No UI mutations.
 *   - No persistence.
 *   - Does not invent candidate competency evidence.
 */

var VERSION = '9B.0';

var DOMAINS = [
  'technical',
  'workflow',
  'communication',
  'documentation',
  'problem_solving',
  'role_specific'
];

var COMPETENCIES = {
  technical: [
    'technical_fundamentals',
    'tool_usage',
    'system_troubleshooting',
    'technical_configuration'
  ],

  workflow: [
    'process_execution',
    'ticket_workflow',
    'policy_procedure_execution',
    'handoff_execution'
  ],

  communication: [
    'professional_communication',
    'customer_communication',
    'team_collaboration',
    'escalation_communication'
  ],

  documentation: [
    'technical_documentation',
    'case_documentation',
    'evidence_documentation',
    'closure_documentation'
  ],

  problem_solving: [
    'diagnostic_reasoning',
    'root_cause_analysis',
    'decision_making',
    'exception_handling'
  ],

  role_specific: [
    'role_domain_knowledge',
    'role_workflow_knowledge',
    'role_tool_proficiency',
    'role_compliance_knowledge'
  ]
};

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listDomains() {
  return DOMAINS.slice();
}

function listCompetencies(domain) {
  var key = clean(domain);

  if (!key) {
    return DOMAINS.reduce(function (result, item) {
      result[item] = COMPETENCIES[item].slice();
      return result;
    }, {});
  }

  return COMPETENCIES[key]
    ? COMPETENCIES[key].slice()
    : [];
}

function getCompetency(competencyId) {
  var id = clean(competencyId);

  if (!id) return null;

  for (var i = 0; i < DOMAINS.length; i += 1) {
    var domain = DOMAINS[i];

    if (COMPETENCIES[domain].indexOf(id) !== -1) {
      return {
        competencyId: id,
        domain: domain
      };
    }
  }

  return null;
}

function normalizeCompetencyRef(ref) {
  if (typeof ref === 'string') {
    var id = clean(ref);
    var found = getCompetency(id);

    return {
      competencyId: id || null,
      domain: found ? found.domain : null,
      source: 'external'
    };
  }

  if (!ref || typeof ref !== 'object') {
    return {
      competencyId: null,
      domain: null,
      source: null
    };
  }

  var competencyId = clean(
    ref.competencyId ||
    ref.id ||
    ref.competency
  );

  var domain = clean(ref.domain);

  var known = getCompetency(competencyId);

  return {
    competencyId: competencyId || null,
    domain: domain || (known ? known.domain : null),
    source: clean(ref.source) || null
  };
}

function buildRoleCompetencyProfile(role) {
  if (!role || typeof role !== 'object') {
    return {
      roleId: null,
      roleName: null,
      competencies: []
    };
  }

  var raw = Array.isArray(role.competencies)
    ? role.competencies
    : [];

  var seen = {};

  var competencies = raw
    .map(normalizeCompetencyRef)
    .filter(function (ref) {
      if (!ref.competencyId) return false;

      if (seen[ref.competencyId]) return false;

      seen[ref.competencyId] = true;
      return true;
    });

  return {
    roleId: clean(role.roleId || role.id) || null,
    roleName: clean(role.roleName || role.name) || null,
    competencies: competencies
  };
}

function extractEvidenceCompetencies(evidenceRefs) {
  if (!Array.isArray(evidenceRefs)) return [];

  var seen = {};

  return evidenceRefs
    .map(function (ref) {
      if (!ref || typeof ref !== 'object') return null;

      return normalizeCompetencyRef({
        competencyId:
          ref.competencyRef ||
          ref.competencyId ||
          ref.competency ||
          null,
        domain:
          ref.domain ||
          null,
        source:
          ref.source ||
          null
      });
    })
    .filter(function (ref) {
      if (!ref || !ref.competencyId) return false;

      if (seen[ref.competencyId]) return false;

      seen[ref.competencyId] = true;
      return true;
    });
}

function mapDimensionsToDomains(dimensions) {
  if (!Array.isArray(dimensions)) return [];

  var mapping = {
    technicalCompetency: 'technical',
    domainCompetency: 'role_specific',
    workflowExecution: 'workflow',
    communication: 'communication',
    documentation: 'documentation',
    professionalReliability: 'workflow'
  };

  var seen = {};

  return dimensions
    .map(function (dimension) {
      return mapping[clean(dimension)] || null;
    })
    .filter(function (domain) {
      if (!domain || seen[domain]) return false;

      seen[domain] = true;
      return true;
    });
}

function createModel(input) {
  input = input || {};

  var evidenceRefs = Array.isArray(input.evidenceRefs)
    ? input.evidenceRefs
    : [];

  var dimensions = Array.isArray(input.dimensions)
    ? input.dimensions
    : [];

  var role = buildRoleCompetencyProfile(
    input.targetRole || input.role || {}
  );

  var evidenceCompetencies =
    extractEvidenceCompetencies(evidenceRefs);

  var evidenceDomains = mapDimensionsToDomains(dimensions);

  return {
    contract: 'professional_readiness_competency_model',
    version: VERSION,

    candidateId:
      clean(input.candidateId) || null,

    targetRole: role,

    domains: listDomains(),

    competencies: {
      model: listCompetencies(),
      role: role.competencies,
      evidenced: evidenceCompetencies
    },

    evidenceDomains: evidenceDomains,

    provenance: {
      source: 'TSMProfessionalReadinessCompetencyModel',
      evidenceCount: evidenceRefs.length,
      evidencedCompetencyCount:
        evidenceCompetencies.length
    }
  };
}

var API = {
  VERSION: VERSION,
  DOMAINS: DOMAINS.slice(),
  COMPETENCIES: clone(COMPETENCIES),
  listDomains: listDomains,
  listCompetencies: listCompetencies,
  getCompetency: getCompetency,
  normalizeCompetencyRef: normalizeCompetencyRef,
  buildRoleCompetencyProfile: buildRoleCompetencyProfile,
  extractEvidenceCompetencies: extractEvidenceCompetencies,
  mapDimensionsToDomains: mapDimensionsToDomains,
  createModel: createModel
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}

if (typeof globalThis !== 'undefined') {
  globalThis.TSMProfessionalReadinessCompetencyModel = API;
}
