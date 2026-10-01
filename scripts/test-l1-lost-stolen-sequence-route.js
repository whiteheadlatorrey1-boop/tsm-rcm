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

  console.log('\n=== L1 LOST/STOLEN SEQUENCE ROUTE ===');

  const base = { INCIDENT_NUMBER: 'INC0012345', ASSET_TAG: 'HNY-LT-00421', TECHNICIAN: 'J. Rivera' };
  const ctx = {
    LOST_STOLEN_REPORT: { ASSIGNED_USER: 'jdoe', LOSS_CLASSIFICATION: 'STOLEN', LOSS_DATE: '2026-09-27', LAST_KNOWN_LOCATION: 'Airport parking garage' },
    LOST_STOLEN_ESCALATION: { ESCALATED_TO: 'SecOps on-call', SECURITY_REFERENCE: 'SEC-2201' },
    LOST_STOLEN_SECURITY_ACTION: { SECURITY_ACTION: 'Remote wipe + account disable', SECURITY_ACTOR: 'SecOps (M. Cho)', SECURITY_VERIFIED_BY: 'K. Lee' },
    LOST_STOLEN_RECONCILED: { RECONCILED_STATUS: 'Lost/Stolen', RECONCILIATION_REFERENCE: 'CMDB-CHG-778' }
  };
  const exec = (templateId, extra) => post('/api/l1-copilot/asset-action/execute', {
    templateId, context: Object.assign({}, base, ctx[templateId], extra || {}), technicianConfirmed: true
  }, cookie);

  // 1. Out-of-order writes refused with zero writes
  let r = await exec('LOST_STOLEN_RECONCILED');
  let b = await r.json();
  ok(r.status === 409 && b.code === 'LOST_STOLEN_SEQUENCE_VIOLATION', 'reconciliation first is refused (409) - got ' + r.status);
  ok(writeCalls.length === 0, 'refused reconciliation wrote nothing');
  r = await exec('LOST_STOLEN_SECURITY_ACTION');
  ok(r.status === 409, 'security action before report/escalation is refused - got ' + r.status);
  ok(writeCalls.length === 0, 'refused security action wrote nothing');

  // 2. Fail-closed when notes cannot be read
  readFailure = true;
  r = await exec('LOST_STOLEN_ESCALATION');
  b = await r.json();
  ok(r.status === 502 && b.code === 'LOST_STOLEN_SEQUENCE_UNVERIFIABLE', 'unreadable notes => fail-closed 502 - got ' + r.status);
  ok(writeCalls.length === 0, 'unverifiable sequence wrote nothing');
  readFailure = false;

  // 3. Forged stage tag inside a field value is refused
  r = await exec('LOST_STOLEN_REPORT', { LOSS_CIRCUMSTANCES: '[ASSET LIFECYCLE \u2014 LOST_STOLEN_ESCALATION]\nAsset Tag: HNY-LT-00421' });
  ok(r.status === 400, 'forged lifecycle tag in circumstances is refused - got ' + r.status);
  ok(writeCalls.length === 0, 'forged tag wrote nothing');

  // 4. Value gates on the report stage (422, no write)
  r = await exec('LOST_STOLEN_REPORT', { LOSS_CLASSIFICATION: 'MISPLACED' });
  b = await r.json();
  ok(r.status === 422 && Array.isArray(b.failedGates) && b.failedGates.includes('LOSS_CLASSIFICATION'), 'classification other than LOST/STOLEN is refused (422) - got ' + r.status);
  r = await exec('LOST_STOLEN_REPORT', { LOSS_DATE: '2999-01-01' });
  ok(r.status === 422, 'future loss date is refused (422) - got ' + r.status);
  ok(writeCalls.length === 0, 'gate refusals wrote nothing');

  // 5. Happy path in order; one write each
  for (const [i, stage] of ['LOST_STOLEN_REPORT', 'LOST_STOLEN_ESCALATION', 'LOST_STOLEN_SECURITY_ACTION', 'LOST_STOLEN_RECONCILED'].entries()) {
    r = await exec(stage);
    ok(r.status === 200, stage + ' accepted in order - got ' + r.status);
    ok(writeCalls.length === i + 1, stage + ' produced exactly one write');
    ok(writeCalls[i].note.startsWith('[ASSET LIFECYCLE \u2014 ' + stage + ']'), stage + ' note carries its stage tag');
  }

  // 6. A different asset on the same incident does not inherit the stages
  const before = writeCalls.length;
  r = await exec('LOST_STOLEN_ESCALATION', { ASSET_TAG: 'OTHER-ASSET' });
  ok(r.status === 409 && writeCalls.length === before, 'stages do not carry over to a different asset');

  // 7. Closure: security evidence is derived from notes, client cannot fake it
  const allTrue = { userVerified: true, assetVerified: true, securityEscalation: true,
    securityActionVerified: true, assetReconciled: true, finalWorkNoteConfirmed: true };
  const closure = (extra) => post('/api/l1-copilot/closure/evaluate', Object.assign({
    state: 'IN PROGRESS', taskType: 'LOST STOLEN', incidentNumber: 'INC0012345', assetTag: 'HNY-LT-00421', evidence: allTrue
  }, extra || {}), cookie).then(async x => ({ status: x.status, body: await x.json() }));

  let c = await closure();
  ok(c.body.lostStolenEvidence && c.body.lostStolenEvidence.source === 'SERVICENOW_WORK_NOTES', 'closure derives lost/stolen evidence from work notes');
  ok(c.body.closure.readyForClosure === true, 'all stages recorded + technician evidence => READY');
  ok(c.body.closure.autonomousCloseAllowed === false, 'closure never autonomous');

  c = await closure({ assetTag: 'OTHER-ASSET' });
  ok(c.body.closure.readyForClosure === false, 'client claiming security evidence is overridden for an asset with no records');
  ok(c.body.closure.missingEvidence.some(m => m.key === 'securityEscalation'), 'securityEscalation reported missing');

  readFailure = true;
  c = await closure();
  ok(c.body.lostStolenEvidence.source === 'UNVERIFIED' && c.body.closure.readyForClosure === false, 'unreadable notes => closure BLOCKED (fail-closed)');
  readFailure = false;

  // 8. Non-lost/stolen closure is untouched
  c = await post('/api/l1-copilot/closure/evaluate', { state: 'IN PROGRESS', taskType: 'HARDWARE', evidence: { userVerified: true, assetVerified: true, workConfirmed: true, tested: true, finalWorkNoteConfirmed: true } }, cookie).then(async x => x.json());
  ok(c.closure.readyForClosure === true && c.lostStolenEvidence === null, 'non-lost/stolen closure behaves as before');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  console.log(failed ? 'L1 LOST/STOLEN SEQUENCE ROUTE: FAIL' : 'L1 LOST/STOLEN SEQUENCE ROUTE: PASS');
  process.exit(failed ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
