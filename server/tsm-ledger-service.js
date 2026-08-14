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

// =====================================================
// HITL APPROVAL GATE PERSISTENCE
// Durable backing store for html/shared/tsm-hitl-gate.js, whose
// decisionLog was previously an in-memory array only -- every
// approve/reject decision (Governance, Integration Hub, the 8 exec-portal
// Decision Centers, Approval Chain) was lost on every server restart.
// One shared collection for all gates, distinguished by gatePrefix (the
// same 'GOV' / 'IHUB' / 'HC' / 'APR' / etc. idPrefix each gate was
// already created with) so this doesn't need one collection per vertical.
// =====================================================

const HITL_COLLECTION = 'hitl_decisions';

async function hitlCollection() {
  const database = await getDb();
  return database.collection(HITL_COLLECTION);
}

/**
 * Upserts a single HITL decision by its own id (already unique -- see
 * decisionId() in tsm-hitl-gate.js). Upsert instead of plain insert so a
 * retry or a hydrate/write race never produces a duplicate row.
 */
async function hitlWriteDecision(gatePrefix, entry) {
  const col = await hitlCollection();
  const doc = Object.assign({ gatePrefix }, entry);
  await col.updateOne({ id: entry.id }, { $set: doc }, { upsert: true });
  return doc;
}

/**
 * Reads all persisted decisions for one gate, oldest first -- matching
 * decisionLog's own push-append (oldest-first) ordering, so hydrate() in
 * tsm-hitl-gate.js can splice these straight in without re-sorting logic
 * living in two places.
 */
async function hitlReadDecisions(gatePrefix) {
  const col = await hitlCollection();
  return col.find({ gatePrefix }).sort({ ts: 1 }).toArray();
}

/**
 * Builds the { write, readAll } adapter shape html/shared/tsm-hitl-gate.js's
 * createGate(idPrefix, persistence) expects, bound to one gatePrefix. Every
 * server.js / routes/*.js call site that creates a HITL gate can do
 * `createGate('GOV', ledger.hitlAdapter('GOV'))` instead of hand-rolling the
 * same two-function object, so there's exactly one place that shape lives.
 */
function hitlAdapter(gatePrefix) {
  return {
    write: (entry) => hitlWriteDecision(gatePrefix, entry),
    readAll: () => hitlReadDecisions(gatePrefix),
  };
}

// =====================================================
// BPO OPERATIONAL PERSISTENCE
// Three collections backing the BPO war room / strategist / executive
// portal (html/war-rooms/bpo-war/*.html), replacing what was previously
// only ever kept in the browser's localStorage:
//
//   bpo_clients     — actual BPO client accounts (name, contact, status).
//                     Distinct from middleware/client-registry.js, which
//                     is login-portal access codes, not business records.
//   bpo_work_items  — the war-room → strategist → exec case pipeline
//                     (one doc per caseId), upserted as a case advances
//                     through stages. Mirrors the TSM_BPO_WAR_RELAY
//                     payload shape from bpo-war-room.html.
//   bpo_audit_logs  — append-only trail of who did what to a client or
//                     work item. Written automatically by the functions
//                     below, not called directly from routes.
// =====================================================

const BPO_CLIENTS_COLLECTION = 'bpo_clients';
const BPO_WORK_ITEMS_COLLECTION = 'bpo_work_items';
const BPO_AUDIT_LOGS_COLLECTION = 'bpo_audit_logs';
// Phase 2 (rest of): append-only collections. Unlike bpo_work_items (one
// doc per caseId, replaced wholesale on each stage advance), these three
// never overwrite — every note/SLA transition/AI output is its own doc,
// so history isn't lost when a case moves war-room -> strategist -> exec.
const BPO_NOTES_COLLECTION = 'bpo_notes';
const BPO_SLA_EVENTS_COLLECTION = 'bpo_sla_events';
const BPO_BNCA_REPORTS_COLLECTION = 'bpo_bnca_reports';

const BPO_PRIORITIES = ['low', 'medium', 'high', 'critical'];

async function bpoClientsCollection() {
  const database = await getDb();
  return database.collection(BPO_CLIENTS_COLLECTION);
}

async function bpoWorkItemsCollection() {
  const database = await getDb();
  return database.collection(BPO_WORK_ITEMS_COLLECTION);
}

async function bpoAuditLogsCollection() {
  const database = await getDb();
  return database.collection(BPO_AUDIT_LOGS_COLLECTION);
}

async function bpoNotesCollection() {
  const database = await getDb();
  return database.collection(BPO_NOTES_COLLECTION);
}

async function bpoSlaEventsCollection() {
  const database = await getDb();
  return database.collection(BPO_SLA_EVENTS_COLLECTION);
}

async function bpoBncaReportsCollection() {
  const database = await getDb();
  return database.collection(BPO_BNCA_REPORTS_COLLECTION);
}

/**
 * Appends one audit entry. Never throws to the caller — an audit-log
 * write failure shouldn't roll back or block the client/work-item
 * mutation it's describing, so callers fire-and-forget this.
 */
async function bpoWriteAudit(entry) {
  try {
    const col = await bpoAuditLogsCollection();
    const doc = { ts: new Date().toISOString(), ...entry };
    await col.insertOne(doc);
  } catch (e) {
    console.warn('[bpoWriteAudit] failed to write audit entry:', e.message);
  }
}

async function bpoListAuditLogs({ entityType, entityId, limit = 100 } = {}) {
  const col = await bpoAuditLogsCollection();
  const query = {};
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  return col.find(query).sort({ ts: -1 }).limit(limit).toArray();
}

// ── Clients ──────────────────────────────────────────────────────────────

function bpoSlugifyClientId(name) {
  const s = (name || '').toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'client';
}

async function bpoListClients({ status } = {}) {
  const col = await bpoClientsCollection();
  const query = {};
  if (status) query.status = status;
  return col.find(query).sort({ name: 1 }).toArray();
}

async function bpoGetClient(id) {
  const col = await bpoClientsCollection();
  return col.findOne({ id });
}

/**
 * Creates a client. id is slugified from name, then de-duped by
 * appending -2, -3, ... if it collides with an existing client.
 */
async function bpoCreateClient({ name, contactName, contactEmail, contactPhone, notes }, actor) {
  const clean = (name || '').toString().trim();
  if (!clean) throw new Error('name required');

  const col = await bpoClientsCollection();
  let id = bpoSlugifyClientId(clean);
  let suffix = 2;
  while (await col.findOne({ id })) {
    id = `${bpoSlugifyClientId(clean)}-${suffix++}`;
  }

  const doc = {
    id,
    name: clean,
    contactName: (contactName || '').toString().trim(),
    contactEmail: (contactEmail || '').toString().trim(),
    contactPhone: (contactPhone || '').toString().trim(),
    notes: (notes || '').toString().trim(),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await col.insertOne(doc);
  await bpoWriteAudit({
    actor, action: 'client.create', entityType: 'client', entityId: id,
    detail: { name: clean },
  });
  return doc;
}

async function bpoUpdateClient(id, fields, actor) {
  const col = await bpoClientsCollection();
  const allowed = ['name', 'contactName', 'contactEmail', 'contactPhone', 'notes'];
  const $set = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (fields[key] !== undefined) $set[key] = (fields[key] || '').toString().trim();
  }
  const result = await col.findOneAndUpdate(
    { id },
    { $set },
    { returnDocument: 'after' }
  );
  const updated = result && result.value ? result.value : result;
  if (updated) {
    await bpoWriteAudit({
      actor, action: 'client.update', entityType: 'client', entityId: id,
      detail: $set,
    });
  }
  return updated;
}

async function bpoSetClientStatus(id, status, actor) {
  if (status !== 'active' && status !== 'inactive') {
    throw new Error("status must be 'active' or 'inactive'");
  }
  const col = await bpoClientsCollection();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: { status, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  const updated = result && result.value ? result.value : result;
  if (updated) {
    await bpoWriteAudit({
      actor, action: status === 'active' ? 'client.reactivate' : 'client.deactivate',
      entityType: 'client', entityId: id, detail: { status },
    });
  }
  return updated;
}

// ── Work items ───────────────────────────────────────────────────────────
// One doc per caseId, upserted as it moves war-room -> strategist -> exec.
// stage/payload/clientId are replaced wholesale on each upsert; callers
// pass the full current snapshot (same shape as the old localStorage
// TSM_BPO_WAR_RELAY payload), not a partial patch.

async function bpoListWorkItems({ clientId, stage, limit = 100 } = {}) {
  const col = await bpoWorkItemsCollection();
  const query = {};
  if (clientId) query.clientId = clientId;
  if (stage) query.stage = stage;
  return col.find(query).sort({ updatedAt: -1 }).limit(limit).toArray();
}

async function bpoGetWorkItem(caseId) {
  const col = await bpoWorkItemsCollection();
  return col.findOne({ caseId });
}

/**
 * Hours between two ISO timestamps (or now, if `to` omitted). Used for
 * slaAgeHours — how long a case has been open, computed at read/write
 * time from createdAt rather than stored as a value that would go stale.
 */
function bpoHoursBetween(fromIso, toIso) {
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.max(0, Math.round(((to - from) / 3600000) * 100) / 100);
}

function bpoNormalizePriority(priority) {
  const p = (priority || '').toString().trim().toLowerCase();
  return BPO_PRIORITIES.includes(p) ? p : 'medium';
}

async function bpoUpsertWorkItem(caseId, fields, actor) {
  if (!caseId) throw new Error('caseId required');
  const col = await bpoWorkItemsCollection();
  const now = new Date().toISOString();
  const {
    clientId = null, vertical = 'bpo', stage = 'war-room', payload = {}, status = 'open',
    owner, priority, dueDate,
  } = fields || {};

  const existing = await col.findOne({ caseId });
  const createdAt = existing ? existing.createdAt : now;

  const $set = {
    caseId, clientId, vertical, stage, payload, status, updatedAt: now,
    slaAgeHours: bpoHoursBetween(createdAt, now),
  };
  // owner/priority/dueDate are optional and sticky — a later upsert that
  // doesn't pass them (e.g. the exec-portal resolve call) shouldn't wipe
  // out what the war room or strategist already set.
  if (owner !== undefined) $set.owner = (owner || '').toString().trim();
  else if (existing && existing.owner !== undefined) $set.owner = existing.owner;
  if (priority !== undefined) $set.priority = bpoNormalizePriority(priority);
  else if (existing && existing.priority !== undefined) $set.priority = existing.priority;
  else $set.priority = 'medium';
  if (dueDate !== undefined) $set.dueDate = dueDate || null;
  else if (existing && existing.dueDate !== undefined) $set.dueDate = existing.dueDate;

  const $setOnInsert = existing ? undefined : { createdAt: now };

  await col.updateOne(
    { caseId },
    $setOnInsert ? { $set, $setOnInsert } : { $set },
    { upsert: true }
  );
  const doc = await col.findOne({ caseId });

  const previousStage = existing ? existing.stage : null;
  await bpoWriteAudit({
    actor, action: existing ? 'work_item.advance' : 'work_item.create',
    entityType: 'work_item', entityId: caseId,
    detail: { stage, clientId, previousStage },
  });

  // Auto-emit an SLA event for open/advance/resolve — separate from the
  // audit log, which is a generic who-did-what trail. This is specifically
  // the stage-timeline a reporting query can walk to compute time-in-stage
  // and breach counts, without parsing audit-log detail blobs.
  let slaEventType = 'advanced';
  if (!existing) slaEventType = 'opened';
  else if (status === 'resolved' && existing.status !== 'resolved') slaEventType = 'resolved';
  try {
    const slaCol = await bpoSlaEventsCollection();
    await slaCol.insertOne({
      caseId, clientId, vertical,
      type: slaEventType,
      fromStage: previousStage,
      toStage: stage,
      status,
      ageHoursAtEvent: $set.slaAgeHours,
      actor,
      ts: now,
    });
  } catch (e) {
    console.warn('[bpoUpsertWorkItem] failed to write SLA event:', e.message);
  }

  return doc;
}

// ── Notes ────────────────────────────────────────────────────────────────
// Append-only — one doc per note, never edited/deleted in place, so a
// case's note history can't be silently rewritten.

async function bpoAddNote(caseId, { text, clientId } = {}, actor) {
  if (!caseId) throw new Error('caseId required');
  const clean = (text || '').toString().trim();
  if (!clean) throw new Error('text required');

  const col = await bpoNotesCollection();
  const doc = { caseId, clientId: clientId || null, text: clean, actor, ts: new Date().toISOString() };
  await col.insertOne(doc);
  await bpoWriteAudit({
    actor, action: 'work_item.note', entityType: 'work_item', entityId: caseId,
    detail: { textPreview: clean.slice(0, 120) },
  });
  return doc;
}

async function bpoListNotes({ caseId, limit = 100 } = {}) {
  const col = await bpoNotesCollection();
  const query = {};
  if (caseId) query.caseId = caseId;
  return col.find(query).sort({ ts: -1 }).limit(limit).toArray();
}

// ── SLA events ───────────────────────────────────────────────────────────
// Read-only from the outside — these are only ever written by
// bpoUpsertWorkItem above, not accepted directly from a route body.

async function bpoListSlaEvents({ caseId, clientId, limit = 200 } = {}) {
  const col = await bpoSlaEventsCollection();
  const query = {};
  if (caseId) query.caseId = caseId;
  if (clientId) query.clientId = clientId;
  return col.find(query).sort({ ts: -1 }).limit(limit).toArray();
}

// ── BNCA / AI-output reports ────────────────────────────────────────────
// Append-only — every AI/BNCA extraction+recommendation the strategist
// screen renders gets its own doc here, not just whatever the current
// bpo_work_items.payload snapshot happens to hold. Lets Phase 4 reporting
// (and any future audit) see what the model actually said at each point,
// not just the latest state.

async function bpoSaveBncaReport(caseId, report, actor) {
  if (!caseId) throw new Error('caseId required');
  if (!report || typeof report !== 'object') throw new Error('report object required');

  const col = await bpoBncaReportsCollection();
  const doc = {
    caseId,
    clientId: report.clientId || null,
    vertical: report.vertical || 'bpo',
    confidence: Number.isFinite(report.confidence) ? report.confidence : null,
    confidenceDefaulted: !!report.confidenceDefaulted,
    recommendation: report.recommendation || null,
    explainability: report.explainability || null,
    exposure: report.exposure || null, // { ifIgnored, ifActed, urgencyWindow } from TSMBNCAExposureEngine
    raw: report.raw !== undefined ? report.raw : report,
    actor,
    ts: new Date().toISOString(),
  };
  await col.insertOne(doc);
  await bpoWriteAudit({
    actor, action: 'work_item.bnca_report', entityType: 'work_item', entityId: caseId,
    detail: { confidence: doc.confidence },
  });
  return doc;
}

async function bpoListBncaReports({ caseId, limit = 50 } = {}) {
  const col = await bpoBncaReportsCollection();
  const query = {};
  if (caseId) query.caseId = caseId;
  return col.find(query).sort({ ts: -1 }).limit(limit).toArray();
}

// =====================================================
// CONCIERGE TRANSPORT PERSISTENCE
// Same ledger-service-first, routes-second pattern as BPO above. Maps a
// server/services/concierge-transport-adapter.js booking to a durable
// mission record plus an append-only status timeline, replacing what the
// adapter otherwise only holds in-memory:
//
//   concierge_missions      — one doc per bookingId, upserted as a
//                              booking's status advances (mirrors
//                              BOOKING_STATUSES: confirmed -> ... ->
//                              completed/cancelled). Mirrors bpo_work_items.
//   concierge_status_events — append-only status-transition trail, one doc
//                              per transition, so history survives a
//                              mission doc being overwritten on the next
//                              upsert. Mirrors bpo_sla_events.
// =====================================================

const CONCIERGE_MISSIONS_COLLECTION = 'concierge_missions';
const CONCIERGE_STATUS_EVENTS_COLLECTION = 'concierge_status_events';

async function conciergeMissionsCollection() {
  const database = await getDb();
  return database.collection(CONCIERGE_MISSIONS_COLLECTION);
}

async function conciergeStatusEventsCollection() {
  const database = await getDb();
  return database.collection(CONCIERGE_STATUS_EVENTS_COLLECTION);
}

async function conciergeListMissions({ status, provider, propertyId, limit = 100 } = {}) {
  const col = await conciergeMissionsCollection();
  const query = {};
  if (status) query.status = status;
  if (provider) query.provider = provider;
  if (propertyId) query.propertyId = propertyId;
  return col.find(query).sort({ updatedAt: -1 }).limit(limit).toArray();
}

async function conciergeGetMission(bookingId) {
  const col = await conciergeMissionsCollection();
  return col.findOne({ bookingId });
}

/**
 * Upserts a mission from a booking (as returned by the adapter's book(),
 * status(), or simulateEvent()). Same slaAgeHours-at-write-time approach
 * as bpoUpsertWorkItem, and same "optional fields are sticky" rule so a
 * later status-only update doesn't wipe guestName/propertyId set earlier.
 */
async function conciergeUpsertMission(bookingId, fields, actor) {
  if (!bookingId) throw new Error('bookingId required');
  const col = await conciergeMissionsCollection();
  const now = new Date().toISOString();
  const {
    provider = null, quoteId = null, status = 'confirmed', confirmationCode = null,
    request = null, driver = null, guestName, propertyId, vertical = 'concierge', note,
  } = fields || {};

  const existing = await col.findOne({ bookingId });
  const createdAt = existing ? existing.createdAt : now;

  const $set = {
    bookingId, provider, quoteId, status, confirmationCode, request, driver, vertical,
    updatedAt: now,
    ageHoursAtUpdate: bpoHoursBetween(createdAt, now),
  };
  if (guestName !== undefined) $set.guestName = (guestName || '').toString().trim();
  else if (existing && existing.guestName !== undefined) $set.guestName = existing.guestName;
  if (propertyId !== undefined) $set.propertyId = propertyId || null;
  else if (existing && existing.propertyId !== undefined) $set.propertyId = existing.propertyId;

  const $setOnInsert = existing ? undefined : { createdAt: now };

  await col.updateOne(
    { bookingId },
    $setOnInsert ? { $set, $setOnInsert } : { $set },
    { upsert: true }
  );
  const doc = await col.findOne({ bookingId });

  const previousStatus = existing ? existing.status : null;
  if (!existing || previousStatus !== status) {
    try {
      const evCol = await conciergeStatusEventsCollection();
      await evCol.insertOne({
        bookingId, provider, vertical,
        fromStatus: previousStatus,
        toStatus: status,
        note: note || undefined,
        actor,
        ts: now,
      });
    } catch (e) {
      console.warn('[conciergeUpsertMission] failed to write status event:', e.message);
    }
  }

  return doc;
}

async function conciergeListStatusEvents({ bookingId, limit = 200 } = {}) {
  const col = await conciergeStatusEventsCollection();
  const query = {};
  if (bookingId) query.bookingId = bookingId;
  return col.find(query).sort({ ts: -1 }).limit(limit).toArray();
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
  // HITL gate persistence
  hitlWriteDecision,
  hitlReadDecisions,
  hitlAdapter,
  // BPO operational persistence
  bpoListClients,
  bpoGetClient,
  bpoCreateClient,
  bpoUpdateClient,
  bpoSetClientStatus,
  bpoListWorkItems,
  bpoGetWorkItem,
  bpoUpsertWorkItem,
  bpoListAuditLogs,
  bpoWriteAudit,
  // BPO Phase 2 (rest of): notes / SLA events / BNCA reports
  bpoAddNote,
  bpoListNotes,
  bpoListSlaEvents,
  bpoSaveBncaReport,
  bpoListBncaReports,
  // Concierge transport persistence
  conciergeListMissions,
  conciergeGetMission,
  conciergeUpsertMission,
  conciergeListStatusEvents,
};
