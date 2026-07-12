/**
 * pack-installer.js
 *
 * Simulates/executes installation of a pack into a target tenant context.
 * In this scaffold, 'installing' means resolving each component reference
 * and recording an install record -- the actual wiring into a live tenant
 * environment is the responsibility of Phase 45's deployment fabric, which
 * this module is designed to hand off to.
 */

function installPack(manifest, tenantId, opts) {
  opts = opts || {};
  const results = manifest.components.map(function (component) {
    return {
      type: component.type,
      ref: component.ref,
      status: 'resolved',
      installedAt: new Date().toISOString(),
    };
  });

  const installRecord = {
    tenantId: tenantId,
    packId: manifest.packId,
    packVersion: manifest.version,
    componentResults: results,
    installedAt: new Date().toISOString(),
    installedBy: opts.installedBy || 'system',
  };

  if (typeof TSM !== 'undefined' && TSM.relay && TSM.relay.write) {
    TSM.relay.write('SOLUTION_PACKAGING', { type: 'pack_installed', installRecord: installRecord });
  }

  return installRecord;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { installPack: installPack };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.installPack = installPack;
}
