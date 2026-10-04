'use strict';

const VERSION = '14I.0';

const OWNERSHIP = {
  candidateRegistry: [
    'candidate_identity',
    'canonical_candidate_evidence'
  ],

  careerTraining: [
    'training',
    'practice',
    'verification'
  ],

  professionalReadiness: [
    'readiness_interpretation',
    'qualification'
  ],

  crm: [
    'employer_relationship',
    'accounts',
    'contacts',
    'opportunities',
    'job_orders'
  ],

  ats: [
    'requisitions',
    'applications',
    'application_workflow'
  ],

  staffing: [
    'candidate_matching',
    'candidate_submission',
    'placement'
  ],

  hr: [
    'employment_lifecycle',
    'onboarding',
    'offboarding',
    'hr_cases'
  ],

  wfm: [
    'availability',
    'scheduling',
    'assignments',
    'workforce_operations'
  ],

  unifiedIntelligence: [
    'signal_aggregation',
    'evidence_correlation',
    'insight_generation',
    'action_proposals',
    'cross_domain_dashboard'
  ]
};

function buildBoundary() {
  return {
    version: VERSION,
    ownership: JSON.parse(JSON.stringify(OWNERSHIP)),
    controls: [
      'registry_remains_canonical',
      'intelligence_does_not_replace_domain_ownership',
      'intelligence_does_not_write_placement_state',
      'intelligence_does_not_write_employment_state',
      'intelligence_does_not_write_application_state',
      'intelligence_does_not_replace_readiness_scoring',
      'actions_require_human_review',
      'evidence_remains_reference_based',
      'models_are_pure_and_non_persistent'
    ]
  };
}

module.exports = {
  VERSION,
  OWNERSHIP,
  buildBoundary
};
