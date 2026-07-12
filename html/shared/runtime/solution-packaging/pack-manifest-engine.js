/**
 * pack-manifest-engine.js
 *
 * Defines and validates the Solution Pack manifest schema. A pack is a
 * declarative bundle of the pieces a vertical deployment needs -- it does
 * not contain the actual engine code, only references to it, so packs
 * stay lightweight and versioned independently of the runtime itself.
 */

const REQUIRED_FIELDS = ['packId', 'name', 'vertical', 'version', 'components'];
const COMPONENT_TYPES = ['agent', 'rule', 'policy', 'workflowTemplate', 'dashboard', 'connector'];

function createManifest(input) {
  const manifest = {
    packId: input.packId,
    name: input.name,
    vertical: input.vertical,
    version: input.version || '1.0.0',
    description: input.description || '',
    components: input.components || [],
    createdAt: new Date().toISOString(),
  };
  return manifest;
}

function validateManifest(manifest) {
  const errors = [];

  REQUIRED_FIELDS.forEach(function (field) {
    if (!manifest || manifest[field] === undefined || manifest[field] === null) {
      errors.push('Missing required field: ' + field);
    }
  });

  if (manifest && Array.isArray(manifest.components)) {
    manifest.components.forEach(function (c, idx) {
      if (!c.type || COMPONENT_TYPES.indexOf(c.type) === -1) {
        errors.push('components[' + idx + '].type must be one of: ' + COMPONENT_TYPES.join(', '));
      }
      if (!c.ref) {
        errors.push('components[' + idx + '].ref is required (path or id of the referenced artifact)');
      }
    });
  } else if (manifest) {
    errors.push('components must be an array');
  }

  return { valid: errors.length === 0, errors: errors };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REQUIRED_FIELDS: REQUIRED_FIELDS, COMPONENT_TYPES: COMPONENT_TYPES, createManifest: createManifest, validateManifest: validateManifest };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.packManifest = { createManifest: createManifest, validateManifest: validateManifest };
}
