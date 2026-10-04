'use strict';
// Over-HTTP test of POST /api/candidates/:id/training-events using the real router
// with a stubbed registry (no database, no writes). Verifies the A+ practice event
// reaches the registry unchanged and that errors surface as 500.
process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-session-secret';
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
const router = require(path.join(__dirname, '..', 'routes', 'candidate-registry.js'));
Module._load = origLoad;

let calls = [];
let failWith = null;
registry.recordTrainingEvent = async (id, event) => {
  calls.push({ id, event });
  if (failWith) throw new Error(failWith);
  return { candidateId: id, readinessScore: event.score };
};

const app = express();
app.use(express.json());
app.use(router);

const server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const post = (p, body) => new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port, path: p, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let d = ''; res.on('data', (c) => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }));
    });
    req.on('error', reject); req.write(data); req.end();
  });

  let passed = 0, failed = 0;
  const check = async (label, fn) => { try { await fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); } };

  const event = { type: 'aplus_practice_session', score: 75, weight: 1,
    meta: { correct: 6, total: 8, objective: 'test', source: 'aplus_practice' } };

  await check('A+ event -> 201 with candidate', async () => {
    const r = await post('/api/candidates/cand_1/training-events', event);
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.candidate.candidateId, 'cand_1');
    assert.strictEqual(r.body.candidate.readinessScore, 75);
  });
  await check('registry received id and event unchanged', async () => {
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].id, 'cand_1');
    assert.deepStrictEqual(calls[0].event, event);
  });
  await check('candidate id is URL-decoded before reaching the registry', async () => {
    await post('/api/candidates/' + encodeURIComponent('cand 2') + '/training-events', event);
    assert.strictEqual(calls[1].id, 'cand 2');
  });
  await check('registry error -> 500 with message', async () => {
    failWith = 'training event score must be numeric';
    const r = await post('/api/candidates/cand_1/training-events', { type: 'aplus_practice_session', score: 'high' });
    assert.strictEqual(r.status, 500);
    assert.strictEqual(r.body.error, 'training event score must be numeric');
    failWith = null;
  });

  server.close();
  console.log('A+ CANDIDATE ROUTE (HTTP): ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
