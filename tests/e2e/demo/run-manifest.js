#!/usr/bin/env node
// run-manifest.js <vertical>
//
// Manifest-driven capture orchestrator. Reads manifests/<vertical>.json and
// executes each state's declared `route` (navigation — act boundaries only,
// or a same-page reload when paired with `clearStorage`), `actions`
// ([{click|fill|select|check|nav|wait|fillIfEmpty, selector, value}]) and
// `expect` ({see, text:[selector, regexSource], same}) through the shared
// fail-loud tests/e2e/helpers/demo-step.js. Frames and a sidecar are written
// exactly as the hand-written capture-*.js scripts do, so a manifest can
// replace one once it has been proven equivalent (see --diff below).
//
//   node run-manifest.js <vertical>                 (server must be running)
//   node run-manifest.js <vertical> --diff <path>    also diff the resulting
//                                                     sidecar against an
//                                                     existing capture JSON,
//                                                     frame id + recorded
//                                                     text fields only
//
// Manifest-level fields this reads (all optional):
//   login                  : true to POST /api/auth/login before any state
//   defaultStatusSelector  : statusSelector applied to every state unless overridden
//   defaultStatusKey       : statusKey applied to every state unless overridden
//   defaultRecord          : record map merged under every state's own `record`
//   viewport               : {width, height} (default 1920x1080)
//
// Per-state fields beyond the existing caption/narration/tiers/etc.:
//   slug         : the step id used in frame filenames and the sidecar (required)
//   preActions   : actions run before `route` navigation (e.g. closing a panel
//                  on the current page before leaving it)
//   route        : path to navigate to (joined with BASE_URL)
//   clearStorage : clear localStorage/sessionStorage before navigating `route`
//   routeWait    : ms to wait after the route navigation settles (default 1200)
//   actions      : the step's own action list, run in order
//   need         : selectors that must be visible+enabled before the action runs
//   expect.see   : selectors that must appear after the action
//   expect.text  : [selector, regexSource] — selector's text must match
//   expect.same  : allow unchanged page text (toggles/selects that don't re-render)
//   focus        : selector to scroll into view before the screenshot
//   wait         : ms to wait after the action (default 1100, from demo-step.js)
//   statusSelector, statusKey, record : per-state overrides of the manifest defaults
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createCapture } = require('../helpers/demo-step.js');

const DEMO_DIR = __dirname;
const [, , vertical, ...rest] = process.argv;
if (!vertical) { console.error('Usage: node run-manifest.js <vertical> [--diff <existing-capture.json>]'); process.exit(2); }
const diffIdx = rest.indexOf('--diff');
const diffAgainst = diffIdx > -1 ? rest[diffIdx + 1] : null;

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = process.env.TSM_LOGIN_PASSWORD || 'dev';

const manifestPath = path.join(DEMO_DIR, 'manifests', `${vertical}.json`);
if (!fs.existsSync(manifestPath)) fail(`missing ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.frameDir) fail(`${vertical}.json has no frameDir`);
const OUT = path.join(DEMO_DIR, manifest.frameDir);
const SIDECAR = path.join(DEMO_DIR, `${vertical}-manifest-capture.json`);

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }

async function runAction(page, a) {
  const sel = a.selector;
  try {
    switch (a.type) {
      case 'click':
      case 'nav':
        await page.locator(sel).first().click({ timeout: 4000 });
        break;
      case 'fill':
        await page.fill(sel, a.value, { timeout: 4000 });
        break;
      case 'select':
        await page.selectOption(sel, a.value, { timeout: 4000 });
        break;
      case 'check':
        await page.locator(sel).first().check({ timeout: 4000 });
        break;
      case 'wait':
        await page.waitForTimeout(a.ms || 500);
        break;
      case 'fillIfEmpty':
        for (const f of a.fields || []) {
          const loc = page.locator(f.selector).first();
          if (!(await loc.inputValue({ timeout: 4000 }))) await loc.fill(f.value, { timeout: 4000 });
        }
        break;
      default:
        throw new Error('unknown action type: ' + a.type);
    }
  } catch (e) {
    if (a.optional) return; // e.g. closing a panel that may already be closed
    throw e;
  }
}

(async () => {
  const browser = await chromium.launch();
  const viewport = manifest.viewport || { width: 1920, height: 1080 };
  const page = await browser.newPage({ viewport });
  const { step: step0, writeSidecar, pageErrors } = createCapture({ page, browser, outDir: OUT, base: BASE });
  const step = (label, action, o = {}) => step0(label, action, {
    ...o,
    statusSelector: o.statusSelector || manifest.defaultStatusSelector,
    statusKey: o.statusKey || manifest.defaultStatusKey,
    record: { ...(manifest.defaultRecord || {}), ...(o.record || {}) },
  });

  if (manifest.login) {
    const lr = await page.request.post(BASE + '/api/auth/login', { data: { password: PASS } });
    if (!lr.ok()) { console.error('login failed: HTTP ' + lr.status()); await browser.close(); process.exit(1); }
    console.log('Logged in.');
  }
  console.log(`Capturing ${vertical} via manifest -> ${OUT}`);

  const states = (manifest.states || []).slice().sort((a, b) => a.n - b.n);
  for (const s of states) {
    if (!s.slug) fail(`state ${s.n} has no "slug" (required for run-manifest.js)`);

    for (const a of s.preActions || []) await runAction(page, a);

    if (s.route) {
      if (s.clearStorage) await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} }).catch(() => {});
      await page.goto(BASE + s.route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(s.routeWait || 1200);
    }

    const action = async () => { for (const a of s.actions || []) await runAction(page, a); };
    const opts = {};
    if (s.need) opts.need = s.need;
    if (s.expect) {
      if (s.expect.see) opts.see = s.expect.see;
      if (s.expect.text) opts.text = [s.expect.text[0], new RegExp(s.expect.text[1], 'i')];
      if (s.expect.same) opts.same = true;
    }
    if (s.focus) opts.focus = s.focus;
    if (s.wait) opts.wait = s.wait;
    if (s.statusSelector) opts.statusSelector = s.statusSelector;
    if (s.statusKey) opts.statusKey = s.statusKey;
    if (s.record) opts.record = s.record;

    await step(s.slug, action, opts);
  }

  const { n } = writeSidecar(SIDECAR);
  console.log(`\n✓ ${n} unique frames captured -> ${OUT}`);
  console.log(`  sidecar: ${SIDECAR}`);
  if (pageErrors.length) console.log('  note: page errors seen: ' + [...new Set(pageErrors)].join(' | '));
  await browser.close();

  if (diffAgainst) {
    const ok = diffSidecars(SIDECAR, diffAgainst);
    process.exit(ok ? 0 : 1);
  }
})().catch((e) => { console.error('CAPTURE ERROR', e.message); process.exit(1); });

function diffSidecars(a, b) {
  const A = JSON.parse(fs.readFileSync(a, 'utf8')).frames;
  const B = JSON.parse(fs.readFileSync(b, 'utf8')).frames;
  if (A.length !== B.length) { console.error(`DIFF: frame count differs: manifest run ${A.length} vs ${b} ${B.length}`); return false; }
  let ok = true;
  for (let i = 0; i < A.length; i++) {
    const fa = A[i], fb = B[i];
    const keys = new Set([...Object.keys(fa), ...Object.keys(fb)].filter(k => k !== 'shot' && k !== 'url'));
    for (const k of keys) {
      if ((fa[k] || '') !== (fb[k] || '')) { console.error(`DIFF: frame ${i + 1} (${fa.id} vs ${fb.id}) field "${k}" differs:\n  manifest: ${JSON.stringify(fa[k])}\n  existing: ${JSON.stringify(fb[k])}`); ok = false; }
    }
  }
  if (ok) console.log(`\n✓ sidecar matches ${b} step for step (${A.length} frames, ignoring screenshot hash/url)`);
  return ok;
}
