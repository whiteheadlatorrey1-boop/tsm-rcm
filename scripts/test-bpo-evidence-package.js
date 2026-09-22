'use strict';

/**
 * Phase 10 regression: Evidence / Appeal Package
 * (bpoBuildEvidencePackage in server/tsm-ledger-service.js).
 *
 * No dedicated test file existed for this phase prior to this review.
 * Same in-memory MongoDB stub pattern as the other test-bpo-*.js files
 * in this directory — no real database/network required.
 */

const crypto = require('crypto');
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
// bpoStoreDocument refuses to run without a real encryption key configured
// (by design — see server/tsm-ledger-service.js) rather than silently
// storing plaintext, so the test needs a real one, not a placeholder.
process.env.TSM_DOC_ENCRYPTION_KEY =
  process.env.TSM_DOC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');

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

async function main() {
  // ── Case 1: full package — outcome, learning record, notes, sla events, document ──
  await ledger.bpoUpsertWorkItem(
    'EVID-FULL',
    {
      clientId: 'CLIENT-A', vertical: 'healthcare', stage: 'appeal-submitted', priority: 'high',
      status: 'open',
      payload: {
        structuredCase: {
          claimId: 'EVID-FULL', financialExposure: 4850, recoveryLikelihood: 'MODERATE',
          confidence: 65, recommendation: 'Appeal on medical necessity grounds',
        },
      },
    },
    'test-suite'
  );
  await ledger.bpoAddNote('EVID-FULL', { text: 'Called payer, requested itemized denial letter.', clientId: 'CLIENT-A' }, 'analyst-1');
  await ledger.bpoStoreDocument({
    caseId: 'EVID-FULL', clientId: 'CLIENT-A', filename: 'denial-letter.pdf',
    mimetype: 'application/pdf', buffer: Buffer.from('fake pdf bytes'),
  }, 'analyst-1');
  await ledger.bpoRecordWorkItemOutcome(
    'EVID-FULL',
    { recoveryStatus: 'PARTIALLY_RECOVERED', recoveredAmount: 2000, actionTaken: 'Appeal filed', payerOutcome: 'Processed' },
    'test-suite'
  );
  await ledger.bpoBuildLearningRecord('EVID-FULL', 'test-suite');

  const full = await ledger.bpoBuildEvidencePackage('EVID-FULL');

  ok(full.caseId === 'EVID-FULL', 'package caseId matches the requested case');
  ok(full.caseSummary && full.caseSummary.financialExposure === 4850, 'caseSummary pulls exposure from the structuredCase');
  ok(full.caseSummary.recommendation === 'Appeal on medical necessity grounds', 'caseSummary carries the recommendation text');
  ok(full.hasOutcome === true, 'hasOutcome is true once Phase 7 has recorded an outcome');
  ok(full.outcome.recoveryStatus === 'PARTIALLY_RECOVERED' && full.outcome.recoveredAmount === 2000, 'outcome fields match what was recorded');
  ok(full.hasLearningRecord === true, 'hasLearningRecord is true once Phase 6 has built a record');
  ok(full.learningRecord && full.learningRecord.predictedLikelihood === 'MODERATE', 'learningRecord carries the predicted likelihood');
  ok(Array.isArray(full.timeline) && full.timeline.length >= 2, 'timeline merges notes and SLA events (got ' + (full.timeline || []).length + ' entries)');
  const noteEntry = full.timeline.find((t) => t.kind === 'note');
  ok(!!noteEntry && noteEntry.text.includes('itemized denial letter'), 'timeline includes the note, tagged kind:note');
  const slaEntry = full.timeline.find((t) => t.kind === 'sla_event');
  ok(!!slaEntry, 'timeline includes at least one SLA event, tagged kind:sla_event');
  const tsSorted = full.timeline.every((t, i) => i === 0 || new Date(full.timeline[i - 1].ts) <= new Date(t.ts));
  ok(tsSorted, 'timeline entries are sorted chronologically regardless of source list');
  ok(full.documents.length === 1 && full.documents[0].filename === 'denial-letter.pdf', 'documents lists filename metadata for the uploaded file');
  ok(full.documents[0].mimetype === 'application/pdf', 'documents metadata includes mimetype');
  ok(!('buffer' in full.documents[0]) && !('data' in full.documents[0]), 'documents metadata never includes the raw file bytes — filenames/type only, per Phase 10\'s stated contract');

  // ── Case 2: bare case — no outcome, no learning record, no notes/docs ──
  await ledger.bpoUpsertWorkItem(
    'EVID-BARE',
    { clientId: 'CLIENT-B', vertical: 'healthcare', stage: 'war-room', status: 'open', payload: {} },
    'test-suite'
  );
  const bare = await ledger.bpoBuildEvidencePackage('EVID-BARE');
  ok(bare.hasOutcome === false && bare.outcome === null, 'a case with no recorded outcome reports hasOutcome:false and outcome:null, not fabricated zeros');
  ok(bare.hasLearningRecord === false && bare.learningRecord === null, 'a case with no learning record reports hasLearningRecord:false and learningRecord:null');
  ok(bare.caseSummary === null, 'a case with no structuredCase in its payload reports caseSummary:null, not an object of nulls');
  ok(Array.isArray(bare.documents) && bare.documents.length === 0, 'a case with no uploaded documents returns an empty documents array');
  // timeline still has the one 'opened' SLA event auto-emitted by bpoUpsertWorkItem
  ok(Array.isArray(bare.timeline) && bare.timeline.length === 1 && bare.timeline[0].kind === 'sla_event', 'a case with no notes still gets its auto-emitted open SLA event in the timeline');

  // ── Error handling ──
  let threwForMissing = false;
  try {
    await ledger.bpoBuildEvidencePackage('EVID-DOES-NOT-EXIST');
  } catch (e) {
    threwForMissing = /not found/i.test(e.message);
  }
  ok(threwForMissing, 'requesting an evidence package for a nonexistent caseId throws a clear "not found" error rather than returning a half-empty package');

  let threwForNoCaseId = false;
  try {
    await ledger.bpoBuildEvidencePackage();
  } catch (e) {
    threwForNoCaseId = /caseId required/i.test(e.message);
  }
  ok(threwForNoCaseId, 'calling with no caseId throws immediately');

  console.log('');
  console.log(passed + ' passed, ' + failed + ' failed');
  console.log('PHASE 10 EVIDENCE / APPEAL PACKAGE: ' + (failed === 0 ? 'PASS' : 'FAIL'));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNCAUGHT ERROR:', e);
  process.exit(1);
});
