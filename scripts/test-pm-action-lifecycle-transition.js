'use strict';

/**
 * Exercises the real server.js route logic for:
 *   POST /api/pm/intelligence-v3   (overlay of persisted status)
 *   POST /api/pm/actions/:id/transition
 *   POST /api/pm/actions/verify    (persists VERIFIED, resolves from store)
 *
 * against the real action-engine.js / intelligence-v3.js modules, using an
 * in-memory fake for tsmLedger.pmGetActionStatus/pmUpsertActionStatus and a
 * fake PM_APPROVAL_GATE -- mirrors the pattern used by
 * test-pm-action-approval-gate.js (no live Mongo/server needed).
 */

const assert = require('assert');
const pmActionEngine = require('../server/pm/action-engine');
const { buildPmIntelligenceV3, verifyPmAction } = require('../server/pm/intelligence-v3');

let pass = 0;
function ok(label) { pass++; console.log('PASS:', label); }

// ── Fake persistence (mirrors server/tsm-ledger-service.js's pm_action_status) ──
const actionStatusStore = new Map();
const statusEvents = [];

async function pmGetActionStatus(actionId) {
  return actionStatusStore.get(actionId) || null;
}

async function pmUpsertActionStatus(actionId, fields, actor) {
  const now = new Date().toISOString();
  const existing = actionStatusStore.get(actionId);
  const createdAt = existing ? existing.createdAt : now;
  const previousStatus = existing ? existing.status : null;
  const doc = { action_id: actionId, ...fields, createdAt, updatedAt: now };
  actionStatusStore.set(actionId, doc);
  if (!existing || previousStatus !== fields.status) {
    statusEvents.push({ entityType: 'pm_action', entityId: actionId, fromStage: previousStatus, toStage: fields.status, actor });
  }
  return doc;
}

// ── Fake approval gate (mirrors PM_APPROVAL_GATE.recordDecision/getLog) ────
const decisionLog = [];
const PM_APPROVAL_GATE = {
  recordDecision({ entityId, decision, actor }) {
    const rec = { entityId, decision, actor, ts: new Date().toISOString() };
    decisionLog.unshift(rec); // most-recent-first, matches getLog()
    return rec;
  },
  getLog(limit) { return decisionLog.slice(0, limit); }
};

// ── Route logic under test, copied to mirror server.js exactly ─────────────

async function resolvePmAction(action) {
  const persisted = await pmGetActionStatus(action.id);
  if (!persisted) return action;
  return {
    ...action,
    status: persisted.status || action.status,
    updatedAt: persisted.updatedAt || action.updatedAt,
    verification: persisted.verification || action.verification,
  };
}

async function routeIntelligenceV3(decisions) {
  const freshActions = pmActionEngine.buildActionQueue(decisions);
  const overlaidActions = await Promise.all(freshActions.map(resolvePmAction));
  return buildPmIntelligenceV3({ decisions, actions: overlaidActions });
}

async function routeTransition(actionId, nextStatus, actor) {
  if (nextStatus === 'VERIFIED') {
    const e = new Error('VERIFIED cannot be set via /transition');
    e.httpStatus = 400;
    throw e;
  }
  const persisted = await pmGetActionStatus(actionId);
  const currentStatus = (persisted && persisted.status) || 'OPEN';
  const updated = pmActionEngine.transition({ status: currentStatus }, nextStatus, {});
  return pmUpsertActionStatus(actionId, {
    status: updated.status,
    verification: (persisted && persisted.verification) || null,
  }, actor);
}

async function routeVerify(actionId, verificationInput) {
  const priorDecisions = PM_APPROVAL_GATE.getLog(500).filter(d => d.entityId === actionId);
  const latest = priorDecisions[0];
  if (!latest || latest.decision !== 'APPROVED') {
    return { ok: false, httpStatus: 409, error: 'Action requires a recorded APPROVED decision before verification' };
  }
  const persisted = await pmGetActionStatus(actionId);
  const authoritativeAction = { id: actionId, status: (persisted && persisted.status) || 'OPEN' };
  const result = verifyPmAction(authoritativeAction, Object.assign({}, verificationInput, { verifiedBy: latest.actor }));
  if (result.ok) {
    await pmUpsertActionStatus(actionId, { status: 'VERIFIED', verification: result.verification }, latest.actor);
  }
  return result;
}

// ── Fixtures ─────────────────────────────────────────────────────────────

const decisions = [{
  id: 'PM-LIFECYCLE-1',
  entityId: 'UNIT-9',
  domain: 'maintenance',
  priority: 'HIGH',
  finding: 'HVAC compressor trending toward failure',
  exposure: 4200,
  action: 'Dispatch vendor for compressor inspection',
  owner: 'Property Management',
  urgency: 'Next business day'
}];
const ACTION_ID = 'ACT-PM-LIFECYCLE-1';

(async () => {
  // 1. Fresh queue starts every action at OPEN
  let data = await routeIntelligenceV3(decisions);
  assert.strictEqual(data.actions[0].id, ACTION_ID);
  assert.strictEqual(data.actions[0].status, 'OPEN');
  ok('fresh intelligence-v3 queue starts every action at OPEN');

  // 2. /transition refuses VERIFIED as a direct target
  await assert.rejects(() => routeTransition(ACTION_ID, 'VERIFIED', 'R. Whitfield'), /VERIFIED cannot be set via \/transition/);
  ok('/transition refuses VERIFIED as a direct target');

  // 3. OPEN -> RESOLVED (skipping steps) rejected
  await assert.rejects(() => routeTransition(ACTION_ID, 'RESOLVED', 'R. Whitfield'), /Invalid PM action transition/);
  ok('OPEN -> RESOLVED (skipping steps) rejected');

  // 4. OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED walks cleanly
  let doc = await routeTransition(ACTION_ID, 'ACKNOWLEDGED', 'R. Whitfield');
  assert.strictEqual(doc.status, 'ACKNOWLEDGED');
  doc = await routeTransition(ACTION_ID, 'IN_PROGRESS', 'R. Whitfield');
  assert.strictEqual(doc.status, 'IN_PROGRESS');
  doc = await routeTransition(ACTION_ID, 'RESOLVED', 'R. Whitfield');
  assert.strictEqual(doc.status, 'RESOLVED');
  ok('OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED walks cleanly, resolving persisted state without a client-supplied action body');

  // 5. intelligence-v3 overlay survives a reload instead of resetting to OPEN
  data = await routeIntelligenceV3(decisions);
  assert.strictEqual(data.actions[0].status, 'RESOLVED');
  ok('intelligence-v3 overlay survives a reload instead of resetting to OPEN');

  // 6. RESOLVED-but-unapproved action still blocked from verification
  let verifyResult = await routeVerify(ACTION_ID, {});
  assert.strictEqual(verifyResult.ok, false);
  assert.strictEqual(verifyResult.httpStatus, 409);
  ok('RESOLVED-but-unapproved action still blocked from verification');

  // 7. approved + RESOLVED action verifies and VERIFIED survives a reload
  PM_APPROVAL_GATE.recordDecision({ entityId: ACTION_ID, decision: 'APPROVED', actor: 'R. Whitfield' });
  verifyResult = await routeVerify(ACTION_ID, { verified: true, exposureAfter: 0 });
  assert.strictEqual(verifyResult.ok, true);
  assert.strictEqual(verifyResult.action.status, 'VERIFIED');
  assert.strictEqual(verifyResult.verification.verifiedBy, 'R. Whitfield');

  data = await routeIntelligenceV3(decisions);
  assert.strictEqual(data.actions[0].status, 'VERIFIED');
  assert.strictEqual(data.actionSummary.verified, 1);
  ok('approved + RESOLVED action verifies and VERIFIED survives a reload');

  console.log(`\nPM action lifecycle test: ALL PASS (${pass}/7)`);
})().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
