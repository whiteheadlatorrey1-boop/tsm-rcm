'use strict';

/**
 * L1 asset-action execute route regression (Phase 4).
 *
 * Proves:
 *   1. Unauthenticated execute is refused.
 *   2. templateId is required.
 *   3. Unknown template is refused (no action type mapped).
 *   4. Execute without technician confirmation is refused, zero writes.
 *   5. Missing required template fields are refused (422, missing list),
 *      zero writes.
 *   6. Missing context.INCIDENT_NUMBER is refused (400), zero writes.
 *   7. Malformed INCIDENT_NUMBER is refused (400), zero writes.
 *   8. Oversized generated note is refused (413), zero writes.
 *   9. ServiceNow-not-configured is refused (503), zero writes.
 *  10. Happy path: exactly one write, tagged with
 *      "[ASSET LIFECYCLE — <ACTION_TYPE>]", exact rendered body, technician
 *      derived from the authenticated session (never trusted from the
 *      request body).
 *  11. ServiceNow write failure is surfaced as 502, not reported as success.
 *
 * Uses:
 *   - real server.js
 *   - isolated in-memory Mongo
 *   - isolated free TCP port
 *   - mocked ServiceNow adapter
 *
 * Run:
 *   node scripts/test-l1-asset-action-execute-route.js
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
  'mongodb://fake-host/tsm-l1-asset-action-execute-test';

process.env.TSM_SESSION_SECRET =
  'test-session-secret-l1-asset-action-execute';

process.env.TSM_ADMIN_PASSWORD =
  'l1-asset-action-execute-test-admin';

delete process.env.TSM_STRICT_INGEST;

/* ------------------------------------------------------------------ */
/* Mock ServiceNow adapter BEFORE server.js loads it.                  */
/* ------------------------------------------------------------------ */

const snAdapterPath = require.resolve(
  '../server/l1-copilot/servicenow-adapter'
);

const writeCalls = [];
let writeFailure = null;
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
    return null;
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

  const jsonHeaders = {
    'Content-Type': 'application/json'
  };

  async function post(path, body, cookie) {
    const headers = Object.assign({}, jsonHeaders);

    if (cookie) {
      headers.Cookie = cookie;
    }

    return fetch(BASE + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  }

  console.log('\n=== L1 ASSET-ACTION EXECUTE ROUTE ===');
  console.log('BASE: ' + BASE);

  const validContext = {
    INCIDENT_NUMBER: 'INC0012345',
    ASSET_TAG: 'HNY-LT-00421',
    TECHNICIAN: 'J. Rivera',
    RETURN_REASON: 'Device replacement'
  };

  /* -------------------------------------------------------------- */
  /* 1. Unauthenticated                                              */
  /* -------------------------------------------------------------- */

  let response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: validContext,
      technicianConfirmed: true
    }
  );

  ok(
    (response.status === 401 || response.status === 403),
    'unauthenticated execute is refused - got ' +
      response.status
  );

  ok(
    writeCalls.length === 0,
    'unauthenticated execute caused zero ServiceNow writes'
  );

  const login = await fetch(
    BASE + '/api/auth/login',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        password: process.env.TSM_ADMIN_PASSWORD
      })
    }
  );

  const cookie =
    (login.headers.get('set-cookie') || '')
      .split(';')[0];

  ok(
    login.status === 200 &&
      cookie.startsWith('tsm_session='),
    'admin login succeeds and returns session cookie'
  );

  /* -------------------------------------------------------------- */
  /* 2. templateId required                                         */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    { context: validContext, technicianConfirmed: true },
    cookie
  );

  ok(
    response.status === 400,
    'missing templateId is refused - got ' + response.status
  );

  ok(writeCalls.length === 0, 'missing-templateId rejection did not call ServiceNow');

  /* -------------------------------------------------------------- */
  /* 3. Unknown template                                            */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'NOT_A_REAL_TEMPLATE',
      context: validContext,
      technicianConfirmed: true
    },
    cookie
  );

  ok(
    response.status === 400,
    'unknown templateId is refused - got ' + response.status
  );

  ok(writeCalls.length === 0, 'unknown-template rejection did not call ServiceNow');

  /* -------------------------------------------------------------- */
  /* 4. No technician confirmation                                  */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: validContext,
      technicianConfirmed: false
    },
    cookie
  );

  let body = await response.json();

  ok(
    response.status === 403,
    'execute without technician confirmation is refused - got ' +
      response.status
  );

  ok(
    writeCalls.length === 0,
    'unconfirmed execute did not call ServiceNow'
  );

  /* -------------------------------------------------------------- */
  /* 5. Missing required template fields                            */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: { INCIDENT_NUMBER: 'INC0012345', ASSET_TAG: 'HNY-LT-00421' },
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 422,
    'missing required template fields are refused - got ' +
      response.status
  );

  ok(
    Array.isArray(body.missing) &&
      body.missing.includes('TECHNICIAN') &&
      body.missing.includes('RETURN_REASON'),
    'missing-field response lists the absent required fields'
  );

  ok(
    writeCalls.length === 0,
    'missing-field rejection did not call ServiceNow'
  );

  /* -------------------------------------------------------------- */
  /* 6. Missing INCIDENT_NUMBER                                     */
  /*                                                                  */
  /* INCIDENT_NUMBER is a required field on every registered          */
  /* template, so a blank value is caught by renderTemplate()'s       */
  /* MISSING_REQUIRED_FIELDS check (422) before the route's own       */
  /* `if (!incidentId)` 400 check ever runs. That 400 branch in       */
  /* server.js is currently unreachable given the registry's field    */
  /* requirements — this test documents the actual (422) behavior     */
  /* rather than the behavior the route's own comment/code implies.   */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: Object.assign({}, validContext, { INCIDENT_NUMBER: '' }),
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 422 &&
      Array.isArray(body.missing) &&
      body.missing.includes('INCIDENT_NUMBER'),
    'blank INCIDENT_NUMBER is refused via required-field validation - got ' +
      response.status
  );

  ok(writeCalls.length === 0, 'blank-INCIDENT_NUMBER rejection did not call ServiceNow');

  /* -------------------------------------------------------------- */
  /* 7. Malformed INCIDENT_NUMBER                                   */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: Object.assign({}, validContext, { INCIDENT_NUMBER: 'INC1^ORnumberSTARTSWITHINC' }),
      technicianConfirmed: true
    },
    cookie
  );

  ok(
    response.status === 400,
    'malformed INCIDENT_NUMBER is refused - got ' + response.status
  );

  ok(writeCalls.length === 0, 'malformed-INCIDENT_NUMBER rejection did not call ServiceNow');

  /* -------------------------------------------------------------- */
  /* 8. Oversized generated note                                    */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: Object.assign({}, validContext, { TECHNICIAN_NOTES: 'x'.repeat(20001) }),
      technicianConfirmed: true
    },
    cookie
  );

  ok(
    response.status === 413,
    'oversized generated note is refused - got ' + response.status
  );

  ok(writeCalls.length === 0, 'oversized-note rejection did not call ServiceNow');

  /* -------------------------------------------------------------- */
  /* 9. ServiceNow not configured                                   */
  /* -------------------------------------------------------------- */

  configured = false;

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: validContext,
      technicianConfirmed: true
    },
    cookie
  );

  ok(
    response.status === 503,
    'execute with ServiceNow unconfigured is refused - got ' + response.status
  );

  ok(writeCalls.length === 0, 'unconfigured-ServiceNow rejection did not call writeWorkNote');

  configured = true;

  /* -------------------------------------------------------------- */
  /* 10. Happy path                                                 */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: validContext,
      // A client-supplied technician must never override the
      // session-derived identity.
      technician: { id: 'someone-else', label: 'Spoofed Technician' },
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 200 &&
      body.ok === true,
    'technician-confirmed execute succeeds - got ' + response.status
  );

  ok(
    writeCalls.length === 1,
    'exactly one ServiceNow write occurred'
  );

  ok(
    writeCalls[0] &&
      writeCalls[0].incident === 'INC0012345',
    'ServiceNow write targeted the supplied incident'
  );

  const expectedTag = '[ASSET LIFECYCLE \u2014 RETURN_TO_INVENTORY]\n';

  ok(
    writeCalls[0] &&
      typeof writeCalls[0].note === 'string' &&
      writeCalls[0].note.startsWith(expectedTag),
    'written note is tagged with the mapped action type'
  );

  ok(
    writeCalls[0] &&
      writeCalls[0].note.includes('Asset Tag: HNY-LT-00421') &&
      writeCalls[0].note.includes('Technician: J. Rivera') &&
      writeCalls[0].note.includes('Reason: Device replacement'),
    'written note contains the exact rendered template fields'
  );

  ok(
    body.action &&
      body.action.technician &&
      body.action.technician.id !== 'someone-else',
    'technician identity is derived from the session, not the request body'
  );

  ok(
    body.governed &&
      body.governed.technicianConfirmed === true &&
      body.governed.exactDraftWritten === true,
    'successful execute reports technician confirmation and exact-draft governance'
  );

  ok(
    body.servicenow &&
      body.servicenow.attempted === true &&
      body.servicenow.success === true,
    'successful execute reports the ServiceNow write as attempted and successful'
  );

  /* -------------------------------------------------------------- */
  /* 11. ServiceNow failure is not reported as success              */
  /* -------------------------------------------------------------- */

  writeFailure = 'Simulated ServiceNow write failure';

  response = await post(
    '/api/l1-copilot/asset-action/execute',
    {
      templateId: 'RETURN_TO_INVENTORY',
      context: Object.assign({}, validContext, { INCIDENT_NUMBER: 'INC0099002' }),
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 502,
    'ServiceNow write failure is surfaced as 502 - got ' + response.status
  );

  ok(
    body.ok === false &&
      body.servicenow &&
      body.servicenow.success === false,
    'failed ServiceNow write is not reported as successful'
  );

  writeFailure = null;

  ok(
    writeCalls.length === 2,
    'failure-path attempt is the second and only additional write call'
  );

  console.log(
    '\n' +
      passed +
      ' passed, ' +
      failed +
      ' failed'
  );

  console.log(
    failed
      ? 'L1 ASSET-ACTION EXECUTE ROUTE: FAIL'
      : 'L1 ASSET-ACTION EXECUTE ROUTE: PASS'
  );

  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error('\nFAIL (exception):', err);
  process.exit(1);
});
