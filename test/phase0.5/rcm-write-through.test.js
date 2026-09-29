const assert = require('assert');
const engine = require('../../html/js/career/tsm-rcm-career-engine.js');

const tick = () => new Promise((r) => setImmediate(r));

describe('Phase 0.5 — RCM write-through to Candidate Registry', function () {
  let original;
  beforeEach(() => { original = global.TSMCandidateRegistryBridge; engine.clearCandidateContext(); });
  afterEach(() => { global.TSMCandidateRegistryBridge = original; engine.clearCandidateContext(); });

  const attempt = { competency: 'appeal_strategy', concept: 'denial_recovery', score: 0.91, source: 't' };

  it('sends nothing without candidate context', async () => {
    const calls = [];
    global.TSMCandidateRegistryBridge = { recordRcmAttempt: (...a) => { calls.push(a); return Promise.resolve(); } };
    engine.recordAttempt(attempt);
    await tick();
    assert.strictEqual(calls.length, 0);
  });

  it('sends candidateId and a 0-100 score with context active', async () => {
    const calls = [];
    global.TSMCandidateRegistryBridge = { recordRcmAttempt: (...a) => { calls.push(a); return Promise.resolve(); } };
    engine.setCandidateContext('cand_test');
    const local = engine.recordAttempt(attempt);
    await tick();
    assert.strictEqual(local.score, 0.91);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0][0], 'cand_test');
    assert.strictEqual(calls[0][1].score, 91);
    assert.strictEqual(calls[0][1].metadata.attemptId, local.id);
  });

  it('swallows async bridge failure, keeps the local attempt, and counts it', async () => {
    let unhandled = false;
    const onUnhandled = () => { unhandled = true; };
    process.once('unhandledRejection', onUnhandled);
    global.TSMCandidateRegistryBridge = { recordRcmAttempt: () => Promise.reject(new Error('network down')) };
    engine.setCandidateContext('cand_test');
    const before = engine.getWriteThroughStatus().failed;
    const local = engine.recordAttempt(attempt);
    await tick(); await tick();
    process.removeListener('unhandledRejection', onUnhandled);
    assert.strictEqual(local.competency, 'appeal_strategy');
    assert.strictEqual(unhandled, false);
    assert.strictEqual(engine.getWriteThroughStatus().failed, before + 1);
    assert.strictEqual(engine.getWriteThroughStatus().lastError, 'network down');
  });

  it('swallows a synchronous bridge throw', () => {
    global.TSMCandidateRegistryBridge = { recordRcmAttempt: () => { throw new Error('boom'); } };
    engine.setCandidateContext('cand_test');
    const local = engine.recordAttempt(attempt);
    assert.strictEqual(local.score, 0.91);
  });
});
