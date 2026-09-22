'use strict';
/*
 * Shared governed exception relay regression
 * (html/shared/tsm-governed-exception-relay.js).
 *
 * Exercises TSMGovernedExceptionRelay.relayGovernedException() directly --
 * the REAL shared file, run in a vm sandbox alongside the REAL
 * tsm-active-member.js and tsm-bpo-relay.js. Only fetch and localStorage
 * are faked, same pattern as test-rcm-os-exception-relay.js.
 *
 * Also asserts both real call sites (RCM-OS, Honeywell strategist) are
 * actually wired to this module -- not just that the module itself works
 * in isolation.
 *
 * Run: node scripts/test-governed-exception-relay.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const RELAY_MODULE_SRC = read('html/shared/tsm-governed-exception-relay.js');
const ACTIVE_MEMBER_JS = read('html/shared/tsm-active-member.js');
const BPO_RELAY_JS = read('html/shared/tsm-bpo-relay.js');
const HONEYWELL_HTML = read('html/war-rooms/honeywell-strategist.html');
const RCM_OS_HTML = read('html/finops-suite/tsm-rcm-os.html');

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('OK:  ' + msg);
  else { failures++; console.error('FAIL: ' + msg); }
}
function eq(actual, expected, msg) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  check(same, msg + (same ? '' : '  (got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected) + ')'));
}

function makeSandbox({ activeMemberId = null, primedCache = null } = {}) {
  const calls = [];
  const fakeFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    return { ok: true, status: 200, json: async () => ({ ok: true, clients: [], workItem: { caseId: 'x' }, document: { id: 'd1' } }) };
  };

  const store = primedCache ? Object.assign({}, primedCache) : {};
  const fakeLocalStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };

  const win = { localStorage: fakeLocalStorage, location: { search: '' } };
  const ctx = vm.createContext({
    window: win, document: {}, localStorage: fakeLocalStorage, location: win.location,
    fetch: fakeFetch, FormData, Blob, URL, setTimeout, console,
    encodeURIComponent, JSON, Date, Promise, Array, Object, String, Error, module: {},
  });

  vm.runInContext(ACTIVE_MEMBER_JS, ctx);
  vm.runInContext(BPO_RELAY_JS, ctx);
  vm.runInContext(RELAY_MODULE_SRC, ctx);
  if (activeMemberId) win.TSMActiveMember.setActive(activeMemberId);

  return { ctx, win, calls, store };
}

const PKG = {
  domain: 'honeywell',
  packageId: 'meridian-air-handlers',
  title: 'Meridian Industrial Incident',
  source: 'Meridian Industrial Strategist',
  summary: 'Test incident summary',
  kpis: { bnca_exposure: 42000 },
};

(async () => {
  console.log('\n== Module is actually wired into both real call sites (not just written and left unused)');
  check(HONEYWELL_HTML.includes('/shared/tsm-governed-exception-relay.js'), 'honeywell-strategist.html includes the shared relay module');
  check(HONEYWELL_HTML.includes('TSMGovernedExceptionRelay.relayGovernedException('), 'honeywell-strategist.html calls relayGovernedException()');
  check(!/<script src="[^"]*mission-model\.js"|<script src="[^"]*mission-store\.js"/.test(RCM_OS_HTML), 'tsm-rcm-os.html no longer loads the dead legacy Mission Core scripts (a code comment may still explain the old behavior it replaced)');

  console.log('\n== No active member selected -> no-op');
  {
    const { ctx, win, calls } = makeSandbox({ activeMemberId: null });
    win.TSMGovernedExceptionRelay.relayGovernedException(PKG, {
      vertical: 'honeywell', caseId: 'TSM-HW-TEST-ESC', sourceSystem: 'test', cacheKey: 'test_cache_v1',
    });
    await new Promise((r) => setTimeout(r, 20));
    check(calls.length === 0, 'no active member -> zero network calls, no invented tenant');
  }

  console.log('\n== Missing caseId or cacheKey -> refuses rather than guessing a key');
  {
    const { ctx, win, calls } = makeSandbox({ activeMemberId: 'acme-corp' });
    win.TSMGovernedExceptionRelay.relayGovernedException(PKG, { vertical: 'honeywell', sourceSystem: 'test' });
    await new Promise((r) => setTimeout(r, 20));
    check(calls.length === 0, 'missing caseId/cacheKey -> no relay attempted');
  }

  console.log('\n== Active member selected -> real relay, work item PENDING (ready-for-review), never auto-approved');
  {
    const { ctx, win, calls } = makeSandbox({ activeMemberId: 'acme-corp' });
    win.TSMGovernedExceptionRelay.relayGovernedException(PKG, {
      vertical: 'honeywell', caseId: 'TSM-HW-TEST-ESC', sourceSystem: 'honeywell-strategist-escalate', cacheKey: 'test_cache_v1',
    });
    await new Promise((r) => setTimeout(r, 20));

    check(calls.length === 2, 'exactly two calls: work-item upsert, then document upload');
    const wiCall = calls[0];
    eq(wiCall.method, 'POST', 'work-item call is a POST');
    eq(wiCall.url, '/api/bpo/work-items/TSM-HW-TEST-ESC', 'work item posted to the exact caseId given');

    const sent = JSON.parse(wiCall.body);
    eq(sent.clientId, 'acme-corp', 'work item clientId is the real active member, never invented');
    eq(sent.stage, 'ready-for-review', 'work item stage is ready-for-review -- PENDING human approval');
    eq(sent.status, 'open', 'work item status is open');
    check(!/approve|execute|governance/i.test(wiCall.url), 'relay never calls an approval/execution/governance endpoint -- Phase 15 remains the sole authority');

    eq(sent.payload.tsmRelay.sourceSystem, 'honeywell-strategist-escalate', 'relay records the caller-supplied source system');
  }

  console.log('\n== Same caseId + same member -> no duplicate relay (per-caller idempotency cache)');
  {
    const primed = { test_cache_v1: JSON.stringify({ 'TSM-HW-TEST-ESC': 'acme-corp' }) };
    const { ctx, win, calls } = makeSandbox({ activeMemberId: 'acme-corp', primedCache: primed });
    win.TSMGovernedExceptionRelay.relayGovernedException(PKG, {
      vertical: 'honeywell', caseId: 'TSM-HW-TEST-ESC', sourceSystem: 'test', cacheKey: 'test_cache_v1',
    });
    await new Promise((r) => setTimeout(r, 20));
    check(calls.length === 0, 'already-relayed caseId+member combo does not re-fire');
  }

  console.log('\n== Same caseId, member changes -> relays again to the new member');
  {
    const primed = { test_cache_v1: JSON.stringify({ 'TSM-HW-TEST-ESC': 'old-member' }) };
    const { ctx, win, calls } = makeSandbox({ activeMemberId: 'new-member', primedCache: primed });
    win.TSMGovernedExceptionRelay.relayGovernedException(PKG, {
      vertical: 'honeywell', caseId: 'TSM-HW-TEST-ESC', sourceSystem: 'test', cacheKey: 'test_cache_v1',
    });
    await new Promise((r) => setTimeout(r, 20));
    check(calls.length === 2, 'active member change relays the same case again');
    eq(JSON.parse(calls[0].body).clientId, 'new-member', 're-relay attributed to the newly active member, not the stale one');
  }

  console.log('\n== relayToBPO failure is non-fatal (caught, logged, never throws)');
  {
    const { ctx, win } = makeSandbox({ activeMemberId: 'acme-corp' });
    ctx.fetch = async () => ({ ok: false, status: 500, json: async () => ({ ok: false, error: 'boom' }) });
    let threw = false;
    try {
      win.TSMGovernedExceptionRelay.relayGovernedException(PKG, {
        vertical: 'honeywell', caseId: 'TSM-HW-TEST-ESC', sourceSystem: 'test', cacheKey: 'test_cache_v1',
      });
      await new Promise((r) => setTimeout(r, 20));
    } catch (e) { threw = true; }
    check(!threw, 'a relay failure does not throw or crash the caller');
  }

  console.log(failures ? '\nGOVERNED EXCEPTION RELAY REGRESSION: ' + failures + ' FAILURE(S)' : '\nGOVERNED EXCEPTION RELAY REGRESSION: PASS');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('FAIL (exception):', e); process.exit(1); });
