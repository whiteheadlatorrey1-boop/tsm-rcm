'use strict';
// GET /api/candidates, GET /api/candidates/:id, and GET
// /api/candidates/evidence-overview (routes/candidate-registry.js) now
// require an authenticated internal-staff session (admin/manager/analyst)
// -- previously these were open to anyone. Regression-guards:
//   - unauthenticated GET is 401, an authenticated 'client' session is 403
//     (clients are an external portal role, not staff)
//   - each internal staff role (admin/manager/analyst) can still read
//   - non-admin staff still get the redacted publicView (no email/_id) --
//     the auth gate is additive, it doesn't change the existing
//     admin-vs-non-admin field redaction
//   - the write routes (create/training-events) are untouched by this
//     change -- still reachable without a staff session, exactly as before
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

const SAMPLE_CANDIDATE = {
  candidateId: 'c1', name: 'Jane Learner', email: 'jane@example.com', _id: 'mongo-oid-1',
  role: 'RCM Specialist', status: 'in_training', readinessScore: 42
};

registry.listCandidates = async () => [SAMPLE_CANDIDATE];
registry.getCandidate = async (id) => (id === 'c1' ? SAMPLE_CANDIDATE : null);
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
      let d = ''; res.on('data', (c) => d += c); res.on('end', () => {
        let body = null;
        try { body = d ? JSON.parse(d) : null; } catch (e) { body = d; }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject); if (data) req.write(data); req.end();
  });

  let passed = 0, failed = 0;
  const check = async (label, fn) => { try { await fn(); passed++; console.log('PASS: ' + label); } catch (e) { failed++; console.log('FAIL: ' + label + ' -> ' + e.message); } };

  await check('GET /api/candidates without a session -> 401', async () => {
    assert.strictEqual((await call('GET', '/api/candidates')).status, 401);
  });
  await check('GET /api/candidates with a client session -> 403 (not staff)', async () => {
    assert.strictEqual((await call('GET', '/api/candidates', cookieFor('client'))).status, 403);
  });
  for (const role of ['admin', 'manager', 'analyst']) {
    await check(`GET /api/candidates with a '${role}' session -> 200`, async () => {
      const r = await call('GET', '/api/candidates', cookieFor(role));
      assert.strictEqual(r.status, 200);
      assert.strictEqual(Array.isArray(r.body.candidates), true);
      assert.strictEqual(r.body.candidates[0].candidateId, 'c1');
    });
  }
  await check('non-admin staff (manager) still gets the redacted publicView (no email/_id)', async () => {
    const r = await call('GET', '/api/candidates', cookieFor('manager'));
    assert.strictEqual(r.body.candidates[0].email, undefined);
    assert.strictEqual(r.body.candidates[0]._id, undefined);
  });
  await check('admin still gets the full record (email present)', async () => {
    const r = await call('GET', '/api/candidates', cookieFor('admin'));
    assert.strictEqual(r.body.candidates[0].email, 'jane@example.com');
  });

  await check('GET /api/candidates/c1 without a session -> 401', async () => {
    assert.strictEqual((await call('GET', '/api/candidates/c1')).status, 401);
  });
  await check('GET /api/candidates/c1 with a client session -> 403 (not staff)', async () => {
    assert.strictEqual((await call('GET', '/api/candidates/c1', cookieFor('client'))).status, 403);
  });
  await check('GET /api/candidates/c1 with a staff session -> 200', async () => {
    const r = await call('GET', '/api/candidates/c1', cookieFor('analyst'));
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.candidate.candidateId, 'c1');
  });
  await check('GET /api/candidates/no-such-id with a staff session -> 404 (auth gate does not swallow a real not-found)', async () => {
    assert.strictEqual((await call('GET', '/api/candidates/no-such-id', cookieFor('admin'))).status, 404);
  });

  await check('GET /api/candidates/evidence-overview without a session -> 401', async () => {
    assert.strictEqual((await call('GET', '/api/candidates/evidence-overview')).status, 401);
  });
  await check('GET /api/candidates/evidence-overview with a client session -> 403 (not staff)', async () => {
    assert.strictEqual((await call('GET', '/api/candidates/evidence-overview', cookieFor('client'))).status, 403);
  });
  await check('GET /api/candidates/evidence-overview with a staff session -> 200', async () => {
    const r = await call('GET', '/api/candidates/evidence-overview', cookieFor('manager'));
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.candidates[0].candidateId, 'c1');
  });
  await check('learner create (no session) still works (untouched by this change)', async () => {
    assert.strictEqual((await call('POST', '/api/candidates', null, { name: 'T', role: 'x' })).status < 400, true);
  });
  await check('learner training event (no session) still works -> 201 (untouched by this change)', async () => {
    assert.strictEqual((await call('POST', '/api/candidates/c1/training-events', null, { type: 'aplus_practice_session', score: 75 })).status, 201);
  });

  server.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
