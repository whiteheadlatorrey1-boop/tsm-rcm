'use strict';
// Phase 15B regression: read-only readiness intelligence view + Command Center card.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const view = require(path.join(root, 'server', 'workforce-readiness-view.js'));
const routeSrc = fs.readFileSync(path.join(root, 'routes', 'staffing-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'html', 'tsm-workforce-intelligence-command-center.html'), 'utf8');
const viewSrc = fs.readFileSync(path.join(root, 'server', 'workforce-readiness-view.js'), 'utf8');

let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); }
}
const cand = (score, extra) => Object.assign({ candidateId: 'c1', name: 'Test Candidate', readinessScore: score, readinessBasis: 'scored' }, extra);

check('85 -> qualification, review action, human review required', () => {
  const v = view.buildCandidateReadinessView(cand(85));
  assert.strictEqual(v.state, 'qualification');
  assert.strictEqual(v.actions.length, 1);
  assert.strictEqual(v.actions[0].type, 'review');
  assert.strictEqual(v.humanReviewRequired, true);
});
check('60 -> gap, train action, human review required', () => {
  const v = view.buildCandidateReadinessView(cand(60));
  assert.strictEqual(v.state, 'gap');
  assert.strictEqual(v.actions[0].type, 'train');
  assert.strictEqual(v.humanReviewRequired, true);
});
check('75 -> honest no_insight state, no actions, note present', () => {
  const v = view.buildCandidateReadinessView(cand(75));
  assert.strictEqual(v.state, 'no_insight');
  assert.strictEqual(v.insights.length, 0);
  assert.strictEqual(v.actions.length, 0);
  assert.strictEqual(v.humanReviewRequired, false);
  assert.ok(v.note);
});
check('no-evidence candidate (score 0) is not shown as a development gap', () => {
  const v = view.buildCandidateReadinessView(cand(0, { readinessBasis: 'no-training-data' }));
  assert.strictEqual(v.state, 'no_evidence');
  assert.strictEqual(v.actions.length, 0);
});
check('score is clamped to 0-100 by the 15A normalizer', () => {
  assert.strictEqual(view.buildCandidateReadinessView(cand(150)).readinessScore, 100);
});
check('missing / null / blank / non-numeric / boolean score is rejected, never treated as 0', () => {
  [null, undefined, '', 'abc', true].forEach((s) => {
    assert.throws(() => view.buildCandidateReadinessView({ candidateId: 'c1', readinessScore: s }), (e) => e.code === 'NO_READINESS_SCORE');
  });
});
check('15A normalizer rejects null / blank / boolean instead of returning 0', () => {
  const bridge = require(path.join(root, 'html', 'js', 'career', 'tsm-workforce-readiness-integration.js'));
  [null, undefined, '', true, false, 'abc'].forEach((s) => assert.throws(() => bridge.normalizeReadinessScore(s), /readinessScore must be numeric/));
  assert.strictEqual(bridge.normalizeReadinessScore(0), 0);
  assert.strictEqual(bridge.normalizeReadinessScore('78'), 78);
});
check('view exposes only identity, score, signal, insights, actions (no raw record)', () => {
  const v = view.buildCandidateReadinessView(cand(85, { email: 'x@y.z', _id: 'abc', role: 'r' }));
  assert.ok(!('email' in v) && !('_id' in v) && !('role' in v));
  assert.strictEqual(v.readOnly, true);
});
check('sample data flag is passed through', () => {
  assert.strictEqual(view.buildCandidateReadinessView(cand(85, { isSampleData: true })).isSampleData, true);
  assert.strictEqual(view.buildCandidateReadinessView(cand(85)).isSampleData, false);
});

(async () => {
  const get = (rec) => async () => rec;
  const r400 = await view.resolveReadinessIntelligence('', get(null));
  const r404 = await view.resolveReadinessIntelligence('nope', get(null));
  const r422 = await view.resolveReadinessIntelligence('c1', get({ candidateId: 'c1', readinessScore: null }));
  const r200 = await view.resolveReadinessIntelligence('c1', get(cand(85)));
  check('resolver: 400 on missing id', () => assert.strictEqual(r400.status, 400));
  check('resolver: 404 when candidate not found', () => assert.strictEqual(r404.status, 404));
  check('resolver: 422 when no numeric score', () => assert.strictEqual(r422.status, 422));
  check('resolver: 200 with view body', () => { assert.strictEqual(r200.status, 200); assert.strictEqual(r200.body.state, 'qualification'); });

  const routeStart = routeSrc.indexOf("router.get('/api/staffing/candidates/:candidateId/readiness-intelligence'");
  const routeBlock = routeStart >= 0 ? routeSrc.slice(routeStart, routeSrc.indexOf('\n});', routeStart)) : '';
  check('route is registered under /api/staffing (inherits requireStaffAuth mount)', () => assert.ok(routeStart >= 0));
  check('route/view perform no registry writes', () => {
    assert.ok(!/upsertCandidate|recordTrainingEvent|deleteCandidate|seedSampleData|insertOne|updateOne|deleteOne/.test(routeBlock + viewSrc));
  });
  check('route is GET only', () => assert.ok(routeBlock.startsWith("router.get(")));

  check('Randstad / Multi-Tenant scenario mode untouched', () => {
    assert.ok(html.includes('function togglePilotScenarioMode()'));
    ['mReadiness.textContent = "82%"', 'mReadiness.textContent = "74%"', 'Randstad Deployment Mode', 'Standard Multi-Tenant Pilot']
      .forEach((s) => assert.ok(html.includes(s), 'missing: ' + s));
  });
  check('candidate card + input + output elements exist', () => {
    ['candidate-intel-card', 'candidate-intel-id', 'candidate-intel-load', 'candidate-intel-output'].forEach((id) => assert.ok(html.includes('id="' + id + '"'), id));
  });
  const m = html.indexOf('// 15B candidate readiness intelligence');
  const block = m >= 0 ? html.slice(m, html.indexOf('</script>', m)) : '';
  check('card script uses textContent only (no innerHTML / document.write / eval)', () => {
    assert.ok(block.length > 0);
    assert.ok(!/innerHTML|outerHTML|document\.write|eval\(/.test(block));
  });
  check('card script does not touch scenario elements', () => {
    assert.ok(!/metric-readiness|deployment-scenario|pilot-mode-btn/.test(block));
  });
  check('card script is GET-only fetch', () => assert.ok(!/method\s*:/i.test(block)));

  console.log('STAFFING READINESS INTELLIGENCE (15B): ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
