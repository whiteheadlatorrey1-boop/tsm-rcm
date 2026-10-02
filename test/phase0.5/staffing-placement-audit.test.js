'use strict';
if (typeof describe === 'undefined') {
  global.describe = (n, f) => { console.log(n); f(); };
  global.it = (n, f) => { f(); console.log('  ok - ' + n); };
}
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../html/js/career/tsm-staffing-audit.js');
const A = require(file);
const Svc = fs.readFileSync(path.join(__dirname, '../../server/staffing-engine-service.js'), 'utf8');

const plc = () => ({ placementId: 'p1', candidateId: 'c1', jobOrderId: 'j1', status: 'submitted' });
const args = () => ({ placement: plc(), to: 'interviewing', actorId: 'u1', at: '2026-10-02T00:00:00.000Z', historyIndex: 1 });

describe('Placement audit events', function () {
  it('is pure: no imports, clock, randomness or I/O', function () {
    const src = fs.readFileSync(file, 'utf8');
    ['require(', 'Date.now', 'new Date(', 'Math.random', 'process.', 'fs.', 'fetch('].forEach(t =>
      assert.ok(!src.includes(t), 'found forbidden token ' + t));
  });
  it('builds a complete event from a status change', function () {
    const e = A.buildStatusChangeEvent(args());
    assert.deepStrictEqual(Object.assign({}, e), {
      auditEventId: 'p1:1:interviewing', schemaVersion: 1, type: 'placement.interviewing',
      placementId: 'p1', candidateId: 'c1', jobOrderId: 'j1',
      from: 'submitted', to: 'interviewing', actorId: 'u1',
      at: '2026-10-02T00:00:00.000Z', historyIndex: 1
    });
  });
  it('is deterministic (same input, same event id)', function () {
    assert.strictEqual(A.buildStatusChangeEvent(args()).auditEventId, A.buildStatusChangeEvent(args()).auditEventId);
  });
  it('records a missing actor as null, never invented', function () {
    const a = args(); delete a.actorId;
    assert.strictEqual(A.buildStatusChangeEvent(a).actorId, null);
  });
  it('rejects bad input', function () {
    assert.throws(() => A.buildStatusChangeEvent(null));
    assert.throws(() => A.buildStatusChangeEvent(Object.assign(args(), { to: 'hired' })));
    assert.throws(() => A.buildStatusChangeEvent(Object.assign(args(), { at: 'yesterday' })));
    assert.throws(() => A.buildStatusChangeEvent(Object.assign(args(), { historyIndex: -1 })));
    assert.throws(() => A.buildStatusChangeEvent(Object.assign(args(), { placement: {} })));
  });
  it('returns a frozen event and does not mutate input', function () {
    const a = args(); Object.freeze(a.placement);
    const e = A.buildStatusChangeEvent(a);
    assert.ok(Object.isFrozen(e));
    assert.strictEqual(a.placement.status, 'submitted');
  });
  it('has no protected-class or free-text fields', function () {
    const keys = Object.keys(A.buildStatusChangeEvent(args())).sort();
    assert.deepStrictEqual(keys, ['actorId','at','auditEventId','candidateId','from','historyIndex','jobOrderId','placementId','schemaVersion','to','type']);
  });
  it('statuses match the staffing engine VALID_STATUSES', function () {
    A.STATUSES.forEach(s => assert.ok(Svc.includes("'" + s + "'"), 'service missing ' + s));
  });
});

describe('Placement audit wiring (source checks)', function () {
  it('is flag-gated and defaults off', function () {
    assert.ok(Svc.includes("process.env.STAFFING_PLACEMENT_AUDIT === '1'"));
  });
  it('is called after the status update is persisted', function () {
    const i = Svc.indexOf('await recordPlacementAudit(');
    assert.ok(i > -1, 'call missing');
    assert.ok(Svc.slice(Math.max(0, i - 200), i).includes('updateOne({ placementId }, { $set: update })'));
  });
  it('is best-effort: failures are caught and never thrown', function () {
    const s = Svc.indexOf('async function recordPlacementAudit');
    const body = Svc.slice(s, Svc.indexOf('\n}\n', s));
    assert.ok(body.includes('try {') && body.includes('catch'));
    assert.ok(!/throw\s/.test(body));
  });
});
