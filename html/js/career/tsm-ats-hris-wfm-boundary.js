'use strict';

const VERSION = '13I.0';

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
  ]
};

function buildBoundary() {
  return {
    version: VERSION,
    ownership: JSON.parse(JSON.stringify(OWNERSHIP)),
    handoffs: [
      'crm_job_order_to_ats_requisition',
      'ats_application_to_staffing_review',
      'staffing_placement_to_hr',
      'hr_worker_to_wfm',
      'wfm_activity_to_workforce_evidence'
    ],
    controls: [
      'candidate_registry_remains_canonical',
      'ats_does_not_replace_staffing_placement',
      'wfm_does_not_replace_hr_employment_lifecycle',
      'readiness_does_not_write_application_state',
      'crm_does_not_write_candidate_identity',
      'evidence_is_reference_based',
      'models_are_pure_and_non_persistent'
    ]
  };
}

module.exports = {
  VERSION,
  OWNERSHIP,
  buildBoundary
};
