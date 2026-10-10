// =====================================================
// CANDIDATE REGISTRY SERVICE
// Single source of truth for candidate records, shared by:
//   - Career Training Platform (html/tsm-career-training-platform.html)
//   - Staffing Readiness Assessment (html/tsm-candidate-readiness-v2.html)
//
// Uses the same MongoClient connection pattern as
// server/tsm-ledger-service.js. Connection string comes from
// MONGODB_URI in .env, e.g.:
//   mongodb://<user>:<pass>@<host>:443/tsm-consultz
//     ?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false
//
// NOTE: retryWrites=false is required if pointed at Firestore's
// Mongo-compatibility layer (see tsm-ledger-service.js header).
// =====================================================

const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');

const DEFAULT_DB_NAME = 'tsm-consultz';
const CANDIDATES_COLLECTION = 'candidates';
const TRAINING_EVENTS_COLLECTION = 'candidate_training_events';

let client = null;
let db = null;
let connecting = null;

/**
 * Lazily connects and caches a single MongoClient for the process.
 * Safe to call from multiple places concurrently.
 */
async function connect() {
  if (db) return db;
  if (connecting) return connecting;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to .env — see server/tsm-ledger-service.js header for format.'
    );
  }

  connecting = (async () => {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 15000,
        retryWrites: false,
      });
      await client.connect();
      db = client.db(process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME);

      const col = db.collection(CANDIDATES_COLLECTION);

      // Firestore MongoDB compatibility does not allow this runtime
      // UserCred to create indexes. Index management belongs outside the
      // application startup path.

      return db;
    } finally {
      connecting = null;
    }
  })();

  db = await connecting;
  return db;
}

function genCandidateId() {
  return 'cand_' + crypto.randomBytes(6).toString('hex');
}

/**
 * Computes a readiness score from actual recorded training-event data
 * instead of a typed-in number. This is intentionally simple and
 * transparent so it can be explained in a client meeting; swap the
 * weighting below once real assessment/training data sources are wired in.
 *
 * events: array of { type: 'module_complete'|'quiz'|'mock_shift', score?: number, weight?: number }
 */
/**
 * Normalizes and validates a training event before persistence.
 *
 * Contract:
 * - type is required
 * - score is optional; omitted score is explicitly unscored
 * - weight defaults to 1 and must be greater than zero
 * - meta defaults to an object
 */
function normalizeTrainingEvent(event = {}) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('training event must be an object');
  }

  if (typeof event.type !== 'string' || !event.type.trim()) {
    throw new Error('training event type is required');
  }

  let score = null;

  if (event.score !== undefined && event.score !== null) {
    if (typeof event.score !== 'number' || !Number.isFinite(event.score)) {
      throw new Error('training event score must be numeric');
    }

    score = event.score;
  }

  const weight = event.weight === undefined || event.weight === null
    ? 1
    : event.weight;

  if (
    typeof weight !== 'number' ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    throw new Error('training event weight must be greater than zero');
  }

  const meta =
    event.meta === undefined || event.meta === null
      ? {}
      : event.meta;

  return {
    type: event.type.trim(),
    score,
    scored: score !== null,
    weight,
    meta,
  };
}

function computeReadinessScore(events = []) {
  if (!events.length) return { score: 0, breakdown: [], basis: 'no-training-data' };

  let totalWeight = 0;
  let weightedSum = 0;
  const breakdown = [];

  for (const ev of events) {
    const weight = typeof ev.weight === 'number' ? ev.weight : 1;
    const hasScore = typeof ev.score === 'number';

    breakdown.push({
      type: ev.type,
      score: hasScore ? ev.score : null,
      weight,
      scored: hasScore,
    });

    if (!hasScore) continue;

    totalWeight += weight;
    weightedSum += ev.score * weight;
  }

  if (totalWeight === 0) {
    return { score: 0, breakdown, basis: 'no-scored-events' };
  }

  const raw = weightedSum / totalWeight;
  return {
    score: Math.round(raw * 10) / 10,
    breakdown,
    basis: 'weighted-average-of-training-events',
  };
}

async function listCandidates({ status } = {}) {
  const database = await connect();
  const query = status ? { status } : {};
  return database
    .collection(CANDIDATES_COLLECTION)
    .find(query)
    .sort({ updatedAt: -1 })
    .toArray();
}

async function getCandidate(candidateId) {
  const database = await connect();
  return database.collection(CANDIDATES_COLLECTION).findOne({ candidateId });
}

function cleanText(v, max) {
  if (v == null) return v;
  return String(v).replace(/[<>]/g, '').trim().slice(0, max);
}

async function upsertCandidate(payload, opts = {}) {
  const database = await connect();
  const now = new Date().toISOString();
  const candidateId = payload.candidateId || genCandidateId();
  // Untrusted callers (public routes) cannot set server-controlled fields:
  // updates keep stored values, creates get safe defaults.
  if (opts && opts.trusted === false) {
    const existing = await database.collection(CANDIDATES_COLLECTION).findOne({ candidateId });
    payload = Object.assign({}, payload, {
      status: existing ? existing.status : undefined,
      source: existing ? existing.source : undefined,
      isSampleData: existing ? existing.isSampleData : payload.isSampleData,
      readinessEvidence: existing ? existing.readinessEvidence : undefined,
      createdAt: existing ? existing.createdAt : undefined,
    });
  }

  const events = await database
    .collection(TRAINING_EVENTS_COLLECTION)
    .find({ candidateId })
    .toArray();
  const readiness = computeReadinessScore(events);

  const doc = {
    candidateId,
    name: cleanText(payload.name, 120),
    role: cleanText(payload.role, 120) || null,
    email: cleanText(payload.email, 254) || null,
    status: payload.status || 'in_training',
    source: payload.source || 'career_training_platform',
    isSampleData: payload.isSampleData !== undefined ? payload.isSampleData : true,
    readinessScore: readiness.score,
    readinessBasis: readiness.basis,
    readinessEvidence: payload.readinessEvidence || null,
    updatedAt: now,
    createdAt: payload.createdAt || now,
  };

  await database
    .collection(CANDIDATES_COLLECTION)
    .updateOne({ candidateId }, { $set: doc }, { upsert: true });

  return getCandidate(candidateId);
}

function buildOperationalEvidence(event, existingEvidence) {
  const type = event && event.type;

  if (type !== 'l1_resolution' && type !== 'l1_escalation') {
    return existingEvidence || null;
  }

  const current = existingEvidence && typeof existingEvidence === 'object'
    ? existingEvidence
    : {};

  const operational = current.operational && typeof current.operational === 'object'
    ? current.operational
    : {};

  const l1 = operational.l1 && typeof operational.l1 === 'object'
    ? operational.l1
    : {};

  const key = type === 'l1_resolution' ? 'resolution' : 'escalation';

  const previous = l1[key] && typeof l1[key] === 'object'
    ? l1[key]
    : {};

  return {
    ...current,
    operational: {
      ...operational,
      l1: {
        ...l1,
        [key]: {
          attempts: Number(previous.attempts || 0) + 1,
          lastScore: Number(event.score) || 0,
          lastRecordedAt: event.recordedAt || new Date().toISOString(),
          lastMeta: event.meta || {},
        },
      },
    },
  };
}

async function recordTrainingEvent(candidateId, event) {
  const normalizedEvent = normalizeTrainingEvent(event);

  const database = await connect();
  const doc = {
    candidateId,
    type: normalizedEvent.type,
    score: normalizedEvent.score,
    weight: normalizedEvent.weight,
    recordedAt: new Date().toISOString(),
    meta: normalizedEvent.meta,
  };
  await database.collection(TRAINING_EVENTS_COLLECTION).insertOne(doc);

  // Recompute and persist the candidate's readiness score off real data.
  const events = await database
    .collection(TRAINING_EVENTS_COLLECTION)
    .find({ candidateId })
    .toArray();
  const readiness = computeReadinessScore(events);

  const candidate = await getCandidate(candidateId);

  const priorOperational =
    candidate && candidate.readinessEvidence && candidate.readinessEvidence.operational;

  const latestEvidence =
    normalizedEvent.type === 'readiness_assessment'
      ? (Object.keys(normalizedEvent.meta).length > 0 || priorOperational
          ? {
              ...(normalizedEvent.meta || {}),
              ...(priorOperational ? { operational: priorOperational } : {})
            }
          : null)
      : buildOperationalEvidence(normalizedEvent, candidate && candidate.readinessEvidence);

  const update = {
    readinessScore: readiness.score,
    readinessBasis: readiness.basis,
    updatedAt: new Date().toISOString(),
  };

  if (latestEvidence) {
    update.readinessEvidence = latestEvidence;
  }

  await database.collection(CANDIDATES_COLLECTION).updateOne(
    { candidateId },
    { $set: update }
  );

  return getCandidate(candidateId);
}

async function deleteCandidate(candidateId) {
  const database = await connect();
  await database.collection(TRAINING_EVENTS_COLLECTION).deleteMany({ candidateId });
  const result = await database
    .collection(CANDIDATES_COLLECTION)
    .deleteOne({ candidateId });
  return result.deletedCount > 0;
}

/**
 * Seeds realistic, clearly-labeled placeholder candidates + training events
 * so both apps have something to render before a real intake pipeline is
 * wired in. Safe to call repeatedly — it upserts, not duplicates.
 */
async function seedSampleData() {
  const samples = [
    {
      name: 'J. Alvarez',
      role: 'Medical Billing Specialist',
      status: 'in_training',
      events: [
        { type: 'module_complete', score: 88, weight: 1 },
        { type: 'quiz', score: 74, weight: 1 },
        { type: 'mock_shift', score: 81, weight: 2 },
      ],
    },
    {
      name: 'M. Chen',
      role: 'Loan Processing Associate',
      status: 'ready_for_placement',
      events: [
        { type: 'module_complete', score: 95, weight: 1 },
        { type: 'quiz', score: 91, weight: 1 },
        { type: 'mock_shift', score: 93, weight: 2 },
      ],
    },
    {
      name: 'R. Okafor',
      role: 'Construction Admin Coordinator',
      status: 'in_training',
      events: [
        { type: 'module_complete', score: 70, weight: 1 },
        { type: 'quiz', score: 65, weight: 1 },
      ],
    },
    {
      name: 'S. Patel',
      role: 'Front Desk / Hotel Ops',
      status: 'needs_review',
      events: [
        { type: 'module_complete', score: 60, weight: 1 },
        { type: 'quiz', score: 55, weight: 1 },
        { type: 'mock_shift', score: 58, weight: 2 },
      ],
    },
  ];

  const database = await connect();
  const results = [];
  for (const s of samples) {
    const candidate = await upsertCandidate({
      name: s.name,
      role: s.role,
      status: s.status,
      isSampleData: true,
      source: 'seed_script',
    });
    for (const ev of s.events) {
      await recordTrainingEvent(candidate.candidateId, ev);
    }
    results.push(await getCandidate(candidate.candidateId));
  }
  return results;
}

// Read-only: a candidate's raw training events, oldest first.
async function listTrainingEvents(candidateId) {
  const database = await connect();
  return database.collection(TRAINING_EVENTS_COLLECTION).find({ candidateId }).sort({ recordedAt: 1 }).toArray();
}

module.exports = {
  connect,
  listCandidates,
  getCandidate,
  upsertCandidate,
  recordTrainingEvent,
  listTrainingEvents,
  deleteCandidate,
  seedSampleData,
  computeReadinessScore,
  normalizeTrainingEvent,
};
