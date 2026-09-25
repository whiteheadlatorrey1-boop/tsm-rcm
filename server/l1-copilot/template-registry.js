'use strict';

/**
 * Deterministic Template Engine (Phase 2)
 *
 * Registry of operational templates for the Asset Lifecycle panel
 * (Phase 3 UI) and the /api/l1-copilot/asset-action/* routes.
 *
 * Rule: the system substitutes verified data the technician supplied —
 * it never invents facts. If a required field is missing, renderTemplate
 * throws MISSING_REQUIRED_FIELDS instead of generating a partial action.
 *
 * This module is pure and holds no ServiceNow/network code.
 */

// Every field the templates below can reference. `label` is the
// human-readable line prefix used in the generated work note.
const FIELD_LABELS = Object.freeze({
  INCIDENT_NUMBER: 'Incident',
  ASSET_TAG: 'Asset Tag',
  MANUFACTURER: 'Manufacturer',
  MODEL: 'Model',
  ASSIGNED_USER: 'Assigned User',
  TECHNICIAN: 'Technician',
  RETURN_REASON: 'Reason',
  TECHNICIAN_NOTES: 'Notes'
});

function field(name) {
  return { name, label: FIELD_LABELS[name] || name };
}

const TEMPLATES = Object.freeze({
  RETURN_TO_INVENTORY: {
    id: 'RETURN_TO_INVENTORY',
    label: 'Return to Inventory',
    heading: 'RETURN TO INVENTORY',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'RETURN_REASON'],
    optional: ['MANUFACTURER', 'MODEL', 'ASSIGNED_USER', 'TECHNICIAN_NOTES']
  },
  DEVICE_REPLACEMENT: {
    id: 'DEVICE_REPLACEMENT',
    label: 'Device Replacement',
    heading: 'DEVICE REPLACEMENT',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'MANUFACTURER', 'MODEL', 'ASSIGNED_USER', 'TECHNICIAN'],
    optional: ['TECHNICIAN_NOTES']
  },
  HARDWARE_SWAP: {
    id: 'HARDWARE_SWAP',
    label: 'Hardware Swap',
    heading: 'HARDWARE SWAP',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'MANUFACTURER', 'MODEL', 'TECHNICIAN'],
    optional: ['ASSIGNED_USER', 'TECHNICIAN_NOTES']
  },
  LOANER_RETURN: {
    id: 'LOANER_RETURN',
    label: 'Loaner Return',
    heading: 'LOANER RETURN',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'ASSIGNED_USER', 'TECHNICIAN'],
    optional: ['MANUFACTURER', 'MODEL', 'RETURN_REASON', 'TECHNICIAN_NOTES']
  },
  WARRANTY_DEPOT_RETURN: {
    id: 'WARRANTY_DEPOT_RETURN',
    label: 'Warranty Depot Return',
    heading: 'WARRANTY DEPOT RETURN',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'MANUFACTURER', 'MODEL', 'TECHNICIAN', 'RETURN_REASON'],
    optional: ['ASSIGNED_USER', 'TECHNICIAN_NOTES']
  },
  DEVICE_REASSIGNMENT: {
    id: 'DEVICE_REASSIGNMENT',
    label: 'Device Reassignment',
    heading: 'DEVICE REASSIGNMENT',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'ASSIGNED_USER', 'TECHNICIAN'],
    optional: ['MANUFACTURER', 'MODEL', 'TECHNICIAN_NOTES']
  }
});

/**
 * listTemplates() -> [{ id, label, required, optional }]
 * Consumed directly by GET /api/l1-copilot/asset-action/templates and by
 * the Asset Lifecycle panel to build the action dropdown + field list.
 */
function listTemplates() {
  return Object.values(TEMPLATES).map(t => ({
    id: t.id,
    label: t.label,
    required: [...t.required],
    optional: [...t.optional]
  }));
}

function getTemplate(templateId) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) {
    const err = new Error(`Unknown template "${templateId}". Must be one of: ${Object.keys(TEMPLATES).join(', ')}`);
    err.code = 'UNKNOWN_TEMPLATE';
    throw err;
  }
  return tpl;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * renderTemplate(templateId, context) -> { templateId, heading, fields, body }
 *
 * context: flat object keyed by field name (e.g. { INCIDENT_NUMBER: 'INC0012345', ... }).
 * Only fields the template declares (required + optional) are read — nothing
 * outside the registry's controlled variable list is substituted.
 *
 * Throws:
 *   UNKNOWN_TEMPLATE            — templateId not in the registry
 *   MISSING_REQUIRED_FIELDS     — err.missing is the list of absent/blank required fields
 */
function renderTemplate(templateId, context = {}) {
  const tpl = getTemplate(templateId);
  const ctx = context || {};

  const missing = tpl.required.filter(name => {
    const v = clean(ctx[name]);
    return v === undefined || v === null || v === '';
  });

  if (missing.length > 0) {
    const err = new Error(
      `Cannot generate ${tpl.label}: missing required field(s): ${missing.join(', ')}`
    );
    err.code = 'MISSING_REQUIRED_FIELDS';
    err.missing = missing;
    throw err;
  }

  const lines = [`[${tpl.heading}]`];
  for (const name of [...tpl.required, ...tpl.optional]) {
    const v = clean(ctx[name]);
    if (v === undefined || v === null || v === '') continue; // optional + absent -> omit line
    lines.push(`${field(name).label}: ${v}`);
  }

  return {
    templateId: tpl.id,
    heading: tpl.heading,
    fields: [...tpl.required, ...tpl.optional],
    body: lines.join('\n')
  };
}

module.exports = {
  listTemplates,
  renderTemplate
};
