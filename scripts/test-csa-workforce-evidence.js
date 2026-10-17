'use strict';

// Offline regression coverage for Part 1 of feat/workforce-evidence:
//   (a) staff-attested manual CSA evidence (exam id/date/verifier/url),
//       recordManualCandidateEvidence / recordCsaManualAttestation /
//       POST /api/candidates/:id/csa-evidence
//   (b) automatic ledger entry when a Career Training completion event
//       (type 'csa_certification_complete') lands for a candidate whose
//       role matches /ServiceNow CSA/i
//
// Runs fully offline -- the mongodb driver is faked at require.cache level
// before candidate-registry-service / routes/candidate-registry are
// required, same pattern as test-l1-copilot-candidate-registry-reuse.js
// and test-auth-candidate-registry-routes.js.

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-session-secret';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const Module = require('module');

const ledgerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-workforce-evidence-'));
process.env.CSA_CANDIDATE_EVIDENCE_DIR = ledgerDir;

let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) { passed++; console.log('PASS: ' + msg); } else { failed++; console.log('FAIL: ' + msg); } };

// ---- Part 1(a): ledger-level unit tests -----------------------------------

const {
  recordManualCandidateEvidence,
  recordTrainingCompletionEvidence,
  listCandidateEvidence,
} = require('../server/certification/candidate-evidence-ledger');
const { recordCsaManualAttestation } = require('../server/certification/candidate-evidence-adapter');

(function unitTests() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-manual-'));
  try {
    const base = {
      candidateId: 'CAND-MANUAL-1',
      examId: 'CSA-2026-00123',
      examDate: '2026-09-01',
      verifier: 'J. Rivera',
      evidenceUrl: 'https://certs.example.com/CSA-2026-00123',
      recordedBy: 'staff-admin-1',
    };

    ok((() => {
      const out = recordManualCandidateEvidence(base, dir);
      return out.record.candidateId === 'CAND-MANUAL-1' &&
        out.record.kind === 'manual_attestation' &&
        out.record.examId === 'CSA-2026-00123' &&
        out.record.verifier === 'J. Rivera' &&
        out.record.evidenceUrl === base.evidenceUrl &&
        out.record.recordedBy === 'staff-admin-1' &&
        typeof out.record.recordedAt === 'string';
    })(), 'recordManualCandidateEvidence writes a manual_attestation record with all fields');

    ok(listCandidateEvidence('CAND-MANUAL-1', dir).length === 1, 'listCandidateEvidence sees the new manual record');

    ok((() => {
      try { recordManualCandidateEvidence(base, dir); return false; } catch (e) { return /already recorded/.test(e.message); }
    })(), 'duplicate examId for the same candidate is rejected (append-only)');

    ok((() => {
      try {
        recordManualCandidateEvidence({ ...base, candidateId: 'CAND-MANUAL-2', examId: 'bad id with spaces' }, dir);
        return false;
      } catch (e) { return /examId/.test(e.message); }
    })(), 'rejects an invalid examId');

    ok((() => {
      try {
        recordManualCandidateEvidence({ ...base, candidateId: 'CAND-MANUAL-3', examDate: 'not-a-date' }, dir);
        return false;
      } catch (e) { return /examDate/.test(e.message); }
    })(), 'rejects an invalid examDate');

    ok((() => {
      try {
        recordManualCandidateEvidence({ ...base, candidateId: 'CAND-MANUAL-4', verifier: '  ' }, dir);
        return false;
      } catch (e) { return /verifier/.test(e.message); }
    })(), 'rejects a blank verifier');

    ok((() => {
      try {
        recordManualCandidateEvidence({ ...base, candidateId: 'CAND-MANUAL-5', recordedBy: '' }, dir);
        return false;
      } catch (e) { return /recordedBy/.test(e.message); }
    })(), 'rejects a missing recordedBy (caller must always attribute the write)');

    ok((() => {
      try {
        recordManualCandidateEvidence({ ...base, candidateId: 'CAND-MANUAL-6', evidenceUrl: 'javascript:alert(1)' }, dir);
        return false;
      } catch (e) { return /evidenceUrl/.test(e.message); }
    })(), 'rejects a non-http(s) evidenceUrl');

    ok((() => {
      const out = recordManualCandidateEvidence({ ...base, candidateId: 'CAND-MANUAL-7', examId: 'CSA-2026-NOURL', evidenceUrl: undefined }, dir);
      return out.record.evidenceUrl === null;
    })(), 'evidenceUrl is optional');

    // Adapter wrapper round-trips the same shape.
    ok((() => {
      const out = recordCsaManualAttestation({ ...base, candidateId: 'CAND-MANUAL-8', examId: 'CSA-2026-ADAPTER' }, dir);
      return out.record.kind === 'manual_attestation' && out.record.candidateId === 'CAND-MANUAL-8';
    })(), 'recordCsaManualAttestation adapter wraps the ledger write correctly');

    // Part 1(b) ledger primitive, exercised directly (route-level coverage below).
    ok((() => {
      const out = recordTrainingCompletionEvidence({
        candidateId: 'CAND-TRAIN-1',
        submissionId: 'training-abc123',
        trainingEventType: 'csa_certification_complete',
      }, dir);
      return out.record.kind === 'training_completion' && out.record.trainingEventType === 'csa_certification_complete';
    })(), 'recordTrainingCompletionEvidence writes a training_completion record');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
})();

// ---- Part 1(a)+(b): route + service-level tests, fake Mongo ---------------

const candidates = new Map();
const trainingEvents = [];
let nextEventId = 1;

function makeCollection(name) {
  const isCandidates = name === 'candidates';
  const isEvents = name === 'candidate_training_events';
  return {
    async findOne(query) {
      if (isCandidates) {
        const doc = candidates.get(query.candidateId);
        return doc ? { ...doc } : null;
      }
      return null;
    },
    find(query = {}) {
      let results;
      if (isEvents) {
        results = trainingEvents.filter((e) => query.candidateId === undefined || e.candidateId === query.candidateId).map((e) => ({ ...e }));
      } else if (isCandidates) {
        results = [...candidates.values()].map((c) => ({ ...c }));
      } else {
        results = [];
      }
      const api = { sort() { return api; }, limit(n) { results = results.slice(0, n); return api; }, async toArray() { return results; } };
      return api;
    },
    async updateOne(query, update) {
      if (!isCandidates) throw new Error('updateOne only stubbed for candidates');
      const existing = candidates.get(query.candidateId) || null;
      const next = existing ? { ...existing } : {};
      if (update.$set) Object.assign(next, update.$set);
      candidates.set(query.candidateId, next);
      return { matchedCount: existing ? 1 : 0, modifiedCount: existing ? 1 : 0 };
    },
    async insertOne(doc) {
      if (isEvents) trainingEvents.push({ ...doc });
      return { acknowledged: true, insertedId: 'fake-event-id-' + (nextEventId++) };
    },
  };
}

const fakeDb = { collection: (name) => makeCollection(name) };
class FakeMongoClient { async connect() { return this; } db() { return fakeDb; } }
const mongodbResolvedPath = require.resolve('mongodb');
const fakeMongodbModule = new Module(mongodbResolvedPath, null);
fakeMongodbModule.exports = { MongoClient: FakeMongoClient, ObjectId: class {} };
fakeMongodbModule.loaded = true;
require.cache[mongodbResolvedPath] = fakeMongodbModule;
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';

const registry = require('../server/candidate-registry-service');
const { signSession } = require('../middleware/require-auth');
const express = require('express');
const router = require('../routes/candidate-registry');

const cookieFor = (role) => 'tsm_session=' + signSession({ role, staffId: 'staff-' + role, exp: Date.now() + 60000 });

(async () => {
  // --- Part 1(b): training-event hook ---
  candidates.set('CAND-CSA-ROLE', { candidateId: 'CAND-CSA-ROLE', role: 'ServiceNow CSA Track', name: 'A' });
  candidates.set('CAND-OTHER-ROLE', { candidateId: 'CAND-OTHER-ROLE', role: 'RCM Specialist', name: 'B' });

  await registry.recordTrainingEvent('CAND-CSA-ROLE', { type: 'csa_certification_complete', score: 100 });
  ok(listCandidateEvidence('CAND-CSA-ROLE', ledgerDir).length === 1, 'csa_certification_complete + ServiceNow CSA role auto-writes a ledger entry');

  await registry.recordTrainingEvent('CAND-OTHER-ROLE', { type: 'csa_certification_complete', score: 100 });
  ok(listCandidateEvidence('CAND-OTHER-ROLE', ledgerDir).length === 0, 'csa_certification_complete for a non-CSA role does NOT auto-write a ledger entry');

  await registry.recordTrainingEvent('CAND-CSA-ROLE', { type: 'module_complete', score: 100 });
  ok(listCandidateEvidence('CAND-CSA-ROLE', ledgerDir).length === 1, 'an unrelated event type does not add a second ledger entry');

  // Force the ledger write to fail (point CSA_CANDIDATE_EVIDENCE_DIR at a
  // plain file, so fs.mkdirSync throws) and confirm the best-effort hook
  // swallows it -- recordTrainingEvent must still resolve with the updated
  // candidate, never throw, regardless of ledger health.
  const origEnv = process.env.CSA_CANDIDATE_EVIDENCE_DIR;
  const notADir = path.join(os.tmpdir(), 'csa-not-a-dir-' + Date.now());
  fs.writeFileSync(notADir, 'x');
  process.env.CSA_CANDIDATE_EVIDENCE_DIR = notADir;
  let threw = false;
  let candidateAfterLedgerFailure = null;
  try {
    candidateAfterLedgerFailure = await registry.recordTrainingEvent('CAND-CSA-ROLE', { type: 'csa_certification_complete', score: 100 });
  } catch (e) {
    threw = true;
  }
  process.env.CSA_CANDIDATE_EVIDENCE_DIR = origEnv;
  fs.rmSync(notADir, { force: true });
  ok(!threw, 'a ledger write failure never throws out of recordTrainingEvent (best-effort)');
  ok(!!candidateAfterLedgerFailure && typeof candidateAfterLedgerFailure.readinessScore === 'number', 'recordTrainingEvent still returns the updated candidate when the ledger write fails');

  // --- Part 1(a): route ---
  registry.upsertCandidate = registry.upsertCandidate; // untouched
  candidates.set('CAND-ROUTE-1', { candidateId: 'CAND-ROUTE-1', role: 'ServiceNow CSA Track', name: 'Route Test' });

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
          let b = null; try { b = d ? JSON.parse(d) : null; } catch (e) { b = d; }
          resolve({ status: res.statusCode, body: b });
        });
      });
      req.on('error', reject); if (data) req.write(data); req.end();
    });

    const payload = { examId: 'CSA-ROUTE-001', examDate: '2026-09-15', verifier: 'Staff Reviewer', evidenceUrl: 'https://certs.example.com/route-001' };

    await (async () => {
      const r = await call('POST', '/api/candidates/CAND-ROUTE-1/csa-evidence', null, payload);
      ok(r.status === 401, 'POST csa-evidence without a session -> 401 (got ' + r.status + ')');
    })();

    await (async () => {
      const r = await call('POST', '/api/candidates/CAND-ROUTE-1/csa-evidence', cookieFor('client'), payload);
      ok(r.status === 403, 'POST csa-evidence with a client (non-staff) session -> 403 (got ' + r.status + ')');
    })();

    await (async () => {
      const r = await call('POST', '/api/candidates/NO-SUCH-CANDIDATE/csa-evidence', cookieFor('admin'), payload);
      ok(r.status === 404, 'POST csa-evidence for an unknown candidate -> 404 (got ' + r.status + ')');
    })();

    let recordedBy;
    await (async () => {
      const r = await call('POST', '/api/candidates/CAND-ROUTE-1/csa-evidence', cookieFor('manager'), payload);
      ok(r.status === 201, 'POST csa-evidence with a staff session -> 201 (got ' + r.status + ')');
      ok(r.body && r.body.record && r.body.record.examId === 'CSA-ROUTE-001', 'response echoes the recorded examId');
      recordedBy = r.body && r.body.record && r.body.record.recordedBy;
      ok(recordedBy === 'staff-manager', 'recordedBy is taken from the authenticated session, not the request body (got ' + recordedBy + ')');
    })();

    await (async () => {
      const r = await call('POST', '/api/candidates/CAND-ROUTE-1/csa-evidence', cookieFor('admin'), payload);
      ok(r.status === 409, 'duplicate examId for the same candidate via the route -> 409 (got ' + r.status + ')');
    })();

    await (async () => {
      const r = await call('POST', '/api/candidates/CAND-ROUTE-1/csa-evidence', cookieFor('admin'), { ...payload, examId: 'CSA-ROUTE-002', verifier: '' });
      ok(r.status === 400, 'missing verifier -> 400 (got ' + r.status + ')');
    })();

    await (async () => {
      const r = await call('POST', '/api/candidates/CAND-ROUTE-1/csa-evidence', cookieFor('admin'), { ...payload, examId: 'CSA-ROUTE-003', recordedBy: 'someone-else' });
      ok(r.status === 201, 'caller-supplied recordedBy in the body is ignored, not an error (got ' + r.status + ')');
      ok(r.body.record.recordedBy === 'staff-admin', 'the session identity still wins over any caller-supplied recordedBy (got ' + r.body.record.recordedBy + ')');
    })();

    server.close();
    fs.rmSync(ledgerDir, { recursive: true, force: true });

    console.log('\n' + passed + ' passed, ' + failed + ' failed');
    process.exit(failed ? 1 : 0);
  });
})().catch((err) => {
  console.error('Test threw:', err);
  fs.rmSync(ledgerDir, { recursive: true, force: true });
  process.exit(1);
});
