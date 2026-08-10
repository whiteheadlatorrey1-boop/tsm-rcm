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
const PA_GL_COLLECTION = 'pa_gl_entries';
const PA_AP_COLLECTION = 'pa_ap_invoices';
const PA_MISSION_COLLECTION = 'pa_missions';

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

// =====================================================
// PROPERTY ACCOUNTING & REVENUE CYCLE
// Collections keyed by missionId (e.g. "PA-MEC-001" — one document
// per property/close-period). Mirrors the in-page state shape that
// html/construction-suite/property-accounting-revenue-cycle.html
// used to keep purely client-side.
// =====================================================

async function paGlCollection() {
  const database = await getDb();
  return database.collection(PA_GL_COLLECTION);
}

async function paApCollection() {
  const database = await getDb();
  return database.collection(PA_AP_COLLECTION);
}

async function paMissionCollection() {
  const database = await getDb();
  return database.collection(PA_MISSION_COLLECTION);
}

/**
 * Ensures a mission/budget doc exists for this missionId, seeding it
 * with `seed` (budget, actual, property, period, etc.) only if absent.
 * Never overwrites an existing doc — seeding is first-write-wins.
 */
async function paEnsureMission(missionId, seed) {
  const col = await paMissionCollection();
  await col.updateOne(
    { missionId },
    { $setOnInsert: { missionId, ...seed, createdAt: new Date().toISOString() } },
    { upsert: true }
  );
  return col.findOne({ missionId });
}

async function paGetMission(missionId) {
  const col = await paMissionCollection();
  return col.findOne({ missionId });
}

async function paUpdateBudget(missionId, budget) {
  const col = await paMissionCollection();
  await col.updateOne(
    { missionId },
    { $set: { budget, updatedAt: new Date().toISOString() } }
  );
  return col.findOne({ missionId });
}

async function paAdjustActual(missionId, delta) {
  const col = await paMissionCollection();
  await col.updateOne(
    { missionId },
    { $inc: { actual: delta }, $set: { updatedAt: new Date().toISOString() } }
  );
  return col.findOne({ missionId });
}

async function paListGlEntries(missionId) {
  const col = await paGlCollection();
  return col.find({ missionId }).sort({ ts: 1 }).toArray();
}

async function paPostGlEntry(missionId, entry) {
  const col = await paGlCollection();
  const doc = {
    missionId,
    date: entry.date,
    account: entry.account,
    type: entry.type,
    amount: entry.amount,
    description: entry.description,
    ts: new Date().toISOString(),
  };
  const result = await col.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

async function paListApInvoices(missionId) {
  const col = await paApCollection();
  return col.find({ missionId }).sort({ id: 1 }).toArray();
}

/**
 * Seeds AP invoices for a mission only if none exist yet for it
 * (first-write-wins, same pattern as paEnsureMission).
 */
async function paEnsureApInvoices(missionId, invoices) {
  const col = await paApCollection();
  const existing = await col.countDocuments({ missionId });
  if (existing > 0) return;
  const docs = invoices.map((inv) => ({ missionId, ...inv }));
  if (docs.length) await col.insertMany(docs);
}

async function paSetApInvoiceStatus(missionId, invoiceId, status) {
  const col = await paApCollection();
  const result = await col.findOneAndUpdate(
    { missionId, id: invoiceId, status: 'pending' },
    { $set: { status, decidedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  return result && result.value ? result.value : result;
}

/**
 * Test/demo-support only: wipes all GL entries and AP invoices for a
 * missionId and resets its mission doc back to `seed`, so a repeatable
 * e2e run (or a demo reset) starts from a pristine state instead of
 * accumulating real persisted entries run over run. paEnsureMission is
 * first-write-wins by design (never overwrites once seeded), so this is
 * the only way to actually re-seed an existing missionId.
 */
async function paResetMission(missionId, seed) {
  const [glCol, apCol, missionCol] = await Promise.all([
    paGlCollection(),
    paApCollection(),
    paMissionCollection(),
  ]);
  await Promise.all([
    glCol.deleteMany({ missionId }),
    apCol.deleteMany({ missionId }),
    missionCol.deleteOne({ missionId }),
  ]);
  await missionCol.updateOne(
    { missionId },
    { $setOnInsert: { missionId, ...seed, createdAt: new Date().toISOString() } },
    { upsert: true }
  );
  return missionCol.findOne({ missionId });
}

module.exports = {
  connect,
  getDb,
  getLedgerCollection,
  writeEntry,
  readRecentEntries,
  close,
  // property accounting
  paEnsureMission,
  paGetMission,
  paUpdateBudget,
  paAdjustActual,
  paListGlEntries,
  paPostGlEntry,
  paListApInvoices,
  paEnsureApInvoices,
  paSetApInvoiceStatus,
  paResetMission,
};
