'use strict';
// Browser check for the Construction recovery page. Boots its own server,
// signs an admin session, and drives the real page in headless Chromium.
// Run: node scripts/check-construction-recovery-browser.js
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'local-test-secret-not-for-prod';
const { signSession } = require('../middleware/require-auth');
const { chromium } = require('@playwright/test');

let failed = 0;
function check(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; }

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on('error', reject);
  });
}

async function waitForHealth(base, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(base + '/health'); if (r.ok) return true; } catch (e) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'con-browser-'));
  const shotDir = path.join(__dirname, '..', 'reports');
  fs.mkdirSync(shotDir, { recursive: true });
  const port = await freePort();
  const base = 'http://127.0.0.1:' + port;
  const child = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, { PORT: String(port), CONSTRUCTION_AUDIT_DIR: auditDir, GROQ_API_KEY: '' }),
    stdio: 'ignore',
    detached: true
  });
  let browser;
  try {
    const up = await waitForHealth(base, 30000);
    check('server booted on port ' + port + ' (/health answers)', up);
    if (!up) throw new Error('server did not start; if it ignores PORT, start it yourself and rerun with BASE_URL');

    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.addCookies([{ name: 'tsm_session', value: signSession({ role: 'admin', exp: Date.now() + 3600000 }), url: base }]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(base + '/html/construction-suite/construction-recovery.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#kpis .kpi').first().waitFor({ timeout: 10000 });
    const kpis = await page.locator('#kpis').innerText();
    check('KPI: 9 weeks behind', /9 wks behind/i.test(kpis));
    check('KPI: +$3,100,000 forecast overrun now', kpis.includes('+$3,100,000'));
    check('KPI: +$1,400,000 after recovery, 4 weeks still behind', kpis.includes('+$1,400,000') && /4 still behind/.test(kpis));
    check('KPI: 41 exposures tracked', /\b41\b/.test(kpis));
    check('10 ranked exposures listed (header + 10 rows)', (await page.locator('#exp tr').count()) === 11);
    check('11 change order cards', (await page.locator('.co').count()) === 11);
    check('recovery plan lists 4 actions', (await page.locator('#plan li').count()) === 4);
    await page.screenshot({ path: path.join(shotDir, 'construction-recovery-1-loaded.png'), fullPage: true });

    // two-click accept on CO-03
    const co3 = () => page.locator('.co', { hasText: 'CO-03' });
    const accept = co3().locator('button').first();
    await accept.click();
    check('first click only arms the button (no decision yet)', /CONFIRM/.test(await accept.innerText()) && !(await co3().innerText()).includes('Decision recorded'));
    await accept.click();
    await co3().getByText('Decision recorded').waitFor({ timeout: 10000 });
    check('second click records the decision', (await co3().innerText()).includes('APPROVE'));
    await page.locator('#audit').getByText('CHANGE_ORDER_DECISION').first().waitFor({ timeout: 10000 });
    check('audit panel shows the decision', (await page.locator('#audit').innerText()).includes('CO-03'));
    const files = fs.readdirSync(auditDir).filter(f => f.startsWith('construction-recovery-audit-'));
    check('decision written to the durable audit file', files.length === 1 && fs.readFileSync(path.join(auditDir, files[0]), 'utf8').includes('CO-03'));

    // override with a too-short reason is blocked
    const co7 = () => page.locator('.co', { hasText: 'CO-07' });
    await co7().locator('input').fill('short');
    const ov = co7().locator('button', { hasText: /OVERRIDE/ });
    await ov.click();
    await ov.click();
    await page.locator('#msg', { hasText: 'Blocked' }).waitFor({ timeout: 10000 });
    check('override with a short reason is blocked', !(await co7().innerText()).includes('Decision recorded'));

    // draft falls back to the template with no Groq key
    await co3().locator('button', { hasText: 'DRAFT' }).click();
    await co3().locator('pre').waitFor({ timeout: 10000 });
    check('draft shows the template fallback', (await co3().innerText()).includes('Template draft'));
    await page.screenshot({ path: path.join(shotDir, 'construction-recovery-2-after-actions.png'), fullPage: true });

    // inside the war room
    await page.goto(base + '/html/war-rooms/construct-war/construction-war-room.html#recovery', { waitUntil: 'domcontentloaded' });
    const frameEl = page.locator('#tabpanel-recovery iframe');
    await frameEl.waitFor({ timeout: 10000 });
    const inner = page.frameLocator('#tabpanel-recovery iframe');
    await inner.locator('#kpis .kpi').first().waitFor({ timeout: 10000 });
    check('war room #recovery tab renders the page inside its iframe', (await inner.locator('#kpis').innerText()).includes('+$3,100,000'));
    await page.screenshot({ path: path.join(shotDir, 'construction-recovery-3-war-room-tab.png') });

    check('no JavaScript errors on the page', errors.length === 0);
    if (errors.length) console.log('  errors: ' + errors.join(' | '));
  } catch (e) {
    console.error('ERROR: ' + e.message);
    failed++;
  } finally {
    if (browser) await browser.close();
    try { process.kill(-child.pid); } catch (e) { /* already gone */ }
    fs.rmSync(auditDir, { recursive: true, force: true });
  }
  if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
  console.log('All construction recovery browser checks passed');
})();
