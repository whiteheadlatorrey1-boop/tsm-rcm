'use strict';
// Hand-checked unit tests for server/construction-bpo/change-orders.js.

const assert = require('assert');
const { evaluateChangeOrder, evaluateChangeOrders, summarizeStalledByJob, DEFAULT_SLA_HOURS } = require('../server/construction-bpo/change-orders');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

const ASOF = new Date('2026-01-10T00:00:00.000Z');

t('default SLA is 72 hours', () => {
  assert.strictEqual(DEFAULT_SLA_HOURS, 72);
});

t('open CO well within SLA: not stalled, no flags', () => {
  // submitted 10 hours before asOf -- ageHours = 10, under 72h
  const r = evaluateChangeOrder({ id: 'CO1', jobId: 'J1', status: 'pending', submittedAt: '2026-01-09T14:00:00.000Z' }, { asOf: ASOF });
  assert.strictEqual(r.ageHours, 10);
  assert.strictEqual(r.isOpen, true);
  assert.strictEqual(r.isStalled, false);
  assert.deepStrictEqual(r.flags, []);
});

t('open CO past the 72h default SLA: stalled, SLA_BREACH flag with overageHours', () => {
  // submitted 100 hours before asOf -- ageHours = 100, overage = 100-72 = 28
  const r = evaluateChangeOrder({ id: 'CO2', jobId: 'J1', status: 'pending', submittedAt: '2026-01-05T20:00:00.000Z' }, { asOf: ASOF });
  assert.strictEqual(r.ageHours, 100);
  assert.strictEqual(r.isStalled, true);
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'SLA_BREACH');
  assert.strictEqual(r.flags[0].slaHours, 72);
  assert.strictEqual(r.flags[0].overageHours, 28);
});

t('exactly at the SLA boundary (ageHours === slaHours) is NOT stalled -- strictly greater-than', () => {
  const r = evaluateChangeOrder({ id: 'CO3', jobId: 'J1', status: 'pending', submittedAt: '2026-01-07T00:00:00.000Z' }, { asOf: ASOF });
  assert.strictEqual(r.ageHours, 72);
  assert.strictEqual(r.isStalled, false);
});

t('a decided (approved) CO is never stalled, even if its open period exceeded SLA -- age measured to resolvedAt, not asOf', () => {
  // submitted 200h before asOf but resolved only 20h after submission -- within SLA at the time it was decided
  const r = evaluateChangeOrder({
    id: 'CO4', jobId: 'J2', status: 'approved',
    submittedAt: '2026-01-01T00:00:00.000Z', resolvedAt: '2026-01-01T20:00:00.000Z',
  }, { asOf: ASOF });
  assert.strictEqual(r.ageHours, 20);
  assert.strictEqual(r.isOpen, false);
  assert.strictEqual(r.isStalled, false, 'resolved COs cannot be stalled regardless of elapsed wall-clock time since resolution');
});

t('a custom slaHours overrides the 72h default', () => {
  const r = evaluateChangeOrder({ id: 'CO5', jobId: 'J1', status: 'pending', submittedAt: '2026-01-09T12:00:00.000Z' }, { asOf: ASOF, slaHours: 10 });
  // ageHours = 12, slaHours = 10 -> stalled
  assert.strictEqual(r.ageHours, 12);
  assert.strictEqual(r.isStalled, true);
});

t('missing submittedAt: ageHours/isStalled stay null/false, INVALID_SUBMITTED_AT flag with reason "missing"', () => {
  const r = evaluateChangeOrder({ id: 'CO6', jobId: 'J1', status: 'pending' }, { asOf: ASOF });
  assert.strictEqual(r.ageHours, null);
  assert.strictEqual(r.isStalled, false);
  assert.deepStrictEqual(r.flags, [{ type: 'INVALID_SUBMITTED_AT', id: 'CO6', jobId: 'J1', value: null, reason: 'missing' }]);
});

t('unparseable submittedAt: INVALID_SUBMITTED_AT flag with reason "unparseable" and the original bad value', () => {
  const r = evaluateChangeOrder({ id: 'CO7', jobId: 'J1', status: 'pending', submittedAt: 'not-a-date' }, { asOf: ASOF });
  assert.strictEqual(r.ageHours, null);
  assert.deepStrictEqual(r.flags, [{ type: 'INVALID_SUBMITTED_AT', id: 'CO7', jobId: 'J1', value: 'not-a-date', reason: 'unparseable' }]);
});

t('evaluateChangeOrders maps over a list', () => {
  const list = [
    { id: 'A', jobId: 'J1', status: 'pending', submittedAt: '2026-01-09T12:00:00.000Z' },
    { id: 'B', jobId: 'J2', status: 'pending', submittedAt: '2026-01-01T00:00:00.000Z' },
  ];
  const results = evaluateChangeOrders(list, { asOf: ASOF });
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].isStalled, false);
  assert.strictEqual(results[1].isStalled, true);
});

t('summarizeStalledByJob counts stalled COs per job, omitting jobs with zero', () => {
  const evaluated = evaluateChangeOrders([
    { id: 'A', jobId: 'J8', status: 'pending', submittedAt: '2026-01-01T00:00:00.000Z' }, // stalled
    { id: 'B', jobId: 'J8', status: 'pending', submittedAt: '2026-01-02T00:00:00.000Z' }, // stalled
    { id: 'C', jobId: 'J8', status: 'pending', submittedAt: '2026-01-03T00:00:00.000Z' }, // stalled
    { id: 'D', jobId: 'J1', status: 'pending', submittedAt: '2026-01-09T20:00:00.000Z' }, // not stalled
  ], { asOf: ASOF });
  assert.deepStrictEqual(summarizeStalledByJob(evaluated), { J8: 3 });
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
