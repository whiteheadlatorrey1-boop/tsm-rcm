'use strict';

// GOLDEN: pre-Phase-1B behavior of workflow-engine.getRequiredEvidence.
// Hard-coded on purpose so this stays independent of workflow-contract.js.
const assert = require('assert');
const engine = require('../../../server/l1-copilot/workflow-engine');

const U = { key: 'userVerified', label: 'User validation' };
const A = { key: 'assetVerified', label: 'Asset validation' };
const W = { key: 'workConfirmed', label: 'Required work' };
const T = { key: 'tested', label: 'Functionality testing' };
const L = { key: 'locationVerified', label: 'Location verification', nextAction: 'VERIFY LOCATION' };
const F = { key: 'finalWorkNoteConfirmed', label: 'Final work note confirmation' };

const GOLDEN = {
  'ONBOARDING': [U, A, W, T, L, F],
  'OFFBOARDING': [U, A, W, T, L, F],
  'FOOT MOVE': [U, A, W, T, L, F],
  'HARDWARE': [U, A, W, T, F],
  'HARDWARE SWAP': [U, A, W, T, F],
  'INCIDENT': [U, A, W, T, F],
  'OTHER': [U, A, W, T, F]
};

for (const [type, expected] of Object.entries(GOLDEN)) {
  assert.deepStrictEqual(engine.getRequiredEvidence(type), expected, `evidence drift for ${type}`);
  console.log(`PASS golden evidence ${type}`);
}
assert.deepStrictEqual(engine.getRequiredEvidence('footmove'), GOLDEN['FOOT MOVE']);
assert.deepStrictEqual(engine.getRequiredEvidence('nonsense'), GOLDEN['OTHER']);
console.log('PASS normalization aliases + unknown -> OTHER');
