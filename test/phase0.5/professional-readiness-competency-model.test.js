'use strict';

const assert = require('assert');
const Model = require(
  '../../html/js/career/tsm-professional-readiness-competency-model.js'
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

check('VERSION', Model.VERSION, '9B.0');

check(
  'six competency domains',
  Model.listDomains(),
  [
    'technical',
    'workflow',
    'communication',
    'documentation',
    'problem_solving',
    'role_specific'
  ]
);

check(
  'technical competencies exist',
  Model.listCompetencies('technical').length > 0,
  true
);

check(
  'known competency resolves',
  Model.getCompetency('diagnostic_reasoning'),
  {
    competencyId: 'diagnostic_reasoning',
    domain: 'problem_solving'
  }
);

check(
  'unknown competency does not invent a domain',
  Model.getCompetency('made_up_competency'),
  null
);

check(
  'dimension mapping',
  Model.mapDimensionsToDomains([
    'technicalCompetency',
    'workflowExecution',
    'communication',
    'documentation'
  ]),
  [
    'technical',
    'workflow',
    'communication',
    'documentation'
  ]
);

const model = Model.createModel({
  candidateId: 'CAND-9B',
  targetRole: {
    roleId: 'ROLE-L1',
    roleName: 'IT Support Technician',
    competencies: [
      'system_troubleshooting',
      'ticket_workflow'
    ]
  },
  dimensions: [
    'technicalCompetency',
    'workflowExecution'
  ],
  evidenceRefs: [
    {
      evidenceId: 'EV-001',
      competencyRef: 'system_troubleshooting',
      source: 'career_training'
    },
    {
      evidenceId: 'EV-002',
      competency: 'ticket_workflow',
      source: 'simulation'
    }
  ]
});

check(
  'candidate identity',
  model.candidateId,
  'CAND-9B'
);

check(
  'role identity',
  model.targetRole.roleId,
  'ROLE-L1'
);

check(
  'role competency count',
  model.competencies.role.length,
  2
);

check(
  'evidenced competency count',
  model.competencies.evidenced.length,
  2
);

check(
  'evidence domains',
  model.evidenceDomains,
  [
    'technical',
    'workflow'
  ]
);

console.log(
  '\nPHASE 9B COMPETENCY MODEL TESTS OK — ' +
  passed +
  ' checks passed'
);
