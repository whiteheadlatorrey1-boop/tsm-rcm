'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../html/js/career/tsm-staffing-pipeline-model.js');
const P = require(file);
const Svc = fs.readFileSync(path.join(__dirname, '../../server/staffing-engine-service.js'), 'utf8');

function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
const match = () => ({
  jobId: 'j1', candidateId: 'c1',
  review: { humanReviewRequired: true, automatedDecision: false },
  audit: { inputFingerprint: 'abc123' }
});
const review = () => ({ decision: 'approved', reviewerId: 'u1', reviewedAt: '2026-10-01T12:00:00.000Z', reviewedFingerprint: 'abc123', candidateId: 'c1', jobId: 'j1' });
const plc = status => ({ placementId: 'p1', candidateId: 'c1', status, statusHistory: [{ status: 'submitted', at: '2026-10-01T00:00:00.000Z' }] });
const ctx = { actorId: 'u1', at: '2026-10-02T00:00:00.000Z' };

describe('Phase 8E — Staffing pipeline model', function () {
  it('is pure: no imports, clock, randomness or I/O', function () {
    const src = fs.readFileSync(file, 'utf8');
    assert(!/require\(/.test(src));
    assert(!/Date\.now|new Date\(|Math\.random|fetch\(|localStorage|process\./.test(src));
  });

  it('stages exactly match the live service VALID_STATUSES', function () {
    const m = Svc.match(/VALID_STATUSES = \[([\s\S]*?)\]/);
    const live = m[1].match(/'([a-z_]+)'/g).map(s => s.replace(/'/g, ''));
    assert.deepStrictEqual(P.STAGES.slice(), live);
  });

  it('every transition target is a known stage and terminals have no exits', function () {
    P.STAGES.forEach(s => P.TRANSITIONS[s].forEach(t => assert(P.STAGES.includes(t))));
    assert(P.isTerminal('declined') && P.isTerminal('ended') && !P.isTerminal('placed'));
  });

  it('allows the forward path and rejects skips and reversals', function () {
    assert(P.canTransition('submitted', 'interviewing'));
    assert(P.canTransition('interviewing', 'offered'));
    assert(P.canTransition('offered', 'placed'));
    assert(!P.canTransition('submitted', 'placed'));
    assert(!P.canTransition('placed', 'interviewing'));
    assert(!P.canTransition('declined', 'submitted'));
  });

  it('gate passes only with an approved human review bound to the current match', function () {
    assert.strictEqual(P.evaluateSubmissionGate(match(), review()).allowed, true);
  });

  it('gate blocks missing review, wrong fingerprint, non-approval, missing reviewer', function () {
    assert(P.evaluateSubmissionGate(match(), null).reasons.includes('human-review-missing'));
    assert(P.evaluateSubmissionGate(match(), Object.assign(review(), { reviewedFingerprint: 'zzz' })).reasons.includes('review-does-not-match-current-match'));
    assert(P.evaluateSubmissionGate(match(), Object.assign(review(), { decision: 'rejected' })).reasons.includes('review-not-approved'));
    assert(P.evaluateSubmissionGate(match(), Object.assign(review(), { reviewerId: '' })).reasons.includes('reviewer-id-missing'));
    assert(P.evaluateSubmissionGate(match(), Object.assign(review(), { candidateId: 'c2' })).reasons.includes('review-candidate-mismatch'));
  });

  it('gate blocks a match not flagged for human review or lacking audit', function () {
    const m = match(); m.review.automatedDecision = true;
    assert(P.evaluateSubmissionGate(m, review()).reasons.includes('match-not-flagged-for-human-review'));
    assert(P.evaluateSubmissionGate({ jobId: 'j1', candidateId: 'c1', review: match().review }, review()).reasons.includes('match-audit-missing'));
    assert(P.evaluateSubmissionGate(null, review()).reasons.includes('match-result-missing'));
  });

  it('applyTransition returns a new record, appends history, never mutates', function () {
    const p = deepFreeze(plc('submitted'));
    const n = P.applyTransition(p, 'interviewing', ctx);
    assert.strictEqual(n.status, 'interviewing');
    assert.strictEqual(n.statusHistory.length, 2);
    assert.deepStrictEqual(n.statusHistory[1], { status: 'interviewing', at: ctx.at, actorId: 'u1' });
    assert.strictEqual(p.status, 'submitted');
    assert.strictEqual(p.statusHistory.length, 1);
  });

  it('sets placedAt only on placement', function () {
    assert.strictEqual(P.applyTransition(plc('offered'), 'placed', ctx).placedAt, ctx.at);
    assert(!('placedAt' in P.applyTransition(plc('submitted'), 'interviewing', ctx)));
  });

  it('throws on illegal transition, terminal stage, bad actor or timestamp', function () {
    assert.throws(() => P.applyTransition(plc('submitted'), 'placed', ctx), /transition-not-allowed/);
    assert.throws(() => P.applyTransition(plc('declined'), 'ended', ctx), /current-stage-terminal/);
    assert.throws(() => P.applyTransition(plc('submitted'), 'interviewing', { at: ctx.at }), /actor-id-missing/);
    assert.throws(() => P.applyTransition(plc('submitted'), 'interviewing', { actorId: 'u1', at: 'nope' }), /timestamp-invalid/);
    assert.throws(() => P.applyTransition(plc('submitted'), 'bogus', ctx), /target-stage-invalid/);
  });

  it('is deterministic', function () {
    assert.deepStrictEqual(P.applyTransition(plc('offered'), 'placed', ctx), P.applyTransition(plc('offered'), 'placed', ctx));
  });
});
