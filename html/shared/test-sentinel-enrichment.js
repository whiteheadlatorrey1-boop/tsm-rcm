const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

function makeLocalStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
}

const sandbox = { console, window: {}, CustomEvent: function (name, opts) { this.name = name; this.detail = opts && opts.detail; } };
sandbox.window.localStorage = makeLocalStorage();
sandbox.window.dispatchEvent = () => {};
sandbox.localStorage = sandbox.window.localStorage;
sandbox.fetch = () => Promise.reject(new Error('fetch not used in this test'));

vm.createContext(sandbox);
const code = fs.readFileSync(path.join(__dirname, 'tsm-capability-sweep.js'), 'utf8');
vm.runInContext(code, sandbox, { filename: 'tsm-capability-sweep.js' });

const TSM = sandbox.window.TSMCapabilitySweep;
const ls = sandbox.window.localStorage;

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); console.log('PASS -', name); passed++; }
  catch (e) { console.log('FAIL -', name, '\n   ', e.message); failed++; }
}

(function () {
  const insuranceAnomaly = { id: 'ins-strat-171234', title: 'Insurance Matter', severity: 'HIGH', exposure: 120000, confidence: 82, rootCause: 'BNCA synthesis.', recommendedAction: 'Escalate.' };
  ls.setItem('TSM_INSURANCE_STRATEGIST_RELAY', JSON.stringify({ generatedAt: 't', anomalies: [insuranceAnomaly] }));
  ls.setItem('TSM_INSURANCE_CAPABILITY_SWEEP', JSON.stringify({ capturedAt: 't', decisionPackage: { caseId: 'CASE-INS-9001', vertical: 'insurance', phasesTouched: 6, errors: ['mdm: unavailable'], phases: {} } }));
  const result = TSM.autoEnrichSentinel('insurance');
  check('insurance: returns updated relay', () => assert.ok(result));
  const a = result.anomalies[0];
  check('insurance: core fields unchanged', () => {
    assert.strictEqual(a.severity, 'HIGH'); assert.strictEqual(a.exposure, 120000); assert.strictEqual(a.confidence, 82);
    assert.strictEqual(a.rootCause, insuranceAnomaly.rootCause); assert.strictEqual(a.recommendedAction, insuranceAnomaly.recommendedAction);
  });
  check('insurance: sweep fields added', () => {
    assert.strictEqual(a.sweep.caseId, 'CASE-INS-9001'); assert.strictEqual(a.sweep.phasesTouched, 6); assert.strictEqual(a.sweep.errorCount, 1);
  });
})();

(function () {
  ls.setItem('TSM_FINOPS_CAPABILITY_SWEEP', JSON.stringify({ capturedAt: 't', decisionPackage: { caseId: 'CASE-FIN-1', vertical: 'finops', phasesTouched: 3, errors: [], phases: {} } }));
  const result = TSM.autoEnrichSentinel('finops');
  check('finops: no-op, no relay entry exists', () => assert.strictEqual(result, null));
  check('finops: does not fabricate a relay key', () => assert.strictEqual(ls.getItem('TSM_FINOPS_STRATEGIST_RELAY'), null));
})();

(function () {
  const anomaly = { id: 'x-1', title: 'T', severity: 'LOW', exposure: 100, confidence: 90, rootCause: 'r', recommendedAction: 'a' };
  ls.setItem('TSM_LEGAL_STRATEGIST_RELAY', JSON.stringify({ generatedAt: 't', anomalies: [anomaly] }));
  const before = ls.getItem('TSM_LEGAL_STRATEGIST_RELAY');
  const result = TSM.autoEnrichSentinel('legal');
  check('legal: no-op when sweep data missing', () => assert.strictEqual(result, null));
  check('legal: relay left byte-identical', () => assert.strictEqual(ls.getItem('TSM_LEGAL_STRATEGIST_RELAY'), before));
})();

(function () {
  const original = { id: 'i', title: 't', severity: 'HIGH', exposure: 1, confidence: 1, rootCause: 'r', recommendedAction: 'a' };
  const originalCopy = JSON.parse(JSON.stringify(original));
  const enriched = TSM.enrichSentinelAnomaly(original, { caseId: 'C', phasesTouched: 2, errors: [] });
  check('enrichSentinelAnomaly does not mutate input', () => assert.deepStrictEqual(original, originalCopy));
  check('enrichSentinelAnomaly returns distinct object', () => { assert.notStrictEqual(enriched, original); assert.ok(enriched.sweep); });
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
