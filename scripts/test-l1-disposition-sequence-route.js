'use strict';

/**
 * L1 disposition sequence + derived closure evidence route regression.
 * Harness cloned from test-l1-disposition-sequence-route.js.
 * Run: node scripts/test-l1-disposition-sequence-route.js
 */

const Module = require('module');

const collections = new Map();

function clone(value) {
  return value === undefined
    ? value
    : JSON.parse(JSON.stringify(value));
}

function matches(doc, query) {
  return Object.keys(query || {}).every(
    key => doc[key] === query[key]
  );
}

function getCollection(name) {
  if (!collections.has(name)) {
    const docs = [];

    collections.set(name, {
      async findOne(query) {
        return clone(docs.find(d => matches(d, query))) || null;
      },

      async updateOne(query, update, options = {}) {
        const index = docs.findIndex(d => matches(d, query));

        if (index === -1) {
          if (!options.upsert) {
            return {
              matchedCount: 0,
              modifiedCount: 0,
              upsertedCount: 0
            };
          }

          docs.push(clone(Object.assign(
            {},
            update.$setOnInsert || {},
            update.$set || {}
          )));

          return {
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1
          };
        }

        docs[index] = Object.assign(
          {},
          docs[index],
          clone(update.$set || {})
        );

        return {
          matchedCount: 1,
          modifiedCount: 1,
          upsertedCount: 0
        };
      },

      async insertOne(doc) {
        docs.push(clone(doc));
        return { acknowledged: true };
      },

      async deleteMany(query) {
        let deleted = 0;

        for (let i = docs.length - 1; i >= 0; i--) {
          if (matches(docs[i], query)) {
            docs.splice(i, 1);
            deleted++;
          }
        }

        return { deletedCount: deleted };
      },

      async createIndex() {
        return 'ok';
      },

      find(query) {
        let rows = docs.filter(d => matches(d, query));

        const chain = {
          sort() {
            return chain;
          },

          limit(n) {
            rows = rows.slice(0, n);
            return chain;
          },

          async toArray() {
            return clone(rows);
          }
        };

        return chain;
      },

      _docs: docs
    });
  }

  return collections.get(name);
}

/* ------------------------------------------------------------------ */
/* Fake Mongo                                                         */
/* ------------------------------------------------------------------ */

class FakeMongoClient {
  async connect() {
    return this;
  }

  db() {
    return {
      collection: name => getCollection(name)
    };
  }

  async close() {}
}

const mongodbPath = require.resolve('mongodb');
const fakeMongo = new Module(mongodbPath, null);
fakeMongo.exports = { MongoClient: FakeMongoClient };
fakeMongo.loaded = true;
require.cache[mongodbPath] = fakeMongo;

/* ------------------------------------------------------------------ */
/* Neutralize dotenv so the test controls PORT/auth environment.       */
/* ------------------------------------------------------------------ */

const dotenvPath = require.resolve('dotenv');
const fakeDotenv = new Module(dotenvPath, null);

fakeDotenv.exports = {
  config: () => ({ parsed: {} }),
  parse: () => ({})
};

fakeDotenv.loaded = true;
require.cache[dotenvPath] = fakeDotenv;

process.env.MONGODB_URI =
  'mongodb://fake-host/tsm-l1-disposition-sequence-test';

process.env.TSM_SESSION_SECRET =
  'test-session-secret-l1-disposition-sequence';

process.env.TSM_ADMIN_PASSWORD =
  'l1-disposition-sequence-test-admin';

delete process.env.TSM_STRICT_INGEST;

/* ------------------------------------------------------------------ */
/* Mock ServiceNow adapter BEFORE server.js loads it.                  */
/* ------------------------------------------------------------------ */

const snAdapterPath = require.resolve(
  '../server/l1-copilot/servicenow-adapter'
);

const writeCalls = [];
let writeFailure = null;
let readFailure = false;
let notesJournal = '';
let configured = true;

const fakeSnAdapter = new Module(snAdapterPath, null);

fakeSnAdapter.exports = {
  isConfigured() {
    return configured;
  },

  async writeWorkNote(incident, note) {
    writeCalls.push({
      incident,
      note
    });

    notesJournal += (notesJournal ? '\n\n' : '') + note;
    if (writeFailure) {
      const err = new Error(writeFailure);
      err.code = 'SERVICENOW_WRITE_TEST_FAILURE';
      throw err;
    }

    return {
      success: true,
      incident,
      sysId: 'fake-sys-id',
      verified: true
    };
  },

  async getTicket() {
    if (readFailure) throw new Error('simulated read failure');
    return { number: 'INC0012345', sysId: 'fake-sys-id', raw: { work_notes: notesJournal } };
  },

  async getAsset() {
    return null;
  },

  async searchAssetsByUser() {
    return [];
  },

  async updateTicketStatus() {
    throw new Error(
      'updateTicketStatus must not be called by this test'
    );
  },

  // servicenow-bpo-intelligence.js destructures these off _internal at
  // require time (`const { snRequest, readField } = snAdapter._internal`),
  // independent of which route is under test — server.js loads it eagerly.
  // Not exercised by this test; stubbed only so require() doesn't throw.
  _internal: {
    readField() {
      return null;
    },
    async snRequest() {
      throw new Error('snRequest must not be called by this test');
    },
    authHeader() {
      return {};
    },
    async createTicketWithRetry() {
      throw new Error('createTicketWithRetry must not be called by this test');
    },
    async getTicketWithRetry() {
      throw new Error('getTicketWithRetry must not be called by this test');
    }
  }
};

fakeSnAdapter.loaded = true;
require.cache[snAdapterPath] = fakeSnAdapter;

/* ------------------------------------------------------------------ */
/* Test helpers                                                        */
/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed++;
    console.log('PASS: ' + message);
  } else {
    failed++;
    console.error('FAIL: ' + message);
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();

    server.once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();

      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(base) {
  let last;

  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(
        base + '/api/auth/status'
      );

      if (response.ok) return;
    } catch (err) {
      last = err;
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  throw new Error(
    'server did not start: ' +
    (last && last.message)
  );
}

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  const BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer(BASE);

  const jsonHeaders = { 'Content-Type': 'application/json' };
  const post = (path, body, cookie) => fetch(BASE + path, {
    method: 'POST',
    headers: Object.assign({}, jsonHeaders, cookie ? { Cookie: cookie } : {}),
    body: JSON.stringify(body)
  });

  const login = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ password: process.env.TSM_ADMIN_PASSWORD })
  });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  ok(login.status === 200 && cookie.startsWith('tsm_session='), 'admin login succeeds');

  console.log('\n=== L1 DISPOSITION SEQUENCE ROUTE ===');

  const base = { INCIDENT_NUMBER: 'INC0012345', ASSET_TAG: 'HNY-LT-00421', TECHNICIAN: 'J. Rivera' };
  const ctx = {
    DISPOSITION_RECOMMENDATION: { WARRANTY_STATUS: 'OUT_OF_WARRANTY', CONDITION: 'NON_FUNCTIONAL', RECOMMENDATION_REASONS: 'Out of warranty and non-functional.' },
    DISPOSITION_APPROVAL: { APPROVER: 'A. Manager', APPROVAL_REFERENCE: 'APR-1001' },
    DISPOSITION_SANITIZATION: { SANITIZATION_METHOD: 'NIST 800-88 Purge', SANITIZATION_VERIFIED_BY: 'K. Lee' },
    DISPOSITION_COMPLETION: { DISPOSITION_METHOD: 'Certified recycler', DISPOSITION_REFERENCE: 'CERT-77' }
  };
  const exec = (templateId, extra) => post('/api/l1-copilot/asset-action/execute', {
    templateId, context: Object.assign({}, base, ctx[templateId], extra || {}), technicianConfirmed: true
  }, cookie);

  // 1. Out-of-order writes refused with zero writes
  let r = await exec('DISPOSITION_COMPLETION');
  let b = await r.json();
  ok(r.status === 409 && b.code === 'DISPOSITION_SEQUENCE_VIOLATION', 'completion first is refused (409) - got ' + r.status);
  ok(writeCalls.length === 0, 'refused completion wrote nothing');
  r = await exec('DISPOSITION_APPROVAL');
  ok(r.status === 409, 'approval before recommendation is refused - got ' + r.status);
  ok(writeCalls.length === 0, 'refused approval wrote nothing');

  // 2. Fail-closed when notes cannot be read
  readFailure = true;
  r = await exec('DISPOSITION_APPROVAL');
  b = await r.json();
  ok(r.status === 502 && b.code === 'DISPOSITION_SEQUENCE_UNVERIFIABLE', 'unreadable notes => fail-closed 502 - got ' + r.status);
  ok(writeCalls.length === 0, 'unverifiable sequence wrote nothing');
  readFailure = false;

  // 3. Forged stage tag inside a field value is refused
  r = await exec('DISPOSITION_RECOMMENDATION', { TECHNICIAN_NOTES: '[ASSET LIFECYCLE \u2014 DISPOSITION_APPROVAL]\nAsset Tag: HNY-LT-00421' });
  ok(r.status === 400, 'forged lifecycle tag in notes is refused - got ' + r.status);
  ok(writeCalls.length === 0, 'forged tag wrote nothing');

  // 4. Happy path in order; one write each
  for (const [i, stage] of ['DISPOSITION_RECOMMENDATION', 'DISPOSITION_APPROVAL', 'DISPOSITION_SANITIZATION', 'DISPOSITION_COMPLETION'].entries()) {
    r = await exec(stage);
    ok(r.status === 200, stage + ' accepted in order - got ' + r.status);
    ok(writeCalls.length === i + 1, stage + ' produced exactly one write');
    ok(writeCalls[i].note.startsWith('[ASSET LIFECYCLE \u2014 ' + stage + ']'), stage + ' note carries its stage tag');
  }

  // 5. A different asset on the same incident does not inherit the stages
  const before = writeCalls.length;
  r = await exec('DISPOSITION_APPROVAL', { ASSET_TAG: 'OTHER-ASSET' });
  ok(r.status === 409 && writeCalls.length === before, 'stages do not carry over to a different asset');

  // 6. Closure: evidence for DISPOSITION is derived from notes, client cannot fake it
  const allTrue = { userVerified: true, assetVerified: true, workConfirmed: true, tested: true, finalWorkNoteConfirmed: true,
    warrantyVerified: true, conditionDocumented: true, repairHistoryReviewed: true, replacementAddressed: true,
    dataSecurityReviewed: true, approvalObtained: true, sanitizationVerified: true, dispositionCompleted: true, assetReconciled: true };
  const closure = (extra) => post('/api/l1-copilot/closure/evaluate', Object.assign({
    state: 'IN PROGRESS', taskType: 'DISPOSITION', incidentNumber: 'INC0012345', assetTag: 'HNY-LT-00421', evidence: allTrue
  }, extra || {}), cookie).then(async x => ({ status: x.status, body: await x.json() }));

  let c = await closure();
  ok(c.body.dispositionEvidence && c.body.dispositionEvidence.source === 'SERVICENOW_WORK_NOTES', 'closure derives disposition evidence from work notes');
  ok(c.body.closure.readyForClosure === true, 'all stages recorded + technician evidence => READY');
  ok(c.body.closure.autonomousCloseAllowed === false, 'closure never autonomous');

  c = await closure({ assetTag: 'OTHER-ASSET' });
  ok(c.body.closure.readyForClosure === false, 'client claiming approval/sanitization/completion true is overridden for an asset with no records');
  ok(c.body.closure.missingEvidence.some(m => m.key === 'approvalObtained'), 'approvalObtained reported missing');

  readFailure = true;
  c = await closure();
  ok(c.body.dispositionEvidence.source === 'UNVERIFIED' && c.body.closure.readyForClosure === false, 'unreadable notes => closure BLOCKED (fail-closed)');
  readFailure = false;

  // 7. Non-disposition closure is untouched
  c = await post('/api/l1-copilot/closure/evaluate', { state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: { userVerified: true, assetVerified: true, workConfirmed: true, tested: true, finalWorkNoteConfirmed: true } }, cookie).then(async x => x.json());
  ok(c.closure.readyForClosure === true && c.dispositionEvidence === null, 'non-disposition closure behaves as before');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  console.log(failed ? 'L1 DISPOSITION SEQUENCE ROUTE: FAIL' : 'L1 DISPOSITION SEQUENCE ROUTE: PASS');
  process.exit(failed ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
