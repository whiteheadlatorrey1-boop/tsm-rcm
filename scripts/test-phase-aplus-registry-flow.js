'use strict';
// Real candidate-registry-service against an in-memory fake MongoDB (no network, no writes).
// Verifies the A+ practice event is stored unchanged, feeds readinessScore on a 0-100
// scale, and is assessed as exactly one (technical) dimension.
const assert = require('assert');
const Module = require('module');
const path = require('path');

const stores = {};
const matches = (doc, q) => Object.keys(q || {}).every((k) => doc[k] === q[k]);
function makeCollection(name) {
  const docs = (stores[name] = stores[name] || []);
  const impl = {
    async insertOne(d) { docs.push(Object.assign({}, d)); return { acknowledged: true }; },
    find(q) { const r = docs.filter((d) => matches(d, q)); return { toArray: async () => r.slice(), sort() { return this; }, limit() { return this; } }; },
    async findOne(q) { return docs.find((d) => matches(d, q)) || null; },
    async updateOne(q, u, o) {
      let d = docs.find((x) => matches(x, q));
      if (!d && o && o.upsert) { d = Object.assign({}, q, u.$setOnInsert || {}); docs.push(d); }
      if (d) Object.assign(d, u.$set || {});
      return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 };
    },
    async replaceOne(q, r, o) {
      const i = docs.findIndex((x) => matches(x, q));
      if (i >= 0) docs[i] = Object.assign({}, r); else if (o && o.upsert) docs.push(Object.assign({}, r));
      return { matchedCount: i >= 0 ? 1 : 0 };
    },
    async deleteOne(q) { const i = docs.findIndex((x) => matches(x, q)); if (i >= 0) docs.splice(i, 1); return { deletedCount: i >= 0 ? 1 : 0 }; },
    async countDocuments(q) { return docs.filter((d) => matches(d, q)).length; },
  };
  return new Proxy(impl, { get(t, p) { if (p in t) return t[p]; if (typeof p === 'symbol' || p === 'then') return undefined; throw new Error('fake mongo: unsupported method ' + String(p)); } });
}
class FakeClient { async connect() {} db() { return { collection: makeCollection }; } }

process.env.MONGODB_URI = 'mongodb://fake.invalid/test';
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'mongodb') return { MongoClient: FakeClient, ObjectId: class {} };
  return origLoad.call(this, request, ...rest);
};
const registry = require(path.join(__dirname, '..', 'server', 'candidate-registry-service.js'));
const model = require(path.join(__dirname, '..', 'server', 'readiness', 'professional-readiness-model.js'));
Module._load = origLoad;

(async () => {
  let passed = 0, failed = 0;
  const check = async (label, fn) => { try { await fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); } };

  const created = await registry.upsertCandidate({ name: 'TEST A+ Learner', role: 'IT Support / A+', status: 'in_training', source: 'aplus_practice', isSampleData: true });
  const id = created.candidateId || (created.candidate && created.candidate.candidateId);
  const ev = (score) => ({ type: 'aplus_practice_session', score, weight: 1, meta: { correct: 6, total: 8, source: 'aplus_practice' } });

  await check('candidate created with an id', async () => assert.ok(id));
  let after;
  await check('A+ event accepted; readinessScore is 75 (0-100 scale)', async () => {
    after = await registry.recordTrainingEvent(id, ev(75));
    assert.strictEqual(after.readinessScore, 75);
  });
  await check('event stored unchanged (type, score, weight, meta.source)', async () => {
    const all = [].concat(...Object.values(stores)).filter((d) => d.type === 'aplus_practice_session');
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].score, 75); assert.strictEqual(all[0].weight, 1); assert.strictEqual(all[0].meta.source, 'aplus_practice');
  });
  await check('second session (55) averages to 65', async () => {
    const c = await registry.recordTrainingEvent(id, ev(55));
    assert.strictEqual(c.readinessScore, 65);
  });
  await check('readiness model assesses exactly one dimension (technical)', async () => {
    const events = await registry.listTrainingEvents(id);
    const r = model.assessProfessionalReadiness(events);
    assert.deepStrictEqual(r.overall.assessedDimensions, ['technical']);
  });
  await check('non-numeric score is rejected', async () => {
    await assert.rejects(() => registry.recordTrainingEvent(id, { type: 'aplus_practice_session', score: 'high' }));
  });

  console.log('A+ REGISTRY FLOW: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('  ERROR: ' + e.message); process.exit(1); });
