'use strict';
// NMLS SAFE MLO weighted blueprint: structure, plus the gate rules that depend only on the blueprint.
// Facts come from NMLS pages; see docs/CERTIFICATION_BLUEPRINT_SOURCES.md.
const assert = require('assert');
const { getWeightedBlueprint, listWeightedBlueprints } = require('../server/certification/weighted-blueprints');
const { evaluateWeightedReadiness } = require('../server/certification/weighted-gate');

let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); }
}
const ID = 'nmls-safe-mlo-2026';
const bp = getWeightedBlueprint(ID);
const rows = (domainId, n, score) => Array.from({ length: n }, () => ({ domainId: domainId, score: score }));
const sim = (extra) => Object.assign({ score: 90, questions: 120, minutes: 150 }, extra);
const fullCount = (sims) => evaluateWeightedReadiness(ID, [], sims).sims.fullCount;

check('weights match the NMLS outline and sum to 100', () => {
  assert.deepStrictEqual(bp.domains.map((d) => d.weight), [24, 11, 20, 27, 18]);
  assert.strictEqual(bp.domains.reduce((s, d) => s + d.weight, 0), 100);
});
check('exam facts match the NMLS handbook (120 items, 190 minutes, 75 pass)', () => {
  assert.deepStrictEqual(bp.exam, { questions: 120, minutes: 190, officialPassScore: 75 });
});
check('domain ids are unique and every domain has topics', () => {
  const ids = bp.domains.map((d) => d.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert(bp.domains.every((d) => Array.isArray(d.topics) && d.topics.length > 0));
});
check('platform target sits above the official pass score', () => {
  assert(bp.readiness.readyTarget > bp.exam.officialPassScore);
});
check('the CSA blueprint is still listed (nothing displaced)', () => {
  assert(listWeightedBlueprints().some((b) => b.id === 'servicenow-csa-2026'));
});
check('no evidence: not ready, weighted score is null (never 0)', () => {
  const r = evaluateWeightedReadiness(ID, [], []);
  assert.strictEqual(r.ready, false);
  assert.strictEqual(r.weighted.score, null);
  assert.strictEqual(r.label, 'CONTINUE PREP');
});
check('evidence in one domain only covers that domain weight', () => {
  const r = evaluateWeightedReadiness(ID, rows('federal-laws', 10, 90), []);
  assert.strictEqual(r.weighted.coveredWeight, 24);
  assert.strictEqual(r.ready, false);
});
check('simulations alone can never make anyone ready', () => {
  const r = evaluateWeightedReadiness(ID, [], [sim({ score: 95 }), sim({ score: 95 })]);
  assert.strictEqual(r.ready, false);
});
check('a simulation with fewer than 120 questions is not full', () => {
  assert.strictEqual(fullCount([sim({ questions: 119 })]), 0);
});
check('a simulation over 190 minutes is not full', () => {
  assert.strictEqual(fullCount([sim({ minutes: 191 })]), 0);
});
check('a simulation at exactly 120 questions and 190 minutes is full', () => {
  assert.strictEqual(fullCount([sim({ minutes: 190 })]), 1);
});
check('a simulation containing unreviewed questions is not full', () => {
  assert.strictEqual(fullCount([sim({ unreviewedQuestions: 3 })]), 0);
});

console.log('MLO BLUEPRINT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
