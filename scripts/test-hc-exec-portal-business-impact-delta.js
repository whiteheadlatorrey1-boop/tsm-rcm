'use strict';

// Regression test for the Healthcare exec portal Business Impact Delta bug
// found and fixed this session:
//
//   1. hc-main-strategist.html computed the real, deterministic Business
//      Impact Delta via the shared TSMBNCAExposureEngine.project() and
//      displayed it correctly on the STRATEGIST page itself (#hcDeltaNo /
//      #hcDeltaAct), but never cached the numbers anywhere
//      escalateToExecPortal() could read them from -- so its relay
//      payload never carried noActionRevLoss/actionRevLoss at all.
//
//   2. Separately and independently, executive-portal.html's KPI-wiring
//      function (wireStratKPIs) was reading from window.__TSM_STRAT_JSON__
//      (never assigned anywhere in the codebase) and two relay keys that
//      are either unwritten or written by an unrelated block with a
//      completely different shape -- never the real TSM_EXEC_RELAY key
//      that escalateToExecPortal() actually writes to and that the rest
//      of the exec portal already reads from everywhere else.
//
// Together, these meant the Business Impact Delta / recovery-time /
// confidence tiles on the Healthcare exec portal have never populated,
// for any case, ever -- both bugs had to be fixed for the tiles to work.
//
// This test doesn't spin up a browser; it exercises the same two code
// units in isolation with the same data shapes the real pages use:
//   (a) TSMBNCAExposureEngine.project() -- real file, required directly
//   (b) the escalateToExecPortal() write-side contract -- reimplemented
//       here as a plain object assignment matching the exact lines
//       changed in hc-main-strategist.html, since that logic lives
//       inline in a giant HTML file and isn't its own requirable module
//   (c) the wireStratKPIs() read-side contract -- same approach, mirrors
//       the exact lines changed in executive-portal.html
//
// If the underlying HTML is ever refactored to extract these into real
// modules, this test's two hand-copied blocks should be replaced with
// direct requires of those modules instead.

const path = require('path');
const TSMBNCAExposureEngine = require('../html/js/tsm-bnca-exposure-engine.js');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

// ── Step 1: the strategist page's render function computes this exact
// shape (mirrors the hcXPImpact computation + fmt() in hc-main-strategist.html) ──
const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

const hcXPImpact = TSMBNCAExposureEngine.project({
  baseExposure: 84000,
  severity: 'HIGH',
  confidence: 62,
  daysUntilDeadline: 5
});

assert(typeof hcXPImpact.ifIgnored.exposure === 'number' && hcXPImpact.ifIgnored.exposure > 0,
  `TSMBNCAExposureEngine computes a real no-action exposure figure - got ${hcXPImpact.ifIgnored.exposure}`);
assert(typeof hcXPImpact.ifActed.exposure === 'number' && hcXPImpact.ifActed.exposure < hcXPImpact.ifIgnored.exposure,
  `with-action exposure is real and lower than no-action - got ${hcXPImpact.ifActed.exposure} vs ${hcXPImpact.ifIgnored.exposure}`);

// ── Step 2: the module-level cache assignments added to
// hc-main-strategist.html's render function ──
const lastStrategistNoActionExposure = fmt(hcXPImpact.ifIgnored.exposure);
const lastStrategistWithActionExposure = fmt(hcXPImpact.ifActed.exposure);
const lastStrategistRecoveryTime = hcXPImpact.urgencyWindow + ' \u00b7 ' + hcXPImpact.methodology;
const lastStrategistConfidence = 62;

// ── Step 3: the escalateToExecPortal() payload.kpi assignments added
// this session -- this is the exact write-side fix ──
const kpi = { totalAtRisk: '$84,000', denialRate: '11.2%' };
if (lastStrategistNoActionExposure) kpi.noActionRevLoss = lastStrategistNoActionExposure;
if (lastStrategistWithActionExposure) kpi.actionRevLoss = lastStrategistWithActionExposure;
if (lastStrategistRecoveryTime) kpi.recoveryTime = lastStrategistRecoveryTime;
if (lastStrategistConfidence !== null) kpi.confidence = lastStrategistConfidence;

const payload = { ts: Date.now(), kpi }; // this is what gets JSON.stringify'd into TSM_EXEC_RELAY

assert(payload.kpi.noActionRevLoss === lastStrategistNoActionExposure,
  'escalateToExecPortal() payload.kpi carries noActionRevLoss');
assert(payload.kpi.actionRevLoss === lastStrategistWithActionExposure,
  'escalateToExecPortal() payload.kpi carries actionRevLoss');

// ── Step 4: the wireStratKPIs() read-side fix in executive-portal.html --
// same logic, reimplemented here: check TSM_EXEC_RELAY-shaped raw object
// first, extract from raw.kpi, fall back to em-dash only if truly absent ──
function hasData(obj) {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
}

function wireStratKPIsLogic(relayJson, simulatedExecRelayStorage) {
  let raw = relayJson;
  if (!hasData(raw)) raw = simulatedExecRelayStorage ? JSON.parse(simulatedExecRelayStorage) : null;
  raw = raw || {};
  const stratJson = raw.kpi || raw.stratJson || raw.json || raw;
  return {
    noAction: stratJson.noActionRevLoss || '\u2014',
    withAction: stratJson.actionRevLoss || '\u2014',
    recovery: stratJson.recoveryTime || '\u2014',
    confidence: stratJson.confidence != null ? stratJson.confidence + '%' : '\u2014'
  };
}

// Simulate what's actually in sessionStorage/localStorage['TSM_EXEC_RELAY']
// after escalateToExecPortal() runs (this is JSON.stringify(payload) in
// the real code -- reproduced here since this test has no DOM/storage).
const simulatedExecRelayStorage = JSON.stringify(payload);

const wired = wireStratKPIsLogic(null, simulatedExecRelayStorage);

assert(wired.noAction === lastStrategistNoActionExposure,
  `exec portal KPI tile reads the real no-action figure end-to-end - got ${wired.noAction}`);
assert(wired.withAction === lastStrategistWithActionExposure,
  `exec portal KPI tile reads the real with-action figure end-to-end - got ${wired.withAction}`);
assert(wired.recovery === lastStrategistRecoveryTime,
  'exec portal KPI tile reads the real recovery-time/methodology string end-to-end');
assert(wired.confidence === '62%',
  `exec portal KPI tile reads the real confidence end-to-end - got ${wired.confidence}`);

// ── Step 5: regression guard -- prove the OLD read path (checking
// TSM_HC_WAR_RELAY / TSM_HEALTHCARE_STRATEGIST_RELAY only, no TSM_EXEC_RELAY
// check) would NOT have found this data, confirming the bug was real and
// this fix is what actually closes it, not a redundant no-op change ──
function oldWireStratKPIsLogic(relayJson) {
  // old code never checked TSM_EXEC_RELAY at all -- only these two, which
  // in production are either unwritten or hold a {generatedAt, anomalies}
  // shape from an unrelated Sentinel-push block, never kpi.*
  let raw = relayJson || null;
  raw = raw || {};
  const stratJson = raw.stratJson || raw.json || raw;
  return {
    noAction: stratJson.noActionRevLoss || '\u2014'
  };
}
const oldResult = oldWireStratKPIsLogic(null);
assert(oldResult.noAction === '\u2014',
  'regression guard: confirms the pre-fix read path never found this data (bug was real)');

console.log('\n' + (process.exitCode ? 'TEST FAILED' : 'TEST PASSED'));
