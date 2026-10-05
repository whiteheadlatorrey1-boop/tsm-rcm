'use strict';
const { runProductionControlPlane } = require('../server/vertical-control-plane/production');
let passed = 0, failed = 0;
function check(name, ok) { if (ok) { passed++; console.log('  ok  ' + name); } else { failed++; console.log('  FAIL ' + name); } }

const base = { vertical: 'native-approval-test', findings: [], exposures: [], events: [] };
const control = runProductionControlPlane({ ...base });
check('control: no native decision, low risk -> no approval', control.decisions[0].requiresApproval === false);

const native = runProductionControlPlane({ ...base, decisions: [{ type: 'CLOSURE_READINESS', requiresApproval: true }] });
check('native decision requiring approval forces approval', native.decisions[0].requiresApproval === true);

const notNative = runProductionControlPlane({ ...base, decisions: [{ type: 'X', requiresApproval: false }] });
check('native decision not requiring approval does not force it', notNative.decisions[0].requiresApproval === false);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
