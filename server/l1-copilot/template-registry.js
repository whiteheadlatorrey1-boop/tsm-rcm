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
  TECHNICIAN_NOTES: 'Notes',
  WARRANTY_STATUS: 'Warranty Status',
  CONDITION: 'Condition',
  RECOMMENDATION_REASONS: 'L1 Recommendation Basis',
  APPROVER: 'Approver',
  APPROVAL_REFERENCE: 'Approval Reference',
  SANITIZATION_METHOD: 'Sanitization Method',
  SANITIZATION_VERIFIED_BY: 'Sanitization Verified By',
  DISPOSITION_METHOD: 'Disposition Method',
  DISPOSITION_REFERENCE: 'Disposition Reference',
  LOSS_CLASSIFICATION: 'Loss Classification',
  LOSS_DATE: 'Date Lost/Stolen',
  LAST_KNOWN_LOCATION: 'Last Known Location',
  LOSS_CIRCUMSTANCES: 'Circumstances',
  POLICE_REPORT_REFERENCE: 'Police Report Reference',
  ESCALATED_TO: 'Escalated To',
  SECURITY_REFERENCE: 'Security Reference',
  SECURITY_ACTION: 'Security Action',
  SECURITY_ACTOR: 'Security Action Performed By',
  SECURITY_VERIFIED_BY: 'Security Action Verified By',
  RECONCILED_STATUS: 'CMDB Status Recorded',
  RECONCILIATION_REFERENCE: 'Reconciliation Reference'
});

// Value gates: presence alone is not enough for these fields. Evaluated in
// renderTemplate, so preview, confirm and execute all enforce them.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const GATES = Object.freeze({
  LOSS_CLASSIFICATION: {
    message: 'Loss classification must be LOST or STOLEN.',
    test: v => ['LOST', 'STOLEN'].includes(String(v).trim().toUpperCase())
  },
  LOSS_DATE: {
    message: 'Date lost/stolen must be a real date in YYYY-MM-DD format, not in the future.',
    test: (v, now) => {
      const d = String(v).trim();
      if (!ISO_DATE.test(d)) return false;
      const t = Date.parse(d + 'T00:00:00Z');
      if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== d) return false;
      return t <= Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    }
  }
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
  // Out-of-warranty disposition: four RECORD templates, one per governed stage.
  // Each records what a named human did or decided; required fields force the
  // approver / verifier / reference to be supplied, never inferred.
  DISPOSITION_RECOMMENDATION: {
    id: 'DISPOSITION_RECOMMENDATION',
    label: 'Disposition Recommendation (pending approval)',
    heading: 'DISPOSITION RECOMMENDATION - PENDING APPROVAL',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'WARRANTY_STATUS', 'CONDITION', 'RECOMMENDATION_REASONS'],
    optional: ['MANUFACTURER', 'MODEL', 'ASSIGNED_USER', 'TECHNICIAN_NOTES']
  },
  DISPOSITION_APPROVAL: {
    id: 'DISPOSITION_APPROVAL',
    label: 'Disposition Approval Record',
    heading: 'DISPOSITION APPROVAL RECORD',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'APPROVER', 'APPROVAL_REFERENCE'],
    optional: ['TECHNICIAN_NOTES']
  },
  DISPOSITION_SANITIZATION: {
    id: 'DISPOSITION_SANITIZATION',
    label: 'Disposition Sanitization Record',
    heading: 'DISPOSITION SANITIZATION RECORD',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'SANITIZATION_METHOD', 'SANITIZATION_VERIFIED_BY'],
    optional: ['TECHNICIAN_NOTES']
  },
  DISPOSITION_COMPLETION: {
    id: 'DISPOSITION_COMPLETION',
    label: 'Disposition Completion Record',
    heading: 'DISPOSITION COMPLETION RECORD',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'DISPOSITION_METHOD', 'DISPOSITION_REFERENCE'],
    optional: ['TECHNICIAN_NOTES']
  },
  // Lost/stolen asset: four RECORD templates, one per governed stage. L1 records
  // what named humans (reporting user, security team) did; it never performs the
  // remote lock/wipe/account-disable itself.
  LOST_STOLEN_REPORT: {
    id: 'LOST_STOLEN_REPORT',
    label: 'Lost/Stolen Report',
    heading: 'LOST/STOLEN REPORT',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'ASSIGNED_USER', 'LOSS_CLASSIFICATION', 'LOSS_DATE', 'LAST_KNOWN_LOCATION'],
    optional: ['MANUFACTURER', 'MODEL', 'LOSS_CIRCUMSTANCES', 'POLICE_REPORT_REFERENCE', 'TECHNICIAN_NOTES'],
    gates: ['LOSS_CLASSIFICATION', 'LOSS_DATE']
  },
  LOST_STOLEN_ESCALATION: {
    id: 'LOST_STOLEN_ESCALATION',
    label: 'Lost/Stolen Security Escalation Record',
    heading: 'LOST/STOLEN SECURITY ESCALATION RECORD',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'ESCALATED_TO', 'SECURITY_REFERENCE'],
    optional: ['TECHNICIAN_NOTES']
  },
  LOST_STOLEN_SECURITY_ACTION: {
    id: 'LOST_STOLEN_SECURITY_ACTION',
    label: 'Lost/Stolen Security Action Record',
    heading: 'LOST/STOLEN SECURITY ACTION RECORD',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'SECURITY_ACTION', 'SECURITY_ACTOR', 'SECURITY_VERIFIED_BY'],
    optional: ['SECURITY_REFERENCE', 'TECHNICIAN_NOTES']
  },
  LOST_STOLEN_RECONCILED: {
    id: 'LOST_STOLEN_RECONCILED',
    label: 'Lost/Stolen CMDB Reconciliation Record',
    heading: 'LOST/STOLEN CMDB RECONCILIATION RECORD',
    required: ['INCIDENT_NUMBER', 'ASSET_TAG', 'TECHNICIAN', 'RECONCILED_STATUS', 'RECONCILIATION_REFERENCE'],
    optional: ['TECHNICIAN_NOTES']
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
function renderTemplate(templateId, context = {}, opts = {}) {
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

  const now = opts && opts.now instanceof Date ? opts.now : new Date();
  const failedGates = (tpl.gates || []).filter(name => !GATES[name].test(clean(ctx[name]), now));
  if (failedGates.length > 0) {
    const err = new Error(
      `Cannot generate ${tpl.label}: ${failedGates.map(n => GATES[n].message).join(' ')}`
    );
    err.code = 'GATE_NOT_SATISFIED';
    err.failedGates = failedGates;
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
