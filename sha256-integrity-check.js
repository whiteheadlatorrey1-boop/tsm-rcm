const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8080';
const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

let failures = 0;
const ok = (label, cond, extra) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}` + (extra ? ` (${extra})` : ''));
  if (!cond) failures++;
};

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ── 1. HOTELOPS: war room signs -> strategist verifies clean -> detects tamper ──
  {
    const ctx = await browser.createBrowserContext();
    const warRoom = await ctx.newPage();
    await warRoom.goto(`${BASE}/war-rooms/hotel-war/hotelops-war-room.html`, { waitUntil: 'domcontentloaded' });
    await warRoom.click('#btnLoadSample');
    await new Promise(r => setTimeout(r, 500));
    await warRoom.click('#btnRelay');
    await new Promise(r => setTimeout(r, 800));

    const stored = await warRoom.evaluate(() => localStorage.getItem('TSM_HOTELOPS_STRATEGIST_RELAY'));
    const parsed = JSON.parse(stored || 'null');
    ok('hotelops: relay payload is signed', !!(parsed && parsed._integrity && parsed._integrity.hash));
    ok('hotelops: signed by correct module', parsed && parsed._integrity && parsed._integrity.module === 'hotelops');

    const selfCheck = await warRoom.evaluate(async (data) => await window.TSMIntegrity.verify(data), parsed);
    ok('hotelops: signature is cryptographically valid', selfCheck.ok, JSON.stringify(selfCheck));
    await warRoom.close();

    const strat = await ctx.newPage();
    const stratWarnings = [];
    strat.on('console', m => { if (/integrity mismatch/i.test(m.text())) stratWarnings.push(m.text()); });
    await strat.goto(`${BASE}/war-rooms/hotel-war/hotelops-strategist.html`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    ok('hotelops strategist: no mismatch on valid relay', stratWarnings.length === 0, stratWarnings.join('; '));

    stratWarnings.length = 0;
    await strat.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('TSM_HOTELOPS_STRATEGIST_RELAY'));
      raw.kpis = raw.kpis || {};
      raw.kpis.__tampered = true; // mutate content WITHOUT re-signing
      localStorage.setItem('TSM_HOTELOPS_STRATEGIST_RELAY', JSON.stringify(raw));
    });
    await strat.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    ok('hotelops strategist: DETECTS tampered relay data', stratWarnings.length > 0, stratWarnings.join('; '));
    await strat.close();
    await ctx.close();
  }

  // ── 2. SENTINEL CENTER: ingest signs -> read verifies clean -> detects tamper ──
  {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const warnings = [];
    page.on('console', m => { if (/integrity mismatch/i.test(m.text())) warnings.push(m.text()); });
    await page.goto(`${BASE}/sentinel-center.html`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));

    const samplePayload = { generatedAt: new Date().toISOString(), anomalies: [{ id: 'test-1', title: 'Test anomaly', severity: 'HIGH', exposure: 1000, confidence: 90, rootCause: 'x', recommendedAction: 'y' }] };
    await page.evaluate(async (payload) => { await window.TSM_SENTINEL.ingest('healthcare', payload); }, samplePayload);
    await new Promise(r => setTimeout(r, 500));

    const stored = await page.evaluate(() => localStorage.getItem('TSM_HEALTHCARE_STRATEGIST_RELAY'));
    const parsed = JSON.parse(stored || 'null');
    ok('sentinel-center: ingested payload is signed', !!(parsed && parsed._integrity && parsed._integrity.hash));
    ok('sentinel-center: signed by correct module', parsed && parsed._integrity && parsed._integrity.module === 'sentinel-center');

    warnings.length = 0;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    ok('sentinel-center: no mismatch on valid signed data after reload', warnings.length === 0, warnings.join('; '));

    warnings.length = 0;
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('TSM_HEALTHCARE_STRATEGIST_RELAY'));
      raw.anomalies[0].exposure = 999999999; // mutate WITHOUT re-signing
      localStorage.setItem('TSM_HEALTHCARE_STRATEGIST_RELAY', JSON.stringify(raw));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    ok('sentinel-center: DETECTS tampered data', warnings.length > 0, warnings.join('; '));

    const auditLog = await page.evaluate(() => JSON.parse(localStorage.getItem('TSM_SENTINEL_AUDIT_LOG') || '[]'));
    ok('sentinel-center: tamper logged to audit trail', auditLog.some(e => e.type === 'integrity_mismatch'));
    await ctx.close();
  }

  // ── 3. RCM-OS: relay client send() signs, verify against local fallback ──
  // Note: POST /api/rcm/relay requires an API key (requireAuth middleware)
  // that isn't configured in this sandbox, so send() correctly falls back
  // to localStorage (by design) and load()'s server-first GET returns a
  // legitimate 204. Testing the local-storage path directly here, same as
  // the other two modules — this is the path real cross-tab same-browser
  // relays use today regardless of server auth config.
  {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/finops-suite/tsm-rcm-os.html`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));

    const sendResult = await page.evaluate(async () => {
      const payload = { docName: 'integrity-smoke-test.pdf', generatedAt: new Date().toISOString(), engines: { test: true } };
      return await window.RCMRelay.send(payload);
    });
    ok('rcm-os: send() falls back to local storage (server auth not configured in sandbox)', sendResult.via === 'local', JSON.stringify(sendResult));

    const stored = await page.evaluate(() => localStorage.getItem('TSM_FINOPS_RCM_RELAY'));
    const parsed = JSON.parse(stored || 'null');
    ok('rcm-os: relay send() signs payload', !!(parsed && parsed._integrity && parsed._integrity.hash));

    const verifyClean = await page.evaluate(async (data) => await window.TSMIntegrity.verify(data), parsed);
    ok('rcm-os: signature verifies clean before tampering', verifyClean.ok, JSON.stringify(verifyClean));

    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('TSM_FINOPS_RCM_RELAY'));
      raw.docName = 'HACKED.pdf'; // mutate WITHOUT re-signing
      localStorage.setItem('TSM_FINOPS_RCM_RELAY', JSON.stringify(raw));
    });
    const tamperResult = await page.evaluate(async () => {
      const raw = JSON.parse(localStorage.getItem('TSM_FINOPS_RCM_RELAY'));
      return await window.TSMIntegrity.verify(raw);
    });
    ok('rcm-os: DETECTS tampered payload', tamperResult.ok === false && tamperResult.reason === 'mismatch', JSON.stringify(tamperResult));
    await ctx.close();
  }

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
