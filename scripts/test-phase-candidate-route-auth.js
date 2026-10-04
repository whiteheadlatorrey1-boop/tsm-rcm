'use strict';
// Candidate Registry routes: admin-only delete/seed, learner create/event stay open.
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
const { signSession } = require(path.join(__dirname, '..', 'middleware', 'require-auth.js'));
const router = require(path.join(__dirname, '..', 'routes', 'candidate-registry.js'));
Module._load = origLoad;

const hits = { del: 0, seed: 0 };
registry.deleteCandidate = async () => { hits.del++; return true; };
registry.seedSampleData = async () => { hits.seed++; return []; };
registry.upsertCandidate = async (p) => ({ candidateId: 'c1', name: p.name });
registry.recordTrainingEvent = async (id, e) => ({ candidateId: id, readinessScore: e.score });

const cookieFor = (role) => 'tsm_session=' + signSession({ role, exp: Date.now() + 60000 });

const app = express();
app.use(express.json());
app.use(router);
const server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const call = (method, p, cookie, body) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => {
      let d = ''; res.on('data', (c) => d += c); res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject); if (data) req.write(data); req.end();
  });

  let passed = 0, failed = 0;
  const check = async (label, fn) => { try { await fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); } };

  await check('DELETE without session -> 401, nothing deleted', async () => {
    assert.strictEqual((await call('DELETE', '/api/candidates/c1')).status, 401);
    assert.strictEqual(hits.del, 0);
  });
  await check('DELETE as non-admin -> 403, nothing deleted', async () => {
    assert.strictEqual((await call('DELETE', '/api/candidates/c1', cookieFor('client'))).status, 403);
    assert.strictEqual(hits.del, 0);
  });
  await check('DELETE as admin -> 204', async () => {
    assert.strictEqual((await call('DELETE', '/api/candidates/c1', cookieFor('admin'))).status, 204);
    assert.strictEqual(hits.del, 1);
  });
  await check('seed without session -> 401, nothing seeded', async () => {
    assert.strictEqual((await call('POST', '/api/candidates/_seed-sample-data')).status, 401);
    assert.strictEqual(hits.seed, 0);
  });
  await check('seed as admin -> 200', async () => {
    assert.strictEqual((await call('POST', '/api/candidates/_seed-sample-data', cookieFor('admin'))).status, 200);
    assert.strictEqual(hits.seed, 1);
  });
  await check('learner create (no session) still works', async () => {
    assert.strictEqual((await call('POST', '/api/candidates', null, { name: 'T', role: 'x' })).status < 400, true);
  });
  await check('learner training event (no session) still works -> 201', async () => {
    assert.strictEqual((await call('POST', '/api/candidates/c1/training-events', null, { type: 'aplus_practice_session', score: 75 })).status, 201);
  });

  server.close();
  console.log('CANDIDATE ROUTE AUTH: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
