'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(
  __dirname,
  '../../html/js/career'
);

const Contract = require(
  path.join(
    base,
    'tsm-professional-readiness-contract.js'
  )
);

function loadProjection() {
  const ctx = {
    globalThis: {}
  };

  vm.runInNewContext(
    fs.readFileSync(
      path.join(
        base,
        'tsm-professional-readiness-projection.js'
      ),
      'utf8'
    ),
    ctx
  );

  return ctx.globalThis.TSMProfessionalReadinessProjection;
}

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

// 1. Stable API
check('contract VERSION', Contract.VERSION, '9.0');
check(
  'createContract export',
  typeof Contract.createContract,
  'function'
);
check(
  'createEmptyContract export',
  typeof Contract.createEmptyContract,
  'function'
);
check(
  'normalizeEvidenceRefs export',
  typeof Contract.normalizeEvidenceRefs,
  'function'
);

// 2. Existing dimensions preserved
check(
  'existing readiness dimensions',
  Contract.DIMENSIONS,
  [
    'technicalCompetency',
    'domainCompetency',
    'workflowExecution',
    'communication',
    'documentation',
    'professionalReliability'
  ]
);

// 3. Empty contract
{
  const result = Contract.createEmptyContract({
    candidateId: 'CAND-001',
    roleId: 'ROLE-001',
    targetRole: 'IT Support Technician'
  });

  check(
    'empty contract type',
    result.contract,
    'professional_readiness'
  );
  check(
    'empty contract candidateId',
    result.candidateId,
    'CAND-001'
  );
  check(
    'empty contract roleId',
    result.targetRole.roleId,
    'ROLE-001'
  );
  check(
    'empty contract roleName',
    result.targetRole.roleName,
    'IT Support Technician'
  );
  check(
    'empty professional state',
    result.professionalReadiness.state,
    'not_started'
  );
  check(
    'empty qualification',
    result.qualification.qualified,
    false
  );
}

// 4. Existing 7C score preserved
{
  const profile = {
    version: '7C',
    readinessScore: 88,
    readinessBasis: [],
    dimensions: {
      technicalCompetency: 90,
      domainCompetency: 86,
      workflowExecution: 88,
      communication: 84,
      documentation: 87,
      professionalReliability: 92
    }
  };

  const result = Contract.createContract(
    {
      candidateId: 'CAND-002',
      roleId: 'ROLE-IT-001'
    },
    profile
  );

  check(
    '7C readinessScore preserved',
    result.professionalReadiness.readinessScore,
    88
  );

  check(
    'qualification preserves readinessScore',
    result.qualification.readinessScore,
    88
  );
}

// 5. Uninformed dimensions are null, not zero
{
  const profile = {
    version: '7C',
    readinessScore: 85,
    readinessBasis: [{
      kind: 'training',
      dimensions: ['technicalCompetency'],
      verified: true,
      source: 'career_training'
    }],
    dimensions: {
      technicalCompetency: 85,
      domainCompetency: 0,
      workflowExecution: 0,
      communication: 0,
      documentation: 0,
      professionalReliability: 0
    }
  };

  const result = Contract.createContract(
    { candidateId: 'CAND-003' },
    profile
  );

  const domain =
    result.professionalReadiness.dimensions.find(
      function (item) {
        return item.dimensionId === 'domainCompetency';
      }
    );

  check(
    'uninformed dimension is not informed',
    domain.informed,
    false
  );
  check(
    'uninformed dimension score is null',
    domain.score,
    null
  );
  check(
    'uninformed dimension is not a gap',
    domain.gap,
    false
  );
}

// 6. Identity / evidence / competency references
{
  const profile = {
    version: '7C',
    readinessScore: 84,
    readinessBasis: [{
      evidenceId: 'EV-001',
      kind: 'assessment',
      category: 'RCM',
      source: 'career_training',
      competency: 'denial_management',
      dimensions: [
        'domainCompetency',
        'workflowExecution'
      ],
      verified: true
    }]
  };

  const result = Contract.createContract(
    {
      candidateId: 'CAND-004',
      roleId: 'RCM-001',
      targetRole: 'Revenue Cycle Specialist'
    },
    profile
  );

  check(
    'competency domain captured',
    result.competencyDomains,
    ['denial_management']
  );
  check(
    'evidence count',
    result.evidenceRefs.length,
    1
  );
  check(
    'evidence identity',
    result.evidenceRefs[0].evidenceId,
    'EV-001'
  );
  check(
    'verified evidence count',
    result.provenance.verifiedEvidenceCount,
    1
  );
}

// 7. Staffing placement evidence stays outside readiness
{
  const profile = {
    version: '7C',
    readinessScore: 90,
    readinessBasis: [
      {
        evidenceId: 'TRAIN-001',
        kind: 'training',
        source: 'career_training',
        dimensions: ['technicalCompetency'],
        verified: true
      },
      {
        evidenceId: 'PLACE-001',
        kind: 'staffing_placement',
        source: 'staffing_pipeline',
        dimensions: ['technicalCompetency'],
        verified: true
      }
    ]
  };

  const result = Contract.createContract(
    { candidateId: 'CAND-005' },
    profile
  );

  check(
    'placement evidence excluded',
    result.evidenceRefs.length,
    1
  );
  check(
    'training evidence retained',
    result.evidenceRefs[0].evidenceId,
    'TRAIN-001'
  );
}

// 8. Explainable dimension gaps
{
  const profile = {
    version: '7C',
    readinessScore: 76,
    readinessBasis: [{
      kind: 'assessment',
      source: 'career_training',
      dimensions: [
        'technicalCompetency',
        'communication'
      ],
      verified: true
    }],
    dimensions: {
      technicalCompetency: 88,
      communication: 61
    }
  };

  const result = Contract.createContract(
    { candidateId: 'CAND-006' },
    profile
  );

  const communication =
    result.professionalReadiness.dimensions.find(
      function (item) {
        return item.dimensionId === 'communication';
      }
    );

  check(
    'communication is informed',
    communication.informed,
    true
  );
  check(
    'communication score',
    communication.score,
    61
  );
  check(
    'communication gap',
    communication.gap,
    true
  );
  check(
    'professional state',
    result.professionalReadiness.state,
    'developing'
  );
  check(
    'gap creates training action',
    result.trainingActions.length,
    1
  );
  check(
    'gap training dimension',
    result.trainingActions[0].dimensionId,
    'communication'
  );
}

// 9. TRAIN -> PRACTICE -> VERIFY
{
  const profile = {
    version: '7C',
    readinessScore: 72,
    readinessBasis: [{
      kind: 'assessment',
      source: 'career_training',
      dimensions: ['documentation'],
      verified: true
    }],
    dimensions: {
      documentation: 55
    }
  };

  const result = Contract.createContract(
    { candidateId: 'CAND-007' },
    profile
  );

  check(
    'gap training sequence',
    result.trainingActions[0].sequence,
    ['TRAIN', 'PRACTICE', 'VERIFY']
  );
}

// 10. Stable staffing qualification contract
{
  const profile = {
    version: '7C',
    readinessScore: 86,
    readinessBasis: [{
      kind: 'assessment',
      source: 'career_training',
      dimensions: ['technicalCompetency'],
      verified: true
    }],
    dimensions: {
      technicalCompetency: 86
    }
  };

  const result = Contract.createContract(
    {
      candidateId: 'CAND-008',
      roleId: 'ROLE-008'
    },
    profile
  );

  check(
    'qualification contract',
    result.qualification.contract,
    'professional_readiness_qualification'
  );
  check(
    'qualified candidate',
    result.qualification.qualified,
    true
  );
  check(
    'qualification score',
    result.qualification.readinessScore,
    86
  );
}

// 11. Dimension gap prevents qualification
{
  const profile = {
    version: '7C',
    readinessScore: 90,
    readinessBasis: [{
      kind: 'assessment',
      source: 'career_training',
      dimensions: [
        'technicalCompetency',
        'documentation'
      ],
      verified: true
    }],
    dimensions: {
      technicalCompetency: 90,
      documentation: 60
    }
  };

  const result = Contract.createContract(
    { candidateId: 'CAND-009' },
    profile
  );

  check(
    'gap prevents qualification',
    result.qualification.qualified,
    false
  );
  check(
    'qualification gap count',
    result.qualification.gapCount,
    1
  );
}

// 12. Assessment and interview state remain separate
{
  const profile = {
    version: '7C',
    readinessScore: 83,
    readinessBasis: [
      {
        kind: 'assessment',
        source: 'career_training',
        dimensions: ['domainCompetency'],
        verified: true
      },
      {
        kind: 'interview_prep',
        source: 'interview_prep',
        dimensions: ['communication'],
        verified: false
      }
    ],
    dimensions: {
      domainCompetency: 83,
      communication: 78
    }
  };

  const result = Contract.createContract(
    { candidateId: 'CAND-010' },
    profile
  );

  check(
    'assessment state',
    result.assessmentState.status,
    'evidenced'
  );
  check(
    'interview state',
    result.interviewReadiness.status,
    'evidenced'
  );
  check(
    'interview evidence count',
    result.interviewReadiness.evidenceCount,
    1
  );
}

// 13. Compatibility with actual 7C projection
{
  const Projection = loadProjection();

  const profile = Projection.project([
    {
      kind: 'assessment',
      category: 'RCM',
      source: 'career_training',
      dimensions: [
        'domainCompetency',
        'workflowExecution'
      ],
      score: 90,
      verified: true
    },
    {
      kind: 'interview_prep',
      category: 'interview',
      source: 'interview_prep',
      dimensions: ['communication'],
      score: 80,
      verified: true
    }
  ]);

  const result = Contract.createContract(
    {
      candidateId: 'CAND-011',
      roleId: 'ROLE-RCM',
      targetRole: 'Revenue Cycle Specialist'
    },
    profile
  );

  check(
    'projection contract type',
    result.contract,
    'professional_readiness'
  );
  check(
    'projection score preserved',
    result.professionalReadiness.readinessScore,
    profile.readinessScore
  );
  check(
    'projection evidence available',
    result.evidenceRefs.length >= 1,
    true
  );
  check(
    'projection provenance',
    result.provenance.projectionVersion,
    '7C'
  );
}

// 14. Governance provenance
{
  const profile = {
    version: '7C',
    readinessScore: 81,
    readinessBasis: [{
      kind: 'training',
      source: 'career_training',
      dimensions: ['technicalCompetency'],
      verified: true
    }]
  };

  const result = Contract.createContract(
    { candidateId: 'CAND-012' },
    profile
  );

  check(
    'provenance generator',
    result.provenance.generatedBy,
    'TSMProfessionalReadinessContract'
  );
  check(
    'provenance evidence count',
    result.provenance.evidenceCount,
    1
  );
  check(
    'provenance verified count',
    result.provenance.verifiedEvidenceCount,
    1
  );
}

console.log(
  '\nPHASE 9 PROFESSIONAL READINESS CONTRACT TESTS OK — ' +
  passed +
  ' checks passed'
);
