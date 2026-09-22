'use strict';

/**
 * TSM Governance Engine (Phase 15) -- a policy layer that watches cases
 * normalised by the Phase 14 case engine and recommends safe actions.
 *
 * MILESTONE 1 (this file, live now): OBSERVE. evaluateCase() computes at
 * most one recommendation per case and validates it against planAction()
 * before returning it. Nothing here mutates a case, calls planAction for
 * real, or writes anything. A human takes every action.
 *
 * Planned rollout (documented so the roadmap survives code review even
 * though only Milestone 1 is live):
 *   1. observe    (LIVE)    recommend only; validated; never applied.
 *   2. suggest    (planned) surfaced as one-click accept/dismiss in the UI.
 *   3. auto-safe  (planned) a narrow, explicitly-approved policy subset may
 *                           apply itself -- still audited, with a kill
 *                           switch and per-policy opt-in.
 *   4. tunable    (planned) thresholds/policies configurable per client
 *                           without a code change.
 *
 * Governance never invents a new action: every policy's `action` must
 * already exist in tsm-case-engine's ACTIONS, and every recommendation is
 * checked against planAction() before it is returned, so a policy can never
 * suggest something the engine itself would reject.
 *
 * Pure module: no I/O, same discipline as tsm-case-engine.
 */

const engine = require('./tsm-case-engine');

// Milestone 1. Deliberately not read from env/config -- advancing the mode
// is a code change + review, not a runtime toggle.
const MODE = 'observe';

const ROLLOUT = [
  { milestone: 1, mode: 'observe', status: 'live',
    summary: 'Recommend only; every recommendation validated against planAction; nothing applied automatically.' },
  { milestone: 2, mode: 'suggest', status: 'planned',
    summary: 'Recommendations surfaced in the UI as one-click actions for a human to accept or dismiss.' },
  { milestone: 3, mode: 'auto-safe', status: 'planned',
    summary: 'A narrow, explicitly-approved subset of policies may apply themselves -- audited, with a kill switch and per-policy opt-in.' },
  { milestone: 4, mode: 'tunable', status: 'planned',
    summary: 'Policy thresholds configurable per client without a code change.' },
];

// Exposure above which an unescalated case below "high" priority is
// recommended for a priority bump. A governance judgment call, not an
// engine fact, so it lives here rather than in tsm-case-engine.
const HIGH_EXPOSURE_THRESHOLD = 10000;

// System actor used only to VALIDATE a recommendation against planAction.
// Governance itself applies nothing in Milestone 1 -- this role is chosen
// to be broad enough (admin) that a recommendation's validity never depends
// on which role happened to be viewing the case, which is also why
// evaluateCase overrides whatever role/actor the caller passes in ctx.
const VALIDATION_ROLE = 'admin';
const VALIDATION_ACTOR = 'governance-engine';

// Human roles allowed to approve a governed recommendation.
// Client/analyst viewers may see recommendations but cannot approve them.
const APPROVAL_ROLES = Object.freeze([
  'admin',
  'manager',
]);

const APPROVAL_STATES = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
});

// ── Policies ─────────────────────────────────────────────────────────────
// Order matters: for a given case, the first policy that matches wins and
// later ones are skipped for that pass -- a case gets at most one
// recommendation per evaluateCase() call.
const POLICIES = [
  {
    id: 'overdue-unescalated-escalate',
    action: 'escalate',
    matches(nc) {
      return nc.sla.overdue === true && nc.escalated === false;
    },
    build(nc) {
      const days = nc.sla.daysOverdue;
      return {
        action: 'escalate',
        params: {
          reason: 'Policy: case is ' + days + ' day' + (days === 1 ? '' : 's') + ' overdue and not yet escalated.',
        },
      };
    },
  },
  {
    id: 'high-exposure-raise-priority',
    action: 'priority',
    matches(nc) {
      return nc.exposure !== null
        && nc.exposure > HIGH_EXPOSURE_THRESHOLD
        && engine.PRIORITY_RANK[nc.priority] < engine.PRIORITY_RANK.high;
    },
    build(nc) {
      return {
        action: 'priority',
        params: {
          priority: 'high',
          reason: 'Policy: exposure $' + nc.exposure + ' exceeds the $' + HIGH_EXPOSURE_THRESHOLD + ' threshold.',
        },
      };
    },
  },
];

/**
 * Evaluate one work item and return at most one recommendation, or null.
 * ctx must carry ctx.extract (the ledger's structured-case extractor), the
 * same contract normalizeCase requires. ctx.now is optional (defaults to
 * the current time, same as normalizeCase). Any ctx.role/ctx.actor the
 * caller passes is ignored for governance's own purposes -- see
 * VALIDATION_ROLE above.
 */
function evaluateCase(item, ctx) {
  if (!item || typeof item !== 'object') throw engine.engineError('validation', 'evaluateCase requires an item');
  const now = (ctx && ctx.now) || new Date().toISOString();
  const nctx = Object.assign({}, ctx, { role: VALIDATION_ROLE, now });
  const nc = engine.normalizeCase(item, nctx);

  if (nc.state === 'closed') return null;

  for (const policy of POLICIES) {
    if (!policy.matches(nc)) continue;
    const built = policy.build(nc);
    try {
      engine.planAction(built.action, item, built.params, {
        role: VALIDATION_ROLE,
        actor: VALIDATION_ACTOR,
        now,
      });
    } catch (e) {
      // A policy that would fail planAction's own rules recommends nothing
      // rather than surfacing something the engine would reject.
      continue;
    }
    return {
      policyId: policy.id,
      action: built.action,
      params: built.params,
      mode: MODE,
    };
  }
  return null;
}


/**
 * Create a human-approval record for a governance recommendation.
 *
 * This function does NOT execute the action.
 * It creates a deterministic approval boundary between
 * recommendation and execution.
 */
function createApprovalRequest(recommendation, {
  caseId,
  requestedBy,
  requestedRole,
  now,
  expiresAt,
} = {}) {
  if (!recommendation || typeof recommendation !== 'object') {
    throw engine.engineError(
      'validation',
      'createApprovalRequest requires a recommendation'
    );
  }

  if (!recommendation.action) {
    throw engine.engineError(
      'validation',
      'approval requires a recommendation action'
    );
  }

  if (!caseId) {
    throw engine.engineError(
      'validation',
      'approval requires caseId'
    );
  }

  if (!requestedBy) {
    throw engine.engineError(
      'validation',
      'approval requires requestedBy'
    );
  }

  const requestedAt = now || new Date().toISOString();

  return Object.freeze({
    approvalId:
      'APR-' +
      caseId +
      '-' +
      recommendation.action +
      '-' +
      requestedAt.replace(/[^0-9A-Z]/gi, ''),
    caseId,
    policyId: recommendation.policyId,
    action: recommendation.action,
    params: recommendation.params,
    mode: MODE,
    requestedBy,
    requestedRole: requestedRole || null,
    requestedAt,
    expiresAt: expiresAt || null,
    approvalStatus: APPROVAL_STATES.PENDING,
    approvedBy: null,
    approvedRole: null,
    approvedAt: null,
    rejectionReason: null,
  });
}

/**
 * Resolve a pending approval.
 *
 * Approval is intentionally separate from execution.
 * This function changes only the approval record.
 */
function resolveApprovalRequest(approval, {
  approved,
  actor,
  role,
  reason,
  now,
} = {}) {
  if (!approval || typeof approval !== 'object') {
    throw engine.engineError(
      'validation',
      'resolveApprovalRequest requires approval'
    );
  }

  if (!actor) {
    throw engine.engineError(
      'authorization',
      'approval actor is required'
    );
  }

  if (!APPROVAL_ROLES.includes(role)) {
    throw engine.engineError(
      'authorization',
      'role is not authorized to approve governed actions'
    );
  }

  if (approval.approvalStatus !== APPROVAL_STATES.PENDING) {
    throw engine.engineError(
      'state',
      'approval is no longer pending'
    );
  }

  const resolvedAt = now || new Date().toISOString();

  if (
    approval.expiresAt &&
    resolvedAt > approval.expiresAt
  ) {
    return Object.freeze({
      ...approval,
      approvalStatus: APPROVAL_STATES.EXPIRED,
      approvedBy: null,
      approvedRole: null,
      approvedAt: null,
      rejectionReason: 'Approval request expired.',
      resolvedAt,
      resolvedBy: actor,
      resolvedRole: role,
    });
  }

  if (approved === true) {
    return Object.freeze({
      ...approval,
      approvalStatus: APPROVAL_STATES.APPROVED,
      approvedBy: actor,
      approvedRole: role,
      approvedAt: resolvedAt,
      resolvedAt,
      resolvedBy: actor,
      resolvedRole: role,
      rejectionReason: null,
    });
  }

  return Object.freeze({
    ...approval,
    approvalStatus: APPROVAL_STATES.REJECTED,
    approvedBy: null,
    approvedRole: null,
    approvedAt: null,
    rejectionReason:
      reason || 'Approval rejected by authorized reviewer.',
    resolvedAt,
    resolvedBy: actor,
    resolvedRole: role,
  });
}

/**
 * Final safety gate before an executor is ever allowed to run.
 *
 * Phase 15.2 does not execute anything. It only determines whether
 * an approved recommendation has crossed the human-approval boundary.
 */
function canExecuteApprovedAction({
  approval,
  caseId,
  action,
  now,
} = {}) {
  if (!approval) {
    return {
      allowed: false,
      reason: 'APPROVAL_REQUIRED',
    };
  }

  if (approval.caseId !== caseId) {
    return {
      allowed: false,
      reason: 'CASE_MISMATCH',
    };
  }

  if (approval.action !== action) {
    return {
      allowed: false,
      reason: 'ACTION_MISMATCH',
    };
  }

  if (approval.approvalStatus !== APPROVAL_STATES.APPROVED) {
    return {
      allowed: false,
      reason: 'APPROVAL_' + approval.approvalStatus,
    };
  }

  const checkTime = now || new Date().toISOString();

  if (
    approval.expiresAt &&
    checkTime > approval.expiresAt
  ) {
    return {
      allowed: false,
      reason: 'APPROVAL_EXPIRED',
    };
  }

  return {
    allowed: true,
    reason: 'APPROVAL_VALID',
  };
}


function describePolicies() {
  return POLICIES.map(p => ({ id: p.id, action: p.action }));
}

module.exports = {
  MODE,
  ROLLOUT,
  HIGH_EXPOSURE_THRESHOLD,
  describePolicies,
  evaluateCase,
  APPROVAL_ROLES,
  APPROVAL_STATES,
  createApprovalRequest,
  resolveApprovalRequest,
  canExecuteApprovedAction,
};
