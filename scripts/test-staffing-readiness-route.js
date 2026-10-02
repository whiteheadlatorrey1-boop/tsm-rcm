'use strict';
// Over-HTTP test of GET /api/staffing/candidates/:id/readiness-intelligence using the
// real router with a stubbed registry lookup (no database, no writes).
const assert = require('assert');
const http = require('http');
const Module = require('module');
const path = require('path');

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'mongodb') return { MongoClient: class {}, ObjectId: class {} };
  return origLoad.call(this, request, ...rest);
};
const express = require('express');
const registry = require(path.join(__dirname, '..', 'server', 'candidate-registry-service.js'));
const router = require(path.join(__dirname, '..', 'routes', 'staffing-engine.js'));
Module._load = origLoad;

const records = {
  hi: { candidateId: 'hi', name: 'High', readinessScore: 88, readinessBasis: 'scored', isSampleData: false },
  mid: { candidateId: 'mid', name: 'Mid', readinessScore: 75, readinessBasis: 'scored' },
  lo: { candidateId: 'lo', name: 'Low', readinessScore: 55, readinessBasis: 'scored' },
  none: { candidateId: 'none', name: 'None', readinessScore: 0, readinessBasis: 'no-training-data' },
  bad: { candidateId: 'bad', name: 'Bad', readinessScore: null },
};
let writes = 0;
registry.getCandidate = async (id) => records[id] || null;
['upsertCandidate', 'recordTrainingEvent', 'deleteCandidate'].forEach((fn) => { registry[fn] = async () => { writes++; }; });

const app = express();
app.use(router);
const server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const get = (p) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p }, (res) => {
      let d = ''; res.on('data', (c) => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }));
    }).on('error', reject);
  });
  let passed = 0, failed = 0;
  const check = async (label, fn) => { try { await fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); } };
  const base = '/api/staffing/candidates/';
  const sfx = '/readiness-intelligence';

  await check('88 -> 200 qualification + human review', async () => { const r = await get(base + 'hi' + sfx); assert.strictEqual(r.status, 200); assert.strictEqual(r.body.state, 'qualification'); assert.strictEqual(r.body.humanReviewRequired, true); });
  await check('75 -> 200 no_insight', async () => { const r = await get(base + 'mid' + sfx); assert.strictEqual(r.status, 200); assert.strictEqual(r.body.state, 'no_insight'); });
  await check('55 -> 200 gap + train', async () => { const r = await get(base + 'lo' + sfx); assert.strictEqual(r.body.state, 'gap'); assert.strictEqual(r.body.actions[0].type, 'train'); });
  await check('no training data -> 200 no_evidence', async () => { const r = await get(base + 'none' + sfx); assert.strictEqual(r.body.state, 'no_evidence'); });
  await check('null score -> 422', async () => { const r = await get(base + 'bad' + sfx); assert.strictEqual(r.status, 422); });
  await check('unknown id -> 404', async () => { const r = await get(base + 'ghost' + sfx); assert.strictEqual(r.status, 404); });
  await check('response has no raw record fields', async () => { const r = await get(base + 'hi' + sfx); assert.ok(!('_id' in r.body) && !('email' in r.body)); });
  await check('no registry writes were attempted', async () => assert.strictEqual(writes, 0));

  server.close();
  console.log('STAFFING READINESS ROUTE (HTTP): ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
