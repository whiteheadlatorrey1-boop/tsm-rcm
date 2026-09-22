'use strict';
/*
 * RCM-OS cross-module exception relay regression.
 *
 * Was: renderExecExceptions() called TSMMissionModel.createMission() with
 *   tenantId: 'default'  and  client: a.entityId || null
 * for every CRITICAL exception across every vertical -- guessing a tenant,
 * and landing in the legacy TSMMissionStore/TSMCaseManager path, never the
 * governed Phase 14/15 BPO work-item pipeline.
 *
 * Now: relayCriticalExceptionsToBPO() relays through the real
 * tsm-bpo-relay.js, gated on TSMActiveMember.getId() -- no active member,
 * no BPO write, no guess.
 *
 * No browser: the REAL function is pulled out of
 * html/finops-suite/tsm-rcm-os.html and run in a vm sandbox alongside the
 * REAL tsm-active-member.js and tsm-bpo-relay.js. Only the network
 * (fetch) and localStorage are faked, same pattern as
 * test-hc-live-handoff.js.
 *
 * Run: node scripts/test-rcm-os-exception-relay.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const RCM_OS = read('html/finops-suite/tsm-rcm-os.html');
const ACTIVE_MEMBER_JS = read('html/shared/tsm-active-member.js');
const RELAY_JS = read('html/shared/tsm-bpo-relay.js');

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('OK:  ' + msg);
  else { failures++; console.error('FAIL: ' + msg); }
}
function eq(actual, expected, msg) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  check(same, msg + (same ? '' : '  (got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected) + ')'));
}

// Pull the real relay function + its dedup-cache key straight out of the
// shipped page, same extraction technique test-hc-live-handoff.js uses.
function extractFn(src, name) {
  const m = src.match(new RegExp('^(?:async )?function ' + name + '\\b[\\s\\S]*?^\\}', 'm'));
  if (!m) throw new Error('could not extract function ' + name);
  return m[0];
}
function extractConst(src, name) {
  const m = src.match(new RegExp('^const ' + name + '\\s*=.*?;', 'm'));
  if (!m) throw new Error('could not extract const ' + name);
  return m[0];
}
const RELAY_FN_SRC = extractConst(RCM_OS, 'RELAYED_EXC_KEY') + '\n' + extractFn(RCM_OS, 'relayCriticalExceptionsToBPO');

check(!/tenantId:\s*'default'/.test(RELAY_FN_SRC), 'the extracted relay function no longer contains the hardcoded tenantId: \'default\'');
check(!/TSMMissionStore|TSMMissionModel/.test(RELAY_FN_SRC), 'the extracted relay function no longer routes through the legacy Mission Core path');

// A CRITICAL cross-module anomaly, shaped exactly as
// TSMMemory.getCrossModuleAnomalies() returns it (registerAnomaly's record
// shape, tagged with `sector`).
const ANOMALY = {
  id: 'an_test_0001',
  anomalyCode: 'EXC_TEST_0001',
  title: 'Denial pattern spike: CO-50',
  severity: 'CRITICAL',
  status: 'open',
  source: 'RCM-OS Cross-Module Exceptions',
  detectedFrom: 'cross-module-scan',
  entityType: 'exception-queue',
  entityId: 'EXC-9001',
  missingFields: ['appealDeadline'],
  createdAt: '2026-09-19T00:00:00.000Z',
  resolvedAt: null,
  resolvedBy: null,
  relayTargets: [],
  recommendedApps: [],
  meta: { detail: 'Spike detected across 3 providers', exposure: null },
  sector: 'healthcare',
};

function makeSandbox({ activeMemberId = null } = {}) {
  const calls = [];
  const fakeFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    return { ok: true, status: 200, json: async () => ({ ok: true, clients: [{ id: activeMemberId || 'x' }], workItem: { caseId: 'x' }, document: { id: 'd1' } }) };
  };

  const store = {};
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

  // Real tsm-active-member.js + real tsm-bpo-relay.js, exactly as shipped.
  vm.runInContext(ACTIVE_MEMBER_JS, ctx);
  vm.runInContext(RELAY_JS, ctx);
  if (activeMemberId) win.TSMActiveMember.setActive(activeMemberId);

  // The real extracted function, run against those real dependencies.
  vm.runInContext(RELAY_FN_SRC, ctx);

  return { ctx, win, calls };
}

(async () => {
  console.log('\n== No active member selected');
  {
    const { ctx, calls } = makeSandbox({ activeMemberId: null });
    ctx.relayCriticalExceptionsToBPO([ANOMALY]);
    await new Promise((r) => setTimeout(r, 20));
    check(calls.length === 0, 'no active member -> zero network calls (no misattributed BPO case, no guessed tenant)');
  }

  console.log('\n== Active member selected -> real relay');
  let firstCalls;
  {
    const { ctx, calls } = makeSandbox({ activeMemberId: 'ziyad-industries' });
    ctx.relayCriticalExceptionsToBPO([ANOMALY]);
    await new Promise((r) => setTimeout(r, 20));
    firstCalls = calls;

    check(calls.length === 2, 'exactly two calls: work-item upsert, then document upload');
    const wiCall = calls[0];
    eq(wiCall.method, 'POST', 'work-item call is a POST');
    eq(wiCall.url, '/api/bpo/work-items/TSM-HEALTHCARE-EXC-an_test_0001', 'case ID is derived from the anomaly\'s own stable id, namespaced by sector');

    const sent = JSON.parse(wiCall.body);
    eq(sent.clientId, 'ziyad-industries', 'work item clientId is the real selected active member');
    check(sent.clientId !== 'default', 'work item clientId is never the literal string "default"');
    eq(sent.stage, 'ready-for-review', 'work item stage is ready-for-review');
    eq(sent.status, 'open', 'work item status is open');

    // Original exception facts preserved, verbatim, inside the relayed package.
    const pkg = sent.payload;
    eq(pkg.domain, 'healthcare', 'relayed package domain is the anomaly\'s sector');
    eq(pkg.anomalyCode, ANOMALY.anomalyCode, 'anomalyCode preserved');
    eq(pkg.title, ANOMALY.title, 'title preserved');
    eq(pkg.severity, ANOMALY.severity, 'severity preserved');
    eq(pkg.entityType, ANOMALY.entityType, 'entityType preserved');
    eq(pkg.entityId, ANOMALY.entityId, 'entityId preserved');
    eq(pkg.missingFields, ANOMALY.missingFields, 'missingFields preserved');
    eq(pkg.detectedFrom, ANOMALY.detectedFrom, 'detectedFrom preserved');
    eq(pkg.meta, ANOMALY.meta, 'meta preserved (including its honest null exposure)');

    // Nothing manufactured: no exposure/SLA/governance field invented that
    // wasn't in the source anomaly (meta.exposure stays null, not $0 or a
    // fabricated number; no slaDeadline/priority field appears at all).
    check(pkg.meta.exposure === null, 'exposure stays honestly null -- never fabricated as $0 or a guessed figure');
    check(!('slaDeadline' in pkg) && !('priority' in pkg) && !('confidence' in pkg), 'no governance/SLA/confidence fields invented that were absent from the original exception');

    eq(pkg.tsmRelay.sourceSystem, 'rcm-os-executive-tab', 'relay records its source system');

    const docCall = calls[1];
    eq(docCall.url, '/api/bpo/work-items/TSM-HEALTHCARE-EXC-an_test_0001/documents', 'evidence upload targets the same work item');
    check(docCall.body instanceof FormData && docCall.body.get('clientId') === 'ziyad-industries', 'document upload is tied to the same real client');

    // Never touches governance/approval/execution -- this relay creates a
    // work item and nothing more. Phase 15 remains the sole approval/
    // execution authority.
    check(!calls.some((c) => /approve|execute|governance/i.test(c.url)), 'relay never calls an approval/execution/governance endpoint -- Phase 15 remains the sole authority');
  }

  console.log('\n== Re-render with the same anomaly + same member -> no duplicate relay');
  {
    // Simulate a second renderExecExceptions() pass reusing the same
    // localStorage-backed dedup cache the first pass wrote to.
    const activeMemberId = 'ziyad-industries';
    const store = {};
    // Prime the store as if the first relay above had just run in this same sandbox.
    const primed = JSON.parse(JSON.stringify({ 'TSM-HEALTHCARE-EXC-an_test_0001': activeMemberId }));
    const fakeLocalStorage = {
      getItem: (k) => (k === 'tsm_rcmos_relayed_exceptions_v1' ? JSON.stringify(primed) : (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null)),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
    const win = { localStorage: fakeLocalStorage, location: { search: '' } };
    const calls = [];
    const fakeFetch = async (url, opts = {}) => { calls.push({ url, method: opts.method || 'GET', body: opts.body }); return { ok: true, status: 200, json: async () => ({ ok: true, clients: [], workItem: {}, document: {} }) }; };
    const ctx = vm.createContext({ window: win, document: {}, localStorage: fakeLocalStorage, location: win.location, fetch: fakeFetch, FormData, Blob, URL, setTimeout, console, encodeURIComponent, JSON, Date, Promise, Array, Object, String, Error, module: {} });
    vm.runInContext(ACTIVE_MEMBER_JS, ctx);
    vm.runInContext(RELAY_JS, ctx);
    ctx.window.TSMActiveMember.setActive(activeMemberId);
    vm.runInContext(RELAY_FN_SRC, ctx);

    ctx.relayCriticalExceptionsToBPO([ANOMALY]);
    await new Promise((r) => setTimeout(r, 20));
    check(calls.length === 0, 'same anomaly + same member on a re-render does not fire a second relay (idempotency cache)');
  }

  console.log('\n== Same anomaly, member changes -> relays again');
  {
    const store = { tsm_rcmos_relayed_exceptions_v1: JSON.stringify({ 'TSM-HEALTHCARE-EXC-an_test_0001': 'old-member' }) };
    const fakeLocalStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
    const win = { localStorage: fakeLocalStorage, location: { search: '' } };
    const calls = [];
    const fakeFetch = async (url, opts = {}) => { calls.push({ url, method: opts.method || 'GET', body: opts.body }); return { ok: true, status: 200, json: async () => ({ ok: true, clients: [], workItem: {}, document: {} }) }; };
    const ctx = vm.createContext({ window: win, document: {}, localStorage: fakeLocalStorage, location: win.location, fetch: fakeFetch, FormData, Blob, URL, setTimeout, console, encodeURIComponent, JSON, Date, Promise, Array, Object, String, Error, module: {} });
    vm.runInContext(ACTIVE_MEMBER_JS, ctx);
    vm.runInContext(RELAY_JS, ctx);
    ctx.window.TSMActiveMember.setActive('new-member');
    vm.runInContext(RELAY_FN_SRC, ctx);

    ctx.relayCriticalExceptionsToBPO([ANOMALY]);
    await new Promise((r) => setTimeout(r, 20));
    check(calls.length === 2, 'switching active member relays the same anomaly again, to the newly selected member');
    eq(JSON.parse(calls[0].body).clientId, 'new-member', 'the re-relay is attributed to the newly active member, not the stale one');
  }

  console.log(failures ? '\nRCM-OS EXCEPTION RELAY REGRESSION: ' + failures + ' FAILURE(S)' : '\nRCM-OS EXCEPTION RELAY REGRESSION: PASS');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('FAIL (exception):', e); process.exit(1); });
