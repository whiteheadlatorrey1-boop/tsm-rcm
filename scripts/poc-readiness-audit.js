#!/usr/bin/env node
// scripts/poc-readiness-audit.js
//
// Read-only POC readiness audit. For the five named platform modules
// (Workforce, L1, SAP/Enterprise, BPO/Recovery, Legal) and every
// War Room -> Strategist -> Executive Portal chain registered in
// scripts/demo/demo-pages.conf (cross-referenced with
// scripts/demo/relay-verticals.conf for its domain key, when one exists),
// reports:
//   - page reachable (200) and zero page errors on load (real Playwright nav)
//   - which scripts/test-*.js suites cover it by name, and whether THIS run
//     of `npm test` passed or failed for each
//   - external dependencies (MONGODB_URI, SERVICENOW_INSTANCE_URL,
//     GROQ_API_KEY) and whether they're configured (set/unset only, never
//     the value). For the 5 named modules this is a real, grepped finding
//     (see MODULE_DEPENDENCIES below for the exact file/line evidence); for
//     the registry-derived chains it's a lighter per-page text scan for the
//     same three names, which is accurate but shallower.
//   - demo asset: a flagship or studio video registered for it, and
//     whether a human has visually reviewed it (demo-readiness.json)
//
// Usage:
//   BASE_URL=http://localhost:3100 node scripts/poc-readiness-audit.js
// If nothing answers BASE_URL/health, this boots the server itself on that
// port with a random TSM_SESSION_SECRET and TSM_ADMIN_PASSWORD=dev, and
// stops it again when done.
//
// Output: reports/poc-readiness.json, reports/poc-readiness.md (not committed
// — see .gitignore). Exit code is non-zero only when a module is BROKEN
// (its own page 404s / has page errors), not for BLOCKED-ON-<dependency> or
// READY-WITH-DEMO-DATA, which are expected states in a demo environment.

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const REPO = path.join(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const REPORT_DIR = path.join(REPO, 'reports');

// ── 1. the five named primary modules ───────────────────────────────────
// Dependency evidence (grepped, not assumed):
//   Workforce -> server/candidate-registry-service.js:36 throws if
//     MONGODB_URI unset; routed from routes/candidate-registry.js.
//   L1        -> server/l1-copilot/servicenow-adapter.js uses
//     SERVICENOW_INSTANCE_URL; server.js:5055 L1 assistant route calls
//     groqChat() (GROQ_API_KEY).
//   SAP/Enterprise, BPO/Recovery -> no reference to any of the three env
//     vars found in their route/server files at this scan depth; reported
//     as "none detected", which is a real finding, not an omission.
//   Legal     -> server.js:4142 /api/legal/query calls groqChat()
//     (GROQ_API_KEY).
const PRIMARY_MODULES = [
  {
    name: 'Workforce',
    pages: ['/html/tsm-workforce-intelligence-command-center.html', '/html/workforce/certification-dashboard.html'],
    deps: ['MONGODB_URI'],
  },
  {
    name: 'L1',
    pages: ['/html/l1-copilot/enterprise-command-center.html', '/html/l1-copilot/l1-ticket-copilot.html'],
    deps: ['SERVICENOW_INSTANCE_URL', 'GROQ_API_KEY'],
  },
  {
    name: 'SAP/Enterprise',
    pages: ['/html/war-rooms/sap/sap-strategist.html'],
    deps: [],
  },
  {
    name: 'BPO/Recovery',
    pages: ['/html/war-rooms/bpo-war/bpo-war-room.html', '/html/bpo-files/bpo-recovery-queue.html'],
    deps: [],
  },
  {
    name: 'Legal',
    pages: ['/html/war-rooms/legal-war/legal-war-room.html'],
    deps: ['GROQ_API_KEY'],
  },
];

const ENV_VARS = ['MONGODB_URI', 'SERVICENOW_INSTANCE_URL', 'GROQ_API_KEY'];

// ── 2. demo-pages.conf + relay-verticals.conf -> chain modules ──────────
function parseConf(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function loadDemoPages() {
  return parseConf(path.join(REPO, 'scripts/demo/demo-pages.conf')).map((l) => {
    const [label, relpath] = l.split('|');
    return { label, relpath };
  });
}

function loadRelayVerticals() {
  const map = {};
  for (const l of parseConf(path.join(REPO, 'scripts/demo/relay-verticals.conf'))) {
    const parts = l.split('|');
    if (parts.length < 5) continue;
    const [dir, , , , domainKey] = parts;
    map[dir] = domainKey;
  }
  return map;
}

function buildChainModules() {
  const pages = loadDemoPages();
  const domainKeys = loadRelayVerticals();
  const chains = {}; // key -> { name, pages: [relpath...], domainKey }

  for (const { label, relpath } of pages) {
    const warRoomsMatch = /^war-rooms\/([^/]+)\//.exec(relpath);
    let key;
    if (warRoomsMatch) {
      key = warRoomsMatch[1]; // directory segment — matches relay-verticals.conf's vertical-dir
    } else {
      // Fallback for non-war-rooms entries: strip a known trailing role
      // suffix from the LABEL so e.g. "music-index"/"music-demo-conductor"
      // still group under one "music" module, otherwise key by the label
      // itself (a standalone page becomes its own 1-page module).
      key = label.replace(/-(war-room|strategist|executive-portal|situation-room|command|index|release-center|conductor|cadence-builder|marketing|presentation-live)$/, '');
      // no known suffix matched -> key === label, stays a standalone 1-page module
    }
    if (!chains[key]) chains[key] = { name: key, pages: [], domainKey: domainKeys[key] || null };
    chains[key].pages.push({ label, relpath });
  }
  return Object.values(chains);
}

// ── 3. npm test results (run once, parsed from scripts/run-tests.js output) ──
function runNpmTest() {
  console.log('Running npm test (captured for suite-coverage mapping)...');
  const r = spawnSync('node', ['scripts/run-tests.js'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
  const out = (r.stdout || '') + (r.stderr || '');
  const results = {}; // filename -> { status: 'PASS'|'FAIL', message }
  for (const line of out.split('\n')) {
    const m = /^(PASS|FAIL)\s+(\S+\.js)\s*(.*)$/.exec(line.trim());
    if (m) results[m[2]] = { status: m[1], message: m[3] };
  }
  const summaryMatch = /(\d+)\/(\d+) suites passed/.exec(out);
  return { results, summary: summaryMatch ? `${summaryMatch[1]}/${summaryMatch[2]} suites passed` : 'unknown', exitCode: r.status };
}

// A chain's directory name can differ from its test file names (construct-war
// vs test-construction-*.js). Aliases add matching tests; they never change a verdict.
const CHAIN_TEST_ALIASES = {
  'construct-war': ['construction-recovery', 'construction-vertical', 'construction-control-plane']
};
function testsForChain(name, testResults) {
  const seen = new Map();
  for (const kw of [name, ...(CHAIN_TEST_ALIASES[name] || [])]) {
    for (const t of testsForKeyword(kw, testResults)) seen.set(t.file, t);
  }
  return [...seen.values()];
}
function testsForKeyword(keyword, testResults) {
  const kw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
  const matches = Object.keys(testResults).filter((f) => f.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw));
  return matches.map((f) => ({ file: f, ...testResults[f] }));
}

// ── 4. page reachability + page errors (real Playwright nav) ────────────
async function checkPage(browser, relpath) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let status = null;
  try {
    const resp = await page.goto(BASE_URL + relpath, { waitUntil: 'domcontentloaded', timeout: 15000 });
    status = resp ? resp.status() : null;
    await page.waitForTimeout(400);
  } catch (e) {
    await page.close();
    return { relpath, reachable: false, status: null, pageErrors: [], navError: e.message };
  }
  await page.close();
  return { relpath, reachable: status === 200, status, pageErrors: errors, navError: null };
}

// ── 5. demo asset registration (demo-readiness.json) ─────────────────────
function demoAssetFor(keyword) {
  const registry = JSON.parse(fs.readFileSync(path.join(REPO, 'tests/e2e/demo/demo-readiness.json'), 'utf8'));
  const kw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = registry.experiences.find((e) => e.id.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw) || kw.includes(e.id.toLowerCase().replace(/[^a-z0-9]/g, '')));
  if (!match) return null;
  return { id: match.id, mp4: match.mp4, visualReview: match.visualReview === true };
}

// ── 6. per-page text scan for env-var-name mentions (chain modules only) ──
function scanPageTextForDeps(fullPath) {
  if (!fs.existsSync(fullPath)) return [];
  const text = fs.readFileSync(fullPath, 'utf8');
  return ENV_VARS.filter((v) => text.includes(v));
}

function verdictFor({ allReachable, anyPageErrors, depsConfigured, hasDemoAsset, testFailCount }) {
  if (!allReachable || anyPageErrors) return 'BROKEN';
  const unconfigured = depsConfigured.filter((d) => !d.configured).map((d) => d.name);
  if (unconfigured.length) return 'BLOCKED-ON-' + unconfigured.join(',');
  if (testFailCount > 0) return 'BROKEN';
  if (hasDemoAsset === false) return 'READY-WITH-DEMO-DATA';
  return 'READY';
}

async function ensureServerRunning() {
  try {
    const r = await fetch(BASE_URL + '/health', { signal: AbortSignal.timeout(2000) });
    if (r.ok) return null; // already running, nothing to clean up
  } catch (e) { /* not running, boot it */ }

  const port = new URL(BASE_URL).port || '3100';
  console.log(`No server at ${BASE_URL} — booting one on port ${port}...`);
  const crypto = require('crypto');
  const child = spawn('node', ['server.js'], {
    cwd: REPO,
    env: { ...process.env, PORT: port, TSM_SESSION_SECRET: crypto.randomBytes(32).toString('hex'), TSM_ADMIN_PASSWORD: process.env.TSM_ADMIN_PASSWORD || 'dev' },
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r2 = await fetch(BASE_URL + '/health', { signal: AbortSignal.timeout(1500) });
      if (r2.ok) return child;
    } catch (e) { /* keep waiting */ }
  }
  try { process.kill(-child.pid); } catch (e) {}
  throw new Error(`booted server did not answer ${BASE_URL}/health within 15s`);
}

(async () => {
  const bootedChild = await ensureServerRunning();
  const { results: testResults, summary: testSummary } = runNpmTest();
  const browser = await chromium.launch();

  const rows = [];

  for (const mod of PRIMARY_MODULES) {
    const pageChecks = await Promise.all(mod.pages.map((p) => checkPage(browser, p)));
    const allReachable = pageChecks.every((p) => p.reachable);
    const anyPageErrors = pageChecks.some((p) => p.pageErrors.length);
    const tests = testsForKeyword(mod.name.split('/')[0], testResults);
    const depsConfigured = mod.deps.map((d) => ({ name: d, configured: !!process.env[d] }));
    const demoAsset = demoAssetFor(mod.name.split('/')[0]);
    rows.push({
      module: mod.name,
      pages: pageChecks,
      tests,
      deps: depsConfigured,
      demoAsset,
      verdict: verdictFor({
        allReachable, anyPageErrors, depsConfigured,
        hasDemoAsset: demoAsset ? demoAsset.visualReview : false,
        testFailCount: tests.filter((t) => t.status === 'FAIL').length,
      }),
    });
  }

  for (const chain of buildChainModules()) {
    const pageChecks = await Promise.all(chain.pages.map((p) => checkPage(browser, '/html/' + p.relpath)));
    const allReachable = pageChecks.every((p) => p.reachable);
    const anyPageErrors = pageChecks.some((p) => p.pageErrors.length);
    const tests = testsForChain(chain.name, testResults);
    const depsFound = new Set();
    for (const p of chain.pages) for (const d of scanPageTextForDeps(path.join(REPO, 'html', p.relpath))) depsFound.add(d);
    const depsConfigured = [...depsFound].map((d) => ({ name: d, configured: !!process.env[d] }));
    const demoAsset = demoAssetFor(chain.name);
    rows.push({
      module: chain.name + (chain.domainKey ? ` (${chain.domainKey})` : ''),
      pages: pageChecks,
      tests,
      deps: depsConfigured,
      demoAsset,
      verdict: verdictFor({
        allReachable, anyPageErrors, depsConfigured,
        hasDemoAsset: demoAsset ? demoAsset.visualReview : false,
        testFailCount: tests.filter((t) => t.status === 'FAIL').length,
      }),
    });
  }

  await browser.close();
  if (bootedChild) { try { process.kill(-bootedChild.pid); } catch (e) {} }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'poc-readiness.json'), JSON.stringify({ generatedAt: new Date().toISOString(), testSummary, modules: rows }, null, 2));

  const md = ['| Module | Reachable | Tests | Deps | Demo | Verdict |', '|---|---|---|---|---|---|'];
  for (const r of rows) {
    const reachable = r.pages.every((p) => p.reachable) && !r.pages.some((p) => p.pageErrors.length) ? '✓' : '✗ ' + r.pages.filter((p) => !p.reachable || p.pageErrors.length).map((p) => p.relpath).join(', ');
    const tests = r.tests.length ? r.tests.map((t) => `${t.file}:${t.status}`).join(', ') : '(none found)';
    const deps = r.deps.length ? r.deps.map((d) => `${d.name}=${d.configured ? 'set' : 'unset'}`).join(', ') : 'none detected';
    const demo = r.demoAsset ? `${r.demoAsset.id} (visualReview=${r.demoAsset.visualReview})` : '(not registered)';
    md.push(`| ${r.module} | ${reachable} | ${tests} | ${deps} | ${demo} | ${r.verdict} |`);
  }
  fs.writeFileSync(path.join(REPORT_DIR, 'poc-readiness.md'),
    `# POC Readiness Audit\n\nGenerated ${new Date().toISOString()} — npm test: ${testSummary}\n\n${md.join('\n')}\n`);

  console.log(`\nWrote reports/poc-readiness.json and reports/poc-readiness.md (${rows.length} modules)`);
  const broken = rows.filter((r) => r.verdict === 'BROKEN');
  if (broken.length) {
    console.error(`\n${broken.length} module(s) BROKEN: ${broken.map((r) => r.module).join(', ')}`);
    process.exit(1);
  }
})().catch((e) => { console.error('AUDIT ERROR:', e.message); process.exit(1); });
