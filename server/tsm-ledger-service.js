// =====================================================
// TSM LEDGER SERVICE
// MongoDB-driver client for Firestore's MongoDB-compatibility
// endpoint (tsm-rcm-prod / database "tsm-consultz").
//
// Connection string comes from MONGODB_URI in .env, e.g.:
//   mongodb://<userCredsId>:<password>@<host>:443/tsm-consultz
//     ?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false
//
// NOTE: retryWrites=false is required — Firestore's Mongo-compatibility
// layer does not support retryable writes.
// =====================================================

const { MongoClient } = require('mongodb');

const DEFAULT_DB_NAME = 'tsm-consultz';
const LEDGER_COLLECTION = 'ledger_entries';

let client = null;
let db = null;
let connecting = null;

/**
 * Lazily connects and caches a single MongoClient for the process.
 * Safe to call from multiple places concurrently — concurrent callers
 * during the first connect share the same in-flight promise.
 */
async function connect() {
  if (db) return db;
  if (connecting) return connecting;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to .env (see server/tsm-ledger-service.js header for format).'
    );
  }

  connecting = (async () => {
    client = new MongoClient(uri, {
      // Firestore's Mongo-compat layer wants these explicit; harmless
      // no-ops against real MongoDB if this code ever points elsewhere.
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db(DEFAULT_DB_NAME);
    connecting = null;
    return db;
  })();

  return connecting;
}

async function getDb() {
  return db || connect();
}

async function getLedgerCollection() {
  const database = await getDb();
  return database.collection(LEDGER_COLLECTION);
}

/**
 * Writes a single ledger entry. Adds a server-side timestamp if the
 * caller didn't supply one.
 */
async function writeEntry(entry) {
  const col = await getLedgerCollection();
  const doc = { ts: new Date().toISOString(), ...entry };
  const result = await col.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

/**
 * Reads the most recent N ledger entries, newest first.
 */
async function readRecentEntries(limit = 20) {
  const col = await getLedgerCollection();
  return col.find({}).sort({ ts: -1 }).limit(limit).toArray();
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connect,
  getDb,
  getLedgerCollection,
  writeEntry,
  readRecentEntries,
  close,
};
