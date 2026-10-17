#!/usr/bin/env node
// cleanup-bpo-flagship-capture.js — deletes whatever capture-bpo-flagship.js
// created, reading .bpo-flagship-capture-state.json for the ids (written
// incrementally as each resource was created, so this still finds and
// removes a partial run). Always exits 0: a missing state file or missing
// MONGODB_URI just means there is nothing to clean up, not a failure.
//
// Called unconditionally from make-bpo-flagship.sh's trap, regardless of
// how the capture exited -- see that script's comment for why cleanup
// cannot live inside capture-bpo-flagship.js itself.

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.bpo-flagship-capture-state.json');
const LEDGER_DB_NAME = 'tsm-consultz'; // see docs/bpo-mongo-acceptance.md

(async () => {
  if (!fs.existsSync(STATE_FILE)) {
    console.log('(cleanup) no capture state file -- nothing to clean up');
    process.exit(0);
  }
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (!process.env.MONGODB_URI) {
    console.warn('(cleanup) MONGODB_URI not set -- cannot clean up ' + JSON.stringify(state) + '. Remove manually if this was a real run.');
    fs.unlinkSync(STATE_FILE);
    process.exit(0);
  }

  let client = null;
  try {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    await client.connect();
    const db = client.db(LEDGER_DB_NAME);

    if (state.docId) {
      await db.collection('bpo_documents_meta').deleteOne({ docId: state.docId });
      await db.collection('bpo_document_chunks').deleteMany({ docId: state.docId });
    }
    if (state.caseId) {
      await db.collection('bpo_work_items').deleteMany({ caseId: state.caseId });
      await db.collection('bpo_sla_events').deleteMany({ caseId: state.caseId });
    }
    if (state.clientId) {
      await db.collection('bpo_clients').deleteMany({ id: state.clientId });
      await db.collection('bpo_client_monthly_reports').deleteMany({ clientId: state.clientId }).catch(() => {});
    }
    const tags = [state.caseId, state.clientId].filter(Boolean);
    if (tags.length) {
      const res = await db.collection('bpo_audit_logs').deleteMany({ entityId: { $in: tags } });
      console.log('(cleanup) removed ' + res.deletedCount + ' audit log entr(y/ies)');
    }
    console.log('(cleanup) removed: ' + JSON.stringify(state));
  } catch (e) {
    console.error('(cleanup) warning:', e.message);
  } finally {
    if (client) await client.close().catch(() => {});
  }
  fs.unlinkSync(STATE_FILE);
  process.exit(0);
})();
