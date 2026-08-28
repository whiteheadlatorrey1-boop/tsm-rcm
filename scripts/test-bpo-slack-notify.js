'use strict';

// Regression test for the Slack BPO notification hook.
//
// Covers two things at two layers:
//   1. server/integrations/slack-notifier.js in isolation (config gating,
//      message shape) — no ledger service, no mongodb stub needed.
//   2. The real bpoUpsertWorkItem() call site in
//      server/tsm-ledger-service.js actually invokes it on the resolved
//      transition, using the same in-memory Mongo stub technique as
//      scripts/test-bpo-upsert-clientid-sticky.js, plus a mocked global
//      fetch so no real network call leaves the sandbox.

const Module = require('module');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

(async () => {
  // ---- Layer 1: slack-notifier.js in isolation ---------------------------

  const notifier = require('../server/integrations/slack-notifier');

  // 1a. Disabled by default (no env vars set) -> notify() is a silent no-op,
  //     never throws, never calls fetch.
  delete process.env.SLACK_BPO_NOTIFY_ENABLED;
  delete process.env.SLACK_BPO_WEBHOOK_URL;
  let fetchCalled = false;
  const origFetch = global.fetch;
  global.fetch = async () => { fetchCalled = true; return { ok: true }; };

  const resultWhenUnconfigured = await notifier.notify({ caseId: 'X-1', slaEventType: 'resolved' });
  assert(resultWhenUnconfigured === false, 'notify() returns false when unconfigured');
  assert(!fetchCalled, 'notify() never calls fetch when unconfigured');

  // 1b. Enabled + webhook set -> real POST attempted, resolves true on 2xx.
  process.env.SLACK_BPO_NOTIFY_ENABLED = 'true';
  process.env.SLACK_BPO_WEBHOOK_URL = 'https://hooks.slack.test/fake-webhook';
  let capturedUrl = null;
  let capturedBody = null;
  global.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedBody = JSON.parse(opts.body);
    return { ok: true, status: 200 };
  };

  const resultWhenConfigured = await notifier.notify({
    caseId: 'BPO-CID-9', clientId: 'acme-co', vertical: 'bpo',
    stage: 'exec', status: 'resolved', slaEventType: 'resolved', actor: 'test-actor',
  });
  assert(resultWhenConfigured === true, 'notify() returns true on a successful (mocked) 2xx POST');
  assert(capturedUrl === 'https://hooks.slack.test/fake-webhook', 'notify() posts to the configured SLACK_BPO_WEBHOOK_URL');
  assert(typeof capturedBody.text === 'string' && capturedBody.text.includes('BPO-CID-9'),
    'posted payload includes a text fallback naming the caseId');
  assert(capturedBody.text.includes('acme-co'), 'posted payload includes the clientId in context');
  assert(Array.isArray(capturedBody.blocks) && capturedBody.blocks.length > 0,
    'posted payload includes Block Kit blocks, not just plain text');

  // 1b-ii. Default event filter: 'opened'/'advanced' do NOT notify unless
  // explicitly opted into via SLACK_BPO_NOTIFY_EVENTS — only 'resolved'
  // does, by default.
  let fetchCalledForNonResolved = false;
  global.fetch = async () => { fetchCalledForNonResolved = true; return { ok: true, status: 200 }; };
  const openedResult = await notifier.notify({ caseId: 'X-3', slaEventType: 'opened' });
  const advancedResult = await notifier.notify({ caseId: 'X-4', slaEventType: 'advanced' });
  assert(openedResult === false, 'notify() skips an "opened" event by default');
  assert(advancedResult === false, 'notify() skips an "advanced" event by default');
  assert(!fetchCalledForNonResolved, 'fetch is never called for filtered-out event types');

  // 1b-iii. Explicit opt-in via SLACK_BPO_NOTIFY_EVENTS re-enables them.
  process.env.SLACK_BPO_NOTIFY_EVENTS = 'opened,resolved';
  let optInFetchCalled = false;
  global.fetch = async () => { optInFetchCalled = true; return { ok: true, status: 200 }; };
  const openedAfterOptIn = await notifier.notify({ caseId: 'X-5', slaEventType: 'opened' });
  assert(openedAfterOptIn === true, 'notify() sends an "opened" event once opted in via SLACK_BPO_NOTIFY_EVENTS');
  assert(optInFetchCalled, 'fetch is called once opted into "opened"');
  delete process.env.SLACK_BPO_NOTIFY_EVENTS; // restore default for the rest of this test

  // 1c. A non-2xx response is a real thrown error (caller's job to catch).
  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'server error' });
  let threw = false;
  try {
    await notifier.notify({ caseId: 'X-2', slaEventType: 'resolved' });
  } catch (e) {
    threw = true;
    assert(/HTTP 500/.test(e.message), 'thrown error on non-2xx includes the status code');
  }
  assert(threw, 'notify() throws on a non-2xx Slack response');

  global.fetch = origFetch;

  // ---- Layer 2: real bpoUpsertWorkItem() call site -----------------------
  // Same in-memory Mongo stub as test-bpo-upsert-clientid-sticky.js.

  const store = new Map();
  function applyUpdate(existing, update) {
    const doc = existing ? { ...existing } : {};
    if (update.$set) Object.assign(doc, update.$set);
    if (update.$setOnInsert && !existing) Object.assign(doc, update.$setOnInsert);
    return doc;
  }
  const fakeCollection = {
    async findOne(query) { const doc = store.get(query.caseId); return doc ? { ...doc } : null; },
    find() { const api = { sort: () => api, limit: () => api, async toArray() { return []; } }; return api; },
    async updateOne(query, update, opts) {
      const existing = store.get(query.caseId) || null;
      if (!existing && !(opts && opts.upsert)) return { matchedCount: 0, modifiedCount: 0 };
      store.set(query.caseId, applyUpdate(existing, update));
      return { matchedCount: existing ? 1 : 0, modifiedCount: existing ? 1 : 0, upsertedCount: existing ? 0 : 1 };
    },
    async insertOne() { return { acknowledged: true, insertedId: 'fake-id' }; },
  };
  const fakeDb = { collection: () => fakeCollection };
  class FakeMongoClient { async connect() { return this; } db() { return fakeDb; } }

  const mongodbResolvedPath = require.resolve('mongodb');
  const fakeMongodbModule = new Module(mongodbResolvedPath, null);
  fakeMongodbModule.exports = { MongoClient: FakeMongoClient };
  fakeMongodbModule.loaded = true;
  require.cache[mongodbResolvedPath] = fakeMongodbModule;

  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';
  process.env.SLACK_BPO_NOTIFY_ENABLED = 'true';
  process.env.SLACK_BPO_WEBHOOK_URL = 'https://hooks.slack.test/fake-webhook';

  const notifyCalls = [];
  global.fetch = async (url, opts) => {
    notifyCalls.push(JSON.parse(opts.body));
    return { ok: true, status: 200 };
  };

  const ledger = require('../server/tsm-ledger-service');

  // Create, then advance to resolved via markExecuted()'s real shape
  // (no clientId field — same as the sticky-clientId test's case 3).
  await ledger.bpoUpsertWorkItem('BPO-SLACK-1', {
    clientId: 'acme-co', vertical: 'bpo', stage: 'war-room', status: 'open', payload: {},
  }, 'test-actor');
  notifyCalls.length = 0; // only care about the resolve transition below

  await ledger.bpoUpsertWorkItem('BPO-SLACK-1', {
    vertical: 'bpo', stage: 'exec', status: 'resolved', payload: {},
  }, 'test-actor');

  assert(notifyCalls.length === 1, `real bpoUpsertWorkItem() resolve transition triggers exactly one Slack notify call - got ${notifyCalls.length}`);
  assert(notifyCalls[0] && notifyCalls[0].text.includes('BPO-SLACK-1'), 'the real call site sends the correct caseId through');
  assert(notifyCalls[0] && notifyCalls[0].text.includes('acme-co'), 'the real call site passes through the sticky clientId, not null');

  // A Slack delivery failure must NOT fail the upsert itself.
  global.fetch = async () => { throw new Error('simulated network failure'); };
  let upsertThrew = false;
  let survivedDoc = null;
  try {
    survivedDoc = await ledger.bpoUpsertWorkItem('BPO-SLACK-1', {
      vertical: 'bpo', stage: 'exec', status: 'resolved', payload: { note: 'retry' },
    }, 'test-actor');
  } catch (e) {
    upsertThrew = true;
  }
  assert(!upsertThrew, 'a Slack delivery failure does not throw out of bpoUpsertWorkItem');
  assert(survivedDoc && survivedDoc.caseId === 'BPO-SLACK-1', 'the upsert still completes and returns the doc despite the Slack failure');

  global.fetch = origFetch;

  console.log('\n' + (process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED'));
})().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});
