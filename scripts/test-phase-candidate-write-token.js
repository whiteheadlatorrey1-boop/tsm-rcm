'use strict';
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
const { signSession, verifySession } = require(path.join(__dirname, '..', 'middleware', 'require-auth.js'));
const { signCandidateToken } = require(path.join(__dirname, '..', 'middleware', 'candidate-token.js'));
const router = require(path.join(__dirname, '..', 'routes', 'candidate-registry.js'));
Module._load = origLoad;

let writes = 0;
registry.upsertCandidate = async (p) => { writes++; return { candidateId: p.candidateId || 'new1', name: p.name }; };
registry.recordTrainingEvent = async (id, e) => { writes++; return { candidateId: id, readinessScore: e.score }; };

const cookieFor = (role) => 'tsm_session=' + signSession({ role, exp: Date.now() + 60000 });
const app = express();
app.use(express.json());
app.use(router);

const server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const call = (method, p, o = {}) => new Promise((resolve, reject) => {
    const data = o.body ? JSON.stringify(o.body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (o.cookie) headers.Cookie = o.cookie;
    if (o.token) headers['x-candidate-token'] = o.token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => {
      let d = ''; res.on('data', (c) => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }));
    });
    req.on('error', reject); if (data) req.write(data); req.end();
  });

  let passed = 0, failed = 0;
  const check = async (label, fn) => { try { await fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); } };
  const ev = { type: 'aplus_practice_session', score: 75, weight: 1 };
  const url = '/api/candidates/c1/training-events';

  delete process.env.CANDIDATE_WRITE_TOKEN_REQUIRED;
  await check('flag off: event without token -> 201 (backward compatible)', async () => {
    assert.strictEqual((await call('POST', url, { body: ev })).status, 201);
  });
  await check('flag off: create returns a candidateToken for the new id', async () => {
    const r = await call('POST', '/api/candidates', { body: { name: 'T' } });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.candidateToken, signCandidateToken('new1'));
  });
  await check('candidate token is not a valid session cookie', async () => {
    assert.strictEqual(verifySession(signCandidateToken('c1')), null);
  });

  process.env.CANDIDATE_WRITE_TOKEN_REQUIRED = '1';
  const tok = signCandidateToken('c1');
  let before = writes;
  await check('flag on: event without token -> 401, nothing written', async () => {
    assert.strictEqual((await call('POST', url, { body: ev })).status, 401);
    assert.strictEqual(writes, before);
  });
  await check('flag on: wrong token -> 401', async () => {
    assert.strictEqual((await call('POST', url, { body: ev, token: 'nope' })).status, 401);
  });
  await check('flag on: token for another candidate -> 401', async () => {
    assert.strictEqual((await call('POST', url, { body: ev, token: signCandidateToken('c2') })).status, 401);
  });
  await check('flag on: matching token -> 201', async () => {
    assert.strictEqual((await call('POST', url, { body: ev, token: tok })).status, 201);
  });
  await check('flag on: admin session without token -> 201', async () => {
    assert.strictEqual((await call('POST', url, { body: ev, cookie: cookieFor('admin') })).status, 201);
  });
  await check('flag on: client-role session without token -> 401', async () => {
    assert.strictEqual((await call('POST', url, { body: ev, cookie: cookieFor('client') })).status, 401);
  });
  await check('flag on: PUT needs the token', async () => {
    assert.strictEqual((await call('PUT', '/api/candidates/c1', { body: { name: 'X' } })).status, 401);
    assert.strictEqual((await call('PUT', '/api/candidates/c1', { body: { name: 'X' }, token: tok })).status, 200);
  });
  await check('flag on: POST with an existing candidateId and no token -> 401', async () => {
    assert.strictEqual((await call('POST', '/api/candidates', { body: { candidateId: 'c1', name: 'X' } })).status, 401);
  });
  await check('flag on: POST creating a new candidate -> 201 + token', async () => {
    const r = await call('POST', '/api/candidates', { body: { name: 'New' } });
    assert.strictEqual(r.status, 201);
    assert.ok(r.body.candidateToken);
  });

  server.close();
  console.log('CANDIDATE WRITE TOKEN: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
