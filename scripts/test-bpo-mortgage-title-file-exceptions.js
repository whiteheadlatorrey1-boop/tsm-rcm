'use strict';
// Unit tests for server/bpo-mortgage-title/file-exceptions.js -- the pure
// compute layer for mortgage/title file checklist + exception tracking.

const assert = require('assert');
const { REQUIRED_DOC_TYPES, calendarDaysUntil, businessDaysUntil, computeFileStatus, computeFileSchedule } = require('../server/bpo-mortgage-title/file-exceptions');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

function allReceived(fileId, overrides = {}) {
  return REQUIRED_DOC_TYPES.map((docType) => ({ fileId, docType, status: 'received', receivedDate: '2026-01-01', ...(overrides[docType] || {}) }));
}

// ───────────────────────────── date math ───────────────────────────────────

t('calendarDaysUntil: simple forward/backward/zero', () => {
  assert.strictEqual(calendarDaysUntil('2026-03-02', '2026-03-14'), 12);
  assert.strictEqual(calendarDaysUntil('2026-03-16', '2026-03-14'), -2);
  assert.strictEqual(calendarDaysUntil('2026-03-02', '2026-03-02'), 0);
});

t('businessDaysUntil: skips weekends, zero when equal, negative going backward', () => {
  // 2026-03-02 is a Monday
  assert.strictEqual(businessDaysUntil('2026-03-09', '2026-03-18'), 7); // Tue,Wed,Thu,Fri,Mon,Tue,Wed
  assert.strictEqual(businessDaysUntil('2026-03-16', '2026-03-18'), 2); // Tue,Wed
  assert.strictEqual(businessDaysUntil('2026-03-02', '2026-03-02'), 0);
  assert.strictEqual(businessDaysUntil('2026-03-18', '2026-03-09'), -7);
});

// ───────────────────────────── INCOMPLETE_DATA ─────────────────────────────

t('no closingDate -> INCOMPLETE_DATA, and every other check is skipped (never guessed)', () => {
  const r = computeFileStatus({ fileId: 'F1', closingDate: null, checklist: [], exceptions: [{ fileId: 'F1', status: 'open' }] }, {}, { asOf: '2026-03-02' });
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'INCOMPLETE_DATA');
  assert.strictEqual(r.daysToClosing, null);
  assert.strictEqual(r.businessDaysToClosing, null);
});

// ───────────────────────────── MISSING_DOC ─────────────────────────────────

t('MISSING_DOC: outside the window is clean; a docType with no row at all counts as missing', () => {
  const checklist = allReceived('F1');
  const missingSurvey = checklist.filter((c) => c.docType !== 'Survey'); // Survey has no row at all
  const farClean = computeFileStatus({ fileId: 'F1', closingDate: '2026-04-01', checklist: missingSurvey, exceptions: [] }, {}, { asOf: '2026-03-02' });
  assert.deepStrictEqual(farClean.flags, []);

  const nearFires = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-10', checklist: missingSurvey, exceptions: [] }, {}, { asOf: '2026-03-02' });
  assert.strictEqual(nearFires.flags.length, 1);
  assert.strictEqual(nearFires.flags[0].type, 'MISSING_DOC');
  assert.strictEqual(nearFires.flags[0].docType, 'Survey');
});

t('MISSING_DOC: a "pending" row (no receivedDate) is also missing, same as no row', () => {
  const checklist = allReceived('F1').map((c) => (c.docType === 'Survey' ? { fileId: 'F1', docType: 'Survey', status: 'pending', receivedDate: null } : c));
  const r = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-10', checklist, exceptions: [] }, {}, { asOf: '2026-03-02' });
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].docType, 'Survey');
});

t('MISSING_DOC: a "waived" row does NOT count as missing', () => {
  const checklist = allReceived('F1').map((c) => (c.docType === 'Survey' ? { fileId: 'F1', docType: 'Survey', status: 'waived' } : c));
  const r = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-10', checklist, exceptions: [] }, {}, { asOf: '2026-03-02' });
  assert.deepStrictEqual(r.flags, []);
});

t('MISSING_DOC: multiple missing doc types each get their own flag', () => {
  const checklist = allReceived('F1').filter((c) => c.docType !== 'Survey' && c.docType !== 'Government ID');
  const r = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-10', checklist, exceptions: [] }, {}, { asOf: '2026-03-02' });
  const types = r.flags.map((f) => f.docType).sort();
  assert.deepStrictEqual(types, ['Government ID', 'Survey']);
});

t('MISSING_DOC: boundary is inclusive (exactly threshold days fires)', () => {
  const checklist = allReceived('F1').filter((c) => c.docType !== 'Survey');
  const atBoundary = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-12', checklist, exceptions: [] }, { missingDocDays: 10 }, { asOf: '2026-03-02' }); // exactly 10 days
  ok1(atBoundary.flags.length === 1, 'exactly-10-days fires');
  const beyondBoundary = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-13', checklist, exceptions: [] }, { missingDocDays: 10 }, { asOf: '2026-03-02' }); // 11 days
  ok1(beyondBoundary.flags.length === 0, '11 days (just past boundary) is clean');
  function ok1(cond, msg) { if (!cond) throw new Error(msg); }
});

t('MISSING_DOC: still fires after closing has already passed', () => {
  const checklist = allReceived('F1').filter((c) => c.docType !== 'Survey');
  const r = computeFileStatus({ fileId: 'F1', closingDate: '2026-02-20', checklist, exceptions: [] }, {}, { asOf: '2026-03-02' }); // closing 10 days ago
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.daysToClosing, -10);
});

// ───────────────────────────── EXPIRED_DOC ─────────────────────────────────

t('EXPIRED_DOC: fires once expirationDate passes, regardless of how far away closing is', () => {
  const checklist = allReceived('F1', { 'Payoff Statement': { expirationDate: '2026-03-05' } });
  const beforeExpiry = computeFileStatus({ fileId: 'F1', closingDate: '2026-06-01', checklist, exceptions: [] }, {}, { asOf: '2026-03-02' });
  assert.deepStrictEqual(beforeExpiry.flags, []);
  const afterExpiry = computeFileStatus({ fileId: 'F1', closingDate: '2026-06-01', checklist, exceptions: [] }, {}, { asOf: '2026-03-09' });
  assert.strictEqual(afterExpiry.flags.length, 1);
  assert.strictEqual(afterExpiry.flags[0].type, 'EXPIRED_DOC');
  assert.strictEqual(afterExpiry.flags[0].docType, 'Payoff Statement');
});

t('EXPIRED_DOC: a "pending"/missing doc has no expirationDate to check -- only MISSING_DOC can fire for it', () => {
  const checklist = allReceived('F1').filter((c) => c.docType !== 'Government ID');
  const r = computeFileStatus({ fileId: 'F1', closingDate: '2026-06-01', checklist, exceptions: [] }, {}, { asOf: '2026-03-02' });
  assert.deepStrictEqual(r.flags, []); // far from closing, so even the missing ID doesn't flag yet, and there's nothing to expire
});

// ───────────────────────── UNCLEARED_EXCEPTION ─────────────────────────────

t('UNCLEARED_EXCEPTION: open + near closing fires; cleared never fires; far from closing is clean', () => {
  const checklist = allReceived('F1');
  const open = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-10', checklist, exceptions: [{ fileId: 'F1', exceptionNumber: 'EX-1', status: 'open' }] }, {}, { asOf: '2026-03-02' });
  assert.strictEqual(open.flags.length, 1);
  assert.strictEqual(open.flags[0].type, 'UNCLEARED_EXCEPTION');

  const cleared = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-10', checklist, exceptions: [{ fileId: 'F1', exceptionNumber: 'EX-1', status: 'cleared' }] }, {}, { asOf: '2026-03-02' });
  assert.deepStrictEqual(cleared.flags, []);

  const farOpen = computeFileStatus({ fileId: 'F1', closingDate: '2026-06-01', checklist, exceptions: [{ fileId: 'F1', exceptionNumber: 'EX-1', status: 'open' }] }, {}, { asOf: '2026-03-02' });
  assert.deepStrictEqual(farOpen.flags, []);
});

// ───────────────────────────── CLOSING_AT_RISK ─────────────────────────────

t('CLOSING_AT_RISK: needs an underlying flag AND within business-day window AND not yet past closing', () => {
  const checklist = allReceived('F1').filter((c) => c.docType !== 'Government ID');
  // 2 business days out, with a real MISSING_DOC underlying it
  const atRisk = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-18', checklist, exceptions: [] }, {}, { asOf: '2026-03-16' });
  const types = atRisk.flags.map((f) => f.type).sort();
  assert.deepStrictEqual(types, ['CLOSING_AT_RISK', 'MISSING_DOC']);

  // same file, 7 business days out (week earlier) -- MISSING_DOC fires (within 10 calendar days) but not yet AT_RISK (not within 5 business days)
  const notYetAtRisk = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-18', checklist, exceptions: [] }, {}, { asOf: '2026-03-09' });
  assert.deepStrictEqual(notYetAtRisk.flags.map((f) => f.type), ['MISSING_DOC']);
});

t('CLOSING_AT_RISK: never fires once closing has already passed, even with an underlying flag', () => {
  const checklist = allReceived('F1').filter((c) => c.docType !== 'Government ID');
  const r = computeFileStatus({ fileId: 'F1', closingDate: '2026-02-20', checklist, exceptions: [] }, {}, { asOf: '2026-03-02' });
  assert.strictEqual(r.flags.some((f) => f.type === 'CLOSING_AT_RISK'), false);
  assert.strictEqual(r.flags.some((f) => f.type === 'MISSING_DOC'), true);
});

t('CLOSING_AT_RISK: a perfectly clean file near closing gets no flags at all', () => {
  const checklist = allReceived('F1');
  const r = computeFileStatus({ fileId: 'F1', closingDate: '2026-03-18', checklist, exceptions: [] }, {}, { asOf: '2026-03-16' });
  assert.deepStrictEqual(r.flags, []);
});

// ───────────────────────────── schedule ────────────────────────────────────

t('computeFileSchedule maps over every file', () => {
  const files = [
    { fileId: 'F1', closingDate: null, checklist: [], exceptions: [] },
    { fileId: 'F2', closingDate: '2026-06-01', checklist: allReceived('F2'), exceptions: [] },
  ];
  const results = computeFileSchedule(files, {}, { asOf: '2026-03-02' });
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].flags[0].type, 'INCOMPLETE_DATA');
  assert.deepStrictEqual(results[1].flags, []);
});

t('computeFileStatus requires fileId', () => {
  assert.throws(() => computeFileStatus({ closingDate: '2026-01-01' }), /fileId/);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
