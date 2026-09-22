'use strict';

/**
 * Phase 15 regression: the governance engine (pure, no I/O), Milestone 1
 * (observe-only recommendations layered on the Phase 14 case engine).
 *   - milestone/rollout is hardcoded and documented, not runtime-toggled
 *   - every shipped policy targets a real Phase 14 action
 *   - overdue -> escalate, high exposure -> raise priority
 *   - every recommendation validates clean against planAction
 *   - closed cases, already-escalated/high-priority cases get nothing
 *   - policy order: first match wins, only one recommendation per case
 *   - vertical-agnostic (unadapted verticals still evaluated)
 *   - governance's own role/actor don't depend on the caller's ctx.role
 *
 * Run: node scripts/test-bpo-governance-engine.js
 */

const engine = require('../server/tsm-case-engine');
const governance = require('../server/tsm-governance-engine');

let passed = 0;
let failed = 0;
function ok(condition, message) {
  if (condition) { passed += 1; console.log('OK: ' + message); }
  else { failed += 1; console.error('FAIL: ' + message); }
}

const NOW = '2026-09-20T12:00:00.000Z';
const DAY = 86400000;
const iso = ms => new Date(new Date(NOW).getTime() + ms).toISOString();
const ctx = (extra) => Object.assign({ extract: () => null, now: NOW, role: 'manager' }, extra || {});

// ── Milestone / rollout ──
ok(governance.MODE === 'observe', 'milestone 1 mode is hardcoded to observe');
ok(
  governance.ROLLOUT.length === 4
    && governance.ROLLOUT.find(r => r.milestone === 1).status === 'live'
    && governance.ROLLOUT.find(r => r.milestone === 1).mode === governance.MODE
    && governance.ROLLOUT.filter(r => r.milestone !== 1).every(r => r.status === 'planned'),
  'the full planned rollout is documented even though only observe is live'
);
ok(
  governance.describePolicies().every(p => engine.ACTIONS.includes(p.action)),
  'every shipped policy only ever targets a real Phase 14 action'
);

// ── Escalation policy ──
const overdueOpen = { caseId: 'gov-1', vertical: 'bpo', status: 'open', priority: 'medium', dueDate: iso(-2 * DAY), createdAt: iso(-5 * DAY) };
let rec = governance.evaluateCase(overdueOpen, ctx());
ok(rec && rec.action === 'escalate' && rec.policyId === 'overdue-unescalated-escalate', 'overdue, unescalated case recommends escalation');
ok(
  (() => { engine.planAction('escalate', overdueOpen, rec.params, { role: 'admin', actor: 'x', now: NOW }); return true; })(),
  'the escalate recommendation validates clean against planAction'
);
ok(typeof rec.params.reason === 'string' && rec.params.reason.length >= 3, 'recommendation carries a valid reason planAction will accept');

const beforeSnapshot = JSON.stringify(overdueOpen);
governance.evaluateCase(overdueOpen, ctx());
ok(JSON.stringify(overdueOpen) === beforeSnapshot, 'evaluateCase does not mutate the item it was given');

const overdueEscalated = Object.assign({}, overdueOpen, { escalated: true, escalationCount: 1 });
ok(governance.evaluateCase(overdueEscalated, ctx()) === null, 'already-escalated overdue case gets no recommendation (nothing left to do)');

const futureDue = Object.assign({}, overdueOpen, { dueDate: iso(2 * DAY) });
ok(governance.evaluateCase(futureDue, ctx()) === null, 'a case due in the future gets no recommendation');

const noDeadline = { caseId: 'gov-2', vertical: 'bpo', status: 'open', priority: 'medium', createdAt: iso(-10 * DAY) };
ok(governance.evaluateCase(noDeadline, ctx()) === null, 'a case with no deadline at all is never treated as overdue');

// ── Priority policy ──
const bigExposureMedium = { caseId: 'gov-3', vertical: 'bpo', status: 'open', priority: 'medium', originalExposure: 15000 };
rec = governance.evaluateCase(bigExposureMedium, ctx());
ok(rec && rec.action === 'priority' && rec.params.priority === 'high', 'exposure over $10k at medium priority recommends raising to high');
ok(
  (() => { engine.planAction('priority', bigExposureMedium, rec.params, { role: 'admin', actor: 'x', now: NOW }); return true; })(),
  'the priority recommendation validates clean against planAction'
);

const smallExposureMedium = { caseId: 'gov-4', vertical: 'bpo', status: 'open', priority: 'medium', originalExposure: 5000 };
ok(governance.evaluateCase(smallExposureMedium, ctx()) === null, 'exposure under threshold gets no recommendation');

const bigExposureHigh = { caseId: 'gov-5', vertical: 'bpo', status: 'open', priority: 'high', originalExposure: 50000 };
ok(governance.evaluateCase(bigExposureHigh, ctx()) === null, 'already-high priority with big exposure gets no recommendation');

const bigExposureCritical = { caseId: 'gov-6', vertical: 'bpo', status: 'open', priority: 'critical', originalExposure: 50000 };
ok(governance.evaluateCase(bigExposureCritical, ctx()) === null, 'critical priority is also left alone');

// ── Policy order ──
const bothApply = { caseId: 'gov-7', vertical: 'bpo', status: 'open', priority: 'medium', dueDate: iso(-1 * DAY), originalExposure: 50000 };
rec = governance.evaluateCase(bothApply, ctx());
ok(rec.action === 'escalate' && rec.policyId === 'overdue-unescalated-escalate', 'when both policies could apply, the earlier one in the list wins and only one fires');

// ── Closed cases ──
const closed = { caseId: 'gov-8', vertical: 'bpo', status: 'resolved', priority: 'medium', dueDate: iso(-30 * DAY), originalExposure: 50000, recoveryStatus: 'RECOVERED' };
ok(governance.evaluateCase(closed, ctx()) === null, 'a closed case never gets a recommendation, no matter how overdue or exposed');

// ── Vertical-agnostic ──
const unadapted = { caseId: 'gov-9', vertical: 'some-new-vertical', status: 'open', priority: 'medium', dueDate: iso(-3 * DAY) };
const nc = engine.normalizeCase(unadapted, ctx());
rec = governance.evaluateCase(unadapted, ctx());
ok(nc.adapted === false && rec && rec.action === 'escalate', 'an unadapted vertical is still evaluated by policy (generic adapter, not a new architecture)');

// ── Role independence ──
const roleItem = { caseId: 'gov-10', vertical: 'bpo', status: 'open', priority: 'medium', dueDate: iso(-1 * DAY) };
const recAnalyst = governance.evaluateCase(roleItem, ctx({ role: 'analyst' }));
const recClient = governance.evaluateCase(roleItem, ctx({ role: 'client' }));
ok(
  JSON.stringify(recAnalyst) === JSON.stringify(recClient) && recAnalyst.action === 'escalate',
  'evaluateCase works regardless of the normalizing role (governance validates its own role internally)'
);

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
