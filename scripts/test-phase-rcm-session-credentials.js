'use strict';
const assert = require('assert');
const path = require('path');

const ENGINE = path.join(__dirname, '../html/js/career/tsm-rcm-career-engine.js');
let passed = 0, failed = 0;

function freshEngine() {
  delete require.cache[require.resolve(ENGINE)];
  delete globalThis.TSMRCMEngine;
  return require(ENGINE);
}

// recordAttempt() -> recordAttemptLocal() -> writeThrough(attempt)
function trigger(engine) {
  engine.recordAttempt({
    domain: 'rcm',
    concept: 'session_credentials_test',
    competency: 'general_rcm',
    score: 80,
    source: 'test_session_credentials'
  });
}

const tick = () => new Promise(r => setImmediate(r));

async function runCase(name, setup, check) {
  const calls = [];
  globalThis.TSMCandidateRegistryBridge = {
    recordRcmAttempt: function (id, payload, opts) {
      calls.push({ id, payload, opts });
      return Promise.resolve({});
    }
  };
  setup();
  try {
    const engine = freshEngine();
    engine.setCandidateContext('cand-1');
    trigger(engine);
    await tick();
    check(calls, engine.getWriteThroughStatus());
    passed++; console.log('ok  - ' + name);
  } catch (e) {
    failed++; console.error('FAIL - ' + name + ': ' + e.message);
  }
}

(async function () {
  await runCase('matching credentials pass token',
    () => { globalThis.TSMCandidateSession = { getCredentials: () => ({ id: 'cand-1', token: 'tok' }) }; },
    (calls, st) => {
      assert.strictEqual(calls.length, 1);
      assert.deepStrictEqual(calls[0].opts, { token: 'tok' });
      assert.strictEqual(st.sent, 1);
      assert.strictEqual(st.failed, 0);
    });

  await runCase('mismatched candidate id fails closed',
    () => { globalThis.TSMCandidateSession = { getCredentials: () => ({ id: 'other', token: 'tok' }) }; },
    (calls, st) => {
      assert.strictEqual(calls.length, 0);
      assert.strictEqual(st.failed, 1);
      assert.ok(/credentials missing or do not match/.test(st.lastError));
    });

  await runCase('getCredentials returns null fails closed',
    () => { globalThis.TSMCandidateSession = { getCredentials: () => null }; },
    (calls, st) => { assert.strictEqual(calls.length, 0); assert.strictEqual(st.failed, 1); });

  await runCase('session absent fails closed',
    () => { delete globalThis.TSMCandidateSession; },
    (calls, st) => { assert.strictEqual(calls.length, 0); assert.strictEqual(st.failed, 1); });

  await runCase('session without getCredentials fails closed',
    () => { globalThis.TSMCandidateSession = {}; },
    (calls, st) => { assert.strictEqual(calls.length, 0); assert.strictEqual(st.failed, 1); });

  console.log('RCM SESSION CREDENTIALS: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
