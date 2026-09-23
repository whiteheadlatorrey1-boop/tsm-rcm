cd /workspaces/tsm-rcm

cat > scripts/test-l1-workflow-closure-gate.js <<'EOF'
'use strict';

/**
 * L1 WORKFLOW / CLOSURE GATE REGRESSION
 *
 * Test-first contract for:
 *   - task classification
 *   - state-aware next action
 *   - required evidence
 *   - closure readiness
 *   - technician authority
 *
 * This script is intentionally standalone.
 * It does not modify ServiceNow or production data.
 */

const assert = require('assert');

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

/**
 * Expected workflow contract.
 * Implementation should eventually move this logic into:
 *
 *   server/l1-copilot/workflow-engine.js
 *   server/l1-copilot/closure-gate.js
 */

function evaluateWorkflow(input) {
  const {
    state,
    taskType,
    evidence = {},
    dependencies = []
  } = input;

  const normalizedState = String(state || '').toUpperCase();
  const normalizedTask = String(taskType || 'OTHER').toUpperCase();

  if (normalizedState === 'NEW' || normalizedState === 'OPEN') {
    return {
      nextAction: 'REVIEW',
      readyForClosure: false,
      reason: 'Ticket must be reviewed before active work begins.'
    };
  }

  if (normalizedState === 'PENDING' || normalizedState === 'ON HOLD') {
    return {
      nextAction: 'RESOLVE DEPENDENCY',
      readyForClosure: false,
      reason: dependencies.length
        ? 'Ticket is blocked by an outstanding dependency.'
        : 'Pending/On Hold requires a documented dependency.'
    };
  }

  if (normalizedState === 'IN PROGRESS') {
    const required = [
      ['userVerified', 'User validation'],
      ['assetVerified', 'Asset validation'],
      ['workConfirmed', 'Required work'],
      ['tested', 'Functionality testing']
    ];

    for (const [key, label] of required) {
      if (evidence[key] !== true) {
        return {
          nextAction: label.toUpperCase(),
          readyForClosure: false,
          reason: `${label} has not been confirmed.`
        };
      }
    }

    if (
      ['FOOT MOVE', 'ONBOARDING', 'OFFBOARDING'].includes(normalizedTask) &&
      evidence.locationVerified !== true
    ) {
      return {
        nextAction: 'VERIFY LOCATION',
        readyForClosure: false,
        reason: 'Location verification is required for this task type.'
      };
    }

    if (evidence.finalWorkNoteConfirmed !== true) {
      return {
        nextAction: 'CONFIRM FINAL WORK NOTE',
        readyForClosure: false,
        reason: 'Technician must confirm the final work note.'
      };
    }

    return {
      nextAction: 'TECHNICIAN MAY CLOSE',
      readyForClosure: true,
      reason: 'Required closure evidence has been confirmed.'
    };
  }

  return {
    nextAction: 'REVIEW',
    readyForClosure: false,
    reason: 'Unknown state requires review.'
  };
}


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
  assert.strictEqual(result.readyForClosure, false);
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
  assert.strictEqual(result.nextAction, 'CONFIRM FINAL WORK NOTE');
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
  const result = evaluateWorkflow({
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
  const result = evaluateWorkflow({
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
EOF

node scripts/test-l1-workflow-closure-gate.js
