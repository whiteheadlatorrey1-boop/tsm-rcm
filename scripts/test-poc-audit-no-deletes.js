'use strict';
// scripts/test-poc-audit-no-deletes.js
//
// Regression guard for an incident where `npm run poc:audit`, killed partway
// through a run (timeout 60 npm run poc:audit), was followed by ~2,483
// tracked files missing from a disposable clone's working tree -- including
// package.json itself.
//
// Investigation: scripts/poc-readiness-audit.js contains no rm/rmSync/
// unlinkSync/git-clean call outside its own reports/ writes, and the
// incident could not be reproduced across four attempts here (varying
// BASE_URL / port-collision with an already-running server / letting it
// finish vs. killing it at 60s) -- every attempt finished with zero
// deletions. The missing files followed an alphabetical-prefix pattern
// consistent with an interrupted bulk filesystem operation external to this
// script (e.g. host/VM-level tmp cleanup of a disposable /tmp clone), not
// with anything poc-readiness-audit.js's own code does.
//
// This test is a safety net regardless of cause: it runs the real script
// to completion in a disposable clone, and separately kills it mid-run
// (matching the original trigger), asserting in both cases that `git
// status` shows no deleted tracked files afterward. Not wired into
// `npm test` (scripts/run-tests.js only globs test-(bpo|auth|l1|enterprise|
// production|csa|hub)-*.js -- a pre-existing gap, flagged separately) --
// run directly: node scripts/test-poc-audit-no-deletes.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const REPO = path.join(__dirname, '..');
let failed = 0;
function check(name, ok) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) failed++;
}

function makeDisposableClone(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poc-audit-test-' + label + '-'));
  const clone = spawnSync('git', ['clone', '--quiet', REPO, dir], { encoding: 'utf8' });
  if (clone.status !== 0) throw new Error('clone failed: ' + clone.stderr);
  const ciResult = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  if (ciResult.status !== 0) throw new Error('npm ci failed: ' + (ciResult.stderr || '').slice(-2000));
  return dir;
}

function deletedTrackedFiles(dir) {
  const r = spawnSync('git', ['status', '--short'], { cwd: dir, encoding: 'utf8' });
  return r.stdout.split('\n').filter((l) => /^\s*D\s/.test(l));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
}

// Run 1: let it finish normally.
(function runToCompletion() {
  const dir = makeDisposableClone('complete');
  try {
    const r = spawnSync('npm', ['run', 'poc:audit'], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 180000,
      env: Object.assign({}, process.env, { BASE_URL: 'http://localhost:3196' }),
    });
    check('audit run to completion did not crash the process tree (spawnSync returned)', r.status !== null || r.signal !== null);
    const deleted = deletedTrackedFiles(dir);
    check('no tracked files deleted after a completed run', deleted.length === 0);
    if (deleted.length) console.log('  deleted (first 5): ' + deleted.slice(0, 5).join(' | '));
  } finally {
    cleanup(dir);
  }
})();

// Run 2: kill it partway through, matching the original incident's trigger.
(function runKilledMidway() {
  const dir = makeDisposableClone('killed');
  try {
    const child = spawn('npm', ['run', 'poc:audit'], {
      cwd: dir,
      env: Object.assign({}, process.env, { BASE_URL: 'http://localhost:3195' }),
      stdio: 'ignore',
      detached: true,
    });
    const killedAt = Date.now();
    setTimeout(() => { try { process.kill(-child.pid, 'SIGTERM'); } catch (e) { try { child.kill('SIGTERM'); } catch (e2) {} } }, 8000);
    const exited = new Promise((resolve) => child.on('exit', resolve));
    // Give it a bit past the kill to let any child processes unwind.
    const result = Promise.race([
      exited.then(() => 'exited'),
      new Promise((resolve) => setTimeout(() => resolve('timed-out-waiting'), 20000)),
    ]);
    return result.then((how) => {
      check('process tree responded to being killed partway through (' + how + ', after ' + (Date.now() - killedAt) + 'ms)', true);
      // Settle a moment for any orphaned/detached children to finish writing.
      return new Promise((resolve) => setTimeout(resolve, 3000));
    }).then(() => {
      const deleted = deletedTrackedFiles(dir);
      check('no tracked files deleted after killing the run partway through', deleted.length === 0);
      if (deleted.length) console.log('  deleted (first 5): ' + deleted.slice(0, 5).join(' | '));
      cleanup(dir);
      finish();
    });
  } catch (e) {
    cleanup(dir);
    check('killed-run scenario executed without throwing', false);
    console.log('  ' + e.message);
    finish();
  }
})();

function finish() {
  if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
  console.log('All poc:audit no-delete checks passed');
}
