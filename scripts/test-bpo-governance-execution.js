'use strict';

/**
 * Phase 15.3 live route regression:
 * persisted governance approval -> explicit governed execution ->
 * canonical Phase 14 bpoOsAct mutation + audit.
 *
 * Uses the same isolated fake-Mongo / real-server / signed-session pattern
 * as scripts/test-bpo-os-routes.js.
 *
 * Run:
 *   node scripts/test-bpo-governance-execution.js
 */

const Module = require('module');

const collections = new Map();
const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function matchValue(actual, cond) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('$in' in cond) return cond.$in.includes(actual);
    return JSON.stringify(actual) === JSON.stringify(cond);
  }
  return actual === cond;
}

function matches(doc, query) {
  return Object.keys(query || {}).every(k => matchValue(doc[k], query[k]));
}

function cmp(a, b) {
  return String(a ?? '') < String(b ?? '') ? -1 :
    String(a ?? '') > String(b ?? '') ? 1 : 0;
}

function getCollection(name) {
  if (!collections.has(name)) {
    const docs = [];
    collections.set(name, {
      async findOne(query) {
        return clone(docs.find(d => matches(d, query))) || null;
      },

      async updateOne(query, update, options = {}) {
        const i = docs.findIndex(d => matches(d, query));

        if (i === -1) {
          if (!options.upsert) {
            return { matchedCount: 0, modifiedCount: 0 };
          }

          docs.push(clone(Object.assign(
            {},
            update.$setOnInsert || {},
            update.$set || {}
          )));

          return {
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1,
          };
        }

        docs[i] = Object.assign({}, docs[i], clone(update.$set || {}));

        return {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 0,
        };
      },

      async insertOne(doc) {
        docs.push(clone(doc));
        return { acknowledged: true };
      },

      async deleteMany(query) {
        const before = docs.length;

        for (let i = docs.length - 1; i >= 0; i--) {
          if (matches(docs[i], query)) docs.splice(i, 1);
        }

        return { deletedCount: before - docs.length };
      },

      async createIndex() {
        return 'ok';
      },

      find(query) {
        let rows = docs.filter(d => matches(d, query));

        const chain = {
          sort(spec) {
            const [k, dir] = Object.entries(spec || {})[0] || [];
            if (k) rows = rows.slice().sort(
              (a, b) => cmp(a[k], b[k]) * dir
            );
            return chain;
          },

          limit(n) {
            rows = rows.slice(0, n);
            return chain;
          },

          async toArray() {
            return clone(rows);
          },
        };

        return chain;
      },

      _docs: docs,
    });
  }

  return collections.get(name);
}

class FakeMongoClient {
  async connect() {
    return this;
  }

  db() {
    return {
      collection: name => getCollection(name),
    };
  }

  async close() {}
}

const mongodbPath = require.resolve('mongodb');
const fakeMongo = new Module(mongodbPath, null);
fakeMongo.exports = { MongoClient: FakeMongoClient };
fakeMongo.loaded = true;
require.cache[mongodbPath] = fakeMongo;

process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://fake-host/tsm-governance-execution-test';

{
  const dotenvPath = require.resolve('dotenv');
  const fake = new Module(dotenvPath, null);
  fake.exports = {
    config: () => ({ parsed: {} }),
    parse: () => ({}),
  };
  fake.loaded = true;
  require.cache[dotenvPath] = fake;
}

process.env.TSM_SESSION_SECRET = 'test-session-secret-for-governance-execution';
process.env.TSM_ADMIN_PASSWORD = 'governance-execution-test-admin-pw';
delete process.env.TSM_STRICT_INGEST;

const auth = require('../middleware/require-auth');

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    passed += 1;
    console.log('OK: ' + msg);
  } else {
    failed += 1;
    console.error('FAIL: ' + msg);
  }
}

let BASE = '';

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = require('net').createServer();

    srv.once('error', reject);

    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();

      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer() {
  let last;

  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(BASE + '/api/auth/status');

      if (r.ok) return;
    } catch (e) {
      last = e;
    }

    await new Promise(r => setTimeout(r, 250));
  }

  throw new Error(
    'server did not start: ' + (last && last.message)
  );
}

const exp = () => Date.now() + 60 * 60 * 1000;

const cookie = payload => ({
  Cookie:
    'tsm_session=' +
    encodeURIComponent(
      auth.signSession(
        Object.assign({ exp: exp() }, payload)
      )
    ),
});

const H = {
  admin: cookie({ role: 'admin', label: 'Admin' }),
  manager: cookie({ role: 'manager', label: 'Maria' }),
  analyst: cookie({ role: 'analyst', label: 'Ann' }),
};

const JSONH = who =>
  Object.assign(
    { 'Content-Type': 'application/json' },
    H[who]
  );

const get = (path, who) =>
  fetch(BASE + path, {
    headers: who ? H[who] : {},
  });

const post = (path, who, body, headers) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: headers || JSONH(who),
    body: JSON.stringify(body),
  });

const work = () => getCollection('bpo_work_items')._docs;
const audits = () => getCollection('bpo_audit_logs')._docs;
const approvals = () => getCollection('hitl_decisions')._docs;

const byId = id =>
  work().find(d => d.caseId === id);

const approvalById = id =>
  approvals().find(d => d.id === id);

const FULL_HC = {
  claimId: 'GOV-AZ-001',
  payer: 'Blue Cross',
  denialCategory: 'medical_necessity',
  denialReasonCode: 'CO-50',
  financialExposure: 4850,
  evidenceProvenance: [
    { field: 'claimId', source: 'doc' },
  ],
  recoveryLikelihood: 'MODERATE',
  confidence: 65,
  appealable: true,
};

async function main() {
  const port = await freePort();

  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;

  require('../server.js');

  await waitForServer();

  const stamp = '2026-09-01T00:00:00.000Z';

  work().push({
    caseId: 'gov-1',
    vertical: 'healthcare',
    clientId: 'c1',
    stage: 'ready-for-review',
    status: 'open',
    priority: 'medium',
    owner: 'ann',
    createdAt: stamp,
    updatedAt: stamp,
    dueDate: '2026-09-15T00:00:00.000Z',
    payload: {
      structuredCase: FULL_HC,
      marker: 'preserve-me',
    },
  });

  // ── Access control ────────────────────────────────────────────────

  let r = await post(
    '/api/bpo/os/governance/approvals/nope/execute',
    null,
    { caseId: 'gov-1', action: 'reassign' },
    { 'Content-Type': 'application/json' }
  );

  ok(
    r.status === 401,
    'unauthenticated governance execution is 401'
  );

  r = await post(
    '/api/bpo/os/governance/approvals/nope/execute',
    'analyst',
    { caseId: 'gov-1', action: 'reassign' }
  );

  ok(
    r.status === 403 || r.status === 404,
    'analyst reaches the governance execution route but cannot bypass the approval gate'
  );

  // ── Create approval ───────────────────────────────────────────────

  r = await post(
    '/api/bpo/os/cases/gov-1/governance/approval',
    'analyst',
    {}
  );

  let j = await r.json();

  ok(
    r.status === 201 &&
    j.ok &&
    j.approval &&
    j.approval.approvalStatus === 'PENDING' &&
    j.approval.caseId === 'gov-1',
    'analyst can create a persisted PENDING governance approval'
  );

  const approvalId = j.approval.approvalId || j.approval.id;

  ok(
    !!approvalId && !!approvalById(approvalId),
    'approval is persisted in the HITL decision store'
  );

  const pendingApproval = clone(approvalById(approvalId));

  // ── Pending approval must not execute ─────────────────────────────

  const beforePending = clone(byId('gov-1'));
  const auditBeforePending = audits().length;

  r = await post(
    '/api/bpo/os/governance/approvals/' +
      encodeURIComponent(approvalId) +
      '/execute',
    'manager',
    {
      caseId: 'gov-1',
      action: pendingApproval.action,
      params: { owner: 'Bob Smith', reason: 'governed test' },
    }
  );

  j = await r.json();

  ok(
    r.status === 403,
    'PENDING approval cannot execute'
  );

  ok(
    JSON.stringify(byId('gov-1')) === JSON.stringify(beforePending) &&
    audits().length === auditBeforePending,
    'blocked pending execution performs no mutation and writes no audit'
  );

  // ── Analyst cannot approve ───────────────────────────────────────

  r = await post(
    '/api/bpo/os/governance/approvals/' +
      encodeURIComponent(approvalId) +
      '/resolve',
    'analyst',
    {
      approved: true,
      reason: 'analyst should not be able to approve',
    }
  );

  ok(
    r.status === 403,
    'analyst cannot resolve/approve a governance request'
  );

  // ── Manager approves ──────────────────────────────────────────────

  r = await post(
    '/api/bpo/os/governance/approvals/' +
      encodeURIComponent(approvalId) +
      '/resolve',
    'manager',
    {
      approved: true,
      reason: 'approved for governed execution regression',
    }
  );

  j = await r.json();

  ok(
    r.status === 200 &&
    j.ok &&
    j.approval.approvalStatus === 'APPROVED',
    'manager resolves the persisted approval as APPROVED'
  );

  const approved = clone(approvalById(approvalId));

  ok(
    approved &&
    approved.approvalStatus === 'APPROVED' &&
    approved.approvedRole === 'manager' &&
    approved.approvedBy === 'Maria' &&
    approved.resolvedAt,
    'approved record contains approver identity and resolution timestamp'
  );

  // ── Approved execution ────────────────────────────────────────────

  const beforeExecute = clone(byId('gov-1'));
  const auditBeforeExecute = audits().length;

  r = await post(
    '/api/bpo/os/governance/approvals/' +
      encodeURIComponent(approvalId) +
      '/execute',
    'manager',
    {
      caseId: 'gov-1',
      action: approved.action,
      params: {
        reason: 'governed execution regression',
        escalatedTo: 'Senior Recovery Specialist',
      },
    }
  );

  j = await r.json();

  ok(
    r.status === 200 &&
    j.ok &&
    j.executed === true &&
    j.approvalId === approvalId,
    'APPROVED governance request executes through the explicit execution route'
  );

  ok(
    byId('gov-1').escalated === true &&
    byId('gov-1').escalatedBy === 'Maria' &&
    byId('gov-1').escalationReason === 'governed execution regression' &&
    byId('gov-1').escalatedTo === 'Senior Recovery Specialist' &&
    byId('gov-1').escalationCount === 1,
    'governed execution reaches the canonical Phase 14 mutation engine'
  );

  ok(
    byId('gov-1').stage === beforeExecute.stage &&
    byId('gov-1').status === beforeExecute.status &&
    byId('gov-1').priority === beforeExecute.priority &&
    byId('gov-1').owner === beforeExecute.owner &&
    JSON.stringify(byId('gov-1').payload) ===
      JSON.stringify(beforeExecute.payload),
    'governed escalate changes only the intended work-item fields'
  );

  ok(
    audits().length === auditBeforeExecute + 1,
    'successful governed execution writes exactly one Phase 14 audit row'
  );

  const audit = audits()[audits().length - 1];

  ok(
    audit.action === 'work_item.escalate' &&
    audit.entityId === 'gov-1' &&
    audit.actor === 'Maria' &&
    audit.detail.role === 'manager' &&
    audit.detail.reason === 'governed execution regression' &&
    audit.detail.escalatedTo === 'Senior Recovery Specialist' &&
    audit.detail.escalationCount === 1,
    'Phase 14 audit records the governed execution actor, role, action and reason'
  );

  // ── Wrong case must be rejected ───────────────────────────────────

  const beforeWrongCase = clone(byId('gov-1'));
  const auditBeforeWrongCase = audits().length;

  r = await post(
    '/api/bpo/os/governance/approvals/' +
      encodeURIComponent(approvalId) +
      '/execute',
    'manager',
    {
      caseId: 'different-case',
      action: approved.action,
      params: {
        owner: 'Evil Change',
        reason: 'wrong case test',
      },
    }
  );

  ok(
    r.status === 403,
    'an approval cannot execute against a different case'
  );

  ok(
    JSON.stringify(byId('gov-1')) === JSON.stringify(beforeWrongCase) &&
    audits().length === auditBeforeWrongCase,
    'wrong-case execution performs no mutation and writes no audit'
  );

  // ── Wrong action must be rejected ─────────────────────────────────

  const beforeWrongAction = clone(byId('gov-1'));
  const auditBeforeWrongAction = audits().length;

  r = await post(
    '/api/bpo/os/governance/approvals/' +
      encodeURIComponent(approvalId) +
      '/execute',
    'manager',
    {
      caseId: 'gov-1',
      action: approved.action === 'reassign'
        ? 'escalate'
        : 'reassign',
      params: {
        reason: 'wrong action test',
      },
    }
  );

  ok(
    r.status === 403,
    'an approval cannot execute a different action'
  );

  ok(
    JSON.stringify(byId('gov-1')) === JSON.stringify(beforeWrongAction) &&
    audits().length === auditBeforeWrongAction,
    'wrong-action execution performs no mutation and writes no audit'
  );

  // ── Missing approval must be rejected ─────────────────────────────

  const beforeMissing = clone(byId('gov-1'));
  const auditBeforeMissing = audits().length;

  r = await post(
    '/api/bpo/os/governance/approvals/does-not-exist/execute',
    'manager',
    {
      caseId: 'gov-1',
      action: approved.action,
      params: {
        owner: 'Unauthorized Change',
        reason: 'missing approval test',
      },
    }
  );

  ok(
    r.status === 403 || r.status === 404,
    'execution without a persisted approval is rejected'
  );

  ok(
    JSON.stringify(byId('gov-1')) === JSON.stringify(beforeMissing) &&
    audits().length === auditBeforeMissing,
    'missing-approval execution performs no mutation and writes no audit'
  );

  // ── Final persisted state ─────────────────────────────────────────

  r = await get(
    '/api/bpo/os/governance/approvals/' +
      encodeURIComponent(approvalId),
    'analyst'
  );

  j = await r.json();

  ok(
    r.status === 200 &&
    j.ok &&
    j.approval.approvalStatus === 'APPROVED' &&
    j.approval.caseId === 'gov-1' &&
    j.approval.action === approved.action,
    'persisted approval remains bound to the original case and action'
  );

  console.log('\n' + passed + ' passed, ' + failed + ' failed');

  process.exit(failed ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
