'use strict';
// Hand-checked unit tests for server/construction-bpo/lien-waivers.js.

const assert = require('assert');
const { evaluateLienWaiver, evaluateLienWaivers } = require('../server/construction-bpo/lien-waivers');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

const ASOF = new Date('2026-01-10T00:00:00.000Z');

t('full amount, no expiration: status ok, no flags', () => {
  const r = evaluateLienWaiver({ jobId: 'J1', subcontractor: 'Acme Electric', payPeriod: '2025-12', expectedAmount: 50000, waiver: { receivedAmount: 50000 } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual(r.amountShort, null);
  assert.deepStrictEqual(r.flags, []);
});

t('no waiver object at all: status missing, LIEN_WAIVER_MISSING flag', () => {
  const r = evaluateLienWaiver({ jobId: 'J8', subcontractor: 'Acme Electric', payPeriod: '2025-12', expectedAmount: 50000, waiver: null }, { asOf: ASOF });
  assert.strictEqual(r.status, 'missing');
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'LIEN_WAIVER_MISSING');
  assert.strictEqual(r.flags[0].expectedAmount, 50000);
});

t('waiver present but receivedAmount less than expected: status short, LIEN_WAIVER_SHORT with amountShort', () => {
  const r = evaluateLienWaiver({ jobId: 'J8', subcontractor: 'Beta Plumbing', payPeriod: '2025-12', expectedAmount: 40000, waiver: { receivedAmount: 32000 } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'short');
  assert.strictEqual(r.amountShort, 8000);
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'LIEN_WAIVER_SHORT');
  assert.strictEqual(r.flags[0].amountShort, 8000);
});

t('receivedAmount exactly equal to expectedAmount: not short', () => {
  const r = evaluateLienWaiver({ jobId: 'J1', subcontractor: 'Acme', expectedAmount: 10000, waiver: { receivedAmount: 10000 } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'ok');
});

t('receivedAmount greater than expectedAmount: not short (over-covered is not a shortfall)', () => {
  const r = evaluateLienWaiver({ jobId: 'J1', subcontractor: 'Acme', expectedAmount: 10000, waiver: { receivedAmount: 12000 } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual(r.amountShort, null);
});

t('expirationDate before asOf: status expired, LIEN_WAIVER_EXPIRED with daysExpired', () => {
  // expired 2026-01-05, asOf 2026-01-10 -> 5 days expired
  const r = evaluateLienWaiver({ jobId: 'J1', subcontractor: 'Acme', expectedAmount: 10000, waiver: { receivedAmount: 10000, expirationDate: '2026-01-05T00:00:00.000Z' } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'expired');
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'LIEN_WAIVER_EXPIRED');
  assert.strictEqual(r.flags[0].daysExpired, 5);
});

t('expirationDate in the future (not yet expired): status ok', () => {
  const r = evaluateLienWaiver({ jobId: 'J1', subcontractor: 'Acme', expectedAmount: 10000, waiver: { receivedAmount: 10000, expirationDate: '2026-02-01T00:00:00.000Z' } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'ok');
  assert.deepStrictEqual(r.flags, []);
});

t('both short AND expired: status short_and_expired, both flags present', () => {
  const r = evaluateLienWaiver({ jobId: 'J8', subcontractor: 'Gamma Drywall', expectedAmount: 20000, waiver: { receivedAmount: 15000, expirationDate: '2026-01-01T00:00:00.000Z' } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'short_and_expired');
  assert.strictEqual(r.flags.length, 2);
  assert.deepStrictEqual(r.flags.map((f) => f.type).sort(), ['LIEN_WAIVER_EXPIRED', 'LIEN_WAIVER_SHORT']);
});

t('missing expectedAmount: SHORT check cannot run, status unverified, INCOMPLETE_DATA flag', () => {
  const r = evaluateLienWaiver({ jobId: 'J1', subcontractor: 'Acme', waiver: { receivedAmount: 5000 } }, { asOf: ASOF });
  assert.strictEqual(r.status, 'unverified');
  assert.strictEqual(r.amountShort, null);
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'INCOMPLETE_DATA');
});

t('missing is never combined with short/expired flags -- a missing waiver returns immediately', () => {
  const r = evaluateLienWaiver({ jobId: 'J1', subcontractor: 'Acme', expectedAmount: 10000, waiver: null }, { asOf: ASOF });
  assert.strictEqual(r.flags.length, 1);
  assert.strictEqual(r.flags[0].type, 'LIEN_WAIVER_MISSING');
});

t('evaluateLienWaivers maps a list; Sample GC style coverage -- 2 missing + 1 short', () => {
  const list = [
    { jobId: 'J8', subcontractor: 'A', expectedAmount: 10000, waiver: null },
    { jobId: 'J8', subcontractor: 'B', expectedAmount: 10000, waiver: null },
    { jobId: 'J8', subcontractor: 'C', expectedAmount: 10000, waiver: { receivedAmount: 7000 } },
    { jobId: 'J8', subcontractor: 'D', expectedAmount: 10000, waiver: { receivedAmount: 10000 } },
  ];
  const results = evaluateLienWaivers(list, { asOf: ASOF });
  const missing = results.filter((r) => r.status === 'missing');
  const short = results.filter((r) => r.status === 'short');
  assert.strictEqual(missing.length, 2);
  assert.strictEqual(short.length, 1);
  assert.strictEqual(results.filter((r) => r.status === 'ok').length, 1);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
