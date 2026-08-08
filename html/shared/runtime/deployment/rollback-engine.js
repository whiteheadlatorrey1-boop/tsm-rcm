/**
 * rollback-engine.js
 *
 * Keeps a short history of prior pack versions per tenant so an upgrade
 * that goes wrong can be reverted without re-deriving the previous state
 * from scratch. Deliberately simple (last-N snapshots) rather than a full
 * version-control system -- this is meant to cover 'the last upgrade
 * broke something, put it back' not long-term history (that's the audit
 * trail's job, see Phase 42).
 */

const MAX_SNAPSHOTS_PER_TENANT = 5;

class RollbackEngine {
  constructor() {
    this._snapshots = {}; // tenantId -> [{ takenAt, packs }]
  }

  snapshot(tenantId, tenantRecord) {
    if (!this._snapshots[tenantId]) this._snapshots[tenantId] = [];
    this._snapshots[tenantId].push({
      takenAt: new Date().toISOString(),
      packs: JSON.parse(JSON.stringify(tenantRecord.packs)),
    });
    if (this._snapshots[tenantId].length > MAX_SNAPSHOTS_PER_TENANT) {
      this._snapshots[tenantId] = this._snapshots[tenantId].slice(-MAX_SNAPSHOTS_PER_TENANT);
    }
    return this._snapshots[tenantId][this._snapshots[tenantId].length - 1];
  }

  listSnapshots(tenantId) {
    return this._snapshots[tenantId] || [];
  }

  rollbackTo(tenantDeploymentStore, tenantId, snapshotIndex) {
    const snapshots = this._snapshots[tenantId] || [];
    const target = snapshots[snapshotIndex];
    if (!target) throw new Error('No snapshot at index ' + snapshotIndex + ' for tenant ' + tenantId);

    const tenant = tenantDeploymentStore.getTenant(tenantId);
    if (!tenant) throw new Error('Unknown tenant: ' + tenantId);

    tenant.packs = JSON.parse(JSON.stringify(target.packs));
    tenant.rolledBackAt = new Date().toISOString();
    tenant.rolledBackToSnapshot = target.takenAt;

    return tenant;
  }
}

const rollbackEngine = new RollbackEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RollbackEngine: RollbackEngine, rollbackEngine: rollbackEngine };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.rollbackEngine = rollbackEngine;
}
