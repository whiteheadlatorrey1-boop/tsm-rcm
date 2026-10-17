#!/usr/bin/env node
'use strict';
// platform-status v2. Flags: --no-run --only <s> --json --audit --timeout <s>
//   --parallel --official --keep-env --no-restore --ref <git ref>
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ROOT = process.cwd();
const HOME = process.env.PS_HOME || ROOT;
const TAG = process.env.PS_TAG || '';
const TIMEOUT_MS = (Number(opt('--timeout')) || 90) * 1000;
const self = path.resolve(process.argv[1]);

if (opt('--ref') && !process.env.PS_HOME) {
  const ref = opt('--ref');
  const tmp = fs.mkdtempSync('/tmp/ps-ref-');
  const wt = path.join(tmp, 'wt');
  const add = cp.spawnSync('git', ['worktree', 'add', '--detach', wt, ref], { cwd: ROOT, stdio: 'inherit' });
  if (add.status !== 0) process.exit(add.status || 1);
  try { if (fs.existsSync(path.join(ROOT, 'node_modules'))) fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(wt, 'node_modules')); } catch {}
  const rest = args.filter((a, i) => a !== '--ref' && args[i - 1] !== '--ref');
  const k = cp.spawnSync(process.execPath, [self, ...rest], { cwd: wt, stdio: 'inherit', env: { ...process.env, PS_HOME: ROOT, PS_TAG: '-' + ref.replace(/[^\w.-]/g, '_') } });
  cp.spawnSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT });
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  process.exit(k.status || 0);
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);
const norm = (s) => s.toLowerCase().replace(/[_\s.]+/g, '-');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const pad = (s, n) => String(s).padEnd(n).slice(0, n);

function walk(dir, out = []) {
  let es;
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(rel(p));
  }
  return out;
}

const files = walk(ROOT);
const config = readJSON(path.join(HOME, 'scripts/platform-status.config.json'), {});
const attest = readJSON(path.join(HOME, 'docs/platform-attestations.json'), {});
const IGNORE = new Set(['node_modules', 'utils', 'util', 'lib', 'common', 'shared', 'middleware', 'config', 'data', 'public',
  'routes', 'services', 'servers', 'private-config', 'reports', 'security', 'capability-engines', ...(config.ignoreServerDirs || [])]);

const modules = {};
for (const f of files) {
  const m = f.match(/^server\/([^/]+)\//);
  if (m && !IGNORE.has(m[1])) modules[m[1]] = modules[m[1]] || { slug: m[1], match: [norm(m[1])] };
}
for (const [slug, c] of Object.entries(config.modules || {})) modules[slug] = { slug, match: (c.match || [slug]).map(norm) };

// each file belongs to ONE module: the one with the longest matching name token
const toks = [];
for (const m of Object.values(modules)) for (const t of m.match) toks.push({ t, slug: m.slug });
toks.sort((a, b) => b.t.length - a.t.length);
const owner = (f) => { const n = norm(f); const h = toks.find((x) => n.includes(x.t)); return h ? h.slug : null; };

const JS = /\.(js|mjs|cjs|ts)$/;
const isTest = (f) => JS.test(f) && /(^|\/)[^/]*test[^/]*\.(js|mjs|cjs|ts)$/i.test(f) && !f.startsWith('server/') && !/\.spec\./.test(f) && !f.startsWith('tests/e2e/');
const OFFICIAL = (f) => /^scripts\/test-(bpo|auth|l1|enterprise|production)-.*\.js$/.test(f) && f !== 'scripts/test-bpo-client-wiring-smoke.js';

const G = {};
for (const m of Object.values(modules)) {
  G[m.slug] = { src: files.filter((f) => f.startsWith(`server/${m.slug}/`) && JS.test(f)), tests: [], pages: [], assets: [], loc: 0 };
  for (const f of G[m.slug].src) { try { G[m.slug].loc += fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').length; } catch {} }
}
const addLoc = (o, f) => { try { G[o].loc += fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').length; } catch {} };
for (const f of files) {
  if (f.startsWith('server/')) continue;
  const o = owner(f);
  if (!o) continue;
  if (isTest(f)) G[o].tests.push(f);
  else if (/\.(html|jsx|tsx|vue)$/.test(f)) { G[o].pages.push(f); addLoc(o, f); }
  else if (/\.(js|mjs|css)$/.test(f) && f.startsWith("html/")) addLoc(o, f);
  else if (/\.(mp4|webm|mov|pptx|pdf)$/i.test(f)) G[o].assets.push(f);
}

const ENV_RE = /(must be set|environment variable|not set in the environment|Could not find Chrome)/i;
const SRV_RE = /(waitForServer|ECONNREFUSED|server reachab|connect ECONN|fetch failed)/i;
const RUN_RE = /(describe is not defined|\bit is not defined|test is not defined|window is not defined|document is not defined|Cannot use import statement|ERR_REQUIRE_ESM)/i;
const DROP = /(MONGO|ATLAS|DATABASE|GROQ|ANTHROPIC|OPENAI|FLY_|_KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL)/i;
function suiteEnv() {
  if (flag('--keep-env')) return { ...process.env, TSM_SESSION_SECRET: process.env.TSM_SESSION_SECRET || 'test-session-secret' };
  const e = {};
  for (const [k, v] of Object.entries(process.env)) if (!DROP.test(k)) e[k] = v;
  e.TSM_SESSION_SECRET = 'test-session-secret';
  return e;
}
const ENVV = suiteEnv();

function runSuiteOnce(file, pre) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    cp.execFile('node', pre ? ['-r', pre, file] : [file], { cwd: ROOT, timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024, env: ENVV }, (err, stdout, stderr) => {
      const out = `${stdout}\n${stderr}`;
      const sum = out.match(/(\d+)\s+passed,\s+(\d+)\s+failed/i);
      let passed = 0, failed = 0;
      if (sum) { passed = +sum[1]; failed = +sum[2]; }
      else if (/^\s*PASS:\s*\d+\s*$/im.test(out) && /^\s*FAIL:\s*\d+\s*$/im.test(out)) { passed = +out.match(/^\s*PASS:\s*(\d+)\s*$/im)[1]; failed = +out.match(/^\s*FAIL:\s*(\d+)\s*$/im)[1]; }
      else { passed = (out.match(/^\s*(PASS|ok)\b/gim) || []).length; failed = (out.match(/^\s*(FAIL|not ok)\b/gim) || []).length; }
      const timedOut = !!(err && err.killed);
      let status = 'pass';
      if (err || failed > 0) {
        if (ENV_RE.test(out)) status = 'blocked-env';
        else if (SRV_RE.test(out)) status = 'blocked-server';
        else if (RUN_RE.test(out)) status = 'needs-runner';
        else status = timedOut ? 'timeout' : 'fail';
      }
      if ((status === 'fail' || status === 'timeout') && failed === 0) failed = 1;
      if (status.startsWith('blocked') || status === 'needs-runner') { passed = 0; failed = 0; }
      const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
      const reason = (lines.find((l) => /error|must be set|not defined|ECONN|waitForServer/i.test(l)) || (err ? `exit ${err.code}` : '')).slice(0, 110);
      resolve({ file, status, passed, failed, reason, tail: status === 'fail' || status === 'timeout' ? lines.slice(-6) : [], ms: Date.now() - t0 });
    });
  });
}
async function runSuite(file) {
  const first = await runSuiteOnce(file);
  const shim = path.join(path.dirname(self), 'mini-describe.js');
  if (first.status === 'needs-runner' && /(describe|\bit|test) is not defined/.test(first.reason) && fs.existsSync(shim)) {
    const second = await runSuiteOnce(file, shim);
    second.shim = true;
    return second;
  }
  return first;
}

async function runAll(list) {
  const results = new Map();
  const queue = [...list];
  const n = flag('--parallel') ? 4 : 1;
  await Promise.all(Array.from({ length: n }, async () => {
    while (queue.length) { const f = queue.shift(); process.stderr.write('.'); results.set(f, await runSuite(f)); }
  }));
  process.stderr.write('\n');
  return results;
}

const dirty = () => { try { return cp.execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean).map((l) => l.slice(3)); } catch { return []; } };
function lastCommit(paths) {
  if (!paths.length) return null;
  try { return cp.execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths.slice(0, 60)], { cwd: ROOT, encoding: 'utf8' }).trim() || null; } catch { return null; }
}

function score(g, runs, last, att) {
  const gaps = [];
  let v = Math.min(10, Math.round((g.loc / 300) * 10)); if (g.loc < 300) gaps.push('thin source');
  v += g.pages.length >= 3 ? 15 : g.pages.length ? 8 : 0; if (!g.pages.length) gaps.push('no pages');
  v += g.tests.length >= 3 ? 15 : g.tests.length ? 8 : 0; if (!g.tests.length) gaps.push('no tests');
  if (runs) {
    const run = runs.filter((r) => r.status === 'pass' || r.status === 'fail' || r.status === 'timeout');
    const tot = run.reduce((a, r) => a + r.passed + r.failed, 0);
    const pas = run.reduce((a, r) => a + r.passed, 0);
    if (tot) v += Math.round((pas / tot) * 25);
    const bad = run.filter((r) => r.status !== 'pass').length;
    const blk = runs.length - run.length;
    if (bad) gaps.push(`${bad} suite(s) FAILING`);
    if (blk) gaps.push(`${blk} suite(s) unverified (blocked)`);
  } else if (g.tests.length) gaps.push('tests not run');
  if (last) { const d = (Date.now() - new Date(last)) / 864e5; v += d <= 30 ? 5 : d <= 90 ? 2 : 0; if (d > 90) gaps.push('stale >90d'); }
  if (g.assets.length) v += 5; else gaps.push('no demo/deck');
  let a = 0;
  if (att && att.liveAcceptance) a += 15; else gaps.push('no live acceptance attested');
  if (att && att.realData) a += 10; else gaps.push('no real data attested');
  return { verified: Math.min(75, v), attested: a, total: Math.min(75, v) + a, gaps };
}

(async () => {
  const only = opt('--only');
  const list = Object.values(modules).filter((m) => !only || m.slug.includes(only)).sort((a, b) => a.slug.localeCompare(b.slug));
  const officialFiles = files.filter(OFFICIAL);

  let results = new Map();
  if (!flag('--no-run')) {
    let runSet = [...new Set([...list.flatMap((m) => G[m.slug].tests), ...officialFiles])];
    if (flag('--official')) runSet = officialFiles;
    process.stderr.write(`Running ${runSet.length} suites ${flag('--parallel') ? 'in parallel' : 'serially'} (credentials ${flag('--keep-env') ? 'KEPT' : 'stripped'})\n`);
    const before = new Set(dirty());
    results = await runAll(runSet);
    const mutated = dirty().filter((f) => !before.has(f));
    if (mutated.length && !flag('--no-restore')) {
      try { cp.execFileSync('git', ['checkout', '--', ...mutated], { cwd: ROOT }); console.error(`Restored ${mutated.length} tracked file(s) the tests modified: ${mutated.join(', ')}`); } catch (e) { console.error('restore failed: ' + e.message); }
    }
  }

  const rows = list.map((m) => {
    const g = G[m.slug];
    const runs = flag('--no-run') ? null : g.tests.map((t) => results.get(t)).filter(Boolean);
    const last = lastCommit([`server/${m.slug}`, ...g.tests, ...g.pages.slice(0, 40)]);
    const s = score(g, runs, last, attest[m.slug]);
    const blocked = runs ? runs.filter((r) => r.status.startsWith('blocked') || r.status === 'needs-runner').length : null;
    return { slug: m.slug, ...s, loc: g.loc, pages: g.pages.length, suites: g.tests.length, blocked,
      passed: runs ? runs.reduce((a, r) => a + r.passed, 0) : null,
      failed: runs ? runs.reduce((a, r) => a + r.failed, 0) : null,
      assets: g.assets.length, last: last ? last.slice(0, 10) : '-',
      problems: runs ? runs.filter((r) => r.status !== 'pass').map((r) => ({ file: r.file, status: r.status, reason: r.reason, tail: r.tail })) : [] };
  }).sort((a, b) => b.total - a.total);

  const off = officialFiles.map((f) => results.get(f)).filter(Boolean);
  const offSum = { suites: off.length, pass: off.filter((r) => r.status === 'pass').length, fail: off.filter((r) => r.status === 'fail' || r.status === 'timeout').length, blocked: off.filter((r) => r.status.startsWith('blocked') || r.status === 'needs-runner').length };
  const stamp = new Date().toISOString();
  fs.mkdirSync(path.join(HOME, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(HOME, `docs/platform-status${TAG}.json`), JSON.stringify({ generated: stamp, official: offSum, rows }, null, 2));
  if (flag('--json')) { console.log(JSON.stringify({ generated: stamp, official: offSum, rows }, null, 2)); return; }

  console.log(`\nPlatform status v2 @ ${stamp}${TAG ? '  ref' + TAG : ''}  (${rows.length} modules)\n`);
  console.log(`${pad('MODULE', 28)} ${pad('TOTAL', 5)} ${pad('CODE', 4)} ${pad('ATT', 3)} ${pad('LOC', 6)} ${pad('PG', 3)} ${pad('SUITES', 6)} ${pad('PASS/FAIL', 9)} ${pad('BLK', 3)} ${pad('ASSET', 5)} ${pad('LAST', 10)}`);
  console.log('-'.repeat(96));
  for (const r of rows) {
    const pf = r.passed === null ? 'not run' : `${r.passed}/${r.failed}`;
    console.log(`${pad(r.slug, 28)} ${pad(r.total + '%', 5)} ${pad(r.verified, 4)} ${pad(r.attested, 3)} ${pad(r.loc, 6)} ${pad(r.pages, 3)} ${pad(r.suites, 6)} ${pad(pf, 9)} ${pad(r.blocked === null ? '-' : r.blocked, 3)} ${pad(r.assets, 5)} ${pad(r.last, 10)}`);
  }
  console.log('\nTOTAL = CODE (0-75 measured) + ATT (0-25 from docs/platform-attestations.json). BLK = suites that could not run (env/server/runner) and are NOT counted as failures.');
  if (!flag('--no-run')) console.log(`OFFICIAL SET (what npm test runs): ${offSum.suites} suites -> ${offSum.pass} pass, ${offSum.fail} FAIL, ${offSum.blocked} blocked`);

  const real = rows.flatMap((r) => r.problems.filter((p) => p.status === 'fail' || p.status === 'timeout').map((p) => ({ m: r.slug, ...p })));
  const blk = rows.flatMap((r) => r.problems.filter((p) => !(p.status === 'fail' || p.status === 'timeout')).map((p) => ({ m: r.slug, ...p })));
  if (real.length) { console.log('\nREAL FAILURES'); for (const p of real) { console.log(`  [${p.m}] ${p.file} (${p.status})`); p.tail.forEach((l) => console.log('      ' + l.slice(0, 140))); } }
  if (blk.length) { console.log('\nUNVERIFIED (could not run here)'); for (const p of blk) console.log(`  [${p.m}] ${p.file}  ${p.status}: ${p.reason}`); }
  console.log('\nTOP GAPS');
  for (const r of rows.slice(0, 15)) console.log(`  ${pad(r.slug, 28)} ${r.gaps.join('; ') || 'none'}`);
  console.log(`\nSaved: docs/platform-status${TAG}.json`);
  if (flag('--audit')) { console.log('\n--- npm run poc:audit ---'); cp.spawnSync('npm', ['run', 'poc:audit'], { cwd: HOME, stdio: 'inherit' }); }
})();
