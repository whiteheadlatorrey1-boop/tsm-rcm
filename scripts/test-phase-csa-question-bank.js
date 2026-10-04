'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getWeightedBlueprint } = require('../server/certification/weighted-blueprints');
const { evaluateWeightedReadiness } = require('../server/certification/weighted-gate');
const { loadBank, markReviewed, validateBank, bankFile } = require('../server/certification/question-bank');
const { quotas, bankCoverage, buildSimulation, gradeSimulation } = require('../server/certification/simulation');

let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
const ID = 'servicenow-csa-2026';
const bp = getWeightedBlueprint(ID);
const bank = loadBank(ID);
const perfect = (sim) => { const a = {}; sim.items.forEach((i) => { a[i.qid] = i.correct; }); return a; };
const wrong = (sim) => { const a = {}; sim.items.forEach((i) => { const bad = i.options.map((_, k) => k).find((k) => !i.correct.includes(k)); a[i.qid] = [bad]; }); return a; };
const reviewedBank = bank.map((q) => Object.assign({}, q, { reviewed: true }));

t('bank loads at least 120 questions', () => assert.ok(bank.length >= 120));
t('bank passes validation', () => assert.deepStrictEqual(validateBank(bank, bp), []));
t('question ids are unique', () => assert.strictEqual(new Set(bank.map((q) => q.id)).size, bank.length));
t('every question has a reviewed flag', () => assert.ok(bank.every((q) => typeof q.reviewed === 'boolean')));
t('bank has single and multi questions', () => { assert.ok(bank.some((q) => q.type === 'single')); assert.ok(bank.some((q) => q.type === 'multi' && q.correct.length >= 2)); });
t('quotas for 60 questions follow the weights', () => assert.deepStrictEqual(Object.values(quotas(bp, 60)), [4, 6, 12, 12, 18, 8]));
t('quotas always sum to the total', () => [10, 20, 33, 60, 75, 100].forEach((n) => assert.strictEqual(Object.values(quotas(bp, n)).reduce((s, x) => s + x, 0), n)));
t('bank covers every domain quota', () => bankCoverage(bank, bp).forEach((c) => assert.ok(c.have >= c.need, c.domainId + ' ' + c.have + '/' + c.need)));
t('validation catches a bad bank', () => {
  const bad = [{ id: 'x', domainId: 'nope', type: 'single', stem: '', options: ['a', 'b'], correct: [5], explanation: '' }, { id: 'x', domainId: 'collaboration', type: 'multi', stem: 's', options: ['a', 'b', 'c'], correct: [0], explanation: 'e' }];
  const p = validateBank(bad, bp);
  assert.ok(p.some((m) => /unknown domain/.test(m)) && p.some((m) => /duplicate id/.test(m)) && p.some((m) => /bad correct/.test(m)) && p.some((m) => /multi needs/.test(m)));
});
t('simulation has 60 items', () => assert.strictEqual(buildSimulation(ID, bank, { seed: 1 }).items.length, 60));
t('simulation domain counts match quotas', () => {
  const sim = buildSimulation(ID, bank, { seed: 2 }); const q = quotas(bp, 60);
  bp.domains.forEach((d) => assert.strictEqual(sim.items.filter((i) => i.domainId === d.id).length, q[d.id]));
});
t('same seed gives the same simulation', () => assert.deepStrictEqual(buildSimulation(ID, bank, { seed: 7 }), buildSimulation(ID, bank, { seed: 7 })));
t('different seeds give different order', () => assert.notDeepStrictEqual(buildSimulation(ID, bank, { seed: 7 }).items.map((i) => i.qid), buildSimulation(ID, bank, { seed: 8 }).items.map((i) => i.qid)));
t('correct answer position varies across seeds', () => {
  const pos = new Set();
  for (let s = 0; s < 30; s++) { buildSimulation(ID, bank, { seed: s }).items.filter((i) => i.type === 'single').forEach((it) => pos.add(it.correct[0])); }
  assert.ok(pos.size > 1);
});
t('short bank throws unless allowed', () => {
  const short = bank.filter((q) => q.domainId !== 'database-security');
  assert.throws(() => buildSimulation(ID, short, { seed: 1 }), /short in database-security/);
  assert.ok(buildSimulation(ID, short, { seed: 1, allowShort: true }).items.length < 60);
});
t('perfect answers score 100', () => { const s = buildSimulation(ID, bank, { seed: 3 }); const g = gradeSimulation(s, perfect(s), 80); assert.strictEqual(g.score, 100); assert.strictEqual(g.correct, 60); });
t('all wrong answers score 0', () => { const s = buildSimulation(ID, bank, { seed: 3 }); assert.strictEqual(gradeSimulation(s, wrong(s), 80).score, 0); });
t('unanswered questions are wrong', () => { const s = buildSimulation(ID, bank, { seed: 3 }); assert.strictEqual(gradeSimulation(s, {}, 80).correct, 0); });
t('multi-select gets no partial credit', () => {
  const s = buildSimulation(ID, bank, { seed: 3 }); const a = perfect(s); const m = s.items.find((i) => i.type === 'multi');
  a[m.qid] = [m.correct[0]];
  assert.strictEqual(gradeSimulation(s, a, 80).correct, 59);
});
t('per-domain results add up', () => { const s = buildSimulation(ID, bank, { seed: 4 }); const g = gradeSimulation(s, perfect(s), 80); assert.strictEqual(g.domains.reduce((n, d) => n + d.total, 0), 60); g.domains.forEach((d) => assert.strictEqual(d.score, 100)); });
t('grading produces one evidence row per question', () => { const s = buildSimulation(ID, bank, { seed: 4 }); const g = gradeSimulation(s, perfect(s), 80); assert.strictEqual(g.domainEvidence.length, 60); assert.ok(g.domainEvidence.every((e) => e.score === 100)); });
t('sim record flags unreviewed questions', () => { const s = buildSimulation(ID, bank.map((q) => Object.assign({}, q, { reviewed: false })), { seed: 5 }); assert.strictEqual(gradeSimulation(s, perfect(s), 80).simRecord.unreviewedQuestions, 60); });
t('gate ignores a simulation with unreviewed questions', () => {
  const s = buildSimulation(ID, bank, { seed: 5 }); const r = gradeSimulation(s, perfect(s), 80).simRecord;
  assert.strictEqual(evaluateWeightedReadiness(ID, [], [r, r]).sims.fullCount, 0);
});
t('gate counts a fully reviewed full simulation', () => {
  const s = buildSimulation(ID, reviewedBank, { seed: 5 }); const r = gradeSimulation(s, perfect(s), 80).simRecord;
  assert.strictEqual(r.unreviewedQuestions, 0);
  assert.strictEqual(evaluateWeightedReadiness(ID, [], [r, r]).sims.fullCount, 2);
});
t('gate rejects an over-time reviewed simulation', () => {
  const s = buildSimulation(ID, reviewedBank, { seed: 5 }); const r = gradeSimulation(s, perfect(s), 120).simRecord;
  assert.strictEqual(evaluateWeightedReadiness(ID, [], [r, r]).sims.fullCount, 0);
});
t('gate rejects a short reviewed simulation', () => {
  const s = buildSimulation(ID, reviewedBank, { seed: 5, questions: 20 }); const r = gradeSimulation(s, perfect(s), 30).simRecord;
  assert.strictEqual(evaluateWeightedReadiness(ID, [], [r, r]).sims.fullCount, 0);
});
t('markReviewed records the reviewer on a copy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-'));
  fs.copyFileSync(bankFile(ID), path.join(dir, ID + '.json'));
  const before = loadBank(ID, dir);
  const expected = new Set(before.filter((q) => q.reviewed).map((q) => q.id)).add('nav-1').size;
  markReviewed(ID, 'nav-1', 'Pat Reviewer', dir);
  const b = loadBank(ID, dir);
  assert.strictEqual(b.find((q) => q.id === 'nav-1').reviewedBy, 'Pat Reviewer');
  assert.strictEqual(b.filter((q) => q.reviewed).length, expected);
  assert.strictEqual(b.length, before.length);
});
t('every domain has at least 10 spare questions beyond its quota', () => bankCoverage(bank, bp).forEach((c) => assert.ok(c.have >= c.need + 10, c.domainId)));
t('different seeds draw different question sets', () => assert.notDeepStrictEqual(buildSimulation(ID, bank, { seed: 1 }).items.map((i) => i.qid).sort(), buildSimulation(ID, bank, { seed: 2 }).items.map((i) => i.qid).sort()));
t('markReviewed rejects a blank reviewer', () => assert.throws(() => markReviewed(ID, 'nav-1', '  ', os.tmpdir()), /reviewer name required/));
t('markReviewed rejects an unknown question', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-'));
  fs.copyFileSync(bankFile(ID), path.join(dir, ID + '.json'));
  assert.throws(() => markReviewed(ID, 'zzz-9', 'Pat', dir), /Unknown question/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
