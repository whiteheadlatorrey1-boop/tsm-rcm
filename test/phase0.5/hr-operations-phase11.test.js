'use strict';

var assert = require('assert');

var contract =
  require('../../html/js/career/tsm-hr-operations-contract');

var lifecycle =
  require('../../html/js/career/tsm-hr-lifecycle');

var onboarding =
  require('../../html/js/career/tsm-hr-onboarding');

var offboarding =
  require('../../html/js/career/tsm-hr-offboarding');

var records =
  require('../../html/js/career/tsm-hr-records');

var cases =
  require('../../html/js/career/tsm-hr-case');

var compliance =
  require('../../html/js/career/tsm-hr-compliance');

var dashboard =
  require('../../html/js/career/tsm-hr-dashboard');

var boundary =
  require('../../html/js/career/tsm-hr-boundary');

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

/* 11A */

test('11A HR contract identity', function () {
  var value = contract.createContract({
    worker: {
      workerId: 'WORKER-11'
    }
  });

  assert.strictEqual(value.contract, 'hr_operations');
  assert.strictEqual(value.worker.workerId, 'WORKER-11');
});

test('11A employment state defaults to prehire', function () {
  var value = contract.createEmptyContract('WORKER-11');

  assert.strictEqual(value.employment.state, 'prehire');
});

/* 11B */

test('11B lifecycle starts prehire', function () {
  var value = lifecycle.createLifecycle('WORKER-11');

  assert.strictEqual(value.state, 'prehire');
});

test('11B prehire can become active', function () {
  var value = lifecycle.transition('prehire', 'active');

  assert.strictEqual(value.to, 'active');
});

test('11B ended is terminal', function () {
  assert.strictEqual(
    lifecycle.canTransition('ended', 'active'),
    false
  );
});

test('11B actor recorded in lifecycle history', function () {
  var value = lifecycle.applyTransition(
    lifecycle.createLifecycle('WORKER-11'),
    'active',
    'HR-ADMIN'
  );

  assert.strictEqual(value.history[0].actorId, 'HR-ADMIN');
});

/* 11C */

test('11C onboarding creates deterministic tasks', function () {
  var plan = onboarding.createPlan('WORKER-11');

  assert.ok(plan.tasks.length >= 8);
  assert.strictEqual(plan.process, 'onboarding');
});

test('11C onboarding task completion requires evidence reference', function () {
  var plan = onboarding.createPlan('WORKER-11');

  plan = onboarding.completeTask(
    plan,
    plan.tasks[0].taskId,
    'DOC-001'
  );

  assert.strictEqual(plan.tasks[0].status, 'completed');
  assert.strictEqual(plan.tasks[0].evidenceRef, 'DOC-001');
});

/* 11D */

test('11D offboarding creates deterministic tasks', function () {
  var plan = offboarding.createPlan('WORKER-11');

  assert.ok(plan.tasks.length >= 8);
  assert.strictEqual(plan.process, 'offboarding');
});

test('11D offboarding task records evidence', function () {
  var plan = offboarding.createPlan('WORKER-11');

  plan = offboarding.completeTask(
    plan,
    plan.tasks[0].taskId,
    'EXIT-001'
  );

  assert.strictEqual(plan.tasks[0].status, 'completed');
  assert.strictEqual(plan.tasks[0].evidenceRef, 'EXIT-001');
});

/* 11E */

test('11E HR record identity', function () {
  var record = records.createRecord({
    recordId: 'REC-001',
    workerId: 'WORKER-11',
    type: 'employment',
    title: 'Employment Record'
  });

  assert.strictEqual(
    records.validateRecord(record).valid,
    true
  );
});

test('11E records filter by worker', function () {
  var result = records.listByWorker([
    {
      recordId: 'REC-1',
      workerId: 'WORKER-11'
    },
    {
      recordId: 'REC-2',
      workerId: 'OTHER'
    }
  ], 'WORKER-11');

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].recordId, 'REC-1');
});

/* 11F */

test('11F HR case starts open', function () {
  var value = cases.createCase({
    caseId: 'CASE-001',
    workerId: 'WORKER-11',
    subject: 'Benefits question'
  });

  assert.strictEqual(value.state, 'open');
});

test('11F HR case transitions to in_progress', function () {
  var value = cases.createCase({
    caseId: 'CASE-001',
    workerId: 'WORKER-11'
  });

  value = cases.transition(
    value,
    'in_progress',
    'HR-ADMIN'
  );

  assert.strictEqual(value.state, 'in_progress');
  assert.strictEqual(value.history[0].actorId, 'HR-ADMIN');
});

test('11F closed HR case is terminal', function () {
  var value = cases.createCase({
    caseId: 'CASE-001',
    workerId: 'WORKER-11'
  });

  value = cases.transition(value, 'closed');

  assert.throws(function () {
    cases.transition(value, 'open');
  });
});

/* 11G */

test('11G compliance evidence is worker linked', function () {
  var value = compliance.createEvidence({
    evidenceId: 'COMP-001',
    workerId: 'WORKER-11',
    requirementId: 'POLICY-001',
    type: 'policy_acknowledgment'
  });

  assert.strictEqual(
    compliance.validateEvidence(value).valid,
    true
  );
});

test('11G verified compliance evidence is counted', function () {
  var value = compliance.summarize([
    { verified: true, status: 'complete' },
    { verified: false, status: 'pending' }
  ]);

  assert.strictEqual(value.verified, 1);
  assert.strictEqual(value.pending, 1);
});

/* 11H */

test('11H dashboard contract', function () {
  var value = dashboard.buildDashboard({
    lifecycle: {
      workerId: 'WORKER-11',
      state: 'active'
    },
    cases: [],
    complianceEvidence: []
  });

  assert.strictEqual(
    value.contract,
    'hr_operations_dashboard'
  );
  assert.strictEqual(value.workerId, 'WORKER-11');
});

test('11H dashboard does not write state', function () {
  var value = dashboard.buildDashboard({
    lifecycle: {
      workerId: 'WORKER-11',
      state: 'active'
    }
  });

  assert.strictEqual(
    value.boundaries.dashboardWritesState,
    false
  );
});

/* 11I */

test('11I staffing retains placement ownership', function () {
  var value = boundary.buildBoundary('WORKER-11');

  assert.strictEqual(
    value.staffing.ownsPlacementLifecycle,
    true
  );
});

test('11I HR owns employment lifecycle', function () {
  var value = boundary.buildBoundary('WORKER-11');

  assert.strictEqual(
    value.hr.ownsEmploymentLifecycle,
    true
  );
});

test('11I staffing and HR state boundaries remain separate', function () {
  var value = boundary.buildBoundary('WORKER-11');

  assert.strictEqual(
    value.controls.hrDoesNotRewriteStaffingPlacement,
    true
  );

  assert.strictEqual(
    value.controls.staffingDoesNotRewriteEmploymentState,
    true
  );
});

console.log('');
console.log(
  'PHASE 11 HR OPERATIONS TESTS — ' +
  passed + ' passed, ' + failed + ' failed'
);

if (failed) process.exit(1);
