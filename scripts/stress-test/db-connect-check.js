// Run from repo root: node scripts/stress-test/db-connect-check.js
// Standalone check, independent of server.js and the stress-test harness.
// Verifies TCP/TLS reachability + a real read/write against MONGODB_URI,
// with an explicit timeout so it fails loudly instead of hanging forever.
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

const TIMEOUT_MS = 15000;

(async () => {
  console.log('Connecting (15s timeout)...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: TIMEOUT_MS,
    connectTimeoutMS: TIMEOUT_MS,
  });

  const timer = setTimeout(() => {
    console.error(`Still not connected after ${TIMEOUT_MS}ms -- this points to network/egress reachability, not the app.`);
  }, TIMEOUT_MS);

  try {
    await client.connect();
    clearTimeout(timer);
    console.log('Connected.');

    const db = client.db('tsm-consultz');
    console.log('Attempting a real write to a scratch collection...');
    const col = db.collection('_connectivity_probe');
    const doc = { ts: new Date().toISOString(), probe: true };
    const result = await col.insertOne(doc);
    console.log('Write succeeded:', result.insertedId);

    const found = await col.findOne({ _id: result.insertedId });
    console.log('Read-back succeeded:', found);

    await col.deleteOne({ _id: result.insertedId });
    console.log('Cleanup succeeded. Database connectivity is fine.');
  } catch (err) {
    clearTimeout(timer);
    console.error('FAILED:', err.message);
    console.error(err);
  } finally {
    await client.close();
    process.exit(0);
  }
})();
