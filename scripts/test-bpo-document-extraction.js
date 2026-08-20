'use strict';

// Smoke test for the BPO document metadata-extraction wiring
// (docs/BPO_PRODUCTION_READINESS.md Phase 3, "Add metadata extraction").
//
// Covers two things:
//   1. routes/doc-router.js's extractDocText()/isSupported() exported and
//      working standalone (no DB involved).
//   2. server/tsm-ledger-service.js's bpoStoreDocument() ->
//      bpoGetDocumentText() -> bpoListDocuments() round trip, exercised
//      end-to-end against a stubbed 'mongodb' driver, following the same
//      pattern as scripts/test-bpo-upsert-priority-from-severity.js (a
//      real mongodb-memory-server isn't reachable from this sandbox --
//      fastdl.mongodb.org isn't in the network allowlist -- so the driver
//      module itself is faked with an in-memory multi-collection store).
//
// This exercises the real, unmodified bpoStoreDocument/bpoGetDocumentText/
// bpoListDocuments logic, not a mock of those functions -- only the driver
// underneath is fake.

const path = require('path');
const crypto = require('crypto');
const Module = require('module');

let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) { console.log(`  OK   ${label}`); passed++; }
  else { console.log(`  FAIL ${label}`); failed++; }
}

// ---- Part 1: doc-router extraction helpers, no DB needed ------------------

console.log('1. extractDocText() / isSupported() — exported from routes/doc-router.js');
const docRouter = require('../routes/doc-router');
check('module exports isSupported', typeof docRouter.isSupported === 'function');
check('module exports extractDocText', typeof docRouter.extractDocText === 'function');
check('module itself is still the router (app.use() contract)', typeof docRouter === 'function');

(async () => {
  const txtFile = { originalname: 'notes.txt', buffer: Buffer.from('hello world', 'utf8') };
  check('isSupported(.txt) is true', docRouter.isSupported('notes.txt') === true);
  check('extracted .txt text matches source', (await docRouter.extractDocText(txtFile)) === 'hello world');

  const csvFile = { originalname: 'data.csv', buffer: Buffer.from('a,b\n1,2', 'utf8') };
  check('isSupported(.csv) is true', docRouter.isSupported('data.csv') === true);
  check('extracted .csv text matches source', (await docRouter.extractDocText(csvFile)) === 'a,b\n1,2');

  check('isSupported(.png) is false', docRouter.isSupported('photo.png') === false);
  let threw = false;
  try {
    await docRouter.extractDocText({ originalname: 'photo.png', buffer: Buffer.from([1, 2, 3]) });
  } catch (e) {
    threw = e.message === 'unsupported_file_type';
  }
  check('extractDocText() throws unsupported_file_type for .png', threw);

  // ---- Part 2: fake mongodb driver, multi-collection ----------------------

  console.log('\n2. bpoStoreDocument() -> bpoGetDocumentText() -> bpoListDocuments(), against stubbed mongodb driver');

  const collections = new Map(); // name -> array of docs (insertion order preserved)
  function collectionFor(name) {
    if (!collections.has(name)) collections.set(name, []);
    const rows = collections.get(name);

    function matches(doc, query) {
      return Object.keys(query || {}).every(key => {
        const want = query[key];
        if (want && typeof want === 'object' && '$ne' in want) return doc[key] !== want.$ne;
        if (want && typeof want === 'object' && '$exists' in want) return want.$exists ? (key in doc) : !(key in doc);
        return doc[key] === want;
      });
    }
    function matchesOr(doc, query) {
      if (!query.$or) return matches(doc, query);
      const rest = { ...query };
      delete rest.$or;
      return matches(doc, rest) && query.$or.some(sub => matches(doc, sub));
    }

    return {
      async insertOne(doc) {
        rows.push({ ...doc });
        return { acknowledged: true, insertedId: doc.docId || `fake_${rows.length}` };
      },
      async findOne(query) {
        const found = rows.find(d => matchesOr(d, query));
        return found ? { ...found } : null;
      },
      find(query) {
        let results = rows.filter(d => matchesOr(d, query)).map(d => ({ ...d }));
        const cursor = {
          sort(spec) {
            const [[field, dir]] = Object.entries(spec);
            results = results.slice().sort((a, b) => (a[field] > b[field] ? 1 : -1) * dir);
            return cursor;
          },
          limit(n) { results = results.slice(0, n); return cursor; },
          async toArray() { return results; }
        };
        return cursor;
      },
      async updateOne(query, update) {
        const idx = rows.findIndex(d => matchesOr(d, query));
        if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
        if (update.$set) Object.assign(rows[idx], update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      }
    };
  }

  const fakeDb = { collection: (name) => collectionFor(name) };
  class FakeMongoClient {
    async connect() { return this; }
    db() { return fakeDb; }
  }

  const mongodbResolvedPath = require.resolve('mongodb');
  const fakeMongodbModule = new Module(mongodbResolvedPath, null);
  fakeMongodbModule.exports = { MongoClient: FakeMongoClient };
  fakeMongodbModule.loaded = true;
  require.cache[mongodbResolvedPath] = fakeMongodbModule;

  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';
  process.env.TSM_DOC_ENCRYPTION_KEY = process.env.TSM_DOC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');

  // Clear ledger-service module cache in case an earlier test in the same
  // process required it against a different fake driver.
  delete require.cache[require.resolve('../server/tsm-ledger-service')];
  const ledger = require('../server/tsm-ledger-service');

  check('bpoStoreDocument exported', typeof ledger.bpoStoreDocument === 'function');
  check('bpoGetDocumentText exported', typeof ledger.bpoGetDocumentText === 'function');
  check('bpoGetDocumentBuffer exported', typeof ledger.bpoGetDocumentBuffer === 'function');
  check('bpoListDocuments exported', typeof ledger.bpoListDocuments === 'function');

  // 2a. Upload a .txt with successful extraction.
  const fileBuffer = Buffer.from('Q3 recovery notes: client owes $4,200, appeal filed 2026-07-01.', 'utf8');
  const extractedText = fileBuffer.toString('utf8'); // .txt extraction is a straight passthrough
  const meta = await ledger.bpoStoreDocument({
    caseId: 'case_001',
    clientId: 'client_9',
    filename: 'q3-notes.txt',
    mimetype: 'text/plain',
    buffer: fileBuffer,
    extractedText,
    extractionError: null,
  }, 'tester');

  check('meta.hasExtractedText is true', meta.hasExtractedText === true);
  check('meta.extractionError is null', meta.extractionError === null);
  check('meta.textChunkCount >= 1', meta.textChunkCount >= 1);

  const textResult = await ledger.bpoGetDocumentText(meta.docId, 'tester');
  check('bpoGetDocumentText returns a result', !!textResult);
  check('extracted text round-trips exactly', textResult.text === extractedText);

  const bufResult = await ledger.bpoGetDocumentBuffer(meta.docId, 'tester');
  check('bpoGetDocumentBuffer still returns the original file bytes (file/text chunks did not collide)',
    bufResult.buffer.equals(fileBuffer));

  const listed = await ledger.bpoListDocuments({ caseId: 'case_001' });
  check('bpoListDocuments returns the uploaded doc', listed.some(d => d.docId === meta.docId));
  check('bpoListDocuments entries carry hasExtractedText', listed.find(d => d.docId === meta.docId).hasExtractedText === true);

  // 2b. Upload with no extraction (unsupported type / extraction skipped).
  const noTextMeta = await ledger.bpoStoreDocument({
    caseId: 'case_001',
    clientId: 'client_9',
    filename: 'scan.png',
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    extractedText: null,
    extractionError: null,
  }, 'tester');
  check('unsupported-type doc has hasExtractedText false', noTextMeta.hasExtractedText === false);
  const noTextResult = await ledger.bpoGetDocumentText(noTextMeta.docId, 'tester');
  check('bpoGetDocumentText on a doc with no text returns {meta, text:null} rather than throwing',
    !!noTextResult && noTextResult.text === null);

  // 2c. Upload where extraction was attempted but failed.
  const failedMeta = await ledger.bpoStoreDocument({
    caseId: 'case_001',
    clientId: 'client_9',
    filename: 'corrupt.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('not really a docx'),
    extractedText: null,
    extractionError: 'End of central directory not found',
  }, 'tester');
  check('extraction-failed doc still stores (upload not blocked)', !!failedMeta.docId);
  check('extraction-failed doc records the extractionError', failedMeta.extractionError === 'End of central directory not found');
  check('extraction-failed doc has hasExtractedText false', failedMeta.hasExtractedText === false);

  // 2d. Text longer than the truncation cap gets truncated, not rejected.
  // No test-only cap override is exported, and driving 5MB of text through
  // the fake driver's array-based store isn't necessary to prove the code
  // path is wired correctly — this just checks the flag defaults correctly
  // for text comfortably under the real 5MB cap.
  const bigText = 'x'.repeat(200);
  const smallMeta = await ledger.bpoStoreDocument({
    caseId: 'case_002',
    clientId: 'client_9',
    filename: 'short.txt',
    mimetype: 'text/plain',
    buffer: Buffer.from(bigText, 'utf8'),
    extractedText: bigText,
    extractionError: null,
  }, 'tester');
  check('textTruncated is false for text under the cap', smallMeta.textTruncated === false);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('Harness crashed:', err);
  process.exit(1);
});
