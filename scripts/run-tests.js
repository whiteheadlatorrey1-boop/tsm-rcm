#!/usr/bin/env node
'use strict';
// scripts/run-tests.js -- runs every offline regression suite and exits
// non-zero if any fail. Wired to `npm test` and .github/workflows/test.yml.
//
// Runs scripts/test-bpo-*.js, scripts/test-auth-*.js, scripts/test-l1-*.js, scripts/test-enterprise-*.js, scripts/test-production-*.js, scripts/test-csa-*.js, scripts/test-hub-*.js, scripts/test-html-*.js, and scripts/test-construction-*.js,
// each in its own process. Live-server smoke tests are skipped: they need a
// running app and real credentials.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKIP = new Set(['test-bpo-client-wiring-smoke.js']); // needs TSM_CREDENTIAL + a live server

const dir = __dirname;
const files = fs.readdirSync(dir)
  .filter(f => /^test-(bpo|auth|l1|enterprise|production|csa|hub|html|construction)-.*\.js$/.test(f) && !SKIP.has(f))
  .sort();

const env = Object.assign({ TSM_SESSION_SECRET: 'test-session-secret' }, process.env);
let failed = 0;
const started = Date.now();

// Some suites write to tracked registry files under data/ (the SLA admin test
// creates a client and never removes it). Snapshot them and restore afterwards
// so running the tests never leaves a test account behind.
// The L1 audit suites persist state under data/l1-copilot-*.json (audit trail, handoffs, jobs).
// Run twice, or after an interrupted run, they see the earlier records and fail on counts.
// Snapshot whatever is there now, restore it afterwards, and delete files a run created.
const DATA_DIR = path.join(__dirname, '..', 'data');
const GLOBBED = /^l1-copilot-.*\.json$/;
const listGlobbed = () => { try { return fs.readdirSync(DATA_DIR).filter(n => GLOBBED.test(n)).map(n => path.join(DATA_DIR, n)); } catch (e) { return []; } };
const GUARDED = ['data/clients.json', 'data/staff.json'].map(f => path.join(__dirname, '..', f)).concat(listGlobbed());
const snapshots = new Map(GUARDED.map(f => [f, fs.existsSync(f) ? fs.readFileSync(f) : null]));
// Keep the parent alive on Ctrl-C so the loop below can restore before exiting
// (spawnSync blocks the event loop, so this handler never runs code itself).
process.on('SIGINT', () => {});
function restoreGuarded() {
  for (const [f, buf] of snapshots) {
    try {
      if (buf === null) { if (fs.existsSync(f)) fs.unlinkSync(f); }
      else if (!fs.existsSync(f) || !fs.readFileSync(f).equals(buf)) fs.writeFileSync(f, buf);
    } catch (e) { console.error('could not restore ' + f + ': ' + e.message); }
  }
  for (const f of listGlobbed()) {
    if (!snapshots.has(f)) { try { fs.unlinkSync(f); } catch (e) { console.error('could not remove ' + f + ': ' + e.message); } }
  }
}

for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { env, encoding: 'utf8', timeout: 120000 });
  if (r.signal === 'SIGINT') { console.log('\ninterrupted -- restoring files the suites touched'); restoreGuarded(); process.exit(130); }
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  if (r.status === 0) {
    console.log('PASS  ' + f + '  ' + (out[out.length - 1] || '').slice(0, 70));
  } else {
    failed += 1;
    console.log('FAIL  ' + f + '  (exit ' + r.status + (r.error ? ', ' + r.error.message : '') + ')');
    console.log(out.slice(-20).map(l => '      ' + l).join('\n'));
  }
}

console.log('\n' + (files.length - failed) + '/' + files.length + ' suites passed in ' + ((Date.now() - started) / 1000).toFixed(1) + 's');
restoreGuarded();
process.exit(failed ? 1 : 0);
