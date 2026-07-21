#!/usr/bin/env bash
# apply-sentinel-enrichment.sh
# One-shot: locate tsm-capability-sweep.js, back it up, insert the Sentinel
# enrichment functions via an EXACT string match (fails loudly rather than
# guessing if your file doesn't match what was reviewed), drop in the test
# script, and run it.
#
# Usage:
#   ./apply-sentinel-enrichment.sh [path/to/tsm-capability-sweep.js]
#
# If no path is given, it searches the repo for the file.

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "No path given, searching repo for tsm-capability-sweep.js..."
  FILE=$(find . -name "tsm-capability-sweep.js" -not -path "*/node_modules/*" -not -path "*/backups/*" | head -1)
  if [ -z "$FILE" ]; then
    echo "ERROR: could not find tsm-capability-sweep.js. Pass the path explicitly:"
    echo "  ./apply-sentinel-enrichment.sh path/to/tsm-capability-sweep.js"
    exit 1
  fi
  echo "Found: $FILE"
fi

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE does not exist."
  exit 1
fi

BACKUP="${FILE}.before-sentinel-enrichment.$(date +%Y%m%d_%H%M%S).bak"
cp "$FILE" "$BACKUP"
echo "Backed up original to: $BACKUP"

python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    content = f.read()

OLD = """  function renderFromStorage(vertical, el) {
    render(el, readStored(vertical));
  }

  global.TSMCapabilitySweep = {
    fire: fire,
    render: render,
    renderFromStorage: renderFromStorage,
    readStored: readStored
  };
})(window);"""

NEW = """  function renderFromStorage(vertical, el) {
    render(el, readStored(vertical));
  }

  // -- SENTINEL ENRICHMENT (new) --------------------------------------------

  function sentinelStorageKey(vertical) {
    return 'TSM_' + String(vertical || '').toUpperCase() + '_STRATEGIST_RELAY';
  }

  /**
   * enrichSentinelAnomaly(anomaly, sweepPkg) -- returns a NEW object, never
   * mutates the input. Never touches severity/exposure/confidence/rootCause/
   * recommendedAction/id/title -- those feed real risk arithmetic elsewhere.
   * Sweep-derived context goes under a separate 'sweep' namespace so it can
   * never collide with or be mistaken for a risk field.
   */
  function enrichSentinelAnomaly(anomaly, sweepPkg) {
    if (!anomaly || !sweepPkg) return anomaly;
    var out = {};
    for (var k in anomaly) { if (Object.prototype.hasOwnProperty.call(anomaly, k)) out[k] = anomaly[k]; }
    var touched = sweepPkg.phasesTouched != null
      ? sweepPkg.phasesTouched
      : (sweepPkg.phases ? Object.keys(sweepPkg.phases).length : null);
    out.sweep = {
      caseId: sweepPkg.caseId || null,
      phasesTouched: touched,
      errorCount: sweepPkg.errors ? sweepPkg.errors.length : 0,
      capturedAt: new Date().toISOString()
    };
    return out;
  }

  /**
   * autoEnrichSentinel(vertical) -- reads the vertical's existing Sentinel
   * relay entry (TSM_<VERTICAL>_STRATEGIST_RELAY) and its capability sweep
   * entry (TSM_<VERTICAL>_CAPABILITY_SWEEP). If BOTH exist, enriches every
   * anomaly in relay.anomalies with sweep context and writes back to the
   * SAME relay key. Never creates the relay key if it's missing -- this
   * augments an existing push, it does not stand one up.
   *
   * Returns the updated relay object, or null on any no-op/failure path.
   */
  function autoEnrichSentinel(vertical) {
    if (!vertical) return null;
    var relayKey = sentinelStorageKey(vertical);
    var relay;
    try {
      var relayRaw = localStorage.getItem(relayKey);
      relay = relayRaw ? JSON.parse(relayRaw) : null;
    } catch (e) {
      console.warn('[TSMCapabilitySweep] Sentinel relay read failed for ' + vertical + ':', e);
      return null;
    }
    if (!relay || !Array.isArray(relay.anomalies) || !relay.anomalies.length) return null;

    var sweepWrapper = readStored(vertical);
    var sweepPkg = sweepWrapper && sweepWrapper.decisionPackage;
    if (!sweepPkg) return null;

    relay.anomalies = relay.anomalies.map(function (a) { return enrichSentinelAnomaly(a, sweepPkg); });

    try {
      localStorage.setItem(relayKey, JSON.stringify(relay));
    } catch (e) {
      console.warn('[TSMCapabilitySweep] Sentinel relay write failed for ' + vertical + ':', e);
      return null;
    }
    return relay;
  }

  global.TSMCapabilitySweep = {
    fire: fire,
    render: render,
    renderFromStorage: renderFromStorage,
    readStored: readStored,
    enrichSentinelAnomaly: enrichSentinelAnomaly,
    autoEnrichSentinel: autoEnrichSentinel
  };
})(window);"""

if OLD not in content:
    print("ERROR: exact anchor text not found in " + path + ".")
    print("This means the real file differs from the version reviewed in chat --")
    print("stopping rather than guessing where to insert. No changes were made.")
    sys.exit(1)

if "autoEnrichSentinel" in content:
    print("ERROR: 'autoEnrichSentinel' already exists in " + path + ". Refusing to apply twice.")
    print("No changes were made.")
    sys.exit(1)

content = content.replace(OLD, NEW, 1)
with open(path, 'w') as f:
    f.write(content)

print("Patch applied successfully to " + path)
PYEOF

APPLY_STATUS=$?
if [ "$APPLY_STATUS" -ne 0 ]; then
  echo "Patch NOT applied. Original file is untouched. Backup left at: $BACKUP (identical to original, safe to delete)."
  exit 1
fi

TESTDIR=$(dirname "$FILE")
TESTFILE="$TESTDIR/test-sentinel-enrichment.js"

cat > "$TESTFILE" <<'JSEOF'
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
JSEOF

echo ""
echo "Test file written to: $TESTFILE"
echo "Running tests..."
echo ""
node "$TESTFILE"
TEST_STATUS=$?

echo ""
if [ "$TEST_STATUS" -eq 0 ]; then
  echo "All tests passed. Patch applied to: $FILE"
  echo "Backup of pre-patch original: $BACKUP"
else
  echo "TESTS FAILED. The patch was applied to $FILE, but verification failed."
  echo "Consider restoring from backup: cp $BACKUP $FILE"
fi
exit $TEST_STATUS