'use strict';

const assert = require('assert');

const Aggregator = require(
  '../../html/js/career/tsm-professional-readiness-evidence-aggregator.js'
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

check('VERSION', Aggregator.VERSION, '9C.0');

check(
  'allowed evidence kinds',
  Aggregator.ALLOWED_KINDS,
  [
    'training',
    'assessment',
    'simulation',
    'interview_prep',
    'sector_application'
  ]
);

check(
  'staffing placement is excluded',
  Aggregator.isExcludedKind('staffing_placement'),
  true
);

check(
  'training is allowed',
  Aggregator.isAllowedKind('training'),
  true
);

check(
  'unknown evidence kind is rejected',
  Aggregator.isAllowedKind('random_source'),
  false
);

const result = Aggregator.aggregate([
  {
    evidenceId: 'TRAIN-001',
    kind: 'training',
    candidateId: 'CAND-9C',
    source: 'career_training',
    dimensions: ['technicalCompetency'],
    verified: true
  },
  {
    evidenceId: 'ASSESS-001',
    kind: 'assessment',
    candidateId: 'CAND-9C',
    source: 'rcm',
    competency: 'denial_management',
    dimensions: ['domainCompetency'],
    verified: true
  },
  {
    evidenceId: 'SIM-001',
    kind: 'simulation',
    candidateId: 'CAND-9C',
    source: 'war_room',
    dimensions: ['workflowExecution'],
    verified: false
  },
  {
    evidenceId: 'INT-001',
    kind: 'interview_prep',
    candidateId: 'CAND-9C',
    source: 'interview_prep',
    dimensions: ['communication'],
    verified: true
  },
  {
    evidenceId: 'SECTOR-001',
    kind: 'sector_application',
    candidateId: 'CAND-9C',
    source: 'healthcare',
    dimensions: ['documentation'],
    verified: true
  },
  {
    evidenceId: 'PLACE-001',
    kind: 'staffing_placement',
    candidateId: 'CAND-9C',
    source: 'staffing_pipeline',
    dimensions: ['technicalCompetency'],
    verified: true
  }
], {
  candidateId: 'CAND-9C'
});

check(
  'candidate identity',
  result.candidateId,
  'CAND-9C'
);

check(
  'staffing evidence excluded',
  result.evidence.some(function (item) {
    return item.evidenceId === 'PLACE-001';
  }),
  false
);

check(
  'professional evidence count',
  result.summary.evidenceCount,
  5
);

check(
  'verified evidence count',
  result.summary.verifiedEvidenceCount,
  4
);

check(
  'training count',
  result.summary.countsByKind.training,
  1
);

check(
  'assessment count',
  result.summary.countsByKind.assessment,
  1
);

check(
  'simulation count',
  result.summary.countsByKind.simulation,
  1
);

check(
  'interview prep count',
  result.summary.countsByKind.interview_prep,
  1
);

check(
  'sector application count',
  result.summary.countsByKind.sector_application,
  1
);

check(
  'competency reference preserved',
  result.summary.competencyRefs,
  ['denial_management']
);

check(
  'dimensions aggregated',
  result.summary.dimensions,
  [
    'communication',
    'documentation',
    'domainCompetency',
    'technicalCompetency',
    'workflowExecution'
  ]
);

const sourceResult =
  Aggregator.aggregateFromSources({
    training: [
      {
        evidenceId: 'T-001',
        candidateId: 'CAND-SOURCE',
        verified: true
      }
    ],
    assessment: [
      {
        evidenceId: 'A-001',
        candidateId: 'CAND-SOURCE',
        verified: true
      }
    ],
    simulation: [
      {
        evidenceId: 'S-001',
        candidateId: 'CAND-SOURCE',
        verified: false
      }
    ],
    interview_prep: [
      {
        evidenceId: 'I-001',
        candidateId: 'CAND-SOURCE',
        verified: true
      }
    ],
    sector_application: [
      {
        evidenceId: 'SA-001',
        candidateId: 'CAND-SOURCE',
        verified: true
      }
    ]
  }, {
    candidateId: 'CAND-SOURCE'
  });

check(
  'source aggregation count',
  sourceResult.summary.evidenceCount,
  5
);

check(
  'placement exclusion boundary',
  result.boundaries.staffingPlacementEvidenceExcluded,
  true
);

check(
  'provenance generator',
  result.provenance.generatedBy,
  'TSMProfessionalReadinessEvidenceAggregator'
);

console.log(
  '\nPHASE 9C EVIDENCE AGGREGATION TESTS OK — ' +
  passed +
  ' checks passed'
);
