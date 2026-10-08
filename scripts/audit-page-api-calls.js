#!/usr/bin/env node
'use strict';
// Runtime check: boots server.js, collects every /api/... call made by html/**, and probes each
// one unauthenticated. A path is MISSING only when Express itself answers 404 ("Cannot POST /x"),
// i.e. no handler is registered. Handlers that return their own JSON 404 and gated routes (401/403)
// count as present. Unlike a static scan this sees routers mounted from anywhere.
//
//   node scripts/audit-page-api-calls.js --hub      # pages linked from suite-hub.html + their scripts
//   node scripts/audit-page-api-calls.js            # everything under html/ (server files skipped)
//   node scripts/audit-page-api-calls.js --update-baseline   # accept the current missing list
//   BASELINE: scripts/api-probe-baseline.json (known-missing "METHOD /path" entries)
//
// Not part of `npm test` (boots the whole server, ~15s). Run: npm run audit:api
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(__dirname, 'api-probe-baseline.json');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(html|js)$/.test(e.name)) out.push(p);
  }
  return out;
};
// Server code stored under html/ (route definitions, not client calls) must not be scanned.
const looksServerSide = src => /require\(\s*['"]express['"]\s*\)|\b(?:app|router)\.(?:get|post|put|patch|delete|use|all)\(\s*['"`]\//.test(src);

// --hub: only the pages linked from suite-hub.html plus the local scripts they load.
function hubFiles() {
  const hubPath = path.join(ROOT, 'html/bpo-files/suite-hub.html');
  const hub = fs.readFileSync(hubPath, 'utf8'), out = new Set();
  const isFile = f => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } };
  const resolve = (ref, from) => {
    const r = ref.split('#')[0].split('?')[0]; if (!r || /^(https?:|mailto:|javascript:|data:)/.test(r)) return null;
    const cands = r.startsWith('/') ? ['html', 'html/js', 'html/tsm-insurance/public/js', 'js', ''].map(b => path.join(ROOT, b, r.replace(/^\/(js|html)\//, ''))).concat(path.join(ROOT, 'html', r)) : [path.resolve(path.dirname(from), r)];
    return cands.find(isFile) || null;
  };
  for (const m of hub.matchAll(/href="([^"]+)"/g)) {
    const page = resolve(m[1], hubPath); if (!page || !/\.html$/.test(page)) continue;
    out.add(page);
    const src = fs.readFileSync(page, 'utf8');
    for (const sm of src.matchAll(/<script[^>]+src="([^"]+)"/g)) { const f = resolve(sm[1], page); if (f && /\.js$/.test(f)) out.add(f); }
  }
  return [...out];
}

// Text of the balanced {...} starting at s[i] (quotes respected, capped), or ''.
function braceBlock(s, i) {
  let depth = 0, q = null;
  for (let j = i; j < Math.min(s.length, i + 4000); j++) {
    const c = s[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') depth++; else if (c === '}' && --depth === 0) return s.slice(i, j + 1);
  }
  return '';
}

// path -> { explicit:Set(methods), unknown:bool, files:Set }; dynamic (runtime-built) paths are kept apart
function collectCalls(files) {
  const calls = new Map(), dynamic = new Map();
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    if (/\.js$/.test(f) && looksServerSide(s)) continue;
    for (const m of s.matchAll(/(fetch\(\s*)?(['"`])(\/api\/[^'"`\s]*)\2/g)) {
      const raw = m[3].split('?')[0];
      const after = s.slice(m.index + m[0].length);
      // const NAME = '/api/x': a base URL if the file appends to NAME (NAME + '/y', `${NAME}/y`), else a whole endpoint
      const cm = !m[1] && s.slice(Math.max(0, m.index - 60), m.index).match(/(?:const|let|var)\s+(\w+)\s*=\s*$/);
      const isBase = !!cm && new RegExp('\\$\\{\\s*' + cm[1] + '\\s*\\}|\\b' + cm[1] + '\\s*\\+').test(s);
      const isDynamic = isBase || raw.includes('${') || raw.endsWith('/') || /^\s*\+/.test(after); // '/api/x/' + id, '/api/x' + suffix, `/api/${a}`
      const p = raw.replace(/\$\{[^}]*\}/g, 'x');
      if (!/^\/api\/[A-Za-z0-9_\-.\/:]+$/.test(p) || p.includes('..')) continue; // placeholders, templates, prose
      if (isDynamic) { (dynamic.get(raw) || dynamic.set(raw, new Set()).get(raw)).add(path.relative(ROOT, f)); continue; }
      let method = null, unknown = false;
      const om = after.match(/^\s*,\s*(\{)/);
      const opts = om ? braceBlock(after, after.indexOf('{')) : '';
      const mm = opts.match(/\bmethod\s*:\s*['"](\w+)['"]/);
      if (mm) method = mm[1].toUpperCase();
      else if (m[1] && /^\s*\)/.test(after)) method = 'GET';       // fetch('/x')
      else if (m[1] && om && opts) method = 'GET';                  // fetch('/x', { no method key })
      else unknown = true;                                          // options in a variable, or a helper call
      const e = calls.get(p) || calls.set(p, { explicit: new Set(), unknown: false, files: new Set() }).get(p);
      if (method && METHODS.includes(method)) e.explicit.add(method); else if (unknown) e.unknown = true;
      e.files.add(path.relative(ROOT, f));
    }
  }
  return { calls, dynamic };
}

const freePort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const probe = (port, method, p) => new Promise(resolve => {
  const body = method === 'GET' ? null : '{}';
  const req = http.request({ port, path: p, method, timeout: 8000, headers: Object.assign({ Connection: 'close' }, body ? { 'Content-Type': 'application/json', 'Content-Length': 2 } : {}) }, res => {
    let b = ''; res.on('data', c => { if (b.length < 400) b += c; }); res.on('end', () => resolve({ status: res.statusCode, body: b }));
  });
  req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
  req.on('error', e => resolve({ status: 0, body: e.message }));
  if (body) req.write(body); req.end();
});
const expressMissing = (r, method) => r.status === 404 && new RegExp(`Cannot ${method} `).test(r.body);

(async () => {
  const hubOnly = process.argv.includes('--hub');
  const files = hubOnly ? hubFiles() : walk(path.join(ROOT, 'html'));
  const { calls, dynamic } = collectCalls(files);
  const port = await freePort();
  const env = Object.assign({}, process.env, { PORT: String(port), TSM_SESSION_SECRET: process.env.TSM_SESSION_SECRET || 'audit-only-secret-0123456789abcdef' });
  delete env.GROQ_API_KEY; // never let a probe spend money
  const srv = spawn('node', ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  const stop = () => { try { srv.kill('SIGTERM'); } catch (e) {} };
  process.on('exit', stop);
  const t0 = Date.now();
  while (!/listening on port/.test(log)) {
    if (srv.exitCode !== null) { console.error('server exited during boot:\n' + log.slice(-800)); process.exit(2); }
    if (Date.now() - t0 > 90000) { console.error('server did not start within 90s:\n' + log.slice(-800)); stop(); process.exit(2); }
    await new Promise(r => setTimeout(r, 300));
  }
  // Control: a path that cannot exist must come back as Express's own 404 for every method we probe,
  // otherwise a gate in front of the router would hide real misses and the result means nothing.
  for (const m of METHODS) {
    const r = await probe(port, m, '/api/__no_such_route__');
    if (!expressMissing(r, m)) { console.error(`control probe ${m} /api/__no_such_route__ -> ${r.status} ${r.body.slice(0, 80)}; cannot distinguish missing routes`); stop(); process.exit(2); }
  }
  const missing = new Map(); let n = 0; // "METHOD /path" -> files
  for (const [p, e] of calls) {
    if (e.explicit.size) {
      for (const method of e.explicit) { n++; if (expressMissing(await probe(port, method, p), method)) missing.set(`${method} ${p}`, e.files); }
    } else if (e.unknown) { // method not statically known: only missing if neither GET nor POST has a handler
      n += 2;
      const g = expressMissing(await probe(port, 'GET', p), 'GET'), po = expressMissing(await probe(port, 'POST', p), 'POST');
      if (g && po) missing.set(`ANY ${p}`, e.files);
    }
  }
  stop();
  const real = [...missing.keys()];
  let base = []; try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) {}
  if (process.argv.includes('--update-baseline')) { fs.writeFileSync(BASELINE, JSON.stringify(real.sort(), null, 2) + '\n'); console.log(`baseline written: ${real.length} entries`); process.exit(0); }
  const fresh = real.filter(k => !base.includes(k)), fixed = base.filter(k => !real.includes(k));
  console.log(`probed ${n} method+path pairs from ${files.length} files (${hubOnly ? 'hub scope' : 'all of html/'}); ${real.length} have no handler (${base.length} in baseline)`);
  for (const k of fresh.sort()) { console.log(`\nNEW MISSING  ${k}`); [...missing.get(k)].slice(0, 6).forEach(f => console.log('   ' + f)); }
  if (fixed.length) console.log(`\nBaseline entries now present (remove with --update-baseline):\n  ${fixed.join('\n  ')}`);
  if (dynamic.size) console.log(`\n${dynamic.size} runtime-built path(s) not probed (cannot be checked statically): ${[...dynamic.keys()].sort().slice(0, 40).join('  ')}${dynamic.size > 40 ? '  ...' : ''}`);
  process.exit(fresh.length ? 1 : 0);
})();
