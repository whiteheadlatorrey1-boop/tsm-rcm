'use strict';
// Regression test for scripts/test-bpo-mongo-live.js's opt-in/refuse guard:
//   - skips cleanly (exit 0) unless BOTH MONGODB_URI and BPO_MONGO_LIVE=1
//     are set -- a MONGODB_URI merely present in the environment is never
//     enough on its own to make this go live against a real database
//   - refuses outright (exit 1) if NODE_ENV=production or FLY_APP_NAME is
//     set, and that refusal takes priority even when both opt-in
//     variables are also set -- a production-looking environment is a
//     harder stop, not something the opt-in vars can override
//
// Runs fully offline: every case here resolves at the guard itself, before
// any network call (no real MONGODB_URI is ever used), by spawning the
// script as a child process with controlled env.

const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'test-bpo-mongo-live.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

function run(env) {
  const base = Object.assign({}, process.env);
  // Never let a real credential or an inherited production marker leak in
  // from the parent shell -- every case here should resolve purely from
  // what this call passes in `env`.
  delete base.MONGODB_URI;
  delete base.BPO_MONGO_LIVE;
  delete base.NODE_ENV;
  delete base.FLY_APP_NAME;
  const childEnv = Object.assign(base, env);
  Object.keys(childEnv).forEach((k) => { if (childEnv[k] === undefined) delete childEnv[k]; });
  return spawnSync(process.execPath, [SCRIPT], { env: childEnv, encoding: 'utf8', timeout: 10000 });
}

// --- skip (exit 0): neither opt-in var set ---
{
  const r = run({});
  ok(r.status === 0, 'nothing set at all -> exit 0 (skip) (got ' + r.status + ')');
  ok(/must both be set/.test(r.stdout), 'skip message explains both vars are required');
}

// --- skip (exit 0): only one of the two opt-in vars set ---
{
  const r = run({ MONGODB_URI: 'mongodb://fake-host/fake-db' });
  ok(r.status === 0, 'MONGODB_URI set but BPO_MONGO_LIVE not -> still exit 0 (skip) (got ' + r.status + ')');
}
{
  const r = run({ BPO_MONGO_LIVE: '1' });
  ok(r.status === 0, 'BPO_MONGO_LIVE=1 set but MONGODB_URI not -> still exit 0 (skip) (got ' + r.status + ')');
}
{
  const r = run({ BPO_MONGO_LIVE: 'yes' , MONGODB_URI: 'mongodb://fake-host/fake-db'});
  ok(r.status === 0, 'BPO_MONGO_LIVE must be exactly "1" -- "yes" does not count as opting in (got ' + r.status + ')');
}

// --- refuse (exit 1): NODE_ENV=production ---
{
  const r = run({ NODE_ENV: 'production' });
  ok(r.status === 1, 'NODE_ENV=production alone -> exit 1 (refuse), not a quiet skip (got ' + r.status + ')');
  ok(/Refusing to run/.test(r.stderr) && /NODE_ENV=production/.test(r.stderr), 'refusal message names NODE_ENV=production as the reason');
}

// --- refuse (exit 1): FLY_APP_NAME set ---
{
  const r = run({ FLY_APP_NAME: 'tsm-shell' });
  ok(r.status === 1, 'FLY_APP_NAME set alone -> exit 1 (refuse) (got ' + r.status + ')');
  ok(/Refusing to run/.test(r.stderr) && /FLY_APP_NAME=tsm-shell/.test(r.stderr), 'refusal message names FLY_APP_NAME and its value as the reason');
}

// --- refusal takes priority even when both opt-in vars are ALSO set ---
{
  const r = run({ FLY_APP_NAME: 'tsm-shell', MONGODB_URI: 'mongodb://fake-host/fake-db', BPO_MONGO_LIVE: '1' });
  ok(r.status === 1, 'FLY_APP_NAME set overrides opting in via MONGODB_URI+BPO_MONGO_LIVE=1 -- still exit 1, not a live run (got ' + r.status + ')');
  ok(!/must both be set/.test(r.stdout), 'does not fall through to the skip message -- the refusal fires first');
}
{
  const r = run({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://fake-host/fake-db', BPO_MONGO_LIVE: '1' });
  ok(r.status === 1, 'NODE_ENV=production overrides opting in -- still exit 1 (got ' + r.status + ')');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
