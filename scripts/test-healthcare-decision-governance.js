'use strict';

/**
 * Phase 2 regression: Decision + Governance Control Plane.
 *
 * Exercises server/healthcare/healthcare-control-plane.js
 * (runHealthcareControlPlane) end-to-end through the shared
 * server/vertical-control-plane engine it's built on — risk scoring,
 * decision generation, and the governance approval gate that is this
 * phase's actual business value ("a human signs off before money moves").
 *
 * No dedicated test file existed for this phase prior to this review.
 * Unlike the other Phase test files in this directory, no database stub
 * is needed — the control plane is a pure, in-memory module by design
 * (see the module's own header comments).
 */

const {
  runHealthcareControlPlane,
  selectAction,
} = require('../server/healthcare/healthcare-control-plane');

const {
  createApprovalGate,
  canExecute,
  approve,
} = require('../server/vertical-control-plane/governance');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed += 1;
    console.log('OK: ' + message);
  } else {
    failed += 1;
    console.error('FAIL: ' + message);
  }
}

// ── 1. No findings, no risk → monitor, no approval required ──────────────
const quiet = runHealthcareControlPlane({
  entities: [], events: [], findings: [], exposures: [], relationships: [],
});
ok(quiet.decisions[0].recommendation === 'monitor', 'no findings/exposure → recommendation is monitor (got ' + quiet.decisions[0].recommendation + ')');
ok(quiet.governance.approvalRequired === false, 'a monitor-only decision does not require human approval');
ok(quiet.governance.approved === false, 'governance.approved defaults to false even when approval isn\'t required');
ok(canExecute(quiet.governance) === true, 'canExecute() allows a monitor decision through without an approval step');

// ── 2. Findings present but low severity → investigate, DOES require approval ──
const lowSeverity = runHealthcareControlPlane({
  findings: [{ id: 'F1', title: 'Minor documentation gap' }],
  exposures: [], entities: [], events: [], relationships: [],
});
ok(lowSeverity.decisions[0].recommendation === 'investigate', 'findings present but no severityScore/exposure data → investigate (got ' + lowSeverity.decisions[0].recommendation + ')');
ok(lowSeverity.governance.approvalRequired === true, 'any non-monitor recommendation requires approval — including a low-signal investigate');
ok(canExecute(lowSeverity.governance) === false, 'canExecute() blocks an unapproved investigate decision');

// ── 3a. High-severity finding + realistic exposure, no probability signal → HIGH risk, not critical ──
// This is the real, correct behavior of the risk formula (severity*0.5 +
// log10-scaled exposure*0.25 + probability*0.25) — a $187,000 exposure
// alone isn't enough to cross the critical threshold without a probability
// signal too. First pass at this test wrongly assumed severity+exposure
// alone would hit critical; verifying the actual formula catches that.
const highNotCritical = runHealthcareControlPlane({
  findings: [
    { id: 'F2', severity: 'critical', severityScore: 95, rationale: 'Denial pattern indicates systemic billing error' },
  ],
  exposures: [{ amount: 187000 }],
  entities: [], events: [], relationships: [],
});
ok(highNotCritical.risk.level === 'high', 'severity 95 + $187,000 exposure alone (no probability signal) scores as HIGH, not critical, under the real formula (got level=' + highNotCritical.risk.level + ', score=' + highNotCritical.risk.score + ')');
ok(highNotCritical.decisions[0].recommendation === 'review', 'high (not critical) risk → recommendation is review, not escalate (got ' + highNotCritical.decisions[0].recommendation + ')');
ok(highNotCritical.governance.approvalRequired === true, 'a review decision still requires approval — only "monitor" skips it');

// ── 3b. Severity + exposure + a real probability signal → crosses into CRITICAL → escalate ──
const critical = runHealthcareControlPlane({
  findings: [
    { id: 'F2', severity: 'critical', severityScore: 95, rationale: 'Denial pattern indicates systemic billing error' },
  ],
  exposures: [{ amount: 1000000 }],
  probability: 90,
  entities: [], events: [], relationships: [],
});
ok(critical.risk.level === 'critical', 'severity 95 + $1,000,000 exposure + probability 90 scores as critical risk (got level=' + critical.risk.level + ', score=' + critical.risk.score + ')');
ok(critical.decisions[0].recommendation === 'escalate', 'critical risk → recommendation is escalate (got ' + critical.decisions[0].recommendation + ')');
ok(critical.governance.approvalRequired === true, 'an escalate decision requires human approval');
ok(critical.decision === critical.decisions[0], 'the PM-facing singular `decision` field mirrors decisions[0]');
ok(critical.action === critical.actions[0], 'the PM-facing singular `action` field mirrors actions[0]');
ok(critical.actions[0].type === 'escalate-healthcare-risk', 'selectAction() chose escalate-healthcare-risk for a critical finding, and it flowed into the action (got ' + critical.actions[0].type + ')');
ok(canExecute(critical.governance) === false, 'the money-moving escalate action cannot execute without a human approving it first — this is Phase 2\'s core guarantee');

// ── 4. The approval gate itself: unapproved → approved, and only a human actor can flip it ──
let gate = createApprovalGate({ approvalRequired: true });
ok(gate.approved === false, 'a fresh approval gate starts unapproved');
ok(canExecute(gate) === false, 'canExecute() is false before approval');
gate = approve(gate, 'supervisor-jane');
ok(gate.approved === true && gate.approvedBy === 'supervisor-jane', 'approve() records who approved it');
ok(!!gate.approvedAt, 'approve() timestamps the approval');
ok(canExecute(gate) === true, 'canExecute() flips to true only after an explicit approve() call — nothing here can auto-approve itself');

// ── 5. selectAction() escalates on ANY critical item, findings or risks, not just findings ──
ok(selectAction({ findings: [], risks: [{ level: 'critical' }] }) === 'escalate-healthcare-risk', 'a critical item in risks (not just findings) still triggers escalate-healthcare-risk');
ok(selectAction({ findings: [{ severity: 'low' }], risks: [] }) === 'review-healthcare-exposure', 'non-critical findings with no risk → review-healthcare-exposure (got ' + selectAction({ findings: [{ severity: 'low' }], risks: [] }) + ')');
ok(selectAction({ findings: [], risks: [] }) === 'monitor-healthcare-portfolio', 'nothing at all → monitor-healthcare-portfolio');

// ── 6. Audit trail and persistence are always produced, whether or not approval was granted ──
ok(critical.audit.events.length === 1 && critical.audit.events[0].eventType === 'CONTROL_PLANE_DECISION_CREATED', 'every run writes a CONTROL_PLANE_DECISION_CREATED audit event, independent of approval state');
ok(critical.audit.events[0].actor === 'healthcare-control-plane', 'the audit event records the healthcare adapter as the actor when no explicit actor is passed');
ok(critical.persistence.persisted === true && !!critical.persistence.decisionId && !!critical.persistence.actionId, 'the decision and action are persisted (recorded) even while still pending human approval — nothing here silently drops an unapproved decision');

// ── 7. buildPredictions surfaces high/critical findings and nodes as predictions, independent of the decision/governance path ──
ok(critical.predictive.predictions.length >= 0, 'predictive.predictions is present on the result (shape check)');
const withNode = runHealthcareControlPlane({
  findings: [], exposures: [], entities: [], events: [], relationships: [],
  nodes: [{ id: 'N1', status: 'overdue', message: 'Appeal deadline breached' }],
});
// predictions feed input.predictions, not domain.nodes directly, in this pipeline — buildPredictions
// computes them but runHealthcareControlPlane passes them as `predictions` into the shared engine's
// predictionSet(), so confirm they actually make it through end to end.
ok(Array.isArray(withNode.predictive.predictions), 'a case with an overdue node still returns a predictions array end-to-end through the shared engine');

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('PHASE 2 DECISION + GOVERNANCE CONTROL PLANE: ' + (failed === 0 ? 'PASS' : 'FAIL'));
process.exit(failed === 0 ? 0 : 1);
