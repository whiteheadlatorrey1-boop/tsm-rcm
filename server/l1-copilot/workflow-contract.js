'use strict';

/**
 * TSM L1 — WORKFLOW CONTRACT
 *
 * Defines the operational contract for each L1 workflow without performing
 * ServiceNow writes or changing ticket state.
 *
 *   INPUT -> READ / RECONCILE -> ASSESS -> REQUIRED EVIDENCE
 *         -> HUMAN / GOVERNANCE GATES -> CONTROLLED ACTION
 *         -> VERIFY -> CLOSURE READINESS
 *
 * This module is intentionally pure.
 */

const WORKFLOW_IDS = Object.freeze([
  'ONBOARDING',
  'OFFBOARDING',
  'FOOT_MOVE',
  'HARDWARE',
  'HARDWARE_SWAP',
  'INCIDENT',
  'LOANER',
  'LOANER_RETURN',
  'ASSET_RECOVERY',
  'WARRANTY_DEPOT_RETURN',
  'DISPOSITION',
  'LOST_STOLEN',
  'SOFTWARE_FULFILLMENT'
]);

const GATES = Object.freeze({
  READ: 'READ',
  RECONCILE: 'RECONCILE',
  ASSESS: 'ASSESS',
  HUMAN_CONFIRMATION: 'HUMAN_CONFIRMATION',
  APPROVAL: 'APPROVAL',
  SECURITY: 'SECURITY',
  EXECUTION: 'EXECUTION',
  VERIFICATION: 'VERIFICATION',
  CLOSURE: 'CLOSURE'
});

const STD_EVIDENCE = ['userVerified', 'assetVerified', 'workConfirmed', 'tested'];
const FINAL_NOTE = 'finalWorkNoteConfirmed';

const GATES_LIFECYCLE = [GATES.READ, GATES.RECONCILE, GATES.EXECUTION, GATES.VERIFICATION, GATES.CLOSURE];
const GATES_ASSESSED = [GATES.READ, GATES.RECONCILE, GATES.ASSESS, GATES.EXECUTION, GATES.VERIFICATION, GATES.CLOSURE];

const WORKFLOWS = Object.freeze({
  ONBOARDING: {
    id: 'ONBOARDING', label: 'Onboarding', category: 'USER_LIFECYCLE',
    requiredReads: ['USER', 'RITM', 'SC_TASK', 'ASSET'],
    evidence: [...STD_EVIDENCE, 'locationVerified', FINAL_NOTE],
    gates: GATES_LIFECYCLE
  },
  OFFBOARDING: {
    id: 'OFFBOARDING', label: 'Offboarding', category: 'USER_LIFECYCLE',
    requiredReads: ['USER', 'RITM', 'SC_TASK', 'ASSET'],
    evidence: [...STD_EVIDENCE, 'locationVerified', FINAL_NOTE],
    gates: GATES_LIFECYCLE
  },
  FOOT_MOVE: {
    id: 'FOOT_MOVE', label: 'Foot Move', category: 'WORKPLACE',
    requiredReads: ['USER', 'SC_TASK', 'ASSET', 'LOCATION'],
    evidence: [...STD_EVIDENCE, 'locationVerified', FINAL_NOTE],
    gates: GATES_LIFECYCLE
  },
  HARDWARE: {
    id: 'HARDWARE', label: 'Hardware', category: 'ASSET',
    requiredReads: ['INCIDENT', 'ASSET'],
    evidence: [...STD_EVIDENCE, FINAL_NOTE],
    gates: GATES_ASSESSED
  },
  HARDWARE_SWAP: {
    id: 'HARDWARE_SWAP', label: 'Hardware Swap', category: 'ASSET',
    requiredReads: ['INCIDENT', 'OLD_ASSET', 'NEW_ASSET'],
    evidence: [...STD_EVIDENCE, FINAL_NOTE],
    gates: GATES_ASSESSED
  },
  INCIDENT: {
    id: 'INCIDENT', label: 'Incident', category: 'INCIDENT',
    requiredReads: ['INCIDENT'],
    evidence: [...STD_EVIDENCE, FINAL_NOTE],
    gates: [GATES.READ, GATES.ASSESS, GATES.EXECUTION, GATES.VERIFICATION, GATES.CLOSURE]
  },
  LOANER: {
    id: 'LOANER', label: 'Loaner Management', category: 'ASSET',
    requiredReads: ['INCIDENT', 'ASSET', 'USER'],
    evidence: [...STD_EVIDENCE, FINAL_NOTE],
    gates: GATES_ASSESSED
  },
  LOANER_RETURN: {
    id: 'LOANER_RETURN', label: 'Loaner Return', category: 'ASSET',
    requiredReads: ['INCIDENT', 'ASSET', 'USER'],
    evidence: [...STD_EVIDENCE, FINAL_NOTE],
    gates: GATES_ASSESSED
  },
  ASSET_RECOVERY: {
    id: 'ASSET_RECOVERY', label: 'Asset Recovery', category: 'ASSET',
    requiredReads: ['USER', 'ASSET', 'TASK'],
    evidence: [...STD_EVIDENCE, FINAL_NOTE],
    gates: GATES_ASSESSED
  },
  WARRANTY_DEPOT_RETURN: {
    id: 'WARRANTY_DEPOT_RETURN', label: 'Warranty Depot Return', category: 'ASSET',
    requiredReads: ['INCIDENT', 'ASSET', 'WARRANTY'],
    evidence: [...STD_EVIDENCE, FINAL_NOTE],
    gates: GATES_ASSESSED
  },
  DISPOSITION: {
    id: 'DISPOSITION', label: 'Asset Disposition', category: 'ASSET_GOVERNANCE',
    requiredReads: ['ASSET', 'WARRANTY', 'REPAIR_HISTORY', 'OWNERSHIP', 'LOANER_STATUS'],
    evidence: [
      'assetVerified', 'warrantyVerified', 'conditionDocumented', 'repairHistoryReviewed',
      'replacementAddressed', 'dataSecurityReviewed', 'approvalObtained',
      'sanitizationVerified', 'dispositionCompleted', 'assetReconciled', FINAL_NOTE
    ],
    gates: [
      GATES.READ, GATES.RECONCILE, GATES.ASSESS, GATES.SECURITY,
      GATES.HUMAN_CONFIRMATION, GATES.APPROVAL, GATES.EXECUTION,
      GATES.VERIFICATION, GATES.CLOSURE
    ]
  },
  LOST_STOLEN: {
    id: 'LOST_STOLEN', label: 'Lost / Stolen Asset', category: 'SECURITY',
    requiredReads: ['USER', 'ASSET', 'SECURITY_STATUS'],
    evidence: [
      'userVerified', 'assetVerified', 'securityEscalation',
      'securityActionVerified', 'assetReconciled', FINAL_NOTE
    ],
    gates: [
      GATES.READ, GATES.RECONCILE, GATES.ASSESS, GATES.SECURITY,
      GATES.HUMAN_CONFIRMATION, GATES.EXECUTION, GATES.VERIFICATION, GATES.CLOSURE
    ]
  },
  SOFTWARE_FULFILLMENT: {
    id: 'SOFTWARE_FULFILLMENT', label: 'Software / Request Fulfillment', category: 'REQUEST',
    requiredReads: ['RITM', 'SC_TASK', 'USER'],
    evidence: ['userVerified', 'workConfirmed', 'tested', FINAL_NOTE],
    gates: GATES_ASSESSED
  }
});

function getWorkflow(workflowId) {
  const id = String(workflowId || '').trim().toUpperCase();
  const workflow = WORKFLOWS[id];
  if (!workflow) {
    const err = new Error(`Unknown L1 workflow "${workflowId}"`);
    err.code = 'UNKNOWN_L1_WORKFLOW';
    throw err;
  }
  return workflow;
}

function listWorkflows() {
  return WORKFLOW_IDS.map(id => {
    const w = WORKFLOWS[id];
    return { id: w.id, label: w.label, category: w.category };
  });
}

const getRequiredEvidence = id => [...getWorkflow(id).evidence];
const getRequiredReads = id => [...getWorkflow(id).requiredReads];
const getGates = id => [...getWorkflow(id).gates];

module.exports = {
  WORKFLOW_IDS,
  GATES,
  WORKFLOWS,
  getWorkflow,
  listWorkflows,
  getRequiredEvidence,
  getRequiredReads,
  getGates
};
