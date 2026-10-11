'use strict';

/**
 * TSM Relay Sync — server side of html/shared/tsm-relay-sync.js.
 *
 * The War Room -> Strategist -> Executive Portal chain passes a case along in
 * browser storage, so it only exists in the browser that created it. This
 * stores those relay keys per team so any signed-in device sees them.
 *
 *   GET  /api/relay-sync   -> { ok, enabled, scope, version, entries: [{ key, value, area, updatedAt } | { key, deleted, updatedAt }] }
 *                             (server.js answers { ok, enabled: false } itself for signed-out or un-flagged requests)
 *   POST /api/relay-sync   <- { sets: [{ key, value, area }], deletes: [key] }
 *                          -> { ok, results: [{ key, ok, updatedAt } | { key, ok: false, error }] }
 *
 * Rules:
 *   - Signed-in sessions only (the caller mounts this behind requireAnyAuth).
 *   - Scope: a client session reads and writes only its own client's relays;
 *     every staff session shares the 'internal' scope. Scope comes from the
 *     verified session, never from the request.
 *   - Off by default, like the other feature flags in this codebase: until
 *     TSM_RELAY_SYNC=1 is set, reads answer "not enabled" (and the browser
 *     script then does nothing) and writes answer 503.
 *   - Relay payloads can carry document text, so values are encrypted at rest
 *     with the same AES-256-GCM helper and key BPO document storage uses
 *     (TSM_DOC_ENCRYPTION_KEY). Fails closed: with no valid key the routes
 *     answer 503 even when the flag is on, and nothing is stored.
 *   - Only keys that look like relay keys are accepted; anything that looks
 *     like a key, token or secret is refused (same rule as the client).
 *   - Storage is plain updateOne/find on one collection (no createIndex), the
 *     pattern already proven against the Firestore Mongo-compat backend. One
 *     document per (scope, key), capped at 256 KB, well under its per-document
 *     ceiling. A delete is a tombstone so other devices learn of it.
 */

const express = require('express');

const COLLECTION = 'tsm_relay_sync';
const KEY_RE = /^(TSM|tsm)[A-Za-z0-9_-]*(RELAY|relay)[A-Za-z0-9_-]*$/;
const EXTRA_KEYS = new Set(['TSM_WAR_ROOM_BRIEF']);
const DENY_RE = /(key|token|secret|password|credential)/i;
const UI_FLAG_RE = /_(SHOWN|SEEN|DISMISSED|DONE)$/i;
const OWN_KEYS = new Set(['TSM_RELAY_SYNC_META', 'TSM_RELAY_SYNC_RELOADED', 'TSM_RELAY_SYNC_OFF']);
const AREAS = new Set(['local', 'session', 'both']);
const MAX_KEY_LENGTH = 120;
const MAX_VALUE_BYTES = 256 * 1024;
const MAX_KEYS_PER_SCOPE = 200;
const MAX_ITEMS_PER_REQUEST = 100;
const DEFAULT_MAX_AGE_HOURS = 168; // a week: relays are hand-offs in flight, not an archive

function keyAllowed(key) {
  if (typeof key !== 'string' || !key || key.length > MAX_KEY_LENGTH) return false;
  if (OWN_KEYS.has(key) || DENY_RE.test(key) || UI_FLAG_RE.test(key)) return false;
  return KEY_RE.test(key) || EXTRA_KEYS.has(key);
}

function scopeFor(session) {
  if (session && session.role === 'client') {
    if (!session.clientId) return null;
    return 'client:' + session.clientId;
  }
  return 'internal';
}

function isConfigured() {
  if (process.env.TSM_RELAY_SYNC !== '1') return false;
  const raw = process.env.TSM_DOC_ENCRYPTION_KEY;
  if (!raw) return false;
  try { return Buffer.from(raw, 'base64').length === 32; } catch (e) { return false; }
}

function maxAgeMs() {
  const hours = Number(process.env.TSM_RELAY_SYNC_MAX_AGE_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_MAX_AGE_HOURS) * 60 * 60 * 1000;
}

/**
 * @param {{ getDb: Function, encrypt: Function, decrypt: Function }} deps
 *   getDb/encrypt/decrypt come from tsm-ledger-service (getDb,
 *   bpoEncryptBuffer, bpoDecryptBuffer) so this module adds no second
 *   connection and no second crypto implementation.
 */
function createRelaySync({ getDb, encrypt, decrypt }) {
  let lastStamp = 0;
  // Strictly increasing within this process, so two writes in the same
  // millisecond still order correctly for the client's "newer than" check.
  function stamp() {
    const now = Date.now();
    lastStamp = now > lastStamp ? now : lastStamp + 1;
    return lastStamp;
  }

  async function collection() {
    const database = await getDb();
    return database.collection(COLLECTION);
  }

  async function list(scope) {
    const col = await collection();
    const docs = await col.find({ scope }).toArray();
    const cutoff = Date.now() - maxAgeMs();
    const entries = [];
    for (const d of docs) {
      if (!d || !keyAllowed(d.key) || !(d.updatedAt > cutoff)) continue;
      if (d.deleted) {
        entries.push({ key: d.key, deleted: true, updatedAt: d.updatedAt });
        continue;
      }
      let value;
      try {
        value = decrypt(Buffer.from(d.ciphertext, 'base64'), d.iv, d.authTag).toString('utf8');
      } catch (e) {
        continue; // written under a different key (rotation): unreadable, so not offered
      }
      entries.push({ key: d.key, value, area: AREAS.has(d.area) ? d.area : 'local', updatedAt: d.updatedAt });
    }
    entries.sort((a, b) => a.updatedAt - b.updatedAt);
    return entries;
  }

  async function put(scope, item, actor) {
    const key = item && item.key;
    if (!keyAllowed(key)) throw new Error('key is not a relay key');
    if (typeof item.value !== 'string' || !item.value) throw new Error('value must be a non-empty string');
    if (Buffer.byteLength(item.value, 'utf8') > MAX_VALUE_BYTES) throw new Error('value too large');
    const area = AREAS.has(item.area) ? item.area : 'local';

    const col = await collection();
    const existing = await col.findOne({ scope, key });
    if (!existing) {
      const count = (await col.find({ scope }).toArray()).length;
      if (count >= MAX_KEYS_PER_SCOPE) throw new Error('too many relay keys stored for this scope');
    }

    const enc = encrypt(Buffer.from(item.value, 'utf8'));
    const updatedAt = stamp();
    await col.updateOne(
      { scope, key },
      {
        // scope/key are repeated in $set so the upserted document carries them
        // on every backend, not only ones that copy equality fields from the filter.
        $set: {
          scope, key, area,
          ciphertext: enc.ciphertext.toString('base64'), iv: enc.iv, authTag: enc.authTag,
          deleted: false, updatedAt, updatedBy: actor || null,
        },
      },
      { upsert: true }
    );
    return { key, ok: true, updatedAt };
  }

  async function remove(scope, key, actor) {
    if (!keyAllowed(key)) throw new Error('key is not a relay key');
    const col = await collection();
    const existing = await col.findOne({ scope, key });
    const updatedAt = stamp();
    if (existing) {
      await col.updateOne(
        { scope, key },
        { $set: { scope, key, ciphertext: null, iv: null, authTag: null, deleted: true, updatedAt, updatedBy: actor || null } }
      );
    }
    return { key, ok: true, updatedAt };
  }

  return { list, put, remove };
}

/**
 * Express router. Mount behind the session guard:
 *   app.use('/api/relay-sync', requireAnyAuth, relaySync.router(service));
 */
function router(service) {
  const r = express.Router();

  r.use((req, res, next) => {
    if (!isConfigured()) return res.status(503).json({ ok: false, error: 'relay sync is not configured' });
    const scope = scopeFor(req.tsmSession);
    if (!scope) return res.status(403).json({ ok: false, error: 'session has no relay scope' });
    req.relayScope = scope;
    next();
  });

  r.get('/', async (req, res) => {
    try {
      const entries = await service.list(req.relayScope);
      const version = entries.reduce((max, e) => Math.max(max, e.updatedAt), 0);
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, enabled: true, scope: req.relayScope, version, entries });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  r.post('/', async (req, res) => {
    try {
      const body = req.body || {};
      const sets = Array.isArray(body.sets) ? body.sets : [];
      const deletes = Array.isArray(body.deletes) ? body.deletes : [];
      if (sets.length + deletes.length > MAX_ITEMS_PER_REQUEST) {
        return res.status(400).json({ ok: false, error: 'too many items in one request' });
      }
      const s = req.tsmSession || {};
      const actor = s.label || s.staffId || s.role || null;
      const results = [];
      // One bad item never fails the rest: each reports its own outcome.
      for (const item of sets) {
        try { results.push(await service.put(req.relayScope, item, actor)); }
        catch (e) { results.push({ key: item && item.key, ok: false, error: e.message }); }
      }
      for (const key of deletes) {
        try { results.push(await service.remove(req.relayScope, key, actor)); }
        catch (e) { results.push({ key, ok: false, error: e.message }); }
      }
      res.json({ ok: true, results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return r;
}

module.exports = {
  createRelaySync, router, keyAllowed, scopeFor, isConfigured,
  COLLECTION, MAX_VALUE_BYTES, MAX_KEYS_PER_SCOPE, MAX_ITEMS_PER_REQUEST,
};
