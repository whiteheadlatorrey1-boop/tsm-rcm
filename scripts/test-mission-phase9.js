const fs = require('fs');
const vm = require('vm');
const path = require('path');

const REPO = require('path').resolve(__dirname, '..');

class MemStorage {
  constructor() { this.data = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; }
  setItem(k, v) { this.data[k] = String(v); }
  removeItem(k) { delete this.data[k]; }
  clear() { this.data = {}; }
}

function freshSandbox() {
  const sandbox = {};
  sandbox.console = console;
  sandbox.localStorage = new MemStorage();
  sandbox.window = sandbox; // so `typeof window !== 'undefined' ? window : globalThis` picks sandbox itself
  const ctx = vm.createContext(sandbox);

  const modelSrc = fs.readFileSync(path.join(REPO, 'html/shared/runtime/mission/mission-model.js'), 'utf8');
  const storeSrc = fs.readFileSync(path.join(REPO, 'html/shared/runtime/mission/mission-store.js'), 'utf8');
  vm.runInContext(modelSrc, ctx, { filename: 'mission-model.js' });
  vm.runInContext(storeSrc, ctx, { filename: 'mission-store.js' });

  return sandbox;
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + (ok ? '' : ` (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`));
  ok ? pass++ : fail++;
}

// ---- Test 1: createMission via the 8 Phase-2 call sites' workflow shape (no dueDate/completedAt/reviewOutcome passed) ----
{
  const sb = freshSandbox();
  const Model = sb.TSMMissionModel;
  const Store = sb.TSMMissionStore;

  const m = Model.createMission({
    vertical: 'construction',
    tenantId: 'default',
    workflow: { assignedTo: null, queue: null, priority: 'normal', sla: null }, // exact shape used by construction-strategist.html etc
    actor: 'construction-strategist'
  });
  check('createMission with legacy workflow shape: dueDate is undefined (not backfilled)', m.workflow.dueDate, undefined);
  check('createMission with legacy workflow shape: completedAt is undefined (not backfilled)', m.workflow.completedAt, undefined);
  check('createMission with legacy workflow shape: reviewOutcome is undefined (not backfilled)', m.workflow.reviewOutcome, undefined);
}

// ---- Test 2: assignMission backfills dueDate; closeMission sets completedAt/reviewOutcome ----
{
  const sb = freshSandbox();
  const Model = sb.TSMMissionModel;
  const Store = sb.TSMMissionStore;

  const m = Model.createMission({ vertical: 'construction', tenantId: 'default' });
  Store.saveMission(m);
  Store.upsertOperator({ id: 'op1', name: 'Op One', specialties: ['construction'] });

  Store.assignMission(m.id, 'op1', 'tester', '2026-08-01T00:00:00.000Z');
  let after = Store.getMission(m.id);
  check('assignMission: sets assignedTo', after.workflow.assignedTo, 'op1');
  check('assignMission: sets dueDate', after.workflow.dueDate, '2026-08-01T00:00:00.000Z');
  check('assignMission: transitions stage to assigned', after.stage, 'assigned');

  Store.closeMission(m.id, 'tester', 'accurate');
  after = Store.getMission(m.id);
  check('closeMission: sets stage closed', after.stage, 'closed');
  check('closeMission: sets reviewOutcome', after.workflow.reviewOutcome, 'accurate');
  check('closeMission: completedAt is set (truthy)', !!after.workflow.completedAt, true);
}

// ---- Test 3: closeMission rejects invalid reviewOutcome values silently (only 'accurate'/'corrected' allowed) ----
{
  const sb = freshSandbox();
  const Model = sb.TSMMissionModel;
  const Store = sb.TSMMissionStore;
  const m = Model.createMission({ vertical: 'construction', tenantId: 'default' });
  Store.saveMission(m);
  Store.closeMission(m.id, 'tester', 'bogus-value');
  const after = Store.getMission(m.id);
  check('closeMission: invalid reviewOutcome is silently dropped, stays null', after.workflow.reviewOutcome, null);
}

// ---- Test 4: computeOperatorStats basic SLA/accuracy math ----
{
  const sb = freshSandbox();
  const Model = sb.TSMMissionModel;
  const Store = sb.TSMMissionStore;
  Store.upsertOperator({ id: 'op1', name: 'Op One', specialties: ['construction'] });

  // Mission A: assigned with due date in the future, closed immediately -> SLA met, accurate
  const a = Store.saveMission(Model.createMission({ vertical: 'construction', tenantId: 'default' }));
  Store.assignMission(a.id, 'op1', 'tester', '2099-01-01T00:00:00.000Z');
  Store.closeMission(a.id, 'tester', 'accurate');

  // Mission B: assigned with due date in the past, closed now -> SLA missed, corrected
  const b = Store.saveMission(Model.createMission({ vertical: 'construction', tenantId: 'default' }));
  Store.assignMission(b.id, 'op1', 'tester', '2000-01-01T00:00:00.000Z');
  Store.closeMission(b.id, 'tester', 'corrected');

  // Mission C: still open (assigned, not closed) -> counts toward workload only
  const c = Store.saveMission(Model.createMission({ vertical: 'construction', tenantId: 'default' }));
  Store.assignMission(c.id, 'op1', 'tester');

  const stats = Store.computeOperatorStats('op1');
  check('computeOperatorStats: workload = 1 open mission', stats.workload, 1);
  check('computeOperatorStats: closedCount = 2', stats.closedCount, 2);
  check('computeOperatorStats: slaPercent = 50 (1 of 2 eligible met)', stats.slaPercent, 50);
  check('computeOperatorStats: accuracyPercent = 50 (1 accurate of 2 reviewed)', stats.accuracyPercent, 50);
}

// ---- Test 5: THE BUG — computeOperatorStats/recommendAssignment do not scope by vertical ----
{
  const sb = freshSandbox();
  const Model = sb.TSMMissionModel;
  const Store = sb.TSMMissionStore;

  // op1 works both construction and legal
  Store.upsertOperator({ id: 'op1', name: 'Op One', specialties: ['construction', 'legal'] });
  // op2 works only construction, lighter load
  Store.upsertOperator({ id: 'op2', name: 'Op Two', specialties: ['construction'] });

  // op1: heavy load in LEGAL (unrelated to the construction recommendation we're about to ask for)
  for (let i = 0; i < 5; i++) {
    const m = Store.saveMission(Model.createMission({ vertical: 'legal', tenantId: 'default' }));
    Store.assignMission(m.id, 'op1', 'tester');
  }
  // op1: just 1 open mission actually in construction
  const conM = Store.saveMission(Model.createMission({ vertical: 'construction', tenantId: 'default' }));
  Store.assignMission(conM.id, 'op1', 'tester');

  // op2: 1 open construction mission
  const con2 = Store.saveMission(Model.createMission({ vertical: 'construction', tenantId: 'default' }));
  Store.assignMission(con2.id, 'op2', 'tester');

  // Unscoped call (no vertical arg) preserves old cross-vertical behavior for any other callers relying on it
  const statsUnscoped = Store.computeOperatorStats('op1');
  check('computeOperatorStats(op1) with no vertical arg still returns all-vertical workload (backward compatible)',
    statsUnscoped.workload, 6);

  // Scoped call (as recommendAssignment now uses internally) isolates to just construction
  const statsScoped = Store.computeOperatorStats('op1', 'construction');
  check('FIX VERIFIED: computeOperatorStats(op1, "construction") workload = 1, legal missions excluded',
    statsScoped.workload, 1);

  const rec = Store.recommendAssignment('construction');
  check('FIX VERIFIED: recommendAssignment(construction) now compares op1 and op2 on equal footing (both workload=1), op1 wins tiebreak (no SLA data yet for either, stable sort keeps candidates order)',
    rec.operator.id, 'op1');
}

console.log(`\nPhase 9: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
