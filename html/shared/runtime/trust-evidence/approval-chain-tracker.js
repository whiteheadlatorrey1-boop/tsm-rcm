/**
 * approval-chain-tracker.js
 *
 * Tracks required-approval decisions (e.g. high-risk denials, large claims,
 * contract exceptions) from "pending" through "approved/rejected". Sits on
 * top of evidence-ledger.attachApproval so approvals are always evidence-
 * linked rather than tracked separately.
 */

class ApprovalChainTracker {
  constructor(evidenceLedger) {
    this.evidenceLedger = evidenceLedger;
    this._pending = new Map(); // recordId -> { requiredRole, requestedAt, status }
  }

  requireApproval(recordId, opts) {
    const entry = {
      requiredRole: opts.requiredRole,
      reason: opts.reason,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    this._pending.set(recordId, entry);
    return entry;
  }

  approve(recordId, opts) {
    const pending = this._pending.get(recordId);
    if (pending) pending.status = 'approved';

    return this.evidenceLedger.attachApproval(recordId, {
      status: 'approved',
      approver: opts.approver,
      role: opts.role,
      notes: opts.notes || '',
    });
  }

  reject(recordId, opts) {
    const pending = this._pending.get(recordId);
    if (pending) pending.status = 'rejected';

    return this.evidenceLedger.attachApproval(recordId, {
      status: 'rejected',
      approver: opts.approver,
      role: opts.role,
      notes: opts.notes || '',
    });
  }

  pendingApprovals() {
    const out = [];
    this._pending.forEach(function (v, recordId) {
      if (v.status === 'pending') {
        out.push(Object.assign({ recordId: recordId }, v));
      }
    });
    return out;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApprovalChainTracker: ApprovalChainTracker };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.ApprovalChainTracker = ApprovalChainTracker;
}
