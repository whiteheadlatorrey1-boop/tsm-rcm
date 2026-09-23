'use strict';

/**
 * L1 WORKFLOW / CLOSURE GATE REGRESSION
 *
 * Tests:
 *   - task classification
 *   - state-aware next action
 *   - required evidence
 *   - closure readiness
 *   - technician authority
 *
 * No ServiceNow calls.
 * No production writes.
 */

const assert = require('assert');

const {
  classifyTask,
  evaluateWorkflow
} = require('../server/l1-copilot/workflow-engine');

const {
  evaluateClosure,
  buildClosureChecklist
} = require('../server/l1-copilot/closure-gate');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}


/* ============================================================
   TASK CLASSIFICATION
   ============================================================ */

test('Explicit Incident classification is preserved', () => {
  const result = classifyTask({
    taskType: 'Incident'
  });

  assert.strictEqual(result.taskType, 'INCIDENT');
});

test('Onboarding can be classified from description', () => {
  const result = classifyTask({
    description: 'Prepare workstation for new hire onboarding'
  });

  assert.strictEqual(result.taskType, 'ONBOARDING');
});

test('Offboarding can be classified from description', () => {
  const result = classifyTask({
    description: 'Recover laptop for employee offboarding'
  });

  assert.strictEqual(result.taskType, 'OFFBOARDING');
});

test('Foot Move can be classified from description', () => {
  const result = classifyTask({
    description: 'Move user and equipment to new desk'
  });

  assert.strictEqual(result.taskType, 'FOOT MOVE');
});

test('Hardware Swap can be classified from description', () => {
  const result = classifyTask({
    description: 'Replace defective laptop with replacement device'
  });

  assert.strictEqual(result.taskType, 'HARDWARE SWAP');
});


/* ============================================================
   STATE-AWARE WORKFLOW
   ============================================================ */

test('New ticket → review required', () => {
  const result = evaluateWorkflow({
    state: 'New',
    taskType: 'Incident'
  });

  assert.strictEqual(result.nextAction, 'REVIEW');
  assert.strictEqual(result.readyForClosure, false);
});

test('Open ticket → review required', () => {
  const result = evaluateWorkflow({
    state: 'Open',
    taskType: 'Incident'
  });

  assert.strictEqual(result.nextAction, 'REVIEW');
  assert.strictEqual(result.readyForClosure, false);
});

test('Review does not automatically move ticket to In Progress', () => {
  const result = evaluateWorkflow({
    state: 'New',
    taskType: 'Onboarding'
  });

  assert.notStrictEqual(result.nextAction, 'SET IN PROGRESS');
  assert.strictEqual(result.canChangeState, false);
});

test('In Progress → active work allowed', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {}
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'USER VALIDATION');
});

test('Pending → dependency required', () => {
  const result = evaluateWorkflow({
    state: 'Pending',
    taskType: 'Incident'
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'RESOLVE DEPENDENCY');
});

test('On Hold → dependency required', () => {
  const result = evaluateWorkflow({
    state: 'On Hold',
    taskType: 'Hardware',
    dependencies: ['Waiting for replacement device']
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'RESOLVE DEPENDENCY');
});


/* ============================================================
   CLOSURE EVIDENCE
   ============================================================ */

test('Missing user validation blocks closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'USER VALIDATION');
});

test('Missing asset validation blocks closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'ASSET VALIDATION');
});

test('Required physical work not confirmed blocks closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Foot Move',
    evidence: {
      userVerified: true,
      assetVerified: true,
      tested: true,
      locationVerified: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'REQUIRED WORK');
});

test('Required testing not confirmed blocks closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Onboarding',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      locationVerified: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'FUNCTIONALITY TESTING');
});

test('Foot Move requires location verification', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Foot Move',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'VERIFY LOCATION');
});

test('Onboarding requires location verification', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Onboarding',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'VERIFY LOCATION');
});

test('Offboarding requires location verification', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Offboarding',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'VERIFY LOCATION');
});

test('Missing final work-note confirmation blocks closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.nextAction, 'FINAL WORK NOTE CONFIRMATION');
});


/* ============================================================
   READY FOR CLOSURE
   ============================================================ */

test('All required evidence confirmed → ready for closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, true);
  assert.strictEqual(result.nextAction, 'TECHNICIAN MAY CLOSE');
});

test('Complete Foot Move can become ready for closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Foot Move',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      locationVerified: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, true);
});

test('Complete Onboarding can become ready for closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Onboarding',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      locationVerified: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, true);
});

test('Complete Offboarding can become ready for closure', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Offboarding',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      locationVerified: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, true);
});


/* ============================================================
   CLOSURE GATE
   ============================================================ */

test('Closure gate blocks incomplete evidence', () => {
  const result = evaluateClosure({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
  assert.strictEqual(result.closureStatus, 'BLOCKED');
});

test('Closure gate reports READY FOR CLOSURE when evidence is complete', () => {
  const result = evaluateClosure({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.readyForClosure, true);
  assert.strictEqual(result.closureStatus, 'READY FOR CLOSURE');
});

test('Closure gate never permits autonomous close', () => {
  const result = evaluateClosure({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  });

  assert.strictEqual(result.autonomousCloseAllowed, false);
  assert.strictEqual(result.technicianAuthority, true);
});

test('Closure checklist exposes evidence state', () => {
  const checklist = buildClosureChecklist({
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: false,
      workConfirmed: true,
      tested: false,
      finalWorkNoteConfirmed: false
    }
  });

  assert.strictEqual(checklist.length, 5);
  assert.strictEqual(
    checklist.find(item => item.key === 'userVerified').confirmed,
    true
  );
  assert.strictEqual(
    checklist.find(item => item.key === 'assetVerified').confirmed,
    false
  );
});


/* ============================================================
   GOVERNANCE
   ============================================================ */

test('AI cannot independently declare closure without evidence', () => {
  const result = evaluateWorkflow({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {}
  });

  assert.strictEqual(result.readyForClosure, false);
});

test('Closure readiness is evidence-driven, not state-only', () => {
  const result = evaluateClosure({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: true
    }
  });

  assert.strictEqual(result.readyForClosure, false);
});

test('Technician confirmation is required before closure readiness', () => {
  const result = evaluateClosure({
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: false
    }
  });

  assert.strictEqual(result.readyForClosure, false);
});

test('Workflow engine never changes ServiceNow state', () => {
  const input = {
    state: 'New',
    taskType: 'Incident'
  };

  const result = evaluateWorkflow(input);

  assert.strictEqual(input.state, 'New');
  assert.strictEqual(result.canChangeState, false);
});

test('Closure gate never changes ServiceNow state', () => {
  const input = {
    state: 'In Progress',
    taskType: 'Incident',
    evidence: {
      userVerified: true,
      assetVerified: true,
      workConfirmed: true,
      tested: true,
      finalWorkNoteConfirmed: true
    }
  };

  evaluateClosure(input);

  assert.strictEqual(input.state, 'In Progress');
});


/* ============================================================
   SUMMARY
   ============================================================ */

console.log('');
console.log('==========================================');
console.log('L1 WORKFLOW / CLOSURE GATE REGRESSION');
console.log('==========================================');
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

console.log('');
console.log('L1 WORKFLOW / CLOSURE GATE: PASS');
