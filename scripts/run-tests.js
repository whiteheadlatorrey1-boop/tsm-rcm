#!/usr/bin/env node
'use strict';
// scripts/run-tests.js -- runs every offline regression suite and exits
// non-zero if any fail. Wired to `npm test` and .github/workflows/test.yml.
//
// Runs scripts/test-bpo-*.js and scripts/test-auth-*.js, each in its own
// process. Live-server smoke tests are skipped: they need a running app
// and real credentials.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKIP = new Set(['test-bpo-client-wiring-smoke.js']); // needs TSM_CREDENTIAL + a live server

const dir = __dirname;
const files = fs.readdirSync(dir)
  .filter(f => /^test-(bpo|auth)-.*\.js$/.test(f) && !SKIP.has(f))
  .sort();

const env = Object.assign({ TSM_SESSION_SECRET: 'test-session-secret' }, process.env);
let failed = 0;
const started = Date.now();

// Some suites write to tracked registry files under data/ (the SLA admin test
// creates a client and never removes it). Snapshot them and restore afterwards
// so running the tests never leaves a test account behind.
const GUARDED = ['data/clients.json', 'data/staff.json'].map(f => path.join(__dirname, '..', f));
const snapshots = new Map(GUARDED.map(f => [f, fs.existsSync(f) ? fs.readFileSync(f) : null]));
function restoreGuarded() {
  for (const [f, buf] of snapshots) {
    try {
      if (buf === null) { if (fs.existsSync(f)) fs.unlinkSync(f); }
      else if (!fs.existsSync(f) || !fs.readFileSync(f).equals(buf)) fs.writeFileSync(f, buf);
    } catch (e) { console.error('could not restore ' + f + ': ' + e.message); }
  }
}

for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { env, encoding: 'utf8', timeout: 120000 });
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
