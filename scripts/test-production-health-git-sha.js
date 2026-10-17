'use strict';

// Guards the deploy-time GIT_SHA wiring: the Dockerfile accepts it as a build
// arg and exposes it as an env var, and GET /health echoes it back so a live
// deploy can be matched to the commit it was built from. Boots the real
// server.js as a child process with GIT_SHA set (mirroring the ARG -> ENV
// path a `docker build --build-arg GIT_SHA=...` takes) and with it unset
// (mirroring a build that didn't pass the arg).

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL', m)); };

function withServer(env, fn) {
  return new Promise((resolve, reject) => {
    const port = 10000 + Math.floor(Math.random() * 10000);
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: Object.assign({}, process.env, { PORT: String(port), TSM_SESSION_SECRET: 'test-session-secret' }, env),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let settled = false;
    const done = (err, result) => {
      if (settled) return;
      settled = true;
      child.kill();
      err ? reject(err) : resolve(result);
    };
    child.on('error', done);
    const tryFetch = (attemptsLeft) => {
      http.get({ port, path: '/health' }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try { done(null, JSON.parse(body)); }
          catch (e) { done(e); }
        });
      }).on('error', () => {
        if (attemptsLeft <= 0) return done(new Error('server never came up on port ' + port));
        setTimeout(() => tryFetch(attemptsLeft - 1), 200);
      });
    };
    setTimeout(() => tryFetch(25), 200);
  }).then((result) => fn(result));
}

(async () => {
  await withServer({ GIT_SHA: 'deadbeef1234' }, (health) => {
    ok(health.status === 'ok', 'health: status ok with GIT_SHA set');
    ok(health.gitSha === 'deadbeef1234', 'health: gitSha echoes the build-arg value (got ' + health.gitSha + ')');
  });

  await withServer({ GIT_SHA: '' }, (health) => {
    ok(health.gitSha === 'unknown', 'health: gitSha falls back to "unknown" when not baked in (got ' + health.gitSha + ')');
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log('FAIL', e.message);
  console.log(`\n${pass} passed, ${fail + 1} failed`);
  process.exit(1);
});
