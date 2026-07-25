'use strict';
const assert = require('assert');
const path = require('path');
const { makeSandbox, loadModel, loadStore } = require('./support/mission-store-harness');

// tests/unit/mission-store.operator-stats.spec.js -> repo root is 2 levels up
const REPO_ROOT = path.join(__dirname, '..', '..');

function freshStore() {
  const sandbox = makeSandbox();
  const Model = loadModel(sandbox, REPO_ROOT);
  const Store = loadStore(sandbox, REPO_ROOT);
  return { sandbox, Model, Store };
}

function makeAndCloseMission(Model, Store, vertical, opts) {
  const m = Model.createMission({
    tenantId: 'default',
    vertical: vertical,
    client: opts.client || null,
    workflow: {
      assignedTo: opts.assignedTo,
      queue: null,
      priority: 'normal',
      sla: null
    }
  });
  Store.saveMission(m);
  Store.assignMission(m.id, opts.assignedTo, 'test', opts.dueDate);
  if (opts.close) {
    // backdate completedAt/dueDate relationship via reviewOutcome + manual override
    const closed = Store.closeMission(m.id, 'test', opts.reviewOutcome);
    return closed;
  }
  return Store.getMission(m.id);
}

function run() {
  const { Model, Store } = freshStore();

  // Register one operator ("shared-op") who works BOTH insurance and legal.
  Store.upsertOperator({ id: 'shared-op', name: 'Shared Operator', specialties: ['insurance', 'legal'] });
  Store.upsertOperator({ id: 'ins-only-op', name: 'Insurance Only Operator', specialties: ['insurance'] });

  // shared-op: 3 open missions in LEGAL (heavy legal workload)
  for (let i = 0; i < 3; i++) {
    makeAndCloseMission(Model, Store, 'legal', { assignedTo: 'shared-op', close: false });
  }

  // shared-op: 1 open mission in INSURANCE
  makeAndCloseMission(Model, Store, 'insurance', { assignedTo: 'shared-op', close: false });

  // ins-only-op: 1 open mission in INSURANCE (same workload as shared-op's insurance-only slice)
  makeAndCloseMission(Model, Store, 'insurance', { assignedTo: 'ins-only-op', close: false });

  // --- Reproduce the bug ---
  // recommendAssignment('insurance') should only weigh INSURANCE workload.
  // shared-op has 1 open insurance mission (same as ins-only-op's 1),
  // so they should be tied on workload for an insurance recommendation.
  // Vertical-scoped call (what recommendAssignment now uses internally):
  const statsSharedScoped = Store.computeOperatorStats('shared-op', 'insurance');
  const statsInsOnly = Store.computeOperatorStats('ins-only-op', 'insurance');

  // Backward-compat call (no vertical arg = overall stats across all verticals,
  // still useful for an operator's own dashboard view):
  const statsSharedOverall = Store.computeOperatorStats('shared-op');

  console.log('computeOperatorStats(shared-op, "insurance"):', statsSharedScoped);
  console.log('computeOperatorStats(ins-only-op, "insurance"):', statsInsOnly);
  console.log('computeOperatorStats(shared-op) [no vertical, overall]:', statsSharedOverall);

  assert.strictEqual(statsSharedScoped.workload, 1,
    'FIX FAILED: vertical-scoped stats for shared-op should be 1 (insurance only), got ' + statsSharedScoped.workload);
  assert.strictEqual(statsInsOnly.workload, 1,
    'ins-only-op insurance workload should be 1, got ' + statsInsOnly.workload);
  assert.strictEqual(statsSharedOverall.workload, 4,
    'Overall (unscoped) stats should still show all 4 open missions across verticals, got ' + statsSharedOverall.workload);
  console.log('\n[PASS] computeOperatorStats now correctly scopes by vertical when a vertical is passed,\n' +
              'and still returns overall stats when called without one.\n');

  // Downstream: recommendAssignment('insurance') should now see both
  // candidates tied on workload (1 each), since shared-op's legal load
  // no longer leaks into the insurance comparison.
  const rec = Store.recommendAssignment('insurance');
  console.log('recommendAssignment(insurance) picked:', rec.operator.id, 'with stats:', rec.stats);
  assert.strictEqual(rec.stats.workload, 1,
    'recommendAssignment should now see a properly scoped workload of 1 for the picked operator');
  console.log('[PASS] recommendAssignment(insurance) no longer penalizes shared-op for legal-only workload.');

  console.log('\n=== SUMMARY ===');
  console.log('Fix verified: computeOperatorStats(operatorId, vertical) scopes correctly,');
  console.log('recommendAssignment(vertical) passes vertical through, and the no-vertical');
  console.log('call path (operator dashboards) remains backward compatible.');
}

run();
