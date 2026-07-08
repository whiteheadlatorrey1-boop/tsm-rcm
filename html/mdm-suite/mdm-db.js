/**
 * mdm-db.js
 * SQLite persistence layer for TSM MDM.
 *
 * Design decisions:
 *  - SQLite on the Fly volume (tsm_data), not JSON, not Postgres yet.
 *    Single-machine deploy, no concurrent external writers, minimal ops overhead.
 *  - Schema tracks exactly what server.js actually produces today — the merge_log
 *    entry shape below matches app.post('/api/mdm/merge') in server.js verbatim.
 *    Earlier draft of this file assumed a full per-domain relational schema
 *    (customer_master, vendor_master, ...); real seed-data fields differ too much
 *    per domain (taxId vs sku vs employeeId etc.) for that to hold up, so this
 *    version persists only the two things that actually need to survive a
 *    restart: the merge/decision audit trail, and which record IDs have been
 *    merged away per domain (so an approved merge stays merged after a redeploy,
 *    since MDM_SEED_DATA itself reloads fresh from the JSON file on every boot).
 *  - Graceful fallback: if better-sqlite3 fails to load or the volume isn't
 *    mounted, every exported function becomes a no-op / returns empty, and
 *    server.js keeps running on in-memory state only (today's behavior).
 *
 * Usage:
 *   const mdmDb = require('./html/mdm-suite/mdm-db');
 *   mdmDb.initSchema();          // idempotent, safe on every boot
 *   mdmDb.loadMergeLog();        // -> array, newest last, for hydrating MDM_MERGE_LOG
 *   mdmDb.loadMergedIds();       // -> { domain: Set(mergedRecordId) }
 *   mdmDb.logMerge(entry);       // persist one merge_log row (entry from server.js)
 *   mdmDb.recordMergedId(domain, mergedId);
 *   mdmDb.clearAll();            // mirrors /api/mdm/reset
 */

const path = require('path');

const DB_PATH = process.env.TSM_DB_PATH || path.join('/data', 'tsm_mdm.sqlite');

let db = null;
let available = false;

try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  available = true;
} catch (e) {
  console.warn('[mdm-db] better-sqlite3 unavailable or DB path not writable — falling back to in-memory only. Reason:', e.message);
}

const DDL = `
CREATE TABLE IF NOT EXISTS merge_log (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  survivor_id TEXT NOT NULL,
  merged_id TEXT NOT NULL,
  survivor_name TEXT,
  merged_name TEXT,
  decision TEXT NOT NULL,
  actor TEXT,
  ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merged_records (
  domain TEXT NOT NULL,
  record_id TEXT NOT NULL,
  merge_log_id TEXT,
  PRIMARY KEY (domain, record_id)
);
`;

function initSchema() {
  if (!available) return false;
  db.exec(DDL);
  return true;
}

function loadMergeLog() {
  if (!available) return [];
  const rows = db.prepare('SELECT * FROM merge_log ORDER BY ts ASC').all();
  return rows.map(r => ({
    id: r.id,
    domain: r.domain,
    survivorId: r.survivor_id,
    mergedId: r.merged_id,
    survivorName: r.survivor_name,
    mergedName: r.merged_name,
    decision: r.decision,
    actor: r.actor,
    ts: r.ts
  }));
}

function loadMergedIds() {
  const out = {};
  if (!available) return out;
  const rows = db.prepare('SELECT domain, record_id FROM merged_records').all();
  for (const r of rows) {
    if (!out[r.domain]) out[r.domain] = new Set();
    out[r.domain].add(r.record_id);
  }
  return out;
}

function logMerge(entry) {
  if (!available) return;
  db.prepare(`INSERT OR REPLACE INTO merge_log
    (id, domain, survivor_id, merged_id, survivor_name, merged_name, decision, actor, ts)
    VALUES (@id, @domain, @survivorId, @mergedId, @survivorName, @mergedName, @decision, @actor, @ts)`
  ).run(entry);

  if (entry.decision === 'APPROVED') {
    recordMergedId(entry.domain, entry.mergedId, entry.id);
  }
}

function recordMergedId(domain, recordId, mergeLogId) {
  if (!available) return;
  db.prepare(`INSERT OR REPLACE INTO merged_records (domain, record_id, merge_log_id)
    VALUES (?, ?, ?)`).run(domain, recordId, mergeLogId || null);
}

function clearAll() {
  if (!available) return;
  db.prepare('DELETE FROM merge_log').run();
  db.prepare('DELETE FROM merged_records').run();
}

module.exports = {
  available: () => available,
  initSchema,
  loadMergeLog,
  loadMergedIds,
  logMerge,
  recordMergedId,
  clearAll
};
