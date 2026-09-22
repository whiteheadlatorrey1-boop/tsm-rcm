'use strict';

/**
 * L1 governed resolution route regression.
 *
 * Proves:
 *   1. Resolution generation is draft-only.
 *   2. ServiceNow write requires technician confirmation.
 *   3. ServiceNow write requires the exact reviewed draft.
 *   4. No ServiceNow write occurs on rejected requests.
 *   5. The exact confirmed draft is passed to writeWorkNote().
 *   6. Direct /servicenow/work-note is also governed.
 *
 * Uses:
 *   - real server.js
 *   - isolated in-memory Mongo
 *   - isolated free TCP port
 *   - mocked ServiceNow adapter
 *
 * Run:
 *   node scripts/test-l1-governed-resolution-route.js
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
  'mongodb://fake-host/tsm-l1-governed-resolution-test';

process.env.TSM_SESSION_SECRET =
  'test-session-secret-l1-governed-resolution';

process.env.TSM_ADMIN_PASSWORD =
  'l1-governed-resolution-test-admin';

delete process.env.TSM_STRICT_INGEST;

/* ------------------------------------------------------------------ */
/* Stub Groq HTTP calls while preserving real application routing.    */
/* ------------------------------------------------------------------ */

const realFetch = global.fetch;

global.fetch = async function testFetch(url, options) {
  const target = typeof url === 'string'
    ? url
    : (url && url.url) || '';

  if (target.startsWith('https://api.groq.com/')) {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                'Problem\\n' +
                'Workstation display failure.\\n\\n' +
                'Cause\\n' +
                'Display cable connection issue.\\n\\n' +
                'Actions Taken\\n' +
                'Verified asset tag and reseated display cable.\\n\\n' +
                'Resolution\\n' +
                'Display restored.\\n\\n' +
                'Validation\\n' +
                'Confirmed display functionality returned.\\n\\n' +
                'Next Steps\\n' +
                'None.'
            }
          }
        ]
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  return realFetch(url, options);
};

/* ------------------------------------------------------------------ */
/* Mock ServiceNow adapter BEFORE server.js loads it.                  */
/* ------------------------------------------------------------------ */

const snAdapterPath = require.resolve(
  '../server/l1-copilot/servicenow-adapter'
);

const writeCalls = [];
let writeFailure = null;

const fakeSnAdapter = new Module(snAdapterPath, null);

fakeSnAdapter.exports = {
  isConfigured() {
    return true;
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

  console.log('\n=== L1 GOVERNED RESOLUTION ROUTE ===');
  console.log('BASE: ' + BASE);

  /* -------------------------------------------------------------- */
  /* Authentication                                                  */
  /* -------------------------------------------------------------- */

  let response = await post(
    '/api/l1-copilot/resolution',
    {
      incident: 'INC-L1-GOV-001',
      draft: 'Unauthorized write attempt',
      writeToServicenow: true
    }
  );

  ok(
    (response.status === 401 || response.status === 403),
    'unauthenticated resolution write is refused - got ' +
      response.status
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
  /* 1. Draft-only generation                                       */
  /* -------------------------------------------------------------- */

  const ticket = [
    'INC-L1-GOV-001',
    'User reports workstation display failure.'
  ].join('\n');

  const notes = [
    'Verified asset tag.',
    'Reseated display cable.',
    'Confirmed display returned.'
  ].join('\n');

  response = await post(
    '/api/l1-copilot/resolution',
    {
      ticket,
      analysis: {
        severity: 'medium'
      },
      notes
    },
    cookie
  );

  let body = await response.json();

  /*
   * This request legitimately reaches the AI generation path.
   * If the environment does not have a usable Groq configuration,
   * the test reports that explicitly rather than pretending it passed.
   */
  ok(
    response.status === 200 &&
      body.ok === true,
    'resolution generation route responds successfully - got ' +
      response.status
  );

  if (response.status === 200) {
    ok(
      body.governed &&
        body.governed.draftOnly === true,
      'resolution generation is explicitly marked draft-only'
    );

    ok(
      body.governed &&
        body.governed.writtenToServicenow === false,
      'draft generation does not write to ServiceNow'
    );
  }

  ok(
    writeCalls.length === 0,
    'draft generation caused zero ServiceNow writes'
  );

  /* -------------------------------------------------------------- */
  /* 2. Write without technician confirmation                       */
  /* -------------------------------------------------------------- */

  const reviewedDraft =
    'Problem\n' +
    'Workstation display failure.\n\n' +
    'Cause\n' +
    'Display cable connection issue.\n\n' +
    'Actions Taken\n' +
    'Reseated display cable.\n\n' +
    'Resolution\n' +
    'Display restored.\n\n' +
    'Validation\n' +
    'User display functionality confirmed.\n\n' +
    'Next Steps\n' +
    'None.';

  response = await post(
    '/api/l1-copilot/resolution',
    {
      incident: 'INC-L1-GOV-001',
      draft: reviewedDraft,
      writeToServicenow: true,
      technicianConfirmed: false
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 403,
    'resolution write without technician confirmation is refused - got ' +
      response.status
  );

  ok(
    writeCalls.length === 0,
    'rejected resolution write did not call ServiceNow'
  );

  /* -------------------------------------------------------------- */
  /* 3. Confirmation without draft                                  */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/resolution',
    {
      incident: 'INC-L1-GOV-001',
      writeToServicenow: true,
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 400,
    'confirmed resolution write without draft is refused - got ' +
      response.status
  );

  ok(
    writeCalls.length === 0,
    'missing-draft rejection did not call ServiceNow'
  );

  /* -------------------------------------------------------------- */
  /* 4. Exact reviewed draft is written                             */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/resolution',
    {
      incident: 'INC-L1-GOV-001',
      draft: reviewedDraft,
      writeToServicenow: true,
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 200 &&
      body.ok === true,
    'technician-confirmed resolution write succeeds - got ' +
      response.status
  );

  ok(
    writeCalls.length === 1,
    'exactly one ServiceNow write occurred'
  );

  ok(
    writeCalls[0] &&
      writeCalls[0].incident === 'INC-L1-GOV-001',
    'ServiceNow write targeted the supplied incident'
  );

  ok(
    writeCalls[0] &&
      writeCalls[0].note === reviewedDraft,
    'ServiceNow received the exact reviewed draft'
  );

  ok(
    body.governed &&
      body.governed.technicianConfirmed === true &&
      body.governed.exactDraftWritten === true,
    'successful write reports technician confirmation and exact-draft governance'
  );

  ok(
    body.answer === reviewedDraft,
    'write response returns the exact reviewed draft rather than regenerating it'
  );

  /* -------------------------------------------------------------- */
  /* 5. Direct work-note route without confirmation                 */
  /* -------------------------------------------------------------- */

  response = await post(
    '/api/l1-copilot/servicenow/work-note',
    {
      incident: 'INC-L1-GOV-002',
      note: 'Direct route test note.'
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 403,
    'direct work-note route without confirmation is refused - got ' +
      response.status
  );

  ok(
    writeCalls.length === 1,
    'direct unconfirmed work-note request did not call ServiceNow'
  );

  /* -------------------------------------------------------------- */
  /* 6. Direct work-note route with confirmation                   */
  /* -------------------------------------------------------------- */

  const directNote =
    'Technician-confirmed direct work note.';

  response = await post(
    '/api/l1-copilot/servicenow/work-note',
    {
      incident: 'INC-L1-GOV-002',
      note: directNote,
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 200 &&
      body.ok === true,
    'direct confirmed work-note route succeeds - got ' +
      response.status
  );

  ok(
    writeCalls.length === 2,
    'direct confirmed work-note produced exactly one additional write'
  );

  ok(
    writeCalls[1] &&
      writeCalls[1].incident === 'INC-L1-GOV-002' &&
      writeCalls[1].note === directNote,
    'direct confirmed work-note receives the exact supplied note'
  );

  ok(
    body.governed &&
      body.governed.technicianConfirmed === true &&
      body.governed.appendOnlyWorkNote === true,
    'direct work-note response reports governed append-only behavior'
  );

  /* -------------------------------------------------------------- */
  /* 7. ServiceNow failure is not reported as success              */
  /* -------------------------------------------------------------- */

  writeFailure = 'Simulated ServiceNow write failure';

  response = await post(
    '/api/l1-copilot/resolution',
    {
      incident: 'INC-L1-GOV-003',
      draft: 'Failure-path reviewed draft.',
      writeToServicenow: true,
      technicianConfirmed: true
    },
    cookie
  );

  body = await response.json();

  ok(
    response.status === 502,
    'ServiceNow write failure is surfaced as 502 - got ' +
      response.status
  );

  ok(
    body.ok === false &&
      body.servicenow &&
      body.servicenow.success === false,
    'failed ServiceNow write is not reported as successful'
  );

  writeFailure = null;

  console.log(
    '\n' +
      passed +
      ' passed, ' +
      failed +
      ' failed'
  );

  console.log(
    failed
      ? 'L1 GOVERNED RESOLUTION ROUTE: FAIL'
      : 'L1 GOVERNED RESOLUTION ROUTE: PASS'
  );

  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error('\nFAIL (exception):', err);
  process.exit(1);
});
