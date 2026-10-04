'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const file = path.join(root, 'html/js/career/tsm-placement-evidence.js');
const PE = require(file);
const Evidence = require(path.join(root, 'server/readiness/evidence-layer.js'));
const Model7A = require(path.join(root, 'server/readiness/professional-readiness-model.js'));
const Pipeline = require(path.join(root, 'html/js/career/tsm-staffing-pipeline-model.js'));

function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
const placement = () => ({
  placementId: 'plc_1', candidateId: 'c1', jobOrderId: 'job_1', employerId: 'emp_1',
  status: 'placed', payRate: 22,
  humanReview: { decision: 'approved', reviewerId: 'staff1', reviewedAt: '2026-10-01T12:00:00.000Z', reviewedFingerprint: 'fp1', matcherVersion: '1.0.0' },
  statusHistory: [
    { status: 'submitted', at: '2026-10-01T00:00:00.000Z' },
    { status: 'interviewing', at: '2026-10-02T00:00:00.000Z', actorId: 'staff1' },
    { status: 'offered', at: '2026-10-03T00:00:00.000Z' },
    { status: 'placed', at: '2026-10-04T00:00:00.000Z' }
  ]
});

describe('Phase 8F — Placement evidence (separate stream)', function () {
  it('is pure: no imports, clock, randomness or I/O', function () {
    const src = fs.readFileSync(file, 'utf8');
    assert(!/require\(/.test(src));
    assert(!/Date\.now|new Date\(|Math\.random|fetch\(|localStorage|process\./.test(src));
  });

  it('event stages are exactly the 8E pipeline stages', function () {
    assert.deepStrictEqual(Object.keys(PE.STAGE_TO_EVENT), Pipeline.STAGES.slice());
  });

  it('builds one record per history entry, in order, with stable ids', function () {
    const out = PE.buildPlacementEvidence(placement());
    assert.strictEqual(out.records.length, 4);
    assert.deepStrictEqual(out.records.map(r => r.stage), ['submitted', 'interviewing', 'offered', 'placed']);
    assert.strictEqual(out.rejected.length, 0);
    assert.deepStrictEqual(PE.buildPlacementEvidence(placement()), out);
    assert.strictEqual(out.records[1].actorId, 'staff1');
    assert.strictEqual(out.records[0].actorId, null);
  });

  it('attaches the human-review reference to the submitted record only', function () {
    const recs = PE.buildPlacementEvidence(placement()).records;
    assert.deepStrictEqual(Object.assign({}, recs[0].humanReview), { reviewerId: 'staff1', reviewedAt: '2026-10-01T12:00:00.000Z', reviewedFingerprint: 'fp1' });
    assert(recs.slice(1).every(r => r.humanReview === null));
  });

  it('records carry NO score, weight, dimensions, category, kind or verification', function () {
    const recs = PE.buildPlacementEvidence(placement()).records;
    recs.forEach(r => ['score', 'scored', 'weight', 'dimensions', 'category', 'kind', 'verification', 'summary'].forEach(k => assert(!(k in r), k)));
  });

  it('copies only whitelisted fields: stray / protected-class keys never propagate', function () {
    const p = placement();
    p.age = 52; p.gender = 'x'; p.photoUrl = 'u'; p.address = 'a'; p.payRate = 99;
    p.statusHistory[0].race = 'x';
    const json = JSON.stringify(PE.buildPlacementEvidence(p));
    ['age', 'gender', 'photoUrl', 'address', 'race', 'payRate'].forEach(k => assert(!json.includes('"' + k + '"'), k));
  });

  it('rejects, never guesses: unknown stage, bad timestamp, duplicate, missing ids', function () {
    const p = placement();
    p.statusHistory.push({ status: 'hired', at: '2026-10-05T00:00:00.000Z' });
    p.statusHistory.push({ status: 'ended' });
    p.statusHistory.push({ status: 'placed', at: '2026-10-04T00:00:00.000Z' });
    p.statusHistory.push(null);
    const out = PE.buildPlacementEvidence(p);
    assert.strictEqual(out.records.length, 4);
    assert.deepStrictEqual(out.rejected.map(r => r.reason), ['stage-unknown', 'timestamp-invalid', 'duplicate-entry', 'stage-unknown']);
    assert.strictEqual(PE.buildPlacementEvidence(null).rejected[0].reason, 'placement-missing');
    assert.strictEqual(PE.buildPlacementEvidence({ candidateId: 'c1' }).rejected[0].reason, 'placement-id-missing');
    assert.strictEqual(PE.buildPlacementEvidence({ placementId: 'p' }).rejected[0].reason, 'candidate-id-missing');
  });

  it('does not mutate its input and invents no decline reason', function () {
    const q = JSON.parse(JSON.stringify(placement())); q.statusHistory.push({ status: 'declined', at: '2026-10-05T00:00:00.000Z' });
    const out = PE.buildPlacementEvidence(deepFreeze(q));
    const d = out.records[out.records.length - 1];
    assert.strictEqual(d.stage, 'declined');
    assert(!('reason' in d) && !('declinedBy' in d));
  });

  it('summary is counts only', function () {
    const s = PE.summarizePlacementEvidence(PE.buildPlacementEvidence(placement()).records.concat([{ stream: 'other' }, null]));
    assert.strictEqual(s.total, 4);
    assert.strictEqual(s.candidateCount, 1);
    assert.deepStrictEqual(Object.assign({}, s.byStage), { submitted: 1, interviewing: 1, offered: 1, placed: 1, declined: 0, ended: 0 });
    assert(!('rate' in s) && !('score' in s));
  });

  // ---- The boundary with training evidence --------------------------------
  it('no placement event type exists in the 7A EVENT_MAP', function () {
    PE.EVENT_TYPES.forEach(t => assert(!(t in Model7A.EVENT_MAP), t));
  });

  it('7B normalizeEvidence rejects every placement record as unmapped (cannot become evidence)', function () {
    const recs = PE.buildPlacementEvidence(placement()).records;
    const events = recs.map(r => ({ type: r.eventType, recordedAt: r.occurredAt, score: 100 }));
    const out = Evidence.normalizeEvidence(events, { candidateId: 'c1' });
    assert.strictEqual(out.records.length, 0);
    assert.strictEqual(out.rejected.length, recs.length);
  });

  it('training-evidence modules never reference placement data (regression guard)', function () {
    ['server/readiness/evidence-layer.js', 'server/readiness/professional-readiness-model.js',
     'html/js/career/tsm-professional-readiness-projection.js', 'html/js/career/tsm-competency-evidence-scorer.js',
     'html/js/career/tsm-candidate-match-input.js', 'html/js/career/tsm-job-candidate-match.js'
    ].forEach(f => assert(!/placement/i.test(fs.readFileSync(path.join(root, f), 'utf8')), f));
  });
});
