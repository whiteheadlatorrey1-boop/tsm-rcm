'use strict';
const assert = require('assert');
const { getBlueprint, listBlueprints } = require('../server/certification/blueprint-registry');
const { evaluateReadiness } = require('../server/certification/readiness-gate');

let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
const mk = (skillId, n, score, reviewed = true) => Array.from({ length: n }, () => ({ skillId, score, reviewed }));
const good = [...mk('incident-mgmt', 5, 80), ...mk('work-notes', 5, 80), ...mk('access-control', 3, 80)];

t('registry lists blueprints', () => assert.ok(listBlueprints().length >= 2));
t('getBlueprint returns csa', () => assert.strictEqual(getBlueprint('servicenow-csa').vendor, 'ServiceNow'));
t('unknown blueprint throws', () => assert.throws(() => getBlueprint('nope')));
t('every blueprint has skills', () => listBlueprints().forEach((b) => assert.ok(b.skills.length > 0)));
t('revenueLinked is boolean', () => listBlueprints().forEach((b) => assert.strictEqual(typeof b.revenueLinked, 'boolean')));
t('good evidence is ready', () => assert.strictEqual(evaluateReadiness('servicenow-csa', good).ready, true));
t('empty evidence not ready', () => assert.strictEqual(evaluateReadiness('servicenow-csa', []).ready, false));
t('non-array evidence not ready', () => assert.strictEqual(evaluateReadiness('servicenow-csa', null).ready, false));
t('too few samples blocks', () => {
  const r = evaluateReadiness('servicenow-csa', [...mk('incident-mgmt', 2, 95), ...mk('work-notes', 5, 80), ...mk('access-control', 3, 80)]);
  assert.strictEqual(r.ready, false);
  assert.strictEqual(r.skills[0].status, 'insufficient-samples');
});
t('low score blocks', () => {
  const r = evaluateReadiness('servicenow-csa', [...mk('incident-mgmt', 5, 50), ...mk('work-notes', 5, 80), ...mk('access-control', 3, 80)]);
  assert.strictEqual(r.skills[0].status, 'below-threshold');
  assert.strictEqual(r.ready, false);
});
t('unreviewed evidence blocks', () => {
  const r = evaluateReadiness('servicenow-csa', [...mk('incident-mgmt', 5, 90, false), ...mk('work-notes', 5, 80), ...mk('access-control', 3, 80)]);
  assert.strictEqual(r.skills[0].status, 'unreviewed');
  assert.strictEqual(r.ready, false);
});
t('every skill row carries sampleSize', () => evaluateReadiness('servicenow-csa', good).skills.forEach((s) => assert.strictEqual(typeof s.sampleSize, 'number')));
t('overall carries sampleSize', () => assert.strictEqual(evaluateReadiness('servicenow-csa', good).overall.sampleSize, 13));
t('overall score averaged', () => assert.strictEqual(evaluateReadiness('servicenow-csa', good).overall.score, 80));
t('reasons empty when ready', () => assert.deepStrictEqual(evaluateReadiness('servicenow-csa', good).reasons, []));
t('reasons listed when blocked', () => assert.ok(evaluateReadiness('servicenow-csa', []).reasons.length > 0));
t('NaN scores ignored', () => {
  const r = evaluateReadiness('servicenow-csa', [{ skillId: 'incident-mgmt', score: NaN, reviewed: true }]);
  assert.strictEqual(r.skills[0].sampleSize, 0);
});
t('other-skill evidence ignored', () => assert.strictEqual(evaluateReadiness('servicenow-csa', mk('zzz', 9, 99)).skills[0].sampleSize, 0));
t('itil blueprint evaluates', () => {
  const r = evaluateReadiness('itil-4-foundation', [...mk('service-mgmt', 5, 75), ...mk('change-enablement', 3, 75)]);
  assert.strictEqual(r.ready, true);
});
t('evaluate unknown blueprint throws', () => assert.throws(() => evaluateReadiness('nope', [])));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
