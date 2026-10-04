'use strict';

const assert = require('assert');

const {
  WORKFLOW_IDS,
  GATES,
  getWorkflow,
  listWorkflows,
  getRequiredEvidence,
  getRequiredReads,
  getGates
} = require('../../../server/l1-copilot/workflow-contract');
const engine = require('../../../server/l1-copilot/workflow-engine');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test('all declared workflow IDs resolve', () => {
  for (const id of WORKFLOW_IDS) {
    const workflow = getWorkflow(id);
    assert.strictEqual(workflow.id, id);
    assert.ok(workflow.label);
    assert.ok(workflow.category);
  }
});

test('workflow list is deterministic', () => {
  const workflows = listWorkflows();
  assert.strictEqual(workflows.length, WORKFLOW_IDS.length);
  assert.deepStrictEqual(workflows.map(w => w.id), [...WORKFLOW_IDS]);
});

test('disposition requires governance and security gates', () => {
  const gates = getGates('DISPOSITION');
  for (const g of ['ASSESS', 'SECURITY', 'HUMAN_CONFIRMATION', 'APPROVAL', 'VERIFICATION', 'CLOSURE']) {
    assert.ok(gates.includes(GATES[g]), `missing gate ${g}`);
  }
});

test('disposition requires sanitization and approval evidence', () => {
  const evidence = getRequiredEvidence('DISPOSITION');
  for (const k of ['approvalObtained', 'sanitizationVerified', 'dispositionCompleted', 'assetReconciled']) {
    assert.ok(evidence.includes(k), `missing evidence ${k}`);
  }
});

test('disposition requires asset lifecycle reads', () => {
  const reads = getRequiredReads('DISPOSITION');
  for (const r of ['ASSET', 'WARRANTY', 'REPAIR_HISTORY', 'OWNERSHIP', 'LOANER_STATUS']) {
    assert.ok(reads.includes(r), `missing read ${r}`);
  }
});

test('unknown workflow is rejected', () => {
  assert.throws(
    () => getWorkflow('MAKE_IT_DISAPPEAR'),
    err => err.code === 'UNKNOWN_L1_WORKFLOW'
  );
});

test('lost/stolen workflow requires security gate', () => {
  const gates = getGates('LOST_STOLEN');
  assert.ok(gates.includes(GATES.SECURITY));
  assert.ok(gates.includes(GATES.HUMAN_CONFIRMATION));
});

// Parity: contract evidence for workflows the live engine already knows must
// match the engine's required evidence exactly, so Phase 1B cannot change behavior.
test('contract evidence matches live workflow-engine for existing task types', () => {
  const map = {
    ONBOARDING: 'ONBOARDING',
    OFFBOARDING: 'OFFBOARDING',
    FOOT_MOVE: 'FOOT MOVE',
    HARDWARE: 'HARDWARE',
    HARDWARE_SWAP: 'HARDWARE SWAP',
    INCIDENT: 'INCIDENT'
  };
  for (const [contractId, engineType] of Object.entries(map)) {
    const engineKeys = engine.getRequiredEvidence(engineType).map(r => r.key).sort();
    const contractKeys = getRequiredEvidence(contractId).sort();
    assert.deepStrictEqual(contractKeys, engineKeys, `${contractId} drifts from engine (${engineType})`);
  }
});

console.log('\nL1 workflow contract tests complete.');

test('asset recovery workflow contract is complete', () => {
  const workflow = getWorkflow('ASSET_RECOVERY');

  assert.deepStrictEqual(
    workflow.requiredReads,
    ['USER', 'ASSET', 'TASK']
  );

  assert.deepStrictEqual(
    getGates('ASSET_RECOVERY'),
    [
      GATES.READ,
      GATES.RECONCILE,
      GATES.ASSESS,
      GATES.EXECUTION,
      GATES.VERIFICATION,
      GATES.CLOSURE
    ]
  );

  assert.deepStrictEqual(
    getRequiredEvidence('ASSET_RECOVERY'),
    [
      'userVerified',
      'assetVerified',
      'workConfirmed',
      'tested',
      'finalWorkNoteConfirmed'
    ]
  );
});

test('software fulfillment workflow contract is complete', () => {
  const workflow = getWorkflow('SOFTWARE_FULFILLMENT');

  assert.deepStrictEqual(
    workflow.requiredReads,
    ['RITM', 'SC_TASK', 'USER']
  );

  assert.deepStrictEqual(
    getGates('SOFTWARE_FULFILLMENT'),
    [
      GATES.READ,
      GATES.RECONCILE,
      GATES.ASSESS,
      GATES.EXECUTION,
      GATES.VERIFICATION,
      GATES.CLOSURE
    ]
  );

  assert.deepStrictEqual(
    getRequiredEvidence('SOFTWARE_FULFILLMENT'),
    [
      'userVerified',
      'workConfirmed',
      'tested',
      'finalWorkNoteConfirmed'
    ]
  );
});

console.log('PASS Asset Recovery + Software Fulfillment contracts');

