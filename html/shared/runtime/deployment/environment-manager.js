/**
 * environment-manager.js
 *
 * Manages named environment tiers per tenant (e.g. sandbox / staging /
 * production) so a prospect like Honeywell can be handed a sandbox with
 * demo data while a paying customer runs production with real data --
 * without those two contexts ever mixing state.
 */

const TIERS = ['sandbox', 'staging', 'production'];

function createEnvironment(tenantId, tier, opts) {
  if (TIERS.indexOf(tier) === -1) {
    throw new Error('Unknown environment tier: ' + tier + '. Expected one of: ' + TIERS.join(', '));
  }
  opts = opts || {};
  return {
    tenantId: tenantId,
    tier: tier,
    dataMode: opts.dataMode || (tier === 'production' ? 'live' : 'demo'),
    namespace: tenantId + ':' + tier,
    createdAt: new Date().toISOString(),
  };
}

function isPromotable(fromTier, toTier) {
  const order = { sandbox: 0, staging: 1, production: 2 };
  if (!(fromTier in order) || !(toTier in order)) return false;
  return order[toTier] === order[fromTier] + 1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TIERS: TIERS, createEnvironment: createEnvironment, isPromotable: isPromotable };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.environmentManager = { TIERS: TIERS, createEnvironment: createEnvironment, isPromotable: isPromotable };
}
