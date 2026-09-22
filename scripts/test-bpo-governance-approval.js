'use strict';

const assert = require('assert');

const governance = require('../server/tsm-governance-engine');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed += 1;
    console.log('OK: ' + message);
  } else {
    failed += 1;
    console.error('FAIL: ' + message);
  }
}

const NOW = '2026-09-22T12:00:00.000Z';

console.log('== Phase 15.2 Governance Approval Regression ==');

// ------------------------------------------------------------
// Milestone transition
// ------------------------------------------------------------

ok(
  governance.MODE === 'observe',
  'milestone 1 observe mode remains active during approval rollout'
);

ok(
  governance.APPROVAL_ROLES.includes('admin')
    && governance.APPROVAL_ROLES.includes('manager')
    && !governance.APPROVAL_ROLES.includes('client')
    && !governance.APPROVAL_ROLES.includes('analyst'),
  'only privileged human roles may approve governed actions'
);

// ------------------------------------------------------------
// Build recommendation from actual Phase 15.1 engine
// ------------------------------------------------------------

const item = {
  caseId: 'gov-approval-1',
  vertical: 'bpo',
  status: 'open',
  priority: 'medium',
  dueDate: '2026-09-20T12:00:00.000Z',
  createdAt: '2026-09-10T12:00:00.000Z',
};

const recommendation = governance.evaluateCase(item, {
  extract: () => null,
  now: NOW,
  role: 'analyst',
});

ok(
  recommendation
    && recommendation.action === 'escalate'
    && recommendation.mode === 'observe',
  'governance recommendation remains in observe mode while approval is added'
);

// ------------------------------------------------------------
// Create approval
// ------------------------------------------------------------

const pending = governance.createApprovalRequest(
  recommendation,
  {
    caseId: item.caseId,
    requestedBy: 'analyst-1',
    requestedRole: 'analyst',
    now: NOW,
  }
);

ok(
  pending.approvalStatus === governance.APPROVAL_STATES.PENDING,
  'recommendation creates a pending approval'
);

ok(
  pending.approvalStatus !== governance.APPROVAL_STATES.APPROVED,
  'creating an approval request does not authorize execution'
);

ok(
  pending.caseId === item.caseId
    && pending.action === recommendation.action
    && pending.policyId === recommendation.policyId,
  'approval is bound to the original case, action, and policy'
);

// ------------------------------------------------------------
// Authorization
// ------------------------------------------------------------

const pendingGate = governance.canExecuteApprovedAction({
  approval: pending,
  caseId: item.caseId,
  action: 'escalate',
  now: NOW,
});

ok(
  pendingGate.allowed === false
    && pendingGate.reason === 'APPROVAL_PENDING',
  'pending approval cannot cross the execution gate'
);

assert.throws(
  () => governance.resolveApprovalRequest(
    pending,
    {
      approved: true,
      actor: 'analyst-1',
      role: 'analyst',
      now: NOW,
    }
  )
);

passed += 1;
console.log(
  'OK: analyst cannot approve a governed action'
);

// ------------------------------------------------------------
// Manager approval
// ------------------------------------------------------------

const approved = governance.resolveApprovalRequest(
  pending,
  {
    approved: true,
    actor: 'manager-1',
    role: 'manager',
    now: NOW,
  }
);

ok(
  approved.approvalStatus === governance.APPROVAL_STATES.APPROVED,
  'manager approval transitions pending -> approved'
);

ok(
  approved.approvedBy === 'manager-1'
    && approved.approvedRole === 'manager'
    && approved.approvedAt === NOW,
  'approval records the human approver and timestamp'
);

// ------------------------------------------------------------
// Final execution gate
// ------------------------------------------------------------

const allowed = governance.canExecuteApprovedAction({
  approval: approved,
  caseId: item.caseId,
  action: 'escalate',
  now: NOW,
});

ok(
  allowed.allowed === true
    && allowed.reason === 'APPROVAL_VALID',
  'approved action crosses the human approval gate'
);

// ------------------------------------------------------------
// Wrong case / wrong action protection
// ------------------------------------------------------------

const wrongCase = governance.canExecuteApprovedAction({
  approval: approved,
  caseId: 'wrong-case',
  action: 'escalate',
  now: NOW,
});

ok(
  wrongCase.allowed === false
    && wrongCase.reason === 'CASE_MISMATCH',
  'approval cannot be reused for another case'
);

const wrongAction = governance.canExecuteApprovedAction({
  approval: approved,
  caseId: item.caseId,
  action: 'priority',
  now: NOW,
});

ok(
  wrongAction.allowed === false
    && wrongAction.reason === 'ACTION_MISMATCH',
  'approval cannot be reused for another action'
);

// ------------------------------------------------------------
// Rejection path
// ------------------------------------------------------------

const pendingReject = governance.createApprovalRequest(
  recommendation,
  {
    caseId: 'gov-approval-2',
    requestedBy: 'analyst-2',
    requestedRole: 'analyst',
    now: NOW,
  }
);

const rejected = governance.resolveApprovalRequest(
  pendingReject,
  {
    approved: false,
    actor: 'manager-2',
    role: 'manager',
    reason: 'Insufficient supporting evidence.',
    now: NOW,
  }
);

ok(
  rejected.approvalStatus === governance.APPROVAL_STATES.REJECTED,
  'manager rejection transitions pending -> rejected'
);

ok(
  rejected.rejectionReason === 'Insufficient supporting evidence.',
  'rejection reason is retained'
);

// ------------------------------------------------------------
// Rejected action cannot execute
// ------------------------------------------------------------

const rejectedGate = governance.canExecuteApprovedAction({
  approval: rejected,
  caseId: 'gov-approval-2',
  action: 'escalate',
  now: NOW,
});

ok(
  rejectedGate.allowed === false
    && rejectedGate.reason === 'APPROVAL_REJECTED',
  'rejected action cannot cross the execution gate'
);

// ------------------------------------------------------------
// Expiration
// ------------------------------------------------------------

const expiring = governance.createApprovalRequest(
  recommendation,
  {
    caseId: 'gov-approval-3',
    requestedBy: 'analyst-3',
    requestedRole: 'analyst',
    now: NOW,
    expiresAt: '2026-09-22T13:00:00.000Z',
  }
);

const expired = governance.resolveApprovalRequest(
  expiring,
  {
    approved: true,
    actor: 'manager-3',
    role: 'manager',
    now: '2026-09-22T14:00:00.000Z',
  }
);

ok(
  expired.approvalStatus === governance.APPROVAL_STATES.EXPIRED,
  'expired approval cannot be approved'
);

const expiredGate = governance.canExecuteApprovedAction({
  approval: expired,
  caseId: 'gov-approval-3',
  action: 'escalate',
  now: '2026-09-22T14:00:00.000Z',
});

ok(
  expiredGate.allowed === false,
  'expired approval cannot cross execution gate'
);

// ------------------------------------------------------------
// Double resolution
// ------------------------------------------------------------

assert.throws(
  () => governance.resolveApprovalRequest(
    approved,
    {
      approved: false,
      actor: 'manager-2',
      role: 'manager',
      now: NOW,
    }
  )
);

passed += 1;
console.log(
  'OK: an already-resolved approval cannot be resolved again'
);

// ------------------------------------------------------------
// No mutation
// ------------------------------------------------------------

const original = JSON.stringify(pending);

governance.canExecuteApprovedAction({
  approval: pending,
  caseId: item.caseId,
  action: 'escalate',
  now: NOW,
});

ok(
  JSON.stringify(pending) === original,
  'approval checks do not mutate the approval record'
);

console.log(
  '\nPHASE 15.2 APPROVAL REGRESSION: ' +
  passed +
  ' passed, ' +
  failed +
  ' failed'
);

process.exit(failed ? 1 : 0);
