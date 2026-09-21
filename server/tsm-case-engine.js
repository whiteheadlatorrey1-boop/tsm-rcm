'use strict';

/**
 * TSM Case Engine (Phase 14) -- the shared case/workflow layer of the
 * Operational OS.
 *
 *   ENGINE (this file)      owns what must behave identically everywhere:
 *                           identity, owner, priority, deadline/SLA, exposure,
 *                           escalation, readiness, and the audited safe actions.
 *   VERTICAL ADAPTERS       own what those things MEAN: a healthcare "denial"
 *                           on a "claim", an insurance "matter", a BPO "case".
 *
 * Adding a vertical is an adapter (registerAdapter), not a new architecture.
 *
 * Safe actions (Phase 14 scope): reassign, escalate (+ de-escalate), change
 * priority. Human-initiated, role-gated, reason required, audited. NOTHING in
 * this file routes, escalates or re-prioritises automatically.
 *
 * Pure module: no I/O. The ledger supplies work items and persists results.
 */

const { enforceOutputContract } = require('./tsm-output-contract');

// ── Errors ───────────────────────────────────────────────────────────────
function engineError(kind, message) {
  const e = new Error(message);
  e.isValidation = kind === 'validation';
  e.isForbidden = kind === 'forbidden';
  e.isConflict = kind === 'conflict';
  e.isNotFound = kind === 'notfound';
  return e;
}

// ── Small helpers ────────────────────────────────────────────────────────
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const DUE_SOON_MS = 48 * 3600000;

function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^\s*\$?\s*\d[\d,]*(\.\d+)?\s*$/.test(v)) {
    const n = Number(v.replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toIso(v) {
  if (v === undefined || v === null || v === '') return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function firstIso(...vals) {
  for (const v of vals) { const iso = toIso(v); if (iso) return iso; }
  return null;
}

function round2(n) { return Math.round(n * 100) / 100; }

function isPresent(v) {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

function normPriority(p) {
  const s = String(p || '').trim().toLowerCase();
  return PRIORITY_RANK[s] ? s : 'medium';
}

// Text that ends up in the audit trail and on screen: strip control chars,
// collapse whitespace, enforce a hard length cap (reject, never truncate).
function cleanText(value, max, fieldName) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw engineError('validation', fieldName + ' must be a string');
  const s = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > max) throw engineError('validation', fieldName + ' must be at most ' + max + ' characters');
  return s;
}

// ── Case state ───────────────────────────────────────────────────────────
// open            work in progress
// pending-outcome a recovery outcome is recorded as PENDING -- still being worked
// closed          resolved, or a final (non-PENDING) recovery outcome exists
function caseState(item) {
  if (item.status === 'resolved') return 'closed';
  if (item.recoveryStatus && item.recoveryStatus !== 'PENDING') return 'closed';
  if (item.recoveryStatus === 'PENDING') return 'pending-outcome';
  return 'open';
}

// ── Adapter contract ─────────────────────────────────────────────────────
// Every vertical adapter answers the same questions about a work item. Only
// `id`, `label`, `verticals`, `vocabulary` and `contractKey` are required;
// every capability has an engine default and may be overridden.
//
//   identity(item, sc)      -> { title, unit }
//   exposure(sc, item)      -> number | null        (never a guess, never $0-for-unknown)
//   deadline(sc, item)      -> ISO string | null
//   sla(item, sc, now)      -> { ageHours, dueDate, overdue, dueSoon, daysOverdue }
//   outcome(item, sc)       -> { status, ... } | null
//   recovery(item, sc)      -> { counterparty, category, appealable, likelihood }
//   learning(item, sc)      -> { predictedLikelihood, predictedConfidence } | null
//   readiness(item, sc)     -> { contract, required, missing, compliant }
//   actions(item, role)     -> [ 'reassign', 'escalate', ... ]
const CAPABILITIES = ['identity', 'exposure', 'deadline', 'sla', 'outcome', 'recovery', 'learning', 'readiness', 'actions'];

function hoursSince(iso, nowMs) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, round2((nowMs - t) / 3600000)) : null;
}

const DEFAULTS = {
  identity(item, sc) {
    const title = (sc && (sc.claimId || sc.title)) || item.title || item.caseId;
    return { title: String(title), unit: 'Case' };
  },
  exposure(sc, item) {
    const closed = num(item.originalExposure);
    if (closed !== null) return closed;
    return sc ? num(sc.financialExposure) : null;
  },
  deadline(sc, item) {
    return firstIso(item.dueDate, sc && sc.deadline);
  },
  sla(item, sc, now) {
    const nowMs = new Date(now).getTime();
    const dueDate = this.deadline(sc, item);
    const open = caseState(item) !== 'closed';
    const dueMs = dueDate ? new Date(dueDate).getTime() : null;
    const overdue = open && dueMs !== null && dueMs < nowMs;
    const ageHours = typeof item.slaAgeHours === 'number' ? item.slaAgeHours : (item.createdAt ? hoursSince(item.createdAt, nowMs) : null);
    return {
      ageHours,
      dueDate,
      overdue,
      dueSoon: open && dueMs !== null && dueMs >= nowMs && dueMs - nowMs <= DUE_SOON_MS,
      daysOverdue: overdue ? Math.round(((nowMs - dueMs) / 86400000) * 10) / 10 : 0,
    };
  },
  outcome(item) {
    if (!item.recoveryStatus) return null;
    return {
      status: item.recoveryStatus,
      originalExposure: num(item.originalExposure),
      recoveredAmount: num(item.recoveredAmount),
      remainingBalance: num(item.remainingBalance),
      recoveryRate: typeof item.recoveryRate === 'number' ? item.recoveryRate : null,
      actionTaken: item.actionTaken || null,
      recordedAt: item.outcomeRecordedAt || null,
    };
  },
  recovery(item, sc) {
    return {
      counterparty: sc && sc.payer ? String(sc.payer).trim() : null,
      category: sc && sc.denialCategory ? String(sc.denialCategory).trim() : null,
      appealable: sc && typeof sc.appealable === 'boolean' ? sc.appealable : null,
      likelihood: sc && sc.recoveryLikelihood ? String(sc.recoveryLikelihood).toUpperCase() : null,
    };
  },
  learning(item, sc) {
    if (!sc) return null;
    const conf = Number(sc.confidence);
    const likelihood = sc.recoveryLikelihood ? String(sc.recoveryLikelihood).toUpperCase() : null;
    if (!likelihood && !Number.isFinite(conf)) return null;
    return { predictedLikelihood: likelihood, predictedConfidence: Number.isFinite(conf) ? conf : null };
  },
  readiness(item, sc) {
    const r = enforceOutputContract(this.contractKey, sc || {});
    return { contract: r.contract_used, required: r.contract_outputs, missing: r.missing_fields, compliant: r.is_compliant };
  },
  actions(item, role) {
    return availableActions(item, role);
  },
};

function defineAdapter(spec) {
  for (const k of ['id', 'label', 'verticals', 'vocabulary', 'contractKey']) {
    if (spec[k] === undefined || spec[k] === null) throw engineError('validation', 'adapter is missing required field: ' + k);
  }
  if (!Array.isArray(spec.verticals) || !spec.verticals.length) throw engineError('validation', 'adapter.verticals must be a non-empty array');
  const adapter = Object.assign({}, DEFAULTS, spec);
  adapter.verticals = spec.verticals.map(v => String(v).toLowerCase());
  for (const cap of CAPABILITIES) {
    if (typeof adapter[cap] !== 'function') throw engineError('validation', 'adapter is missing capability: ' + cap);
  }
  return adapter;
}

const ADAPTERS = new Map();
const VERTICAL_INDEX = new Map();

function registerAdapter(spec) {
  const adapter = defineAdapter(spec);
  for (const v of adapter.verticals) {
    if (VERTICAL_INDEX.has(v) && VERTICAL_INDEX.get(v) !== adapter.id) {
      throw engineError('conflict', 'vertical "' + v + '" is already claimed by adapter ' + VERTICAL_INDEX.get(v));
    }
  }
  ADAPTERS.set(adapter.id, adapter);
  for (const v of adapter.verticals) VERTICAL_INDEX.set(v, adapter.id);
  return adapter;
}

// The three verticals in scope for Phase 14. Their structured cases differ
// (healthcare is denial-specific; insurance carries only exposure/deadline/
// evidence/confidence), which is exactly what the adapter layer absorbs.
registerAdapter({
  id: 'healthcare',
  label: 'Healthcare (Denial Recovery)',
  verticals: ['healthcare'],
  vocabulary: { case: 'Denial', unit: 'Claim', action: 'Appeal', outcome: 'Recovery', counterparty: 'Payer' },
  contractKey: 'healthcare',
  identity(item, sc) {
    return { title: String((sc && sc.claimId) || item.caseId), unit: 'Claim' };
  },
  deadline(sc, item) {
    return firstIso(item.dueDate, sc && sc.appealDeadline, sc && sc.deadline);
  },
});

registerAdapter({
  id: 'insurance',
  label: 'Insurance (Claims & Coverage)',
  verticals: ['insurance'],
  vocabulary: { case: 'Matter', unit: 'Claim', action: 'Resolution', outcome: 'Recovery', counterparty: 'Carrier' },
  contractKey: 'insurance',
  identity(item, sc) {
    return { title: String((sc && sc.claimId) || item.title || item.caseId), unit: 'Matter' };
  },
});

registerAdapter({
  id: 'bpo',
  label: 'BPO (General Case Work)',
  verticals: ['bpo'],
  vocabulary: { case: 'Case', unit: 'Work item', action: 'Action', outcome: 'Result', counterparty: 'Counterparty' },
  contractKey: 'default',
});

// Anything without an adapter still flows through the engine (visibility +
// safe actions) on the default contract, flagged adapted:false.
const GENERIC = defineAdapter({
  id: 'generic',
  label: 'Unadapted vertical',
  verticals: ['generic'],
  vocabulary: { case: 'Case', unit: 'Case', action: 'Action', outcome: 'Outcome', counterparty: 'Counterparty' },
  contractKey: 'default',
});

function resolveAdapter(vertical) {
  const id = VERTICAL_INDEX.get(String(vertical || '').toLowerCase());
  return id ? { adapter: ADAPTERS.get(id), adapted: true } : { adapter: GENERIC, adapted: false };
}

function describeAdapters() {
  return Array.from(ADAPTERS.values()).map(a => ({
    id: a.id,
    label: a.label,
    verticals: a.verticals,
    vocabulary: a.vocabulary,
    contract: a.contractKey,
    requiredFields: enforceOutputContract(a.contractKey, {}).contract_outputs,
    capabilities: CAPABILITIES,
  }));
}

// ── Healthcare recovery gate (server-side mirror of the portal's gate) ───
// The Executive Portal blocks an incomplete structured case client-side
// before relaying to BPO. This is the same rule set, enforced at ingest, so
// the browser is no longer the only line of defence. Labels match the portal.
function recoveryGateMissing(sc) {
  const missing = [];
  const c = sc && typeof sc === 'object' ? sc : {};
  if (!c.claimId) missing.push('claim ID');
  if (!c.payer) missing.push('payer');
  if (!c.denialReasonCode) missing.push('denial reason code');
  if (!c.denialCategory) missing.push('denial category');
  if (typeof c.financialExposure !== 'number' || !Number.isFinite(c.financialExposure) || c.financialExposure < 0) missing.push('financial exposure');
  if (!Array.isArray(c.evidenceProvenance) || c.evidenceProvenance.length === 0) missing.push('evidence provenance');
  if (!c.recoveryLikelihood) missing.push('recovery likelihood');
  if (typeof c.confidence !== 'number' || !Number.isFinite(c.confidence)) missing.push('confidence');
  if (c.appealable !== true && c.appealable !== false) missing.push('appealable determination');
  return missing;
}

// Does this incoming work-item payload carry the Healthcare recovery handoff,
// and if so, what is missing from its structured case?
function checkIngestGate(body) {
  const payload = body && body.payload;
  const hrr = payload && payload.sections && payload.sections.healthcareRevenueRecovery;
  if (!hrr || typeof hrr !== 'object') return { applies: false, missing: [] };
  return { applies: true, missing: recoveryGateMissing(hrr.structuredCase) };
}

// ── Safe actions ─────────────────────────────────────────────────────────
const ACTION_POLICY = {
  'reassign':    { roles: ['admin', 'manager'] },
  'escalate':    { roles: ['admin', 'manager', 'analyst'] },
  'de-escalate': { roles: ['admin', 'manager'] },
  'priority':    { roles: ['admin', 'manager', 'analyst'], analystMayOnlyRaise: true },
};
const ACTIONS = Object.keys(ACTION_POLICY);

function availableActions(item, role) {
  if (caseState(item) === 'closed') return [];
  return ACTIONS.filter(a => {
    if (!ACTION_POLICY[a].roles.includes(role)) return false;
    if (a === 'escalate' && item.escalated) return false;
    if (a === 'de-escalate' && !item.escalated) return false;
    return true;
  });
}

/**
 * Validates one safe action against the item's current state and the actor's
 * role, and returns exactly what to persist:
 *   set     fields to $set                 undo   previous values (for rollback)
 *   detail  audit-trail detail             auditAction  audit action name
 * Throws validation (400) / forbidden (403) / conflict (409) errors.
 */
function planAction(action, item, params, ctx) {
  const policy = ACTION_POLICY[action];
  if (!policy) throw engineError('validation', 'unknown action: ' + action + ' (valid: ' + ACTIONS.join(', ') + ')');
  const role = ctx && ctx.role;
  const now = (ctx && ctx.now) || new Date().toISOString();
  const actor = (ctx && ctx.actor) || null;
  if (!policy.roles.includes(role)) throw engineError('forbidden', 'role "' + role + '" may not ' + action + ' a case');
  if (caseState(item) === 'closed') throw engineError('conflict', 'case is closed; ' + action + ' is not available');

  const p = params || {};
  const reason = cleanText(p.reason, 500, 'reason');
  if (reason.length < 3) throw engineError('validation', 'reason is required (at least 3 characters)');

  if (action === 'reassign') {
    const owner = cleanText(p.owner, 100, 'owner');
    if (!owner) throw engineError('validation', 'owner is required');
    const current = (item.owner || '').toString().trim();
    if (owner === current) throw engineError('conflict', 'case is already assigned to ' + owner);
    return {
      auditAction: 'work_item.reassign',
      set: { owner },
      undo: { owner: item.owner === undefined ? '' : item.owner },
      detail: { from: current || null, to: owner, reason },
    };
  }

  if (action === 'priority') {
    const to = String(p.priority || '').trim().toLowerCase();
    if (!PRIORITY_RANK[to]) throw engineError('validation', 'priority must be one of: ' + PRIORITIES.join(', '));
    const from = normPriority(item.priority);
    if (to === from) throw engineError('conflict', 'priority is already ' + to);
    if (role === 'analyst' && PRIORITY_RANK[to] < PRIORITY_RANK[from]) {
      throw engineError('forbidden', 'analysts may raise priority but not lower it; ask a manager');
    }
    return {
      auditAction: 'work_item.priority_change',
      set: { priority: to },
      undo: { priority: item.priority === undefined ? 'medium' : item.priority },
      detail: { from, to, reason },
    };
  }

  if (action === 'escalate') {
    if (item.escalated) throw engineError('conflict', 'case is already escalated');
    const escalatedTo = cleanText(p.escalatedTo, 100, 'escalatedTo') || null;
    const count = (Number(item.escalationCount) || 0) + 1;
    return {
      auditAction: 'work_item.escalate',
      set: { escalated: true, escalatedAt: now, escalatedBy: actor, escalationReason: reason, escalatedTo, escalationCount: count },
      undo: {
        escalated: false, escalatedAt: item.escalatedAt === undefined ? null : item.escalatedAt,
        escalatedBy: item.escalatedBy === undefined ? null : item.escalatedBy,
        escalationReason: item.escalationReason === undefined ? null : item.escalationReason,
        escalatedTo: item.escalatedTo === undefined ? null : item.escalatedTo,
        escalationCount: Number(item.escalationCount) || 0,
      },
      detail: { escalatedTo, escalationCount: count, reason },
    };
  }

  // de-escalate
  if (!item.escalated) throw engineError('conflict', 'case is not escalated');
  return {
    auditAction: 'work_item.de_escalate',
    set: { escalated: false, deescalatedAt: now },
    undo: { escalated: true, deescalatedAt: item.deescalatedAt === undefined ? null : item.deescalatedAt },
    detail: { previousReason: item.escalationReason || null, reason },
  };
}

// ── Normalisation: one common shape for every vertical ───────────────────
function normalizeCase(item, ctx) {
  if (!ctx || typeof ctx.extract !== 'function') throw engineError('validation', 'normalizeCase requires ctx.extract (the ledger structured-case extractor)');
  const now = ctx.now || new Date().toISOString();
  const { adapter, adapted } = resolveAdapter(item.vertical);
  const sc = ctx.extract(item) || null;
  const state = caseState(item);
  const id = adapter.identity(item, sc);
  const exposure = adapter.exposure(sc, item);
  const sla = adapter.sla(item, sc, now);
  const rec = adapter.recovery(item, sc);
  return {
    caseId: item.caseId,
    clientId: item.clientId || null,
    vertical: item.vertical || null,
    adapter: adapter.id,
    adapted,
    title: id.title,
    unit: id.unit,
    stage: item.stage || null,
    status: item.status || null,
    state,
    priority: normPriority(item.priority),
    owner: item.owner ? String(item.owner) : null,
    escalated: !!item.escalated,
    escalation: item.escalated ? {
      at: item.escalatedAt || null, by: item.escalatedBy || null, reason: item.escalationReason || null,
      to: item.escalatedTo || null, count: Number(item.escalationCount) || 1,
    } : null,
    exposure,
    exposureKnown: exposure !== null,
    counterparty: rec.counterparty,
    category: rec.category,
    appealable: rec.appealable,
    deadline: sla.dueDate,
    sla,
    outcome: adapter.outcome(item, sc),
    learning: adapter.learning(item, sc),
    readiness: adapter.readiness(item, sc),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    actions: adapter.actions(item, ctx.role),
  };
}

// Needs-attention ordering: overdue, escalated, priority, exposure, age.
function compareAttention(a, b) {
  if (a.sla.overdue !== b.sla.overdue) return a.sla.overdue ? -1 : 1;
  if (a.escalated !== b.escalated) return a.escalated ? -1 : 1;
  const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (pr) return pr;
  const ea = a.exposure === null ? -1 : a.exposure;
  const eb = b.exposure === null ? -1 : b.exposure;
  if (ea !== eb) return eb - ea;
  return (b.sla.ageHours || 0) - (a.sla.ageHours || 0);
}

function buildQueue(items, ctx, filters) {
  const f = filters || {};
  const wantState = f.state || 'open';
  let cases = items.map(i => normalizeCase(i, ctx));
  cases = cases.filter(c => {
    if (wantState === 'open' && c.state === 'closed') return false;
    if (wantState === 'closed' && c.state !== 'closed') return false;
    if (f.vertical && String(c.vertical || '').toLowerCase() !== String(f.vertical).toLowerCase()) return false;
    if (f.clientId && c.clientId !== f.clientId) return false;
    if (f.owner) {
      if (f.owner === 'unassigned') { if (c.owner) return false; } else if (c.owner !== f.owner) return false;
    }
    if (f.priority && c.priority !== String(f.priority).toLowerCase()) return false;
    if (f.escalated !== undefined && c.escalated !== f.escalated) return false;
    if (f.overdue !== undefined && c.sla.overdue !== f.overdue) return false;
    return true;
  });
  cases.sort(compareAttention);
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(f.offset, 10) || 0, 0);
  return { total: cases.length, offset, limit, cases: cases.slice(offset, offset + limit) };
}

function buildSummary(items, ctx) {
  const all = items.map(i => normalizeCase(i, ctx));
  const open = all.filter(c => c.state !== 'closed');
  let openExposure = 0;
  let unknownExposure = 0;
  const byVertical = {};
  const byStage = {};
  const byOwner = {};
  const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
  let overdue = 0, dueSoon = 0, unassigned = 0, escalated = 0, compliant = 0;

  for (const c of open) {
    if (c.exposure === null) unknownExposure += 1; else openExposure += c.exposure;
    if (c.sla.overdue) overdue += 1;
    if (c.sla.dueSoon) dueSoon += 1;
    if (!c.owner) unassigned += 1;
    if (c.escalated) escalated += 1;
    if (c.readiness.compliant) compliant += 1;
    byPriority[c.priority] += 1;

    const vk = c.vertical || 'unspecified';
    const v = byVertical[vk] || (byVertical[vk] = { vertical: vk, adapter: c.adapter, adapted: c.adapted, open: 0, exposure: 0, unknownExposure: 0, overdue: 0, escalated: 0, unassigned: 0 });
    v.open += 1;
    if (c.exposure === null) v.unknownExposure += 1; else v.exposure += c.exposure;
    if (c.sla.overdue) v.overdue += 1;
    if (c.escalated) v.escalated += 1;
    if (!c.owner) v.unassigned += 1;

    const sk = c.stage || 'unspecified';
    const s = byStage[sk] || (byStage[sk] = { stage: sk, count: 0, ageTotal: 0, ageN: 0 });
    s.count += 1;
    if (typeof c.sla.ageHours === 'number') { s.ageTotal += c.sla.ageHours; s.ageN += 1; }

    const ok = c.owner || 'unassigned';
    const o = byOwner[ok] || (byOwner[ok] = { owner: ok, open: 0, overdue: 0, exposure: 0 });
    o.open += 1;
    if (c.sla.overdue) o.overdue += 1;
    if (c.exposure !== null) o.exposure += c.exposure;
  }

  const stages = Object.values(byStage).map(s => ({
    stage: s.stage, count: s.count, avgAgeHours: s.ageN ? round2(s.ageTotal / s.ageN) : null,
  })).sort((a, b) => b.count - a.count);
  const cands = stages.filter(s => s.avgAgeHours !== null && s.count >= 2);

  return {
    openCount: open.length,
    closedCount: all.length - open.length,
    openExposure: round2(openExposure),
    exposureUnknownCount: unknownExposure,
    overdue, dueSoon, unassigned, escalated,
    readiness: { compliant, nonCompliant: open.length - compliant },
    byPriority,
    byVertical: Object.values(byVertical).map(v => Object.assign(v, { exposure: round2(v.exposure) })).sort((a, b) => b.open - a.open),
    byStage: stages,
    likelyBottleneckStage: cands.length ? cands.reduce((a, b) => (b.avgAgeHours > a.avgAgeHours ? b : a)).stage : null,
    byOwner: Object.values(byOwner).map(o => Object.assign(o, { exposure: round2(o.exposure) })).sort((a, b) => b.open - a.open),
  };
}

module.exports = {
  PRIORITIES, PRIORITY_RANK, ACTIONS, ACTION_POLICY, CAPABILITIES,
  engineError, caseState, cleanText,
  defineAdapter, registerAdapter, resolveAdapter, describeAdapters,
  recoveryGateMissing, checkIngestGate,
  availableActions, planAction,
  normalizeCase, compareAttention, buildQueue, buildSummary,
};
