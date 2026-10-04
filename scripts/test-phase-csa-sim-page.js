'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const { loadBank } = require('../server/certification/question-bank');
const { buildSimulation } = require('../server/certification/simulation');
const { renderSimulationPage, safeJson } = require('../server/certification/sim-page');
const { parseRecord, regrade, storeResult, loadResults, readinessFromResults } = require('../server/certification/sim-record');

let passed = 0, failed = 0;
function t(name, fn) { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
const ID = 'servicenow-csa-2026';
const ROOT = path.join(__dirname, '..');
const realBank = loadBank(ID);
const bank = realBank.map((q) => Object.assign({}, q, { reviewed: false }));
const reviewedBank = realBank.map((q) => Object.assign({}, q, { reviewed: true }));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'csa-sim-'));
const perfect = (sim) => { const a = {}; sim.items.forEach((i) => { a[i.qid] = i.correct; }); return a; };
const rec = (seed, b, minutes) => ({ v: 1, blueprintId: ID, seed, minutes: minutes || 80, answers: perfect(buildSimulation(ID, b, { seed })) });
const html = renderSimulationPage(buildSimulation(ID, bank, { seed: 11 }));

t('safeJson escapes script-breaking characters', () => {
  const s = safeJson({ a: '</script><b>&' + String.fromCharCode(0x2028) });
  assert.ok(!/<|>|&/.test(s) && s.indexOf(String.fromCharCode(0x2028)) < 0);
  assert.strictEqual(JSON.parse(s).a, '</script><b>&' + String.fromCharCode(0x2028));
});
t('page is a complete html document with one script block', () => {
  assert.ok(/^<!doctype html>/i.test(html));
  assert.strictEqual(html.split('<script>').length, 2);
  assert.strictEqual(html.split('</script>').length, 2);
});
t('page script compiles', () => { new vm.Script(html.split('<script>')[1].split('</script>')[0]); });
t('embedded data round-trips', () => {
  const m = html.match(/var DATA = (.*);\r?\n/);
  const d = JSON.parse(m[1]);
  assert.strictEqual(d.seed, 11); assert.strictEqual(d.items.length, 60); assert.strictEqual(d.domains.length, 6);
  assert.strictEqual(d.minutes, 90);
});
t('hostile question text cannot break out of the script', () => {
  const sim = buildSimulation(ID, bank, { seed: 12 });
  sim.items[0].stem = '</script><img src=x onerror=alert(1)>';
  const h = renderSimulationPage(sim);
  assert.strictEqual(h.split('</script>').length, 2);
  assert.ok(h.indexOf('<img src=x') < 0);
});
t('page labels unreviewed runs as practice only', () => assert.ok(html.indexOf('PRACTICE ONLY') > 0));
t('page does not touch the network', () => assert.ok(!/fetch\(|XMLHttpRequest|http:\/\/|https:\/\//.test(html)));
t('parseRecord accepts a good record', () => assert.strictEqual(parseRecord(JSON.stringify(rec(1, bank))).seed, 1));
t('parseRecord rejects bad input', () => {
  assert.throws(() => parseRecord('not json'), /valid JSON/);
  assert.throws(() => parseRecord('{"v":2}'), /version/);
  assert.throws(() => parseRecord(JSON.stringify(Object.assign(rec(1, bank), { seed: -1 }))), /seed/);
  assert.throws(() => parseRecord(JSON.stringify(Object.assign(rec(1, bank), { minutes: 0 }))), /minutes/);
  assert.throws(() => parseRecord(JSON.stringify(Object.assign(rec(1, bank), { answers: [] }))), /answers/);
});
t('regrade scores perfect answers 100', () => { const r = regrade(rec(3, bank), bank); assert.strictEqual(r.graded.score, 100); assert.strictEqual(r.graded.correct, 60); });
t('regrade rejects answers for questions outside the simulation', () => {
  const r = rec(3, bank); r.answers['zzz-1'] = [0];
  assert.throws(() => regrade(r, bank), /not in this simulation/);
});
t('evidence excludes unreviewed questions', () => assert.strictEqual(regrade(rec(4, bank), bank).evidence.length, 0));
t('evidence includes reviewed questions', () => assert.strictEqual(regrade(rec(4, reviewedBank), reviewedBank).evidence.length, 60));
t('sim record carries the unreviewed count', () => assert.strictEqual(regrade(rec(5, bank), bank).graded.simRecord.unreviewedQuestions, 60));
t('storeResult writes once and refuses a duplicate', () => {
  const dir = tmp(); const r = rec(6, reviewedBank);
  const file = storeResult(r, regrade(r, reviewedBank), dir);
  assert.ok(fs.existsSync(file));
  assert.throws(() => storeResult(r, regrade(r, reviewedBank), dir), /already recorded/);
});
t('three reviewed full runs make the gate ready', () => {
  const dir = tmp();
  [21, 22, 23].forEach((s) => { const r = rec(s, reviewedBank); storeResult(r, regrade(r, reviewedBank), dir); });
  const out = readinessFromResults(ID, loadResults(ID, dir));
  assert.strictEqual(out.sims.fullCount, 3); assert.strictEqual(out.ready, true);
});
t('one reviewed run is not enough', () => {
  const dir = tmp(); const r = rec(31, reviewedBank); storeResult(r, regrade(r, reviewedBank), dir);
  const out = readinessFromResults(ID, loadResults(ID, dir));
  assert.strictEqual(out.ready, false); assert.strictEqual(out.sims.fullCount, 1);
});
t('unreviewed runs never make the gate ready', () => {
  const dir = tmp();
  [41, 42, 43].forEach((s) => { const r = rec(s, bank); storeResult(r, regrade(r, bank), dir); });
  const out = readinessFromResults(ID, loadResults(ID, dir));
  assert.strictEqual(out.ready, false); assert.strictEqual(out.sims.fullCount, 0);
});
t('an over-time run does not count', () => {
  const dir = tmp(); [51, 52].forEach((s) => { const r = rec(s, reviewedBank, 120); storeResult(r, regrade(r, reviewedBank), dir); });
  assert.strictEqual(readinessFromResults(ID, loadResults(ID, dir)).sims.fullCount, 0);
});
t('loadResults on a missing folder is empty', () => assert.deepStrictEqual(loadResults(ID, path.join(tmp(), 'nope')), []));
t('page generator writes a page and is deterministic per seed', () => {
  const a = path.join(tmp(), 'a.html'), b = path.join(tmp(), 'b.html');
  cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'csa-sim-page.js'), '--seed', '5', '--out', a]);
  cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'csa-sim-page.js'), '--seed', '5', '--out', b]);
  assert.strictEqual(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'));
  assert.ok(fs.readFileSync(a, 'utf8').indexOf('"seed":5') > 0);
});
t('page generator rejects a bad seed', () => assert.throws(() => cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'csa-sim-page.js'), '--seed', 'abc', '--out', path.join(tmp(), 'x.html')], { stdio: 'pipe' })));
t('record command and readiness report work end to end', () => {
  const dir = tmp(); const env = Object.assign({}, process.env, { CSA_RESULTS_DIR: dir });
  const input = JSON.stringify(rec(61, realBank));
  const out = cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'csa-record.js')], { input, env, encoding: 'utf8' });
  assert.ok(/Recorded run 61: 100%/.test(out));
  assert.throws(() => cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'csa-record.js')], { input, env, stdio: 'pipe' }));
  const rep = cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'csa-readiness.js')], { env, encoding: 'utf8' });
  assert.ok(/CONTINUE PREP/.test(rep) && /Runs recorded: 1/.test(rep));
});
t('record command rejects empty input', () => assert.throws(() => cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'csa-record.js')], { input: '', stdio: ['pipe', 'pipe', 'pipe'], env: Object.assign({}, process.env, { CSA_RESULTS_DIR: tmp() }) })));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
