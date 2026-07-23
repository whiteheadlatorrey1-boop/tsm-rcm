#!/usr/bin/env node
/**
 * scripts/verify-mission-sentinel-bridge.js
 *
 * Verifies the Phase 3 Mission -> Sentinel bridge (mission-sentinel-bridge.js)
 * against BOTH mission-store implementations, using a Node vm + in-memory
 * localStorage shim. No browser/server needed — same pattern as
 * verify-mission-runtime.js.
 *
 * Run from repo root:
 *   node scripts/verify-mission-sentinel-bridge.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0;
let fail = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log('\u2705 ' + label);
    pass++;
  } else {
    console.log('\u274c ' + label + (detail !== undefined ? ' \u2014 ' + JSON.stringify(detail) : ''));
    fail++;
  }
}

function makeLocalStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    _dump: () => store
  };
}

function makeSandbox() {
  const sandbox = {
    console,
    localStorage: makeLocalStorage(),
    window: null,
    globalThis: null,
    CustomEvent: function (type, opts) { this.type = type; this.detail = opts && opts.detail; },
    dispatchedEvents: []
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.dispatchEvent = function (evt) { sandbox.dispatchedEvents.push(evt); };
  vm.createContext(sandbox);
  return sandbox;
}

function loadFile(sandbox, relPath) {
  const full = path.join(process.cwd(), relPath);
  const code = fs.readFileSync(full, 'utf8');
  vm.runInContext(code, sandbox, { filename: relPath });
}

// ── TEST 1: shared runtime store (subscribe-based path) ──
console.log('=== Mission Sentinel Bridge verification ===\n');
console.log('--- Path 1: shared runtime store (mission-store.js) ---');
{
  const sandbox = makeSandbox();
  try {
    loadFile(sandbox, 'html/shared/runtime/mission/mission-model.js');
    loadFile(sandbox, 'html/shared/runtime/mission/mission-store.js');
    loadFile(sandbox, 'html/shared/runtime/mission/mission-sentinel-bridge.js');

    const mission = sandbox.window.TSMMissionModel.createMission({
      vertical: 'healthcare',
      tenantId: 'default',
      classification: { summary: 'Test finding for bridge verification', exposure: '$50K' },
      workflow: { priority: 'high' },
      actor: 'verify-script'
    });
    sandbox.window.TSMMissionStore.saveMission(mission);

    const raw = sandbox.localStorage.getItem('TSM_HEALTHCARE_STRATEGIST_RELAY');
    check('relay key written for healthcare vertical', !!raw, raw);

    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) {}
    check('relay payload has anomalies array', parsed && Array.isArray(parsed.anomalies), parsed);
    check('anomaly severity mapped from priority (high -> HIGH)',
      parsed && parsed.anomalies[0] && parsed.anomalies[0].severity === 'HIGH',
      parsed && parsed.anomalies[0]);
    check('anomaly carries mission summary as title',
      parsed && parsed.anomalies[0] && parsed.anomalies[0].title === 'Test finding for bridge verification',
      parsed && parsed.anomalies[0]);
    check('TSM_SENTINEL_REFRESH event dispatched',
      sandbox.dispatchedEvents.some((e) => e.type === 'TSM_SENTINEL_REFRESH'),
      sandbox.dispatchedEvents);

    // Second save (update, not create) should NOT push again
    const beforeCount = parsed ? parsed.anomalies.length : -1;
    sandbox.window.TSMMissionStore.saveMission(Object.assign({}, mission, { stage: 'in_progress' }));
    const raw2 = sandbox.localStorage.getItem('TSM_HEALTHCARE_STRATEGIST_RELAY');
    const parsed2 = JSON.parse(raw2);
    check('MISSION_UPDATED does not duplicate the Sentinel anomaly',
      parsed2.anomalies.length === beforeCount,
      { before: beforeCount, after: parsed2.anomalies.length });

  } catch (e) {
    check('shared-store path ran without throwing', false, e.message);
  }
}

// ── TEST 2: Construction's class-based store (prototype-patch path) ──
console.log('\n--- Path 2: Construction store (js/tsm-mission-store.js) ---');
{
  const sandbox = makeSandbox();
  try {
    loadFile(sandbox, 'html/js/tsm-mission-store.js');
    loadFile(sandbox, 'html/shared/runtime/mission/mission-sentinel-bridge.js');

    const mission = {
      id: 'constr-test-1',
      vertical: 'construction',
      classification: { summary: 'Construction test finding', exposure: '$120K' },
      workflow: { priority: 'critical' }
    };
    sandbox.window.TSMMissionStore.addMission(mission);

    const raw = sandbox.localStorage.getItem('TSM_CONSTRUCTION_STRATEGIST_RELAY');
    check('relay key written for construction vertical', !!raw, raw);

    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) {}
    check('anomaly severity mapped from priority (critical -> CRIT)',
      parsed && parsed.anomalies[0] && parsed.anomalies[0].severity === 'CRIT',
      parsed && parsed.anomalies[0]);
    check('original addMission behavior preserved (mission still saved to store)',
      sandbox.window.TSMMissionStore.state.missions.some((m) => m.id === 'constr-test-1'),
      sandbox.window.TSMMissionStore.state.missions);
    check('TSM_SENTINEL_REFRESH event dispatched',
      sandbox.dispatchedEvents.some((e) => e.type === 'TSM_SENTINEL_REFRESH'),
      sandbox.dispatchedEvents);

  } catch (e) {
    check('construction-store path ran without throwing', false, e.message);
  }
}

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED (' + fail + ' failed, ' + pass + ' passed)'));
process.exit(fail === 0 ? 0 : 1);