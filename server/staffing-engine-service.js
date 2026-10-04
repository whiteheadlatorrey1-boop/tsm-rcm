// =====================================================
// STAFFING ENGINE SERVICE
// Fills the gap between the Candidate Registry (training/readiness)
// and an actual placement business: employers, job orders, and the
// submit -> interview -> place pipeline, with fee computation.
//
// Reuses the same MongoClient connection pattern as
// server/candidate-registry-service.js and server/tsm-ledger-service.js.
// Connection string comes from MONGODB_URI in .env.
//
// Honesty pattern (matches candidate-registry-service.js): fees are only
// ever computed off numbers actually entered on the job order and
// placement record — never estimated or typed in as a final dollar
// amount directly.
// =====================================================

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const candidateRegistry = require('./candidate-registry-service');
const Pipeline = require('../html/js/career/tsm-staffing-pipeline-model.js');
const PlacementEvidence = require('../html/js/career/tsm-placement-evidence.js');
const ReadinessModel = require('./readiness/professional-readiness-model.js');

const DEFAULT_DB_NAME = 'tsm-consultz';
const EMPLOYERS_COLLECTION = 'staffing_employers';
const JOB_ORDERS_COLLECTION = 'staffing_job_orders';
const PLACEMENTS_COLLECTION = 'staffing_placements';
const PLACEMENT_EVIDENCE_COLLECTION = 'staffing_placement_evidence';

// Phase 8E wiring. When STAFFING_PIPELINE_ENFORCE=1 the human-review submission
// gate and the stage-transition rules from tsm-staffing-pipeline-model.js are
// enforced. Default (unset) leaves behavior exactly as before, so the Staffing
// Admin UI (which has no review step yet) keeps working until the UI ships one.
function pipelineEnforced() {
  return process.env.STAFFING_PIPELINE_ENFORCE === '1';
}

// Phase 8F wiring. When STAFFING_PLACEMENT_EVIDENCE=1, every placement stage is
// recorded as an append-only outcome record in its OWN collection
// (staffing_placement_evidence) -- never the Candidate Registry, never training
// evidence. Default (unset) records nothing.
function placementEvidenceEnabled() {
  return process.env.STAFFING_PLACEMENT_EVIDENCE === '1';
}

// Placement audit trail. When STAFFING_PLACEMENT_AUDIT=1, every status change is
// also written as an immutable event to its own collection. Default off.
// Best-effort: a failure is logged and NEVER blocks or rolls back the status change.
const PlacementAudit = require('../html/js/career/tsm-staffing-audit.js');
const PLACEMENT_AUDIT_COLLECTION = 'staffing_placement_audit';
function placementAuditEnabled() {
  return process.env.STAFFING_PLACEMENT_AUDIT === '1';
}
async function recordPlacementAudit(args) {
  if (!placementAuditEnabled() || !args || !args.placement) return { recorded: 0 };
  try {
    const event = PlacementAudit.buildStatusChangeEvent(args);
    const database = await connect();
    const collection = database.collection(PLACEMENT_AUDIT_COLLECTION);
    const existing = await collection.findOne({ auditEventId: event.auditEventId });
    if (existing) return { recorded: 0 };
    await collection.insertOne(event);
    return { recorded: 1 };
  } catch (err) {
    console.error('[staffing] placement audit write failed (non-blocking):', err && err.message);
    return { recorded: 0, error: true };
  }
}

let client = null;
let db = null;
let connecting = null;

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
      return db;
    } finally {
      connecting = null;
    }
  })();

  db = await connecting;
  return db;
}

function genId(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

// ---------------------------------------------------------------
// Employers
// ---------------------------------------------------------------

async function listEmployers({ status } = {}) {
  const database = await connect();
  const query = status ? { status } : {};
  return database
    .collection(EMPLOYERS_COLLECTION)
    .find(query)
    .sort({ updatedAt: -1 })
    .toArray();
}

async function getEmployer(employerId) {
  const database = await connect();
  return database.collection(EMPLOYERS_COLLECTION).findOne({ employerId });
}

async function upsertEmployer(payload) {
  const database = await connect();
  const now = new Date().toISOString();
  const employerId = payload.employerId || genId('emp');

  const doc = {
    employerId,
    name: payload.name,
    contactName: payload.contactName || null,
    contactEmail: payload.contactEmail || null,
    contactPhone: payload.contactPhone || null,
    sector: payload.sector || null,
    status: payload.status || 'prospect', // prospect | active | inactive
    notes: payload.notes || null,
    updatedAt: now,
    createdAt: payload.createdAt || now,
  };

  await database
    .collection(EMPLOYERS_COLLECTION)
    .updateOne({ employerId }, { $set: doc }, { upsert: true });

  return getEmployer(employerId);
}

async function deleteEmployer(employerId) {
  const database = await connect();
  const result = await database
    .collection(EMPLOYERS_COLLECTION)
    .deleteOne({ employerId });
  return result.deletedCount > 0;
}

// ---------------------------------------------------------------
// Job orders
// ---------------------------------------------------------------

async function listJobOrders({ employerId, status } = {}) {
  const database = await connect();
  const query = {};
  if (employerId) query.employerId = employerId;
  if (status) query.status = status;
  return database
    .collection(JOB_ORDERS_COLLECTION)
    .find(query)
    .sort({ updatedAt: -1 })
    .toArray();
}

async function getJobOrder(jobOrderId) {
  const database = await connect();
  return database.collection(JOB_ORDERS_COLLECTION).findOne({ jobOrderId });
}

/**
 * feeType: 'markup' — hourly spread (billRate - payRate) paid on hours worked
 *          'contingency' — one-time % of the placement's annualized pay
 * feeValue: for markup, ignored (spread is derived from billRate/payRate);
 *           for contingency, the percentage (e.g. 25 for 25%)
 */
async function upsertJobOrder(payload) {
  const database = await connect();
  const now = new Date().toISOString();
  const jobOrderId = payload.jobOrderId || genId('job');

  if (payload.employerId) {
    const employer = await getEmployer(payload.employerId);
    if (!employer) {
      throw new Error(`No employer found for employerId ${payload.employerId}`);
    }
  }

  const doc = {
    jobOrderId,
    employerId: payload.employerId,
    title: payload.title,
    sector: payload.sector || null,
    openings: Number.isFinite(payload.openings) ? payload.openings : 1,
    payRate: payload.payRate != null ? Number(payload.payRate) : null, // hourly, paid to candidate
    billRate: payload.billRate != null ? Number(payload.billRate) : null, // hourly, billed to employer (markup model)
    feeType: payload.feeType || 'contingency', // 'markup' | 'contingency'
    feeValue: payload.feeValue != null ? Number(payload.feeValue) : 25, // contingency %, default matches TSM's stated 20-30% band
    status: payload.status || 'open', // open | filled | closed
    updatedAt: now,
    createdAt: payload.createdAt || now,
  };

  await database
    .collection(JOB_ORDERS_COLLECTION)
    .updateOne({ jobOrderId }, { $set: doc }, { upsert: true });

  return getJobOrder(jobOrderId);
}

async function deleteJobOrder(jobOrderId) {
  const database = await connect();
  const result = await database
    .collection(JOB_ORDERS_COLLECTION)
    .deleteOne({ jobOrderId });
  return result.deletedCount > 0;
}

// ---------------------------------------------------------------
// Placements (submit -> interview -> place pipeline)
// ---------------------------------------------------------------

const VALID_STATUSES = [
  'submitted',
  'interviewing',
  'offered',
  'placed',
  'declined',
  'ended',
];

/**
 * Computes the fee for a placement once it reaches 'placed'.
 * annualHours defaults to a standard 2080hr work-year for contingency math;
 * pass a real value on the placement (e.g. part-time roles) to override.
 */
function computeFee(jobOrder, placement) {
  if (!jobOrder) return null;

  if (jobOrder.feeType === 'markup') {
    if (jobOrder.billRate == null || jobOrder.payRate == null) return null;
    const spread = jobOrder.billRate - jobOrder.payRate;
    return {
      type: 'markup',
      hourlySpread: Math.round(spread * 100) / 100,
      basis: 'billRate_minus_payRate_per_hour',
    };
  }

  // contingency
  const payRate = placement.payRate != null ? Number(placement.payRate) : jobOrder.payRate;
  if (payRate == null) return null;
  const annualHours = Number.isFinite(placement.annualHours) ? placement.annualHours : 2080;
  const annualizedPay = payRate * annualHours;
  const pct = Number.isFinite(jobOrder.feeValue) ? jobOrder.feeValue : 25;
  const amount = Math.round(annualizedPay * (pct / 100) * 100) / 100;
  return {
    type: 'contingency',
    percentage: pct,
    annualizedPay: Math.round(annualizedPay * 100) / 100,
    amount,
    basis: 'percentage_of_annualized_pay',
  };
}

async function listPlacements({ jobOrderId, candidateId, employerId, status } = {}) {
  const database = await connect();
  const query = {};
  if (jobOrderId) query.jobOrderId = jobOrderId;
  if (candidateId) query.candidateId = candidateId;
  if (employerId) query.employerId = employerId;
  if (status) query.status = status;
  return database
    .collection(PLACEMENTS_COLLECTION)
    .find(query)
    .sort({ updatedAt: -1 })
    .toArray();
}

async function getPlacement(placementId) {
  const database = await connect();
  return database.collection(PLACEMENTS_COLLECTION).findOne({ placementId });
}

/**
 * Submits a candidate against a job order. This is the "match/submit"
 * action referenced in the partnership plan — creates the placement
 * record that both the readiness dashboard and an employer-facing view
 * can track through status.
 */
/**
 * Records the outcome-stream records for a placement. Idempotent (a record id
 * already stored is skipped) and best-effort: a failure here is logged and
 * NEVER blocks or rolls back the placement itself.
 */
async function recordPlacementEvidence(placement) {
  if (!placementEvidenceEnabled() || !placement) return { recorded: 0, rejected: 0 };
  try {
    const out = PlacementEvidence.buildPlacementEvidence(placement);
    const database = await connect();
    const collection = database.collection(PLACEMENT_EVIDENCE_COLLECTION);
    let recorded = 0;
    for (const rec of out.records) {
      const existing = await collection.findOne({ placementEvidenceId: rec.placementEvidenceId });
      if (!existing) {
        await collection.insertOne({ ...rec, recordedAt: new Date().toISOString() });
        recorded += 1;
      }
    }
    return { recorded, rejected: out.rejected.length };
  } catch (err) {
    console.error('[staffing] placement evidence not recorded:', err.message);
    return { recorded: 0, rejected: 0, error: err.message };
  }
}

async function listPlacementEvidence({ candidateId, placementId, stage } = {}) {
  const database = await connect();
  const query = {};
  if (candidateId) query.candidateId = candidateId;
  if (placementId) query.placementId = placementId;
  if (stage) query.stage = stage;
  const records = await database
    .collection(PLACEMENT_EVIDENCE_COLLECTION)
    .find(query)
    .sort({ occurredAt: 1 })
    .toArray();
  return records;
}

function evaluatePlacementEligibility(candidate, { minimumReadiness = 70 } = {}) {
  if (!candidate) {
    return {
      eligible: false,
      reason: 'candidate-not-found',
    };
  }

  if (!candidate.candidateId) {
    return {
      eligible: false,
      reason: 'candidate-id-missing',
    };
  }

  if (candidate.isSampleData === true) {
    return {
      eligible: false,
      reason: 'sample-candidate',
    };
  }

  if (candidate.status !== 'ready_for_placement') {
    return {
      eligible: false,
      reason: 'candidate-not-ready',
      status: candidate.status,
    };
  }

  const readinessScore = Number(candidate.readinessScore);

  if (!Number.isFinite(readinessScore) || readinessScore < minimumReadiness) {
    return {
      eligible: false,
      reason: 'readiness-below-threshold',
      readinessScore: Number.isFinite(readinessScore) ? readinessScore : null,
      minimumReadiness,
    };
  }

  return {
    eligible: true,
    reason: 'eligible',
    readinessScore,
  };
}

// Phase 8H gate. When STAFFING_REQUIRE_COVERAGE=1, a candidate must also have
// evidence in at least N readiness dimensions (default 2, set by
// STAFFING_MIN_ASSESSED_DIMENSIONS), so one quiz cannot qualify anyone.
function coverageRequired() {
  return process.env.STAFFING_REQUIRE_COVERAGE === '1';
}
function requiredDimensions() {
  const n = parseInt(process.env.STAFFING_MIN_ASSESSED_DIMENSIONS, 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 2;
}
async function assessCoverage(candidateId) {
  const events = await candidateRegistry.listTrainingEvents(candidateId);
  const r = ReadinessModel.assessProfessionalReadiness(events);
  return { assessed: r.overall.assessedDimensions.length, required: requiredDimensions() };
}

async function submitCandidate({ candidateId, jobOrderId, payRate, annualHours, meta, matchResult, review }) {
  if (!candidateId) {
    throw new Error('candidateId is required');
  }

  const candidate = await candidateRegistry.getCandidate(candidateId);
  const eligibility = evaluatePlacementEligibility(candidate);
  if (eligibility.eligible && coverageRequired()) {
    const cov = await assessCoverage(candidateId);
    if (cov.assessed < cov.required) {
      eligibility.eligible = false;
      eligibility.reason = 'insufficient-coverage';
    }
  }

  if (!eligibility.eligible) {
    throw new Error(
      `Candidate is not eligible for placement: ${eligibility.reason}`
    );
  }

  const database = await connect();
  const jobOrder = await getJobOrder(jobOrderId);
  if (!jobOrder) throw new Error(`No job order found for jobOrderId ${jobOrderId}`);

  // Phase 8E: human-review gate. The review must be an approved human decision
  // bound to the exact match inputs (fingerprint) for THIS candidate.
  let humanReview = null;
  const gateProvided = matchResult != null || review != null;
  if (pipelineEnforced() || gateProvided) {
    const gate = Pipeline.evaluateSubmissionGate(matchResult, review);
    const reasons = gate.reasons.slice();
    if (matchResult && matchResult.candidateId && matchResult.candidateId !== candidateId) {
      reasons.push('match-candidate-mismatch');
    }
    if (reasons.length === 0) {
      humanReview = {
        decision: review.decision,
        reviewerId: review.reviewerId,
        reviewedAt: review.reviewedAt,
        reviewedFingerprint: review.reviewedFingerprint,
        matcherVersion: (matchResult.audit && matchResult.audit.matcherVersion) || null,
      };
    } else if (pipelineEnforced()) {
      throw new Error(`Submission blocked: human review required (${reasons.join(', ')})`);
    }
  }

  const now = new Date().toISOString();
  const placementId = genId('plc');

  const doc = {
    placementId,
    candidateId,
    jobOrderId,
    employerId: jobOrder.employerId,
    status: 'submitted',
    payRate: payRate != null ? Number(payRate) : jobOrder.payRate,
    annualHours: annualHours != null ? Number(annualHours) : null,
    statusHistory: [{ status: 'submitted', at: now }],
    humanReview,
    computedFee: null,
    meta: meta || {},
    createdAt: now,
    updatedAt: now,
  };

  await database.collection(PLACEMENTS_COLLECTION).insertOne(doc);
  const created = await getPlacement(placementId);
  await recordPlacementEvidence(created);
  return created;
}

async function updatePlacementStatus(placementId, status, { actorId } = {}) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const database = await connect();
  const placement = await getPlacement(placementId);
  if (!placement) throw new Error(`No placement found for placementId ${placementId}`);

  // Phase 8E: only legal stage transitions when enforcement is on.
  if (pipelineEnforced() && !Pipeline.canTransition(placement.status, status)) {
    throw new Error(`Illegal transition "${placement.status}" -> "${status}"`);
  }

  const now = new Date().toISOString();
  const historyEntry = actorId ? { status, at: now, actorId } : { status, at: now };
  const update = {
    status,
    updatedAt: now,
    statusHistory: [...(placement.statusHistory || []), historyEntry],
  };

  if (status === 'placed') {
    const jobOrder = await getJobOrder(placement.jobOrderId);
    update.computedFee = computeFee(jobOrder, placement);
    update.placedAt = now;
  }

  await database
    .collection(PLACEMENTS_COLLECTION)
    .updateOne({ placementId }, { $set: update });
  await recordPlacementAudit({ placement, to: status, actorId, at: now, historyIndex: update.statusHistory.length - 1 });

  // If the job order is now fully staffed, mark it filled. Simple count
  // against openings — doesn't try to guess partial-fill semantics.
  if (status === 'placed') {
    const jobOrder = await getJobOrder(placement.jobOrderId);
    if (jobOrder) {
      const placedCount = (
        await database
          .collection(PLACEMENTS_COLLECTION)
          .find({ jobOrderId: jobOrder.jobOrderId, status: 'placed' })
          .toArray()
      ).length;
      if (placedCount >= jobOrder.openings && jobOrder.status !== 'filled') {
        await database
          .collection(JOB_ORDERS_COLLECTION)
          .updateOne({ jobOrderId: jobOrder.jobOrderId }, { $set: { status: 'filled', updatedAt: now } });
      }
    }
  }

  const updated = await getPlacement(placementId);
  await recordPlacementEvidence(updated);
  return updated;
}

async function deletePlacement(placementId) {
  const database = await connect();
  const result = await database
    .collection(PLACEMENTS_COLLECTION)
    .deleteOne({ placementId });
  return result.deletedCount > 0;
}

// Phase 8G wiring. When STAFFING_PLACEMENT_SIGNALS=1, the placement_outcome
// stream can be read as aggregate workforce signals. Read-only: no writes,
// no scoring, and nothing feeds readiness.
const PlacementSignals = require('../html/js/career/tsm-placement-signals.js');
function placementSignalsEnabled() {
  return process.env.STAFFING_PLACEMENT_SIGNALS === '1';
}
async function getPlacementSignals() {
  const records = await listPlacementEvidence({});
  return PlacementSignals.buildPlacementSignals(records);
}

module.exports = {
  connect,
  // employers
  listEmployers,
  getEmployer,
  upsertEmployer,
  deleteEmployer,
  // job orders
  listJobOrders,
  getJobOrder,
  upsertJobOrder,
  deleteJobOrder,
  // placements
  listPlacements,
  getPlacement,
  submitCandidate,
  evaluatePlacementEligibility,
  updatePlacementStatus,
  recordPlacementEvidence,
  listPlacementEvidence,
  placementSignalsEnabled,
  getPlacementSignals,
  deletePlacement,
  computeFee,
  VALID_STATUSES,
};
