/**
 * upgrade-manager.js
 *
 * Plans and records pack version upgrades for a tenant. Produces a diff
 * of components changing between versions so an admin can review before
 * committing -- pairs naturally with your existing assert-guarded Python
 * apply-script discipline: this is the enterprise-customer-facing
 * equivalent of that same 'review before applying' habit.
 */

function planUpgrade(currentManifest, targetManifest) {
  const currentRefs = new Set(currentManifest.components.map((c) => c.ref));
  const targetRefs = new Set(targetManifest.components.map((c) => c.ref));

  const added = targetManifest.components.filter((c) => !currentRefs.has(c.ref));
  const removed = currentManifest.components.filter((c) => !targetRefs.has(c.ref));
  const unchanged = targetManifest.components.filter((c) => currentRefs.has(c.ref));

  return {
    packId: targetManifest.packId,
    fromVersion: currentManifest.version,
    toVersion: targetManifest.version,
    added: added,
    removed: removed,
    unchangedCount: unchanged.length,
    plannedAt: new Date().toISOString(),
  };
}

function recordUpgrade(tenantDeploymentStore, tenantId, upgradePlan) {
  const tenant = tenantDeploymentStore.getTenant(tenantId);
  if (!tenant) throw new Error('Unknown tenant: ' + tenantId);

  tenant.packs = tenant.packs.map(function (p) {
    if (p.packId === upgradePlan.packId) {
      return Object.assign({}, p, {
        version: upgradePlan.toVersion,
        previousVersion: upgradePlan.fromVersion,
        upgradedAt: new Date().toISOString(),
      });
    }
    return p;
  });

  return tenant;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { planUpgrade: planUpgrade, recordUpgrade: recordUpgrade };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.upgradeManager = { planUpgrade: planUpgrade, recordUpgrade: recordUpgrade };
}
