'use strict';

/*
 * TSM Phase 10E — Academy -> Professional Readiness mapping.
 *
 * Does not calculate a replacement readiness score.
 */

var VERSION = '10E.0';

var DIMENSION_MAP = {
  technical_fundamentals: 'technicalCompetency',
  tool_usage: 'technicalCompetency',
  system_troubleshooting: 'technicalCompetency',
  technical_configuration: 'technicalCompetency',

  process_execution: 'workflowExecution',
  ticket_workflow: 'workflowExecution',
  policy_procedure_execution: 'workflowExecution',
  handoff_execution: 'workflowExecution',

  professional_communication: 'communication',
  customer_communication: 'communication',
  team_collaboration: 'communication',
  escalation_communication: 'communication',

  technical_documentation: 'documentation',
  case_documentation: 'documentation',
  evidence_documentation: 'documentation',
  closure_documentation: 'documentation',

  diagnostic_reasoning: 'professionalReliability',
  root_cause_analysis: 'professionalReliability',
  decision_making: 'professionalReliability',
  exception_handling: 'professionalReliability',

  role_domain_knowledge: 'domainCompetency',
  role_workflow_knowledge: 'workflowExecution',
  role_tool_proficiency: 'technicalCompetency',
  role_compliance_knowledge: 'domainCompetency'
};

function mapCompetency(competency) {
  var key = String(competency || '').trim();

  return {
    competency: key,
    dimensionId: DIMENSION_MAP[key] || null,
    mapped: Boolean(DIMENSION_MAP[key])
  };
}

function mapEvidence(evidence) {
  return (Array.isArray(evidence) ? evidence : []).map(function (item) {
    var refs = Array.isArray(item.competencyRefs)
      ? item.competencyRefs
      : [];

    return {
      evidenceId: item.evidenceId,
      moduleId: item.moduleId,
      verified: item.verified === true,
      mappings: refs.map(mapCompetency).filter(function (mapping) {
        return mapping.mapped;
      })
    };
  });
}

function summarize(evidence) {
  var mapped = mapEvidence(evidence);
  var dimensions = {};

  mapped.forEach(function (item) {
    item.mappings.forEach(function (mapping) {
      dimensions[mapping.dimensionId] =
        (dimensions[mapping.dimensionId] || 0) + 1;
    });
  });

  return {
    evidence: mapped,
    dimensionEvidence: dimensions,
    source: 'microsoft_365_academy',
    replacementScoring: false
  };
}

module.exports = {
  VERSION: VERSION,
  DIMENSION_MAP: Object.assign({}, DIMENSION_MAP),
  mapCompetency: mapCompetency,
  mapEvidence: mapEvidence,
  summarize: summarize
};
