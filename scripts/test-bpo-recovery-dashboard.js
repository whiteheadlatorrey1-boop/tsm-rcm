'use strict';

/**
 * Phase 8 regression: Executive Recovery Dashboard
 * (bpoBuildRecoveryDashboard in server/tsm-ledger-service.js).
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

async function seedOpen(caseId, { vertical, clientId, stage, priority, financialExposure, recoveryLikelihood }) {
  await ledger.bpoUpsertWorkItem(
    caseId,
    {
      clientId, vertical, stage, priority, status: 'open',
      payload: {
        structuredCase: {
          claimId: caseId,
          financialExposure,
          recoveryLikelihood,
        },
      },
    },
    'test-suite'
  );
}

async function seedResolved(caseId, { vertical, clientId, originalExposure, recoveredAmount, recoveryStatus }) {
  // originalExposure for the outcome comes from the seeded structuredCase's
  // financialExposure (bpoRecordWorkItemOutcome's own contract) — not a
  // separate field, so it has to be present in the work item's payload
  // before the outcome is recorded.
  await ledger.bpoUpsertWorkItem(
    caseId,
    {
      clientId, vertical, stage: 'closed', status: 'open',
      payload: { structuredCase: { claimId: caseId, financialExposure: originalExposure } },
    },
    'test-suite'
  );
  await ledger.bpoRecordWorkItemOutcome(
    caseId,
    { recoveryStatus, recoveredAmount, actionTaken: 'Appeal filed', payerOutcome: 'Processed' },
    'test-suite'
  );
}

async function main() {
  // ── Pipeline cases (no outcome yet) — two verticals, one unparseable exposure ──
  await seedOpen('DASH-OPEN-1', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'ready-for-review',
    priority: 'high', financialExposure: 5000, recoveryLikelihood: 'MODERATE',
  });
  await seedOpen('DASH-OPEN-2', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'appeal-submitted',
    priority: 'critical', financialExposure: 12000, recoveryLikelihood: 'LIKELY',
  });
  await seedOpen('DASH-OPEN-3-NOEXP', {
    vertical: 'healthcare', clientId: 'CLIENT-A', stage: 'war-room',
    priority: 'low', financialExposure: undefined, recoveryLikelihood: null,
  });
  await seedOpen('DASH-OPEN-4-OTHERVERT', {
    vertical: 'bpo', clientId: 'CLIENT-B', stage: 'war-room',
    priority: 'medium', financialExposure: 9999, recoveryLikelihood: 'UNLIKELY',
  });

  // ── Resolved cases (Phase 7 outcome locked in) ──
  await seedResolved('DASH-RESOLVED-1', {
    vertical: 'healthcare', clientId: 'CLIENT-A',
    originalExposure: 4850, recoveredAmount: 2000, recoveryStatus: 'PARTIALLY_RECOVERED',
  });
  await seedResolved('DASH-RESOLVED-2', {
    vertical: 'healthcare', clientId: 'CLIENT-A',
    originalExposure: 2000, recoveredAmount: 2000, recoveryStatus: 'RECOVERED',
  });

  const d = await ledger.bpoBuildRecoveryDashboard({ vertical: 'healthcare' });

  // ── Pipeline bucket ──
  ok(d.pipeline.count === 2, 'pipeline.count excludes the no-exposure and other-vertical cases (got ' + d.pipeline.count + ')');
  ok(d.pipeline.totalExposure === 17000, 'pipeline.totalExposure sums only the two parseable-exposure healthcare cases (got ' + d.pipeline.totalExposure + ')');
  ok(d.topOpenExposure.length === 2, 'topOpenExposure lists the two pipeline cases');
  ok(d.topOpenExposure[0].caseId === 'DASH-OPEN-2', 'topOpenExposure is sorted by exposure descending (got ' + d.topOpenExposure[0].caseId + ')');
  ok(d.topOpenExposure[0].predictedLikelihood === 'LIKELY', 'topOpenExposure carries the predicted likelihood, uppercased');
  const noExpItem = d.topOpenExposure.find((c) => c.caseId === 'DASH-OPEN-3-NOEXP');
  ok(!noExpItem, 'a case with no parseable exposure is skipped, not zeroed, in topOpenExposure');

  // ── Resolved bucket ──
  ok(d.resolved.count === 2, 'resolved.count reflects the two resolved healthcare cases (got ' + d.resolved.count + ')');
  ok(d.resolved.totalRecovered === 4000, 'resolved.totalRecovered sums recoveredAmount across resolved cases (got ' + d.resolved.totalRecovered + ')');
  ok(d.resolved.byStatus.PARTIALLY_RECOVERED === 1 && d.resolved.byStatus.RECOVERED === 1, 'resolved.byStatus buckets by recoveryStatus');

  // ── Vertical/client scoping ──
  const dOtherVert = await ledger.bpoBuildRecoveryDashboard({ vertical: 'bpo' });
  ok(dOtherVert.pipeline.count === 1, 'a different vertical filter returns only that vertical\'s pipeline case (got ' + dOtherVert.pipeline.count + ')');

  const dClientScoped = await ledger.bpoBuildRecoveryDashboard({ vertical: 'healthcare', clientId: 'CLIENT-NONE' });
  ok(dClientScoped.pipeline.count === 0 && dClientScoped.resolved.count === 0, 'an unmatched clientId filter returns an empty dashboard, not an error or all-clients data');

  const dAll = await ledger.bpoBuildRecoveryDashboard({});
  ok(dAll.pipeline.count === 3, 'omitting vertical/clientId returns all verticals combined (got ' + dAll.pipeline.count + ')');
  ok(dAll.vertical === 'all', 'omitted vertical is reported as \"all\", not null or undefined');

  console.log('');
  console.log(passed + ' passed, ' + failed + ' failed');
  console.log('PHASE 8 EXECUTIVE RECOVERY DASHBOARD: ' + (failed === 0 ? 'PASS' : 'FAIL'));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNCAUGHT ERROR:', e);
  process.exit(1);
});
