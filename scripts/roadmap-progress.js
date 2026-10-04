#!/usr/bin/env node
'use strict';

/**
 * roadmap-progress.js - "where am I?" for the TSM workforce / certification
 * roadmap. READ-ONLY: it inspects files and (optionally) runs test files. It
 * never writes, installs, deploys, or touches the network.
 *
 *   node scripts/roadmap-progress.js               fast: files only
 *   node scripts/roadmap-progress.js --run-tests   also run each matched test file
 *   node scripts/roadmap-progress.js --json        machine-readable output
 *
 * Run it from the repo root. Statuses (strict; matches docs/ROADMAP_STATUS.md):
 *   VERIFIED   all required files present AND every matched test passed (needs --run-tests)
 *   FAILING    a matched test failed when run on its own
 *   EXISTS     files present, but tests not run / none found: NOT proof it works
 *   PARTIAL    some required files missing
 *   NOT FOUND  nothing located
 * --run-tests runs ONLY the offline suites that `npm test` itself trusts
 * (scripts/test-(bpo|auth|staffing|phase)-*.js and test/phase0.5/*.test.js, the
 * latter with the same describe/it shim). Other matched tests (live ServiceNow,
 * route tests needing API keys, etc.) are listed as found but NOT run, so
 * missing credentials never show up as a false FAILING.
 * Caution: running tests can create files (e.g. data/*.json). The script warns
 * if it sees new files after a run; it never deletes anything.
 *
 * Paths for items marked (planned) are where the work is EXPECTED to land.
 * If you build it elsewhere, edit the manifest below.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const RUN = ARGS.has('--run-tests');
const AS_JSON = ARGS.has('--json');

function listFiles() {
  try {
    return cp.execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').filter(Boolean);
  } catch (e) {
    const out = [];
    (function walk(dir) {
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (d) {
        if (d.name === 'node_modules' || d.name === '.git') return;
        const rel = dir ? dir + '/' + d.name : d.name;
        if (d.isDirectory()) walk(rel); else out.push(rel);
      });
    })('');
    return out;
  }
}

const FILES = listFiles();
const FILESET = new Set(FILES);
const TESTFILES = FILES.filter(function (f) {
  return /\.js$/.test(f) && (/^scripts\/test-/.test(f) || /^test\//.test(f) || /\.test\.js$/.test(f));
});

function readText(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return null; }
}
function matchFiles(spec) {
  return typeof spec === 'string' ? (FILESET.has(spec) ? [spec] : []) : FILES.filter(function (f) { return spec.test(f); });
}

function isOfflineSuite(rel) {
  return /^scripts\/test-(bpo|auth|staffing|phase)-[^/]*\.js$/.test(rel) || /^test\/phase0\.5\/[^/]*\.test\.js$/.test(rel);
}
const SHIM = 'scripts/phase-test-shim.js';
const testCache = {};
function runTest(rel) {
  if (!(rel in testCache)) {
    const args = /^test\/phase0\.5\//.test(rel) && FILESET.has(SHIM) ? ['-r', path.join(ROOT, SHIM), rel] : [rel];
    const r = cp.spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    testCache[rel] = r.status === 0;
  }
  return testCache[rel];
}

/* ------------------------------------------------------------------ *
 * Manifest. `files`: required (string = exact path, RegExp = any match).
 * `contains`: [{ file, text }] extra proof a file really has the feature.
 * `tests`: RegExps matched against test-file paths.
 * ------------------------------------------------------------------ */
const ITEMS = [
  { id: 'mlo-audit', group: 'Certification content', name: 'MLO content (audit pending)',
    files: ['html/reo-pro/mlo-exam-prep.html', 'html/reo-pro/exam-content.js', 'html/reo-pro/mlo-regulatory-context.js'],
    tests: [/mlo/i] },
  { id: '15a', group: 'Integration spine', name: '15A Readiness -> Workforce Intelligence bridge',
    files: [/tsm-workforce-readiness-integration\.js$/], tests: [/workforce-readiness-integration-phase15a/] },
  { id: '15b', group: 'Integration spine', name: '15B Command Center integration',
    files: ['server/workforce-readiness-view.js', 'routes/staffing-engine.js', 'html/tsm-workforce-intelligence-command-center.html'],
    contains: [{ file: 'routes/staffing-engine.js', text: 'readiness-intelligence' },
               { file: 'html/tsm-workforce-intelligence-command-center.html', text: 'readiness-intelligence' }],
    tests: [/staffing-readiness-intelligence/] },
  { id: '15c', group: 'Integration spine', name: '15C Training -> Workforce Intelligence',
    files: [/tsm-professional-readiness-gap-training\.js$/, /tsm-competency-evidence-scorer\.js$/], tests: [/competency-evidence|gap-training/] },
  { id: '15d', group: 'Integration spine', name: '15D Candidate Registry stays canonical',
    files: [/tsm-candidate-registry-bridge\.js$/, 'server/candidate-registry-service.js'], tests: [/candidate-registry/] },
  { id: '15e', group: 'Integration spine', name: '15E Staffing -> Workforce Intelligence',
    files: ['routes/staffing-engine.js'], tests: [/staffing/] },
  { id: '15f', group: 'Integration spine', name: '15F CRM -> Workforce Intelligence',
    files: [/tsm-crm-/], tests: [/crm-operations-phase12/] },
  { id: '15g', group: 'Integration spine', name: '15G ATS/HRIS/WFM -> Workforce Intelligence',
    files: [/tsm-ats-/], tests: [/ats-hris-wfm-phase13/] },
  { id: '15h', group: 'Integration spine', name: '15H End-to-end workforce journey test',
    files: [], tests: [/(workforce|candidate).*(journey|end-to-end|e2e)|(journey|end-to-end).*(workforce|candidate)/i] },
  { id: 'cert-found', group: 'Certification engine', name: 'Evidence-based blueprint registry + readiness gate',
    files: ['server/certification/blueprint-registry.js', 'server/certification/readiness-gate.js'],
    tests: [/test-phase-certification-gate/] },
  { id: 'cert-weighted', group: 'Certification engine', name: 'Weighted exam-domain gate + blueprints',
    files: ['server/certification/weighted-gate.js', 'server/certification/weighted-blueprints.js'],
    tests: [/weighted/i, /csa-readiness/i] },
  { id: 'cert-bank', group: 'Certification engine', name: 'Question bank engine + banks',
    files: ['server/certification/question-bank.js', /^server\/certification\/question-banks\/[^/]+\.json$/],
    tests: [/csa-question-bank/] },
  { id: 'cert-sim', group: 'Certification engine', name: 'Timed simulation + sim page + sim record',
    files: ['server/certification/simulation.js', 'server/certification/sim-page.js', 'server/certification/sim-record.js'],
    tests: [/csa-sim-page/] },
  { id: 'cert-evidence', group: 'Certification engine', name: 'Work-note evidence (production work -> certification evidence)',
    files: ['server/certification/work-note-evidence.js'], tests: [/work-note/i] },
  { id: 'cert-wire', group: 'Certification engine', name: 'Wiring: certification route/event (planned)',
    files: [/^routes\/certification/], tests: [/certification.*(route|event|wiring)/i] },
  { id: 'cert-dash', group: 'Certification engine', name: 'Certification dashboard / Command Center view (planned)',
    files: [/^html\/.*certification.*(dashboard|command)/i], tests: [] },
  { id: 'crcr', group: 'Certification adapters', name: 'CRCR blueprint/bank (planned)',
    files: [/^(server\/certification|data\/training-intelligence\/providers)\/.*crcr/i], tests: [/crcr/i] },
  { id: 'csa', group: 'Certification adapters', name: 'ServiceNow CSA reviewed question bank + sim',
    files: ['scripts/csa-bank.js', 'docs/CSA_QUESTION_BANK.md', /^server\/certification\/question-banks\/servicenow-csa/],
    tests: [/csa-question-bank|csa-sim-page/] },
  { id: 'aplus', group: 'Certification adapters', name: 'CompTIA A+ content',
    files: [/^html\/l1-copilot\/aplus\//], tests: [/a\+|aplus/i] },
  { id: 'netplus', group: 'Certification adapters', name: 'CompTIA Network+ content',
    files: [/network-?plus|net-?plus|network\+/i], tests: [/network-?plus|netplus/i] },
  { id: 'sap', group: 'Certification adapters', name: 'SAP content',
    files: [/sap-strategist|sap-how-?to/i], tests: [/test-sap|sap-/i] },
  { id: 'm365', group: 'Existing verticals', name: 'Microsoft 365 academy',
    files: [/tsm-m365-academy/], tests: [/m365-academy-phase10/] },
  { id: 'hr', group: 'Existing verticals', name: 'HR Operations',
    files: [/tsm-hr-/], tests: [/hr-operations-phase11/] },
  { id: 'l1', group: 'Existing verticals', name: 'L1 copilot (BPO/IT operations)',
    files: [/^html\/l1-copilot\//], tests: [/l1/i] },
  { id: 'prod-evidence', group: 'Production evidence', name: 'Operational evidence feeds readiness (l1 events)',
    files: ['server/readiness/professional-readiness-model.js', 'server/readiness/evidence-layer.js'],
    contains: [{ file: 'server/readiness/professional-readiness-model.js', text: 'l1_resolution' }],
    tests: [/readiness/i] },
];

const NEXT_ORDER = ['mlo-audit', '15h', 'cert-wire', 'cert-dash', 'crcr', 'aplus', 'netplus', 'cert-evidence', 'prod-evidence'];

function evaluate(item) {
  const missing = [];
  let found = 0;
  (item.files || []).forEach(function (spec) {
    if (matchFiles(spec).length) found++; else missing.push(String(spec));
  });
  (item.contains || []).forEach(function (c) {
    const t = readText(c.file);
    if (t !== null && t.indexOf(c.text) !== -1) found++; else missing.push(c.file + ' lacks "' + c.text + '"');
  });
  const required = (item.files || []).length + (item.contains || []).length;
  const tests = [];
  (item.tests || []).forEach(function (re) { TESTFILES.forEach(function (f) { if (re.test(f) && tests.indexOf(f) === -1) tests.push(f); }); });

  let status, note = '';
  if (required === 0) { status = tests.length ? 'EXISTS' : 'NOT FOUND'; }
  else if (found === 0) status = 'NOT FOUND';
  else if (found < required) { status = 'PARTIAL'; note = 'missing: ' + missing.join('; '); }
  else status = 'EXISTS';

  const offline = tests.filter(isOfflineSuite);
  const other = tests.length - offline.length;
  let passed = null;
  if (RUN && offline.length && status !== 'NOT FOUND') {
    const results = offline.map(function (t) { return { t: t, ok: runTest(t) }; });
    passed = results.filter(function (r) { return r.ok; }).length;
    const failed = results.filter(function (r) { return !r.ok; }).map(function (r) { return r.t; });
    if (failed.length) { status = 'FAILING'; note = 'failed: ' + failed.join(', '); }
    else if (status === 'EXISTS') { status = 'VERIFIED'; note = offline.length + ' offline test file(s) passed'; }
  }
  if (status === 'EXISTS') {
    if (!tests.length) note = 'no tests found';
    else if (!RUN && offline.length) note = offline.length + ' offline test file(s) found, not run';
    else if (!offline.length) note = tests.length + ' test file(s) found, none in the offline suite (need env/credentials; not run)';
  }
  if (other && status !== 'NOT FOUND') note += (note ? '; ' : '') + other + ' other test file(s) not run';
  return { id: item.id, group: item.group, name: item.name, status: status, tests: tests.length, testsPassed: passed, note: note };
}

const before = new Set(FILES);
const rows = ITEMS.map(evaluate);
const created = RUN ? listFiles().filter(function (f) { return !before.has(f); }) : [];
const bp = readText('server/certification/blueprint-registry.js') || '';
const manual = [
  { item: 'CRCR content domains verified against HFMA', done: /domains:\s*'verified'/.test(bp) },
  { item: 'MLO audit report reviewed; add-on vs build decided', done: false },
  { item: 'L1 pilot client identified, scoped and priced', done: false },
  { item: 'Worker-consent / data-fairness review before production-evidence staffing', done: false },
  { item: 'NMLS pre-licensure education rules confirmed before MLO marketing', done: false },
  { item: 'Employment/IP agreement checked before using any employer ticket data', done: false },
];

const next = NEXT_ORDER.map(function (id) { return rows.find(function (r) { return r.id === id; }); })
  .find(function (r) { return r && r.status !== 'VERIFIED'; });

if (AS_JSON) {
  console.log(JSON.stringify({ ranTests: RUN, createdFiles: created, rows: rows, manual: manual, nextSuggested: next ? next.id : null }, null, 2));
} else {
  const w = Math.max.apply(null, rows.map(function (r) { return r.name.length; }));
  console.log('\nTSM roadmap progress  (' + (RUN ? 'tests RUN' : 'files only; add --run-tests for proof') + ')');
  console.log('repo: ' + ROOT + '  files tracked: ' + FILES.length + '\n');
  let group = '';
  rows.forEach(function (r) {
    if (r.group !== group) { group = r.group; console.log('\n' + group.toUpperCase()); }
    console.log('  ' + r.name.padEnd(w) + '  ' + r.status.padEnd(9) + (r.note ? '  ' + r.note : ''));
  });
  const counts = {};
  rows.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
  console.log('\nSUMMARY  ' + Object.keys(counts).map(function (k) { return k + ': ' + counts[k]; }).join('   '));
  console.log('\nMANUAL / NOT DETECTABLE BY SCRIPT');
  manual.forEach(function (m) { console.log('  [' + (m.done ? 'x' : ' ') + '] ' + m.item); });
  console.log('\nNEXT SUGGESTED: ' + (next ? next.name + ' (' + next.status + ')' : 'everything in the list is VERIFIED'));
  if (created.length) console.log('WARNING: running tests created new files (delete if unwanted): ' + created.join(', ') + '\n');
  console.log('Reminder: EXISTS is not proof it works. Update docs/ROADMAP_STATUS.md from this output.\n');
}
process.exit(rows.some(function (r) { return r.status === 'FAILING'; }) ? 1 : 0);
