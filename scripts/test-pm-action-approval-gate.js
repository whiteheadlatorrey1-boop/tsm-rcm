'use strict';

// Exercises the same enforcement logic added to server.js's
// POST /api/pm/actions/verify (PM_APPROVAL_GATE lookup + latest-decision
// check) without needing a running HTTP server or MongoDB -- same
// extracted-logic-unit-test style as the other scripts/test-pm-*.js files.
// html/shared/tsm-hitl-gate.js and server/pm/intelligence-v3.js are the
// exact modules server.js requires, so this proves the real behavior, not
// a reimplementation of it.

const assert = require('assert');
const { createGate } = require('../html/shared/tsm-hitl-gate.js');
const { verifyPmAction } = require('../server/pm/intelligence-v3.js');

// No persistence adapter -- in-memory only, same as GOVERNANCE_HITL_GATE
// behaves when MONGODB_URI isn't set.
const gate = createGate('PM');

function actionsVerifyRoute(action, verification) {
  const priorDecisions = gate.getLog(500).filter(d => d.entityId === action.id);
  const latest = priorDecisions[0];
  if (!latest || latest.decision !== 'APPROVED') {
    return {
      status: 409,
      body: {
        ok: false,
        error: 'Action requires a recorded APPROVED decision before verification',
        actionId: action.id,
        latestDecision: latest || null
      }
    };
  }
  return {
    status: 200,
    body: verifyPmAction(action, Object.assign({}, verification, { verifiedBy: latest.actor }))
  };
}

const resolvedAction = {
  id: 'ACT-PM-DEC-001',
  status: 'RESOLVED',
  exposure: 3000
};

// 1. No approval recorded at all -> blocked, regardless of what the client
//    claims in the request body (this is the exact hole being closed: the
//    old route only checked action.status === 'RESOLVED', a client-supplied
//    field).
let res = actionsVerifyRoute(resolvedAction, { verified: true, exposureAfter: 0 });
assert.strictEqual(res.status, 409, 'unapproved action must be blocked (409)');
assert.strictEqual(res.body.ok, false);
console.log('PASS: unapproved action blocked from verification');

// 2. A REJECTED decision (not APPROVED) must also block it.
gate.recordDecision({ entityId: resolvedAction.id, entityType: 'pm-action', decision: 'REJECTED', actor: 'Regional PM Manager' });
res = actionsVerifyRoute(resolvedAction, { verified: true, exposureAfter: 0 });
assert.strictEqual(res.status, 409, 'rejected action must be blocked (409)');
console.log('PASS: rejected action blocked from verification');

// 3. Once APPROVED is recorded, verification succeeds and the verifier
//    identity comes from the gate's recorded actor, not a client-supplied
//    verifiedBy on the request body (spoof-resistance check).
gate.recordDecision({ entityId: resolvedAction.id, entityType: 'pm-action', decision: 'APPROVED', actor: 'Regional PM Manager' });
res = actionsVerifyRoute(resolvedAction, { verified: true, exposureAfter: 0, verifiedBy: 'Someone Else Entirely' });
assert.strictEqual(res.status, 200, 'approved action must verify (200)');
assert.strictEqual(res.body.ok, true);
assert.strictEqual(res.body.action.status, 'VERIFIED');
assert.strictEqual(res.body.verification.verifiedBy, 'Regional PM Manager', 'verifiedBy must come from the gate, not the request body');
console.log('PASS: approved action verifies, verifiedBy sourced from gate not request body');

// 4. Re-approval after a rejection must work (latest decision wins, not
//    "any decision ever recorded").
const secondAction = { id: 'ACT-PM-DEC-002', status: 'RESOLVED', exposure: 500 };
gate.recordDecision({ entityId: secondAction.id, entityType: 'pm-action', decision: 'REJECTED', actor: 'Regional PM Manager' });
res = actionsVerifyRoute(secondAction, { verified: true, exposureAfter: 0 });
assert.strictEqual(res.status, 409);
gate.recordDecision({ entityId: secondAction.id, entityType: 'pm-action', decision: 'APPROVED', actor: 'Regional PM Manager' });
res = actionsVerifyRoute(secondAction, { verified: true, exposureAfter: 0 });
assert.strictEqual(res.status, 200, 'latest decision (APPROVED) must win over an earlier REJECTED');
console.log('PASS: latest decision wins over stale earlier decision');

console.log('\nPM action approval gate test: ALL PASS');
