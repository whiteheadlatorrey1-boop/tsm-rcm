'use strict';

const assert = require('assert');

const Contract = require(
  '../../html/js/career/tsm-professional-readiness-contract.js'
);

const Explainable = require(
  '../../html/js/career/tsm-professional-readiness-explainable.js'
);

const Dashboard = require(
  '../../html/js/career/tsm-professional-readiness-dashboard-model.js'
);

const GapTraining = require(
  '../../html/js/career/tsm-professional-readiness-gap-training.js'
);

const Interview = require(
  '../../html/js/career/tsm-professional-readiness-interview.js'
);

const Staffing = require(
  '../../html/js/career/tsm-professional-readiness-staffing-boundary.js'
);

const Governance = require(
  '../../html/js/career/tsm-professional-readiness-governance.js'
);

let passed = 0;

function check(label, actual, expected) {
  try {
    assert.deepStrictEqual(actual, expected);
    console.log('PASS:', label);
    passed += 1;
  } catch (err) {
    console.error('FAIL:', label);
    console.error('  expected:', expected);
    console.error('  actual:  ', actual);
    throw err;
  }
}

const profile = {
  version: '7C',
  readinessScore: 76,

  readinessBasis: [
    {
      evidenceId: 'EV-TECH',
      kind: 'assessment',
      source: 'career_training',
      dimensions: ['technicalCompetency'],
      verified: true
    },
    {
      evidenceId: 'EV-COMM',
      kind: 'interview_prep',
      source: 'interview_prep',
      dimensions: ['communication'],
      verified: true
    }
  ],

  dimensions: {
    technicalCompetency: 88,
    communication: 61
  }
};

const contract = Contract.createContract(
  {
    candidateId: 'CAND-9D',
    roleId: 'ROLE-L1',
    targetRole: 'IT Support Technician'
  },
  profile
);

// 9D
const explanation =
  Explainable.buildExplanation(contract);

check(
  '9D candidate identity',
  explanation.candidateId,
  'CAND-9D'
);

check(
  '9D detects gap',
  explanation.gaps.length,
  1
);

check(
  '9D detects strength',
  explanation.strengths.length,
  1
);

check(
  '9D remains explainable',
  typeof explanation.explanation,
  'string'
);

// 9E
const dashboard =
  Dashboard.buildDashboard(
    contract,
    explanation
  );

check(
  '9E dashboard contract',
  dashboard.contract,
  'professional_readiness_dashboard'
);

check(
  '9E candidate identity',
  dashboard.candidate.candidateId,
  'CAND-9D'
);

check(
  '9E gap count',
  dashboard.gaps.length,
  1
);

check(
  '9E evidence total',
  dashboard.evidence.total,
  2
);

// 9F
const plan =
  GapTraining.buildPlan(contract);

check(
  '9F candidate identity',
  plan.candidateId,
  'CAND-9D'
);

check(
  '9F action count',
  plan.actions.length,
  1
);

check(
  '9F deterministic sequence',
  plan.actions[0].sequence,
  ['TRAIN', 'PRACTICE', 'VERIFY']
);

// 9G
const interview =
  Interview.buildContext(contract);

check(
  '9G candidate identity',
  interview.candidateId,
  'CAND-9D'
);

check(
  '9G existing interview prep preserved',
  interview.boundary.existingInterviewPrepRemainsAuthoritative,
  true
);

check(
  '9G suggested focus',
  interview.suggestedFocusDimensions,
  ['communication']
);

// 9H
const staffing =
  Staffing.qualify(contract);

check(
  '9H qualification contract',
  staffing.contract,
  'professional_readiness_staffing_qualification'
);

check(
  '9H candidate identity',
  staffing.candidateId,
  'CAND-9D'
);

check(
  '9H staffing owns lifecycle',
  staffing.boundary.staffingOwnsPlacementLifecycle,
  true
);

check(
  '9H readiness does not write placement state',
  staffing.boundary.readinessDoesNotWritePlacementState,
  true
);

// 9I
const governance =
  Governance.validate(contract);

check(
  '9I governance valid',
  governance.valid,
  true
);

check(
  '9I candidate linked',
  governance.controls.candidateLinked,
  true
);

check(
  '9I provenance required',
  governance.controls.provenanceRequired,
  true
);

check(
  '9I staffing evidence separated',
  governance.controls.staffingEvidenceSeparated,
  true
);

// Explicit governance failure test.
const contaminated = JSON.parse(
  JSON.stringify(contract)
);

contaminated.evidenceRefs.push({
  evidenceId: 'BAD-PLACEMENT',
  kind: 'staffing_placement',
  source: 'staffing_pipeline'
});

const failedGovernance =
  Governance.validate(contaminated);

check(
  '9I rejects staffing evidence contamination',
  failedGovernance.valid,
  false
);

console.log(
  '\nPHASE 9D-9I TESTS OK — ' +
  passed +
  ' checks passed'
);
