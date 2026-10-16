'use strict';
// Regression test for scripts/verify-staffing-pipeline.js's production
// guard: it creates and deletes real records, and only cleans them up on
// the happy path -- any check/api() call throwing partway through skips
// cleanup entirely, leaving an orphaned "Verify Script Candidate (...)"
// record behind in whatever registry BASE_URL points at. That's exactly
// how the real production candidate registry ended up with orphaned
// records from this script before the guard existed.
//
// Runs fully offline: every case here is spawned as a child process with
// no real credentials, so it either refuses before any network call (the
// cases under test), or -- for the "didn't refuse" cases -- fails fast on
// the credential check in login() before ever reaching the network. No
// case in this file makes a real HTTP request.
//
// scripts/verify-staffing-pipeline.js is the only script in this repo that
// both defaults its target to a real BASE_URL and POSTs to /api/candidates
// -- every other candidate-creating script (test-auth-candidate-registry-routes.js,
// test-phase-candidate-route-auth.js, test-phase-candidate-write-token.js,
// test-phase-aplus-candidate-route.js) boots its own in-process server on
// an ephemeral localhost port and has no BASE_URL concept at all, so none
// of them can reach production regardless of this guard.

const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'verify-staffing-pipeline.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

function run(env, args) {
  const base = Object.assign({}, process.env);
  // Never let a real credential or an inherited NODE_ENV leak in from the
  // parent shell for these offline assertions -- every case here should
  // resolve deterministically from just what this call passes in `env`.
  delete base.VERIFY_AUTH_CODE;
  delete base.TSM_ADMIN_PASSWORD;
  delete base.NODE_ENV;
  delete base.BASE_URL;
  const childEnv = Object.assign(base, env);
  // Object.assign keeps a key set to `undefined` rather than removing it;
  // strip any such keys so the child process genuinely sees them unset
  // (e.g. BASE_URL: undefined must fall through to the script's own
  // https://tsm-shell.fly.dev default, not the literal string "undefined").
  Object.keys(childEnv).forEach(k => { if (childEnv[k] === undefined) delete childEnv[k]; });
  return spawnSync(process.execPath, [SCRIPT, ...(args || [])], { env: childEnv, encoding: 'utf8', timeout: 10000 });
}

// --- refuses: BASE_URL unset (defaults to production) ---
{
  const r = run({ BASE_URL: undefined });
  ok(r.status === 1, 'no BASE_URL override (defaults to production) exits 1 (got ' + r.status + ')');
  ok(/Refusing to run/.test(r.stderr), 'prints the refusal message (got: ' + r.stderr.slice(0, 120) + ')');
  ok(!/POST \/api\/auth\/login/.test(r.stdout), 'never attempts to log in -- refused before any network call');
}

// --- refuses: BASE_URL explicitly set to production ---
{
  const r = run({ BASE_URL: 'https://tsm-shell.fly.dev' });
  ok(r.status === 1, 'explicit production BASE_URL exits 1 (got ' + r.status + ')');
  ok(/Refusing to run/.test(r.stderr), 'prints the refusal message');
}

// --- refuses: a production-looking URL with different casing/scheme still matches ---
{
  const r = run({ BASE_URL: 'HTTPS://TSM-SHELL.FLY.DEV' });
  ok(r.status === 1, 'case-insensitive match on tsm-shell.fly.dev still refuses (got ' + r.status + ')');
}

// --- refuses: NODE_ENV=production even against a non-production-looking URL ---
{
  const r = run({ BASE_URL: 'http://localhost:9999', NODE_ENV: 'production' });
  ok(r.status === 1, 'NODE_ENV=production refuses even with a non-prod-looking BASE_URL (got ' + r.status + ')');
  ok(/NODE_ENV=production/.test(r.stderr), 'refusal message names NODE_ENV=production as the reason');
}

// --- does NOT refuse: a real non-production BASE_URL, no NODE_ENV=production ---
// (gets past the guard, then fails fast on login()'s own credential check --
// a different, clearly distinguishable error, proving the guard didn't fire)
{
  const r = run({ BASE_URL: 'http://localhost:9999' });
  ok(r.status === 1, 'still exits 1 overall (no credentials provided) (got ' + r.status + ')');
  ok(!/Refusing to run/.test(r.stderr), 'does NOT print the production-refusal message for a non-prod target');
  ok(/No credential to authenticate with/.test(r.stderr), 'instead fails on the unrelated missing-credential check (got: ' + r.stderr.slice(0, 160) + ')');
}

// --- does NOT refuse: --allow-prod bypasses the guard for a production BASE_URL ---
{
  const r = run({ BASE_URL: 'https://tsm-shell.fly.dev' }, ['--allow-prod']);
  ok(!/Refusing to run/.test(r.stderr), '--allow-prod bypasses the guard (got stderr: ' + r.stderr.slice(0, 160) + ')');
  ok(/No credential to authenticate with/.test(r.stderr), 'proceeds past the guard to the same missing-credential failure as any other run');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
