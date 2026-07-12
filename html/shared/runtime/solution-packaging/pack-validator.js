/**
 * pack-validator.js
 *
 * Pre-install validation beyond basic manifest shape: checks that every
 * referenced component actually exists in the provided catalog (e.g. a
 * registry of known agents/rules/dashboards), and flags version
 * mismatches. Intended to run in CI (alongside parse-gate.yml) before a
 * pack is published to the marketplace.
 */

function validatePackAgainstCatalog(manifest, catalog) {
  catalog = catalog || {};
  const missing = [];
  const versionWarnings = [];

  manifest.components.forEach(function (component) {
    const catalogEntry = catalog[component.ref];
    if (!catalogEntry) {
      missing.push({ type: component.type, ref: component.ref });
      return;
    }
    if (component.meta && component.meta.expectedVersion && catalogEntry.version) {
      if (component.meta.expectedVersion !== catalogEntry.version) {
        versionWarnings.push({
          ref: component.ref,
          expected: component.meta.expectedVersion,
          actual: catalogEntry.version,
        });
      }
    }
  });

  return {
    packId: manifest.packId,
    valid: missing.length === 0,
    missingComponents: missing,
    versionWarnings: versionWarnings,
    checkedAt: new Date().toISOString(),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validatePackAgainstCatalog: validatePackAgainstCatalog };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.validatePackAgainstCatalog = validatePackAgainstCatalog;
}
