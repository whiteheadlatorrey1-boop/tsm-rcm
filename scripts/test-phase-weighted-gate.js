'use strict';
const assert = require('assert');
const { getWeightedBlueprint, listWeightedBlueprints } = require('../server/certification/weighted-blueprints');
const { evaluateWeightedReadiness } = require('../server/certification/weighted-gate');

let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
const ID = 'servicenow-csa-2026';
const DOMS = ['platform-nav', 'instance-config', 'collaboration', 'self-service-automation', 'database-security', 'migration-integration'];
const rows = (d, n, s) => Array.from({ length: n }, () => ({ domainId: d, score: s }));
const all = (n, s) => DOMS.flatMap((d) => rows(d, n, s));
const sim = (score, questions = 60, minutes = 85) => ({ score, questions, minutes });
const goodSims = [sim(80), sim(82)];
const ev = (e, s) => evaluateWeightedReadiness(ID, e, s);

t('registry lists the csa blueprint', () => assert.strictEqual(listWeightedBlueprints().length, 1));
t('domain weights sum to 100', () => listWeightedBlueprints().forEach((b) => assert.strictEqual(b.domains.reduce((s, d) => s + d.weight, 0), 100)));
t('csa has the six official weights', () => assert.deepStrictEqual(getWeightedBlueprint(ID).domains.map((d) => d.weight), [7, 10, 20, 20, 30, 13]));
t('csa exam is 60 questions in 90 minutes', () => { const e = getWeightedBlueprint(ID).exam; assert.strictEqual(e.questions, 60); assert.strictEqual(e.minutes, 90); });
t('official pass score is recorded as unpublished', () => assert.strictEqual(getWeightedBlueprint(ID).exam.officialPassScore, null));
t('every domain has topics', () => getWeightedBlueprint(ID).domains.forEach((d) => assert.ok(d.topics.length > 0)));
t('unknown blueprint throws', () => assert.throws(() => getWeightedBlueprint('nope')));
t('strong evidence plus sims is ready', () => assert.strictEqual(ev(all(10, 80), goodSims).ready, true));
t('ready label', () => assert.strictEqual(ev(all(10, 80), goodSims).label, 'CERTIFICATION READY'));
t('weighted score is 80 when all are 80', () => assert.ok(Math.abs(ev(all(10, 80), goodSims).weighted.score - 80) < 1e-9));
t('empty evidence is not ready', () => { const r = ev([], []); assert.strictEqual(r.ready, false); assert.strictEqual(r.label, 'CONTINUE PREP'); });
t('missing a domain blocks and reports coverage', () => {
  const r = ev(DOMS.slice(1).flatMap((d) => rows(d, 10, 90)), goodSims);
  assert.strictEqual(r.ready, false); assert.strictEqual(r.weighted.coveredWeight, 93);
});
t('too few samples blocks', () => { const r = ev([...all(10, 80).filter((e) => e.domainId !== 'collaboration'), ...rows('collaboration', 3, 90)], goodSims); assert.strictEqual(r.ready, false); assert.strictEqual(r.domains[2].status, 'insufficient-samples'); });
t('a failing domain blocks even when the weighted score is high', () => {
  const e = DOMS.flatMap((d) => rows(d, 10, d === 'database-security' ? 50 : 95));
  const r = ev(e, goodSims);
  assert.ok(Math.abs(r.weighted.score - 81.5) < 1e-9);
  assert.strictEqual(r.domains[4].status, 'below-floor'); assert.strictEqual(r.ready, false);
});
t('weighted score below target blocks', () => assert.strictEqual(ev(all(10, 65), goodSims).ready, false));
t('no simulations blocks', () => assert.strictEqual(ev(all(10, 80), []).ready, false));
t('one full simulation blocks', () => assert.strictEqual(ev(all(10, 80), [sim(90)]).ready, false));
t('short simulation is not counted as full', () => assert.strictEqual(ev(all(10, 80), [sim(90, 30), sim(90, 30)]).sims.fullCount, 0));
t('over-time simulation is not counted as full', () => assert.strictEqual(ev(all(10, 80), [sim(90, 60, 120), sim(90, 60, 120)]).sims.fullCount, 0));
t('simulation below target blocks', () => assert.strictEqual(ev(all(10, 80), [sim(80), sim(60)]).ready, false));
t('only the latest simulations are judged', () => assert.strictEqual(ev(all(10, 80), [sim(40), sim(80), sim(85)]).ready, true));
t('invalid scores are ignored', () => assert.strictEqual(ev([{ domainId: 'collaboration', score: NaN }, { domainId: 'collaboration', score: 150 }, { domainId: 'collaboration', score: -5 }], []).domains[2].sampleSize, 0));
t('weakest weighted domain is listed first', () => {
  const e = DOMS.flatMap((d) => rows(d, 10, d === 'database-security' ? 50 : 95));
  assert.strictEqual(ev(e, goodSims).weakDomains[0].domainId, 'database-security');
});
t('null inputs are safe', () => assert.strictEqual(ev(null, null).ready, false));
t('every domain row carries sample size', () => ev(all(10, 80), goodSims).domains.forEach((d) => assert.strictEqual(typeof d.sampleSize, 'number')));
t('result carries the not-the-certification disclaimer', () => assert.ok(/not mean the external certification/.test(ev([], []).disclaimer)));
t('evaluating an unknown blueprint throws', () => assert.throws(() => evaluateWeightedReadiness('nope', [], [])));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
