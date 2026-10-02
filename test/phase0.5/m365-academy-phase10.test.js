'use strict';

var assert = require('assert');

var contract = require('../../html/js/career/tsm-m365-academy-contract');
var curriculum = require('../../html/js/career/tsm-m365-academy-curriculum');
var training = require('../../html/js/career/tsm-m365-academy-training');
var evidence = require('../../html/js/career/tsm-m365-academy-evidence');
var readiness = require('../../html/js/career/tsm-m365-academy-readiness');
var progress = require('../../html/js/career/tsm-m365-academy-progress');
var dashboard = require('../../html/js/career/tsm-m365-academy-dashboard');
var governance = require('../../html/js/career/tsm-m365-academy-governance');
var boundary = require('../../html/js/career/tsm-m365-academy-boundary');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS: ' + name);
  } catch (error) {
    failed += 1;
    console.error('FAIL: ' + name);
    console.error(error.message);
  }
}

var modules = curriculum.listModules();

test('10A academy contract identity', function () {
  var value = contract.createContract({
    candidate: { candidateId: 'CAND-10' },
    modules: modules
  });

  assert.strictEqual(value.contract, 'microsoft_365_academy');
  assert.strictEqual(value.candidate.candidateId, 'CAND-10');
});

test('10A stable completion contract', function () {
  var value = contract.createContract({
    candidate: { candidateId: 'CAND-10' },
    modules: modules,
    completedModules: 2
  });

  assert.strictEqual(value.completion.totalModules, modules.length);
  assert.strictEqual(value.completion.completedModules, 2);
});

test('10B curriculum has modules', function () {
  assert.ok(modules.length >= 10);
});

test('10B core Microsoft 365 products represented', function () {
  var products = modules.map(function (m) { return m.product; });

  [
    'Outlook',
    'Microsoft Teams',
    'Word',
    'Excel',
    'PowerPoint',
    'OneDrive',
    'SharePoint'
  ].forEach(function (product) {
    assert.ok(products.indexOf(product) >= 0, product + ' missing');
  });
});

test('10B administration track represented', function () {
  assert.ok(curriculum.getTrack('m365_administration').length >= 2);
});

test('10C deterministic TRAIN PRACTICE VERIFY sequence', function () {
  var plan = training.createModulePlan(modules[0]);

  assert.deepStrictEqual(
    plan.sequence,
    ['TRAIN', 'PRACTICE', 'VERIFY']
  );
});

test('10C practice requires evidence', function () {
  var plan = training.createModulePlan(modules[0]);

  assert.throws(function () {
    training.advance(plan, 'PRACTICE', false);
  });
});

test('10C verification completes module', function () {
  var plan = training.createModulePlan(modules[0]);
  var result = training.advance(plan, 'VERIFY', true);

  assert.strictEqual(result.completed, true);
  assert.strictEqual(result.state, 'verified');
});

var records = [
  {
    evidenceId: 'M365-EVID-001',
    candidateId: 'CAND-10',
    moduleId: 'M365-OUTLOOK-001',
    product: 'Outlook',
    competencyRefs: [
      'tool_usage',
      'professional_communication'
    ],
    stage: 'VERIFY',
    verified: true
  },
  {
    evidenceId: 'M365-EVID-002',
    candidateId: 'CAND-10',
    moduleId: 'M365-EXCEL-001',
    product: 'Excel',
    competencyRefs: [
      'tool_usage',
      'decision_making'
    ],
    stage: 'PRACTICE',
    verified: false
  }
];

test('10D evidence is candidate linked', function () {
  var result = evidence.aggregate(records, 'CAND-10');

  assert.strictEqual(result.evidenceCount, 2);
  assert.strictEqual(result.candidateId, 'CAND-10');
});

test('10D verified evidence is counted', function () {
  var result = evidence.aggregate(records, 'CAND-10');

  assert.strictEqual(result.verifiedEvidenceCount, 1);
});

test('10D duplicate evidence is removed', function () {
  var duplicated = records.concat([records[0]]);
  var result = evidence.aggregate(duplicated, 'CAND-10');

  assert.strictEqual(result.evidenceCount, 2);
});

test('10E competency maps to readiness dimension', function () {
  var result = readiness.mapCompetency('tool_usage');

  assert.strictEqual(result.mapped, true);
  assert.strictEqual(result.dimensionId, 'technicalCompetency');
});

test('10E academy does not replace readiness scoring', function () {
  var result = readiness.summarize(
    evidence.aggregate(records, 'CAND-10').evidence
  );

  assert.strictEqual(result.replacementScoring, false);
});

var learner = progress.createProgress(
  'CAND-10',
  'M365-OUTLOOK-001'
);

test('10F training event advances learner', function () {
  learner = progress.applyEvent(learner, {
    type: 'train_completed'
  });

  assert.strictEqual(learner.state, 'practice');
});

test('10F practice completion advances verification', function () {
  learner = progress.applyEvent(learner, {
    type: 'practice_completed',
    evidenceId: 'EVID-1'
  });

  assert.strictEqual(learner.state, 'verification');
});

test('10F verification produces verified state', function () {
  learner = progress.applyEvent(learner, {
    type: 'verification_passed',
    evidenceId: 'EVID-2',
    timestamp: '2026-10-02T00:00:00Z'
  });

  assert.strictEqual(learner.verified, true);
  assert.strictEqual(learner.state, 'verified');
});

test('10G dashboard contract', function () {
  var c = contract.createContract({
    candidate: { candidateId: 'CAND-10' },
    modules: modules,
    completedModules: 1
  });

  var d = dashboard.buildDashboard(
    c,
    progress.summarize([learner]),
    evidence.aggregate(records, 'CAND-10')
  );

  assert.strictEqual(
    d.contract,
    'microsoft_365_academy_dashboard'
  );
  assert.strictEqual(d.candidateId, 'CAND-10');
});

test('10H governance accepts valid contract', function () {
  var c = contract.createContract({
    candidate: { candidateId: 'CAND-10' },
    modules: modules,
    evidenceRefs: ['EVID-1']
  });

  var result = governance.validate(c);

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.controls.registryRemainsCanonical, true);
});

test('10H governance rejects missing candidate', function () {
  var c = contract.createContract({
    candidate: {},
    modules: modules
  });

  var result = governance.validate(c);

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.failures.indexOf('candidate_identity_required') >= 0
  );
});

test('10I readiness boundary is evidence only', function () {
  var c = contract.createContract({
    candidate: { candidateId: 'CAND-10' },
    modules: modules
  });

  var result = boundary.toProfessionalReadinessInput(
    c,
    evidence.aggregate(records, 'CAND-10')
  );

  assert.strictEqual(result.candidateId, 'CAND-10');
  assert.strictEqual(result.registryWrite, false);
  assert.strictEqual(result.replacementScoring, false);
});

test('10I staffing owns placement lifecycle', function () {
  var c = contract.createContract({
    candidate: { candidateId: 'CAND-10' },
    modules: modules
  });

  var result = boundary.staffingBoundary(c);

  assert.strictEqual(result.academyWritesPlacementState, false);
  assert.strictEqual(result.staffingOwnsPlacementLifecycle, true);
});

console.log('');
console.log(
  'PHASE 10 MICROSOFT 365 ACADEMY TESTS — ' +
  passed + ' passed, ' + failed + ' failed'
);

if (failed) process.exit(1);
