'use strict';
// Browser helper + bridge against a fake fetch/localStorage: the token from the
// create response is stored once and sent on every event; no identity = no traffic.
const assert = require('assert');
const path = require('path');

const store = {};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
}});
const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url, init });
  const body = /training-events$/.test(url)
    ? { candidate: { candidateId: 'cand_1', readinessScore: 75 } }
    : { candidate: { candidateId: 'cand_1' }, candidateToken: 'tok_1' };
  return { ok: true, status: 201, json: async () => body, text: async () => JSON.stringify(body) };
};

const bridge = require(path.join(__dirname, '..', 'html', 'js', 'career', 'tsm-candidate-registry-bridge.js'));
const session = require(path.join(__dirname, '..', 'html', 'js', 'career', 'tsm-candidate-session.js'));

(async () => {
  let passed = 0, failed = 0;
  const check = async (label, fn) => { try { await fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); } };
  const ev = { type: 'aplus_practice_session', score: 75, weight: 1 };

  await check('no identity: nothing is sent', async () => {
    const r = await session.recordEvent(ev, 'aplus_practice');
    assert.strictEqual(r.reason, 'no-identity');
    assert.strictEqual(calls.length, 0);
  });

  session.setIdentity({ name: 'TEST A+ Learner' });

  await check('first event: create, then event carries the token and Content-Type', async () => {
    const r = await session.recordEvent(ev, 'aplus_practice');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(calls.length, 2);
    const h = calls[1].init.headers;
    assert.strictEqual(h['x-candidate-token'], 'tok_1');
    assert.strictEqual(h['Content-Type'], 'application/json');
  });
  await check('id and token stored in localStorage', async () => {
    const s = JSON.parse(store['tsm_candidate_session_v1']);
    assert.strictEqual(s.candidateId, 'cand_1');
    assert.strictEqual(s.candidateToken, 'tok_1');
  });
  await check('second event: no second create, token still sent', async () => {
    calls.length = 0;
    const r = await session.recordEvent(ev, 'aplus_practice');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].init.headers['x-candidate-token'], 'tok_1');
  });
  await check('bridge without options sends no token header (compatible)', async () => {
    calls.length = 0;
    await bridge.recordTrainingEvent('cand_1', ev);
    assert.strictEqual(calls[0].init.headers['x-candidate-token'], undefined);
    assert.strictEqual(calls[0].init.headers['Content-Type'], 'application/json');
  });

  console.log('CANDIDATE SESSION TOKEN: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
