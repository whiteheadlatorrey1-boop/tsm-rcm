'use strict';

/**
 * L1 -> TSM Vertical Control Plane adapter.
 *
 * Pure translation. Takes the input given to the L1 governed orchestrator
 * and the result it returned, and wraps them in the canonical envelope.
 * It never calls the orchestrator, never writes to ServiceNow, and never
 * marks anything approved:
 *   AI recommends -> Technician authorizes -> System records.
 */

const { createEnvelope } = require('../contract');

function findKey(obj, key, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 6) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  for (const v of Object.values(obj)) {
    const hit = findKey(v, key, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

// Maps an already-loaded handoff record (from handoff-store) to an outcome.
// Pure: the adapter never reads the store. A handoff is not a ticket closure.
function handoffToOutcome(h) {
  if (!h || typeof h !== 'object') return [];
  const a = h.action || {};
  return [{
    type: 'L1_HANDOFF',
    handoffId: h.id ?? h.handoffId ?? null,
    status: h.status ?? null,
    technicianId: h.technician?.id ?? null,
    actionType: a.actionType ?? null,
    actionState: a.state ?? null,
    confirmedAt: a.confirmedAt ?? null,
    executedAt: a.executedAt ?? null,
    workPerformed: h.workPerformed ?? null,
    validation: h.validation ?? null,
    blocker: h.blocker ?? null,
    ticketClosureRequested: h.ticketClosureRequested === true,
    recordedAt: h.createdAt ?? null,
    source: 'l1-handoff-store'
  }];
}

function fromOrchestration(input = {}, result = {}, extras = {}) {
  const ctx = (input && input.context) || {};
  const gates = findKey(result, 'gates') || {};
  const closure = gates.closure || {};
  const execution = gates.execution || {};
  const missing = Array.isArray(closure.missingEvidence) ? closure.missingEvidence : [];
  const checklist = findKey(result, 'checklist');
  const taskId = ctx.number || null;

  const entities = [];
  if (taskId) entities.push({ type: 'TASK', id: taskId, state: ctx.state ?? null, shortDescription: ctx.shortDescription ?? null });
  if (ctx.assetTag) entities.push({ type: 'ASSET', id: ctx.assetTag });
  if (ctx.requestedFor) entities.push({ type: 'PERSON', id: ctx.requestedFor, role: 'requestedFor' });

  const relationships = [];
  if (taskId && ctx.assetTag) relationships.push({ from: taskId, to: ctx.assetTag, type: 'TARGETS_ASSET' });
  if (taskId && ctx.requestedFor) relationships.push({ from: taskId, to: ctx.requestedFor, type: 'REQUESTED_FOR' });

  return createEnvelope({
    vertical: 'l1',
    entities,
    events: [{
      type: 'L1_ORCHESTRATION',
      taskType: input.taskType ?? null,
      state: input.state ?? null,
      closureGate: closure.gate ?? null,
      executionGate: execution.gate ?? null
    }],
    findings: missing.map((m) => ({ type: 'MISSING_EVIDENCE', key: m.key, label: m.label, source: 'closure-gate' })),
    exposures: [],
    relationships,
    governance: {
      approvalRequired: true,
      approved: false,
      technicianAuthority: findKey(result, 'technicianAuthority') ?? null,
      autonomousCloseAllowed: findKey(result, 'autonomousCloseAllowed') ?? null,
      closureReason: closure.reason ?? null
    },
    decisions: closure.gate
      ? [{
          type: 'CLOSURE_READINESS',
          gate: closure.gate,
          readyForClosure: closure.readyForClosure === true,
          nextEvidence: closure.nextEvidence ?? null,
          requiresApproval: true,
          source: 'l1-closure-gate'
        }]
      : [],
    actions: execution.gate
      ? [{ type: 'EXECUTION_GATE', gate: execution.gate, allowed: execution.allowed === true, action: execution.action ?? null }]
      : [],
    verification: {
      closureGate: closure.gate ?? null,
      readyForClosure: closure.readyForClosure === true,
      nextEvidence: closure.nextEvidence ?? null,
      missingEvidence: missing.map((m) => m.key),
      checklist: Array.isArray(checklist)
        ? checklist.map((c) => ({ key: c.key, label: c.label, confirmed: c.confirmed === true }))
        : []
    },
    writeback: { allowed: false, executed: false },
    outcomes: handoffToOutcome(extras && extras.handoff),
    metadata: { source: 'l1-copilot/governed-orchestrator', adapter: 'l1-adapter', taskType: input.taskType ?? null }
  });
}

module.exports = { fromOrchestration };
