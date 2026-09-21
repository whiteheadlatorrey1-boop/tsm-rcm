'use strict';

/**
 * Phase 14 regression: the shared case engine + vertical adapters (pure, no I/O).
 *   - adapter registry + contract validation + onboarding a new vertical
 *   - one common case shape across Healthcare / Insurance / BPO / unadapted
 *   - readiness against each vertical's own output contract
 *   - safe-action rules: role policy, reason required, state conflicts,
 *     analyst-may-only-raise-priority
 *   - unified queue ordering/filters/paging, cross-vertical summary
 *   - the server-side Healthcare recovery gate (mirror of the portal's)
 *
 * Run: node scripts/test-bpo-case-engine.js
 */

const engine = require('../server/tsm-case-engine');

let passed = 0;
let failed = 0;
function ok(condition, message) {
  if (condition) { passed += 1; console.log('OK: ' + message); }
  else { failed += 1; console.error('FAIL: ' + message); }
}
function throwsKind(fn, kind, message) {
  try { fn(); ok(false, message + ' (did not throw)'); }
  catch (e) { ok(e[kind] === true, message + ' [' + e.message + ']'); }
}

const NOW = '2026-09-20T12:00:00.000Z';
const DAY = 86400000;
const iso = ms => new Date(new Date(NOW).getTime() + ms).toISOString();

const FULL_HC = {
  claimId: 'AZ-BCBS-1', payer: 'Blue Cross', denialCategory: 'medical_necessity', denialReasonCode: 'CO-50',
  financialExposure: 4850, evidenceProvenance: [{ field: 'claimId', source: 'doc' }], recoveryLikelihood: 'moderate',
  confidence: 65, appealable: true,
};
const extractFrom = sc => () => sc;

// ── Adapter registry ──
const described = engine.describeAdapters();
ok(described.map(a => a.id).sort().join() === 'bpo,healthcare,insurance', 'Healthcare, Insurance and BPO adapters are registered');
ok(described.find(a => a.id === 'healthcare').requiredFields.length === 13 && described.find(a => a.id === 'insurance').requiredFields.length === 6, 'each adapter reports its own vertical contract (13 / 6 required fields)');
ok(described.every(a => engine.CAPABILITIES.every(c => a.capabilities.includes(c))), 'every adapter answers the full capability contract');
throwsKind(() => engine.defineAdapter({ id: 'x', label: 'x', verticals: ['x'], vocabulary: {} }), 'isValidation', 'adapter missing contractKey is rejected');
throwsKind(() => engine.defineAdapter({ id: 'x', label: 'x', verticals: ['x'], vocabulary: {}, contractKey: 'default', exposure: 'nope' }), 'isValidation', 'adapter with a non-function capability is rejected');
throwsKind(() => engine.registerAdapter({ id: 'hc2', label: 'HC 2', verticals: ['Healthcare'], vocabulary: {}, contractKey: 'healthcare' }), 'isConflict', 'a vertical cannot be claimed by two adapters');
engine.registerAdapter({
  id: 'honeywell', label: 'Honeywell (Plant Incident)', verticals: ['honeywell'],
  vocabulary: { case: 'Incident', unit: 'Plant incident', action: 'Mitigation', outcome: 'Recovery' }, contractKey: 'default',
  identity(item) { return { title: 'INC-' + item.caseId, unit: 'Plant incident' }; },
});
const hw = engine.normalizeCase({ caseId: 'h1', vertical: 'Honeywell', status: 'open', stage: 'triage' }, { extract: extractFrom(null), now: NOW, role: 'manager' });
ok(hw.adapter === 'honeywell' && hw.adapted === true && hw.title === 'INC-h1', 'onboarding a new vertical is registerAdapter, not a new architecture');

// ── One common shape ──
const ctx = (sc, role) => ({ extract: extractFrom(sc), now: NOW, role: role || 'manager' });
const hc = engine.normalizeCase({ caseId: 'c-hc', vertical: 'healthcare', clientId: 'c1', stage: 'ready-for-review', status: 'open', priority: 'high', owner: 'ann', createdAt: iso(-3 * DAY), dueDate: iso(-2 * DAY) }, ctx(FULL_HC));
ok(hc.adapter === 'healthcare' && hc.title === 'AZ-BCBS-1' && hc.exposure === 4850 && hc.counterparty === 'Blue Cross' && hc.category === 'medical_necessity', 'healthcare: claim identity, exposure, payer, denial category');
ok(hc.sla.overdue === true && hc.sla.daysOverdue === 2 && hc.deadline === iso(-2 * DAY), 'overdue is measured against the case\'s own deadline');
ok(hc.learning && hc.learning.predictedLikelihood === 'MODERATE' && hc.learning.predictedConfidence === 65, 'learning signals come from the structured case');
ok(hc.readiness.contract === 'healthcare' && hc.readiness.compliant === false && hc.readiness.missing.includes('rootCauseHypothesis'), 'readiness is checked against the healthcare output contract');

const INS_SC = { deadline: iso(1 * DAY), requiredEvidence: ['police report'], financialExposure: 12000, confidence: 70, confidenceTier: 'MEDIUM', humanReviewRequired: true };
const ins = engine.normalizeCase({ caseId: 'c-ins', vertical: 'insurance', stage: 'strategist', status: 'open', createdAt: iso(-1 * DAY) }, ctx(INS_SC));
ok(ins.adapter === 'insurance' && ins.exposure === 12000 && ins.counterparty === null && ins.category === null, 'insurance: exposure from its own shape; no payer/category invented');
ok(ins.readiness.compliant === true && ins.readiness.contract === 'insurance', 'insurance case is compliant with the insurance contract');
ok(ins.deadline === iso(1 * DAY) && ins.sla.dueSoon === true && ins.sla.overdue === false, 'insurance deadline comes from structuredCase.deadline; due within 48h is flagged');

const bpo = engine.normalizeCase({ caseId: 'c-bpo', vertical: 'bpo', status: 'open', stage: 'war-room' }, ctx(null));
ok(bpo.exposure === null && bpo.exposureKnown === false && bpo.readiness.compliant === false, 'bpo: unknown exposure stays null (never $0) and readiness reports missing fields');
const gen = engine.normalizeCase({ caseId: 'c-x', vertical: 'mortgage', status: 'open' }, ctx(null));
ok(gen.adapter === 'generic' && gen.adapted === false && gen.actions.length > 0, 'unadapted vertical still flows through the engine (adapted:false, safe actions available)');
const closed = engine.normalizeCase({ caseId: 'c-closed', vertical: 'healthcare', status: 'resolved', recoveryStatus: 'PARTIALLY_RECOVERED', originalExposure: 2000, recoveredAmount: 500, remainingBalance: 1500, recoveryRate: 0.25, actionTaken: 'Appeal' }, ctx(FULL_HC));
ok(closed.state === 'closed' && closed.exposure === 2000 && closed.outcome.recoveredAmount === 500 && closed.actions.length === 0 && closed.sla.overdue === false, 'closed case: measured exposure, outcome, no actions, never overdue');
const pending = engine.normalizeCase({ caseId: 'c-pend', vertical: 'healthcare', status: 'open', recoveryStatus: 'PENDING' }, ctx(FULL_HC));
ok(pending.state === 'pending-outcome' && pending.actions.length > 0, 'a PENDING outcome is still being worked (actions stay available)');
throwsKind(() => engine.normalizeCase({ caseId: 'z' }, {}), 'isValidation', 'normalizeCase requires the ledger\'s extractor');

// ── Safe actions ──
const openItem = { caseId: 'a1', vertical: 'healthcare', status: 'open', stage: 's', owner: 'ann', priority: 'medium' };
const plan = (a, item, params, role) => engine.planAction(a, item, params, { role, actor: 'tester', now: NOW });

ok(engine.availableActions(openItem, 'manager').join() === 'reassign,escalate,priority', 'manager actions on an open, un-escalated case');
ok(engine.availableActions(openItem, 'analyst').join() === 'escalate,priority', 'analyst may escalate and change priority, not reassign');
ok(engine.availableActions(openItem, 'client').length === 0, 'client role has no actions');
ok(engine.availableActions(Object.assign({}, openItem, { escalated: true }), 'manager').join() === 'reassign,de-escalate,priority', 'escalated case offers de-escalate instead of escalate');
ok(engine.availableActions(Object.assign({}, openItem, { status: 'resolved' }), 'admin').length === 0, 'closed case offers nothing');

let p = plan('reassign', openItem, { owner: '  Bob   Smith ', reason: 'Ann is out sick' }, 'manager');
ok(p.set.owner === 'Bob Smith' && p.detail.from === 'ann' && p.detail.to === 'Bob Smith' && p.detail.reason === 'Ann is out sick' && p.auditAction === 'work_item.reassign' && p.undo.owner === 'ann', 'reassign: plan carries set/undo/audit detail, whitespace normalised');
throwsKind(() => plan('reassign', openItem, { owner: 'bob', reason: 'x' }, 'manager'), 'isValidation', 'reason under 3 characters is rejected');
throwsKind(() => plan('reassign', openItem, { owner: 'bob' }, 'manager'), 'isValidation', 'missing reason is rejected');
throwsKind(() => plan('reassign', openItem, { reason: 'because' }, 'manager'), 'isValidation', 'missing owner is rejected');
throwsKind(() => plan('reassign', openItem, { owner: 'ann', reason: 'no change' }, 'manager'), 'isConflict', 'reassigning to the current owner is a conflict');
throwsKind(() => plan('reassign', openItem, { owner: 'bob', reason: 'because' }, 'analyst'), 'isForbidden', 'analyst cannot reassign');
throwsKind(() => plan('reassign', openItem, { owner: 'bob', reason: 'because' }, 'client'), 'isForbidden', 'client cannot act');
throwsKind(() => plan('reassign', { caseId: 'a', status: 'resolved' }, { owner: 'bob', reason: 'because' }, 'admin'), 'isConflict', 'closed cases cannot be changed');
throwsKind(() => plan('reassign', openItem, { owner: 'b'.repeat(101), reason: 'because' }, 'manager'), 'isValidation', 'over-long owner is rejected, not truncated');
throwsKind(() => plan('reassign', openItem, { owner: 42, reason: 'because' }, 'manager'), 'isValidation', 'non-string owner is rejected');
ok(!/[\u0000-\u001f]/.test(plan('reassign', openItem, { owner: 'bob\u0000\n', reason: 'line1\nline2\t' }, 'manager').detail.reason), 'control characters are stripped from audited text');
throwsKind(() => plan('nuke', openItem, { reason: 'because' }, 'admin'), 'isValidation', 'unknown action is rejected');

p = plan('priority', openItem, { priority: 'HIGH', reason: 'payer deadline moved' }, 'analyst');
ok(p.set.priority === 'high' && p.detail.from === 'medium' && p.detail.to === 'high', 'analyst may raise priority');
throwsKind(() => plan('priority', Object.assign({}, openItem, { priority: 'high' }), { priority: 'low', reason: 'less urgent' }, 'analyst'), 'isForbidden', 'analyst may not lower priority');
ok(plan('priority', Object.assign({}, openItem, { priority: 'high' }), { priority: 'low', reason: 'less urgent' }, 'manager').set.priority === 'low', 'manager may lower priority');
throwsKind(() => plan('priority', openItem, { priority: 'urgent', reason: 'because' }, 'manager'), 'isValidation', 'unknown priority value is rejected');
throwsKind(() => plan('priority', openItem, { priority: 'medium', reason: 'because' }, 'manager'), 'isConflict', 'unchanged priority is a conflict');
ok(plan('priority', { caseId: 'n', status: 'open' }, { priority: 'high', reason: 'because' }, 'manager').detail.from === 'medium', 'a case with no stored priority is treated as medium');

p = plan('escalate', openItem, { reason: 'payer deadline tomorrow', escalatedTo: 'VP Revenue' }, 'analyst');
ok(p.set.escalated === true && p.set.escalatedBy === 'tester' && p.set.escalatedTo === 'VP Revenue' && p.set.escalationCount === 1 && p.undo.escalated === false, 'escalate: flag, actor, target, count, undo');
ok(plan('escalate', { caseId: 'e', status: 'open', escalationCount: 2 }, { reason: 'again please' }, 'manager').set.escalationCount === 3, 'escalation count accumulates across escalations');
throwsKind(() => plan('escalate', Object.assign({}, openItem, { escalated: true }), { reason: 'again please' }, 'manager'), 'isConflict', 'cannot escalate twice');
p = plan('de-escalate', Object.assign({}, openItem, { escalated: true, escalationReason: 'was urgent' }), { reason: 'resolved with payer' }, 'manager');
ok(p.set.escalated === false && p.detail.previousReason === 'was urgent', 'de-escalate clears the flag and records what it replaced');
throwsKind(() => plan('de-escalate', openItem, { reason: 'not escalated' }, 'manager'), 'isConflict', 'cannot de-escalate a case that is not escalated');
throwsKind(() => plan('de-escalate', Object.assign({}, openItem, { escalated: true }), { reason: 'because' }, 'analyst'), 'isForbidden', 'analyst cannot de-escalate');

// ── Queue ──
const items = [
  { caseId: 'q-low', vertical: 'bpo', status: 'open', stage: 'a', priority: 'low', owner: 'ann', createdAt: iso(-1 * DAY) },
  { caseId: 'q-crit', vertical: 'insurance', status: 'open', stage: 'a', priority: 'critical', createdAt: iso(-1 * DAY) },
  { caseId: 'q-over', vertical: 'healthcare', status: 'open', stage: 'b', priority: 'low', owner: 'bob', createdAt: iso(-9 * DAY), dueDate: iso(-1 * DAY) },
  { caseId: 'q-esc', vertical: 'healthcare', status: 'open', stage: 'b', priority: 'medium', owner: 'ann', escalated: true, createdAt: iso(-2 * DAY) },
  { caseId: 'q-done', vertical: 'healthcare', status: 'resolved', recoveryStatus: 'RECOVERED', originalExposure: 100, recoveredAmount: 100 },
];
const qctx = { extract: it => (it.vertical === 'insurance' ? { financialExposure: 900 } : it.vertical === 'healthcare' && it.caseId === 'q-over' ? { financialExposure: 4000 } : null), now: NOW, role: 'manager' };
let q = engine.buildQueue(items, qctx, {});
ok(q.cases.map(c => c.caseId).join() === 'q-over,q-esc,q-crit,q-low' && q.total === 4, 'queue order: overdue, escalated, then priority; closed excluded by default');
ok(engine.buildQueue(items, qctx, { state: 'closed' }).cases.map(c => c.caseId).join() === 'q-done', 'state=closed');
ok(engine.buildQueue(items, qctx, { state: 'all' }).total === 5, 'state=all');
ok(engine.buildQueue(items, qctx, { vertical: 'HEALTHCARE' }).cases.map(c => c.caseId).join() === 'q-over,q-esc', 'vertical filter is case-insensitive');
ok(engine.buildQueue(items, qctx, { owner: 'unassigned' }).cases.map(c => c.caseId).join() === 'q-crit', 'owner=unassigned');
ok(engine.buildQueue(items, qctx, { owner: 'ann' }).total === 2 && engine.buildQueue(items, qctx, { priority: 'low' }).total === 2, 'owner and priority filters');
ok(engine.buildQueue(items, qctx, { escalated: true }).total === 1 && engine.buildQueue(items, qctx, { overdue: true }).total === 1 && engine.buildQueue(items, qctx, { overdue: false }).total === 3, 'escalated / overdue filters');
q = engine.buildQueue(items, qctx, { limit: 2, offset: 1 });
ok(q.cases.length === 2 && q.total === 4 && q.offset === 1 && q.cases[0].caseId === 'q-esc', 'paging');
ok(engine.buildQueue(items, qctx, { limit: 99999 }).limit === 200 && engine.buildQueue(items, qctx, { limit: 'abc' }).limit === 50, 'limit is clamped and defaulted');

// ── Summary ──
const s = engine.buildSummary(items, qctx);
ok(s.openCount === 4 && s.closedCount === 1, 'summary: open / closed counts');
ok(s.openExposure === 4900 && s.exposureUnknownCount === 2, 'summary: exposure sums only known values and counts the unknown ones');
ok(s.overdue === 1 && s.escalated === 1 && s.unassigned === 1, 'summary: overdue / escalated / unassigned');
ok(s.byPriority.critical === 1 && s.byPriority.low === 2 && s.byPriority.medium === 1, 'summary: by priority');
const svh = s.byVertical.find(v => v.vertical === 'healthcare');
ok(svh.open === 2 && svh.exposure === 4000 && svh.unknownExposure === 1 && svh.overdue === 1, 'summary: per-vertical roll-up');
ok(s.likelyBottleneckStage === 'b' || s.likelyBottleneckStage === 'a', 'summary: bottleneck needs at least 2 aged cases in a stage');
ok(s.byOwner.find(o => o.owner === 'ann').open === 2 && s.byOwner.find(o => o.owner === 'unassigned').open === 1, 'summary: by owner');

// ── Healthcare recovery gate (mirror of the portal) ──
ok(engine.recoveryGateMissing(FULL_HC).length === 0, 'a complete healthcare case passes the gate');
const nullCase = { claimId: null, payer: null, denialCategory: 'coding', denialReasonCode: null, financialExposure: null, appealable: true };
ok(engine.recoveryGateMissing(nullCase).join() === 'claim ID,payer,denial reason code,financial exposure,evidence provenance,recovery likelihood,confidence', 'the legacy all-null case fails on exactly the fields the portal gate names');
ok(engine.recoveryGateMissing(null).length === 9, 'a missing structured case fails all 9 checks');
ok(engine.recoveryGateMissing(Object.assign({}, FULL_HC, { financialExposure: NaN })).join() === 'financial exposure' && engine.recoveryGateMissing(Object.assign({}, FULL_HC, { financialExposure: -1 })).join() === 'financial exposure', 'NaN / negative exposure fails');
ok(engine.recoveryGateMissing(Object.assign({}, FULL_HC, { appealable: 'yes' })).join() === 'appealable determination', 'appealable must be a real boolean');
ok(engine.checkIngestGate({ payload: { structuredCase: nullCase } }).applies === false, 'the gate applies only to the healthcare recovery handoff');
ok(engine.checkIngestGate({}).applies === false && engine.checkIngestGate(null).applies === false, 'no payload, no gate');
const g = engine.checkIngestGate({ payload: { sections: { healthcareRevenueRecovery: { structuredCase: nullCase } } } });
ok(g.applies === true && g.missing.length === 7, 'the handoff marker triggers the gate');
ok(engine.checkIngestGate({ payload: { sections: { healthcareRevenueRecovery: {} } } }).missing.length === 9, 'a handoff with no structuredCase is fully missing');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
