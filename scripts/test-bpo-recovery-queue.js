'use strict';

/**
 * Phase 9 regression: BPO Recovery Queue
 * (bpoBuildRecoveryQueue in server/tsm-ledger-service.js).
 *
 * No dedicated test file existed for this phase prior to this review.
 * Same in-memory MongoDB stub pattern as the other test-bpo-*.js files
 * in this directory — no real database/network required.
 */

const Module = require('module');

const collections = new Map();

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function matches(doc, query) {
  return Object.keys(query || {}).every((key) => {
    const want = query[key];
    if (want && typeof want === 'object' && '$in' in want) return want.$in.includes(doc[key]);
    if (want && typeof want === 'object' && '$ne' in want) return doc[key] !== want.$ne;
    return doc[key] === want;
  });
}

function getCollection(name) {
  if (!collections.has(name)) {
    const docs = [];

    collections.set(name, {
      async findOne(query) {
        const found = docs.find((doc) => matches(doc, query));
        return clone(found) || null;
      },

      async updateOne(query, update, options = {}) {
        let index = docs.findIndex((doc) => matches(doc, query));

        if (index === -1) {
          if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 };
          const created = clone(
            Object.assign({}, update.$setOnInsert || {}, update.$set || {})
          );
          docs.push(created);
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }

        docs[index] = Object.assign({}, docs[index], clone(update.$set || {}));
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      },

      async insertOne(doc) {
        docs.push(clone(doc));
        return { acknowledged: true };
      },

      find(query) {
        const filtered = () => docs.filter((doc) => matches(doc, query));
        const chain = {
          sort() { return chain; },
          limit() { return chain; },
          async toArray() { return clone(filtered()); },
        };
        return chain;
      },

      _docs: docs,
    });
  }

  return collections.get(name);
}

class FakeMongoClient {
  constructor() {}
  async connect() { return this; }
  db() { return { collection(name) { return getCollection(name); } }; }
  async close() {}
}

const mongodbPath = require.resolve('mongodb');
const fakeMongoModule = new Module(mongodbPath, null);
fakeMongoModule.exports = { MongoClient: FakeMongoClient };
fakeMongoModule.loaded = true;
require.cache[mongodbPath] = fakeMongoModule;

process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';

const ledger = require('../server/tsm-ledger-service');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed += 1;
    console.log('OK: ' + message);
  } else {
    failed += 1;
    console.error('FAIL: ' + message);
  }
}

async function seedOpen(caseId, { vertical, clientId, stage, priority, financialExposure, slaAgeHoursOverride }) {
  await ledger.bpoUpsertWorkItem(
    caseId,
    {
      clientId, vertical, stage, priority, status: 'open',
      payload: financialExposure === undefined ? {} : {
        structuredCase: { claimId: caseId, financialExposure },
      },
    },
    'test-suite'
  );
  if (typeof slaAgeHoursOverride === 'number') {
    const col = getCollection('bpo_work_items');
    const doc = col._docs.find((d) => d.caseId === caseId);
    if (doc) doc.slaAgeHours = slaAgeHoursOverride;
  }
}

async function main() {
  // Two critical cases (different ages), one high, one medium, one with no
  // parseable exposure, one resolved (must be excluded from the queue).
  await seedOpen('QUEUE-CRIT-OLD', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'ready-for-review',
    priority: 'critical', financialExposure: 3000, slaAgeHoursOverride: 240,
  });
  await seedOpen('QUEUE-CRIT-NEW', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'war-room',
    priority: 'critical', financialExposure: 50000, slaAgeHoursOverride: 5,
  });
  await seedOpen('QUEUE-HIGH', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'ready-for-review',
    priority: 'high', financialExposure: 8000, slaAgeHoursOverride: 100,
  });
  await seedOpen('QUEUE-MEDIUM', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'war-room',
    priority: 'medium', financialExposure: 1000, slaAgeHoursOverride: 300,
  });
  await seedOpen('QUEUE-NOEXP', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'war-room',
    priority: 'low', financialExposure: undefined, slaAgeHoursOverride: 400,
  });
  await seedOpen('QUEUE-OTHERVERT', {
    vertical: 'bpo', clientId: 'CLIENT-B', stage: 'war-room',
    priority: 'critical', financialExposure: 999, slaAgeHoursOverride: 1,
  });

  await seedOpen('QUEUE-RESOLVED', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'closed',
    priority: 'critical', financialExposure: 4850,
  });
  await ledger.bpoRecordWorkItemOutcome(
    'QUEUE-RESOLVED',
    { recoveryStatus: 'RECOVERED', recoveredAmount: 4850, actionTaken: 'Appeal won' },
    'test-suite'
  );

  const q = await ledger.bpoBuildRecoveryQueue({ vertical: 'healthcare' });

  // ── Membership / exclusions ──
  const ids = q.queue.map((x) => x.caseId);
  ok(q.count === 5, 'queue count excludes the resolved case and the other-vertical case (got ' + q.count + ')');
  ok(!ids.includes('QUEUE-RESOLVED'), 'a resolved case never appears in the open queue');
  ok(!ids.includes('QUEUE-OTHERVERT'), 'a different-vertical case is excluded by the vertical filter');
  ok(ids.includes('QUEUE-NOEXP'), 'a case with no parseable exposure still appears in the queue (unlike the dashboard pipeline bucket)');
  const noExpEntry = q.queue.find((x) => x.caseId === 'QUEUE-NOEXP');
  ok(noExpEntry.exposure === null, 'a case with no parseable exposure reports exposure as null, not $0 (got ' + noExpEntry.exposure + ')');

  // ── Sort order: priority tier first, then SLA age within tier ──
  ok(ids[0] === 'QUEUE-CRIT-OLD' && ids[1] === 'QUEUE-CRIT-NEW', 'both critical cases sort before high/medium/low, oldest-first within the tier (got ' + ids.slice(0, 2).join(', ') + ')');
  ok(ids[2] === 'QUEUE-HIGH', 'high-priority case sorts after both criticals despite lower SLA age than the medium/low cases (got ' + ids[2] + ')');
  const critOldIdx = ids.indexOf('QUEUE-CRIT-OLD');
  const critNewIdx = ids.indexOf('QUEUE-CRIT-NEW');
  ok(critOldIdx < critNewIdx, 'exposure does NOT drive sort order — QUEUE-CRIT-NEW has 16x the exposure of QUEUE-CRIT-OLD but sorts second, by age, not first, by money');

  // ── Scoping ──
  const qOtherVert = await ledger.bpoBuildRecoveryQueue({ vertical: 'bpo' });
  ok(qOtherVert.count === 1 && qOtherVert.queue[0].caseId === 'QUEUE-OTHERVERT', 'vertical filter scopes to just that vertical\'s open case');

  const qClientScoped = await ledger.bpoBuildRecoveryQueue({ vertical: 'healthcare', clientId: 'CLIENT-NONE' });
  ok(qClientScoped.count === 0, 'an unmatched clientId filter returns an empty queue, not all clients\' cases');

  // ── limit ──
  const qLimited = await ledger.bpoBuildRecoveryQueue({ vertical: 'healthcare', limit: 2 });
  ok(qLimited.queue.length === 2 && qLimited.count === 5, 'limit truncates the returned queue slice but count still reports the full matching total (got queue.length=' + qLimited.queue.length + ', count=' + qLimited.count + ')');

  console.log('');
  console.log(passed + ' passed, ' + failed + ' failed');
  console.log('PHASE 9 BPO RECOVERY QUEUE: ' + (failed === 0 ? 'PASS' : 'FAIL'));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNCAUGHT ERROR:', e);
  process.exit(1);
});
