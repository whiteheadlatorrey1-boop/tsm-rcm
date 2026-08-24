'use strict';

// Regression test for the empty-file upload bug found by
// scripts/stress-test/run-stress-test.js: bpoStoreDocument() used to
// reject any zero-length buffer with "file buffer is required" (400),
// even though a zero-byte upload is a legitimate case (placeholder file,
// intentionally empty attachment, etc). Verifies the fix stores a
// zero-length document cleanly and round-trips it back out as an empty
// buffer, alongside the untouched null/undefined-buffer rejection and the
// untouched oversize rejection.
//
// Same stubbed-mongodb-driver pattern as
// scripts/test-bpo-document-extraction.js (a real mongodb-memory-server
// isn't reachable from this sandbox).

const crypto = require('crypto');
const Module = require('module');

let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) { console.log(`  OK   ${label}`); passed++; }
  else { console.log(`  FAIL ${label}`); failed++; }
}

(async () => {
  const collections = new Map();
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
      },
      async findOneAndUpdate(query, update) {
        const idx = rows.findIndex(d => matchesOr(d, query));
        if (idx === -1) return { value: null };
        if (update.$set) Object.assign(rows[idx], update.$set);
        return { value: { ...rows[idx] } };
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

  delete require.cache[require.resolve('../server/tsm-ledger-service')];
  const ledger = require('../server/tsm-ledger-service');

  console.log('1. Zero-byte buffer now stores cleanly (previously threw "file buffer is required")');
  let storeErr = null;
  let meta = null;
  try {
    meta = await ledger.bpoStoreDocument({
      caseId: 'case-empty-1',
      clientId: null,
      filename: 'empty_132.txt',
      mimetype: 'text/plain',
      buffer: Buffer.alloc(0),
      extractedText: null,
      extractionError: null,
    }, 'test-actor');
  } catch (e) { storeErr = e; }
  check('bpoStoreDocument did not throw', storeErr === null);
  check('meta.sizeBytes === 0', meta && meta.sizeBytes === 0);
  check('meta.hasExtractedText === false', meta && meta.hasExtractedText === false);

  console.log('\n2. Round-trips back out as an empty buffer via bpoGetDocumentBuffer');
  const result = meta ? await ledger.bpoGetDocumentBuffer(meta.docId, 'test-actor') : null;
  check('bpoGetDocumentBuffer found the doc', result !== null);
  check('returned buffer is a zero-length Buffer', result && Buffer.isBuffer(result.buffer) && result.buffer.length === 0);

  console.log('\n3. Still shows up in bpoListDocuments for the case');
  const list = await ledger.bpoListDocuments({ caseId: 'case-empty-1' });
  check('listed exactly 1 document', list.length === 1);
  check('listed doc sizeBytes === 0', list[0] && list[0].sizeBytes === 0);

  console.log('\n4. Untouched: null/undefined buffer is still rejected');
  let nullErr = null;
  try {
    await ledger.bpoStoreDocument({
      caseId: 'case-null-1', clientId: null, filename: 'x.txt', mimetype: 'text/plain',
      buffer: null, extractedText: null, extractionError: null,
    }, 'test-actor');
  } catch (e) { nullErr = e; }
  check('null buffer throws "file buffer is required"', nullErr && nullErr.message === 'file buffer is required');

  console.log('\n5. Untouched: oversize buffer is still rejected');
  let oversizeErr = null;
  try {
    await ledger.bpoStoreDocument({
      caseId: 'case-oversize-1', clientId: null, filename: 'big.bin', mimetype: 'application/octet-stream',
      buffer: Buffer.alloc(9 * 1024 * 1024), extractedText: null, extractionError: null,
    }, 'test-actor');
  } catch (e) { oversizeErr = e; }
  check('oversize buffer still throws a byte-limit error', oversizeErr && /byte limit/.test(oversizeErr.message));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
