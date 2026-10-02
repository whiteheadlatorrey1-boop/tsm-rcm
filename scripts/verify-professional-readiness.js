'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(
  __dirname,
  '../html/js/career'
);

const Contract = require(
  path.join(
    base,
    'tsm-professional-readiness-contract.js'
  )
);

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

const Projection =
  ctx.globalThis.TSMProfessionalReadinessProjection;

if (!Projection) {
  throw new Error('7C readiness projection unavailable');
}

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
    score: 84,
    verified: true
  }
]);

const contract = Contract.createContract(
  {
    candidateId: 'VERIFY-CANDIDATE',
    roleId: 'VERIFY-ROLE',
    targetRole: 'Professional Readiness Verification'
  },
  profile
);

const required = [
  'candidateId',
  'targetRole',
  'competencyDomains',
  'evidenceRefs',
  'assessmentState',
  'interviewReadiness',
  'professionalReadiness',
  'trainingActions',
  'qualification',
  'provenance'
];

required.forEach(function (key) {
  if (!(key in contract)) {
    throw new Error('Missing contract field: ' + key);
  }
});

if (
  contract.professionalReadiness.readinessScore !==
  profile.readinessScore
) {
  throw new Error('7C readinessScore was not preserved');
}

if (
  contract.provenance.projectionVersion !== '7C'
) {
  throw new Error('7C provenance was not preserved');
}

if (!Array.isArray(contract.trainingActions)) {
  throw new Error('Gap-to-training contract is missing');
}

console.log('PHASE 9 PROFESSIONAL READINESS VERIFY OK');
console.log('contract:', contract.contract);
console.log('version:', contract.version);
console.log('candidateId:', contract.candidateId);
console.log('roleId:', contract.targetRole.roleId);
console.log('readinessScore:', contract.professionalReadiness.readinessScore);
console.log('evidenceRefs:', contract.evidenceRefs.length);
console.log('competencyDomains:', contract.competencyDomains.length);
console.log('trainingActions:', contract.trainingActions.length);
console.log('qualification:', contract.qualification.qualified);
