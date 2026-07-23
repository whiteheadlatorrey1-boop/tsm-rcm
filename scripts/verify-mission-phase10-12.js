// scripts/verify-mission-phase10-12.js
//
// Standalone Puppeteer verification for the Phase 10/11/12 work
// (mission-analytics.js, mission-intelligence.js, mission-graph.js, the
// MISSION relay-domain fix, and mission-executive-dashboard.html).
//
// Run against a live server:
//   node server.js &
//   node scripts/verify-mission-phase10-12.js
//
// What it does, in order:
//   1. Opens the dashboard page (it already loads relay.core.js,
//      mission-model.js, mission-store.js — real production files, not
//      mocks) and clears TSM_MISSION_STORE_V1 / TSM_EVENT_LOG for a clean run.
//   2. Creates 2 missions via TSMMissionModel.createMission() +
//      TSMMissionStore.saveMission() — same functions BPO/Healthcare/etc
//      call for real — one in 'bpo', one in 'healthcare', SAME client, both
//      assigned to the same operator. This is the exact scenario needed to
//      light up every new engine: multi-vertical client (Phase 12),
//      workload-by-operator (Phase 10), and a populated event log (the fix
//      this whole round of work depended on).
//   3. Reloads the dashboard and asserts real rendered output — not just
//      "no JS errors," actual DOM content and localStorage state.
//
// Exits 0 with a printed PASS/FAIL summary; exits 1 on any failed assertion
// so it's usable as a CI gate later if you want to wire it into
// demo-certify.sh.

const puppeteer = require('puppeteer');

const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:3000';
const DASHBOARD_URL = `${BASE_URL}/html/mission-executive-dashboard.html`;

const CHECKS = [];
function check(name, cond, detail) {
  CHECKS.push({ name, pass: !!cond, detail: detail || '' });
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('pageerror', (err) => console.error('[page error]', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[console.error]', msg.text());
  });

  try {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle0' });

    // ── Step 1: clean slate ────────────────────────────────────────────────
    await page.evaluate(() => {
      localStorage.removeItem('TSM_MISSION_STORE_V1');
      localStorage.removeItem('TSM_MISSION_STORE');
      localStorage.removeItem('TSM_EVENT_LOG');
    });

    // ── Step 2: create real missions via the real API ──────────────────────
    const created = await page.evaluate(() => {
      if (!window.TSMMissionModel || !window.TSMMissionStore) {
        return { error: 'TSMMissionModel/TSMMissionStore not loaded on the page' };
      }
      const OPERATOR = 'op-verify-01';
      const CLIENT = 'Acme Verify Corp';

      const m1 = window.TSMMissionModel.createMission({ vertical: 'bpo', tenantId: 'tenant-verify', client: CLIENT, actor: 'verify-script' });
      window.TSMMissionStore.saveMission(m1);
      window.TSMMissionStore.assignMission(m1.id, OPERATOR, 'verify-script', new Date(Date.now() + 86400000).toISOString());

      const m2 = window.TSMMissionModel.createMission({ vertical: 'healthcare', tenantId: 'tenant-verify', client: CLIENT, actor: 'verify-script' });
      window.TSMMissionStore.saveMission(m2);
      window.TSMMissionStore.assignMission(m2.id, OPERATOR, 'verify-script', new Date(Date.now() + 86400000).toISOString());

      return { m1id: m1.id, m2id: m2.id, operator: OPERATOR, client: CLIENT };
    });

    check('missions created without JS error', !created.error, created.error || '');
    if (created.error) throw new Error(created.error);

    // ── Step 3: confirm the relay bridge actually wrote to TSM_EVENT_LOG ───
    const eventLog = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('TSM_EVENT_LOG') || '[]'); } catch (e) { return []; }
    });
    const missionEvents = eventLog.filter((e) => e.domain === 'MISSION');
    check(
      'TSM_EVENT_LOG contains MISSION domain events',
      missionEvents.length > 0,
      `found ${missionEvents.length} MISSION events (this was 0 before the RELAY_REGISTRY fix)`
    );

    // ── Step 4: reload the dashboard so it recomputes from the fresh data ──
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#kpiRow .kpi');

    const kpis = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#kpiRow .kpi')).map((el) => ({
        val: el.querySelector('.val').textContent.trim(),
        lbl: el.querySelector('.lbl').textContent.trim()
      }))
    );
    const totalKpi = kpis.find((k) => k.lbl === 'Total Missions');
    check('dashboard Total Missions >= 2', totalKpi && parseInt(totalKpi.val, 10) >= 2, JSON.stringify(kpis));

    const verticalRows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#verticalTable tbody tr')).map((tr) => tr.textContent.trim())
    );
    check(
      'By Vertical table includes both bpo and healthcare',
      verticalRows.some((r) => r.toLowerCase().includes('bpo')) && verticalRows.some((r) => r.toLowerCase().includes('healthcare')),
      JSON.stringify(verticalRows)
    );

    const clientText = await page.evaluate(() => document.getElementById('clientList').textContent);
    check(
      'Multi-Vertical Clients shows the shared client across bpo + healthcare',
      clientText.includes('Acme Verify Corp') && clientText.toLowerCase().includes('bpo') && clientText.toLowerCase().includes('healthcare'),
      clientText.slice(0, 300)
    );

    const operatorText = await page.evaluate(() => document.getElementById('operatorList').textContent);
    check(
      'Multi-Vertical Operators shows the shared operator across bpo + healthcare',
      operatorText.includes('op-verify-01'),
      operatorText.slice(0, 300)
    );

  } catch (err) {
    console.error('FATAL:', err.message);
    check('script completed without throwing', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=== Phase 10/11/12 verification ===');
  let allPass = true;
  CHECKS.forEach((c) => {
    console.log(`${c.pass ? '✅' : '❌'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
    if (!c.pass) allPass = false;
  });
  console.log(allPass ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exit(allPass ? 0 : 1);
})();