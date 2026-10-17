'use strict';
// Unit tests for server/construction-bpo/metrics.js -- pure compute, no
// Mongo/HTTP (see scripts/test-construction-bpo-metrics-route.js for the
// route-level wiring: auth, storage, controller-time logging).

const assert = require('assert');
const { phoenixWednesdayDeadline, buildPilotMetrics } = require('../server/construction-bpo/metrics');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

t('phoenixWednesdayDeadline: Friday weekEnding -> the following Wednesday, 23:59:59.999 -07:00', () => {
  const d = phoenixWednesdayDeadline('2026-01-09'); // a Friday
  assert.strictEqual(d.toISOString(), '2026-01-15T06:59:59.999Z'); // 23:59:59.999 Phoenix = 06:59:59.999 UTC next day
});

t('phoenixWednesdayDeadline: weekEnding itself a Wednesday -> the NEXT Wednesday, not same-day', () => {
  const d = phoenixWednesdayDeadline('2026-01-07'); // a Wednesday
  assert.strictEqual(d.toISOString(), '2026-01-15T06:59:59.999Z'); // 8 days later, not the same day
});

t('phoenixWednesdayDeadline: rejects a malformed weekEnding', () => {
  assert.throws(() => phoenixWednesdayDeadline('not-a-date'), /weekEnding/);
});

t('buildPilotMetrics: empty input is all zeros, never throws', () => {
  const m = buildPilotMetrics({ clientId: 'c1', reports: [], controllerTimeEntries: [] });
  assert.strictEqual(m.clientId, 'c1');
  assert.strictEqual(m.weeksDelivered, 0);
  assert.strictEqual(m.weeksOnTime, 0);
  assert.strictEqual(m.weeksLate, 0);
  assert.deepStrictEqual(m.flags, { pending: 0, approved: 0, dismissed: 0, total: 0 });
  assert.deepStrictEqual(m.controllerTime, { totalMinutes: 0, entries: [] });
});

t('buildPilotMetrics: a draft report never counts toward delivered/onTime/late', () => {
  const m = buildPilotMetrics({ clientId: 'c1', reports: [{ status: 'draft', weekEnding: '2026-01-09', flags: [] }] });
  assert.strictEqual(m.weeksDelivered, 0);
});

t('buildPilotMetrics: on-time vs late split by the Phoenix Wednesday deadline', () => {
  const reports = [
    // week ending Fri 2026-01-09, deadline Wed 2026-01-14 23:59 Phoenix (=2026-01-15T06:59:59.999Z) -- published just before -> on time
    { status: 'published', weekEnding: '2026-01-09', publishedAt: '2026-01-15T06:00:00.000Z', flags: [] },
    // same deadline, published just after -> late
    { status: 'published', weekEnding: '2026-01-16', publishedAt: '2026-01-22T07:00:00.000Z', flags: [] },
  ];
  const m = buildPilotMetrics({ clientId: 'c1', reports });
  assert.strictEqual(m.weeksDelivered, 2);
  assert.strictEqual(m.weeksOnTime, 1);
  assert.strictEqual(m.weeksLate, 1);
});

t('buildPilotMetrics: flag counts are summed across ALL reports (draft + published), by status', () => {
  const reports = [
    { status: 'published', weekEnding: '2026-01-09', publishedAt: '2026-01-10T00:00:00.000Z', flags: [{ status: 'approved' }, { status: 'dismissed' }] },
    { status: 'draft', weekEnding: '2026-01-16', flags: [{ status: 'pending' }, { status: 'approved' }] },
  ];
  const m = buildPilotMetrics({ clientId: 'c1', reports });
  assert.deepStrictEqual(m.flags, { pending: 1, approved: 2, dismissed: 1, total: 4 });
});

t('buildPilotMetrics: controller time sums minutes and passes entries through', () => {
  const entries = [
    { week: '2026-01-09', minutes: 45, recordedBy: 'Ann', recordedAt: '2026-01-10T00:00:00.000Z' },
    { week: '2026-01-16', minutes: 30, recordedBy: 'Ann', recordedAt: '2026-01-17T00:00:00.000Z' },
  ];
  const m = buildPilotMetrics({ clientId: 'c1', reports: [], controllerTimeEntries: entries });
  assert.strictEqual(m.controllerTime.totalMinutes, 75);
  assert.strictEqual(m.controllerTime.entries.length, 2);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
