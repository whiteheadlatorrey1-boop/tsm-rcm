'use strict';
// Unit tests for the generic server/bpo-service/* framework pieces that
// don't need Mongo/HTTP: report-builder.js, sanitize.js, metrics.js, and
// plugin-registry.js. Route-level wiring (store + HTTP) is covered by
// scripts/test-bpo-service-construction-plugin-routes.js; import-engine
// equivalence with the original construction-bpo/import.js is covered by
// scripts/test-bpo-service-import-engine-equivalence.js.

const assert = require('assert');
const { buildReportDraft } = require('../server/bpo-service/report-builder');
const { sanitizeReportForClient, sanitizeFlagsForClient } = require('../server/bpo-service/sanitize');
const { phoenixWednesdayDeadline, buildPilotMetrics } = require('../server/bpo-service/metrics');
const { registerPlugin, getPlugin, listPlugins } = require('../server/bpo-service/plugin-registry');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

// A tiny fake plug-in: one section ("items"), each item can carry a
// 'STALE' flag if `stale: true`.
const fakePlugin = {
  id: 'test-fake-vertical',
  fileTypes: [],
  reportSections: ['items'],
  computeFlags(input) {
    const items = (input.items || []).map((it) => ({
      id: it.id,
      stale: !!it.stale,
      flags: it.stale ? [{ type: 'STALE', id: it.id }] : [],
    }));
    const flags = items.flatMap((it) => it.flags);
    return { sections: { items }, flags, summary: [{ key: 'itemCount', label: 'Items', value: items.length }] };
  },
};

// ───────────────────────────── report-builder ──────────────────────────────

t('buildReportDraft requires plugin.computeFlags, clientId, weekEnding', () => {
  assert.throws(() => buildReportDraft(null, { clientId: 'c1', weekEnding: '2026-01-01' }), /computeFlags/);
  assert.throws(() => buildReportDraft(fakePlugin, { weekEnding: '2026-01-01' }), /clientId/);
  assert.throws(() => buildReportDraft(fakePlugin, { clientId: 'c1' }), /weekEnding/);
});

t('buildReportDraft assembles sections at the top level, starts as draft, carries reportSections', () => {
  const draft = buildReportDraft(fakePlugin, { clientId: 'c1', weekEnding: '2026-01-09', items: [{ id: 'I1' }] });
  assert.strictEqual(draft.status, 'draft');
  assert.strictEqual(draft.clientId, 'c1');
  assert.deepStrictEqual(draft.reportSections, ['items']);
  assert.strictEqual(draft.items.length, 1);
  assert.deepStrictEqual(draft.flags, []);
});

t('buildReportDraft assigns every flag a unique flagId and status pending, with note/reviewedBy/reviewedAt null', () => {
  const draft = buildReportDraft(fakePlugin, { clientId: 'c1', weekEnding: '2026-01-09', items: [{ id: 'I1', stale: true }, { id: 'I2', stale: true }] });
  assert.strictEqual(draft.flags.length, 2);
  const ids = draft.flags.map((f) => f.flagId);
  assert.strictEqual(new Set(ids).size, 2);
  for (const f of draft.flags) {
    assert.strictEqual(f.status, 'pending');
    assert.strictEqual(f.note, null);
    assert.strictEqual(f.reviewedBy, null);
    assert.strictEqual(f.reviewedAt, null);
  }
  // the nested items[].flags copy shares the SAME objects pre-storage (see report-builder.js header)
  assert.strictEqual(draft.items[0].flags[0], draft.flags[0]);
});

t('buildReportDraft computes flagCounts by type', () => {
  const draft = buildReportDraft(fakePlugin, { clientId: 'c1', weekEnding: '2026-01-09', items: [{ id: 'I1', stale: true }, { id: 'I2', stale: true }] });
  assert.deepStrictEqual(draft.flagCounts, { STALE: 2 });
});

// ──────────────────────────────── sanitize ─────────────────────────────────

t('sanitizeFlagsForClient keeps only approved, strips note', () => {
  const flags = [
    { flagId: 'F1', type: 'A', status: 'approved', note: 'n1' },
    { flagId: 'F2', type: 'B', status: 'dismissed', note: 'n2' },
    { flagId: 'F3', type: 'C', status: 'pending', note: null },
  ];
  const out = sanitizeFlagsForClient(flags);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].flagId, 'F1');
  assert.ok(!('note' in out[0]));
});

t('sanitizeReportForClient walks top-level flags AND every reportSections entity, never mutating the original', () => {
  const report = {
    flags: [{ flagId: 'F1', type: 'STALE', status: 'approved', note: 'ok' }],
    items: [{ id: 'I1', flags: [{ flagId: 'F1', type: 'STALE', status: 'approved', note: 'ok' }] }],
    reportSections: ['items'],
  };
  const clone = sanitizeReportForClient(report, ['items']);
  assert.strictEqual(clone.flags.length, 1);
  assert.ok(!('note' in clone.flags[0]));
  assert.strictEqual(clone.items[0].flags.length, 1);
  assert.ok(!('note' in clone.items[0].flags[0]));
  // original untouched
  assert.strictEqual(report.flags[0].note, 'ok');
  assert.strictEqual(report.items[0].flags[0].note, 'ok');
});

t('sanitizeReportForClient tolerates a report with no matching section arrays', () => {
  const report = { flags: [], items: null };
  const clone = sanitizeReportForClient(report, ['items', 'nonexistentSection']);
  assert.deepStrictEqual(clone.flags, []);
});

// ──────────────────────────────── metrics ──────────────────────────────────

t('phoenixWednesdayDeadline matches the construction-bpo copy\'s known values', () => {
  assert.strictEqual(phoenixWednesdayDeadline('2026-01-09').toISOString(), '2026-01-15T06:59:59.999Z');
  assert.strictEqual(phoenixWednesdayDeadline('2026-01-07').toISOString(), '2026-01-15T06:59:59.999Z'); // itself a Wednesday -> next one
});

t('buildPilotMetrics: on-time vs late, flag counts, controller time -- vertical-agnostic', () => {
  const m = buildPilotMetrics({
    clientId: 'c1',
    reports: [
      { status: 'published', weekEnding: '2026-01-09', publishedAt: '2026-01-10T00:00:00.000Z', flags: [{ status: 'approved' }] },
      { status: 'draft', weekEnding: '2026-01-16', flags: [{ status: 'pending' }] },
    ],
    controllerTimeEntries: [{ week: '2026-01-09', minutes: 20, recordedBy: 'x', recordedAt: '2026-01-10T00:00:00.000Z' }],
  });
  assert.strictEqual(m.weeksDelivered, 1);
  assert.strictEqual(m.weeksOnTime, 1);
  assert.deepStrictEqual(m.flags, { pending: 1, approved: 1, dismissed: 0, total: 2 });
  assert.strictEqual(m.controllerTime.totalMinutes, 20);
});

// ───────────────────────────── plugin-registry ─────────────────────────────

t('registerPlugin validates shape', () => {
  assert.throws(() => registerPlugin({}), /id is required/);
  assert.throws(() => registerPlugin({ id: 'x' }), /computeFlags/);
  assert.throws(() => registerPlugin({ id: 'x', computeFlags: () => {} }), /reportSections/);
  assert.throws(() => registerPlugin({ id: 'x', computeFlags: () => {}, reportSections: [] }), /fileTypes/);
});

t('registerPlugin + getPlugin + listPlugins round-trip', () => {
  registerPlugin(fakePlugin);
  assert.strictEqual(getPlugin('test-fake-vertical'), fakePlugin);
  assert.strictEqual(getPlugin('no-such-vertical'), null);
  assert.ok(listPlugins().includes(fakePlugin));
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
