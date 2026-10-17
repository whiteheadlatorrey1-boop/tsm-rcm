#!/usr/bin/env node
// capture-bpo-flagship.js — fail-loud capture of the real BPO client-onboarding flow.
//
//   node capture-bpo-flagship.js        (server must be running, MONGODB_URI
//                                        pointing at a TEST database set)
//
// Walks the exact flow proven live in docs/bpo-client-onboarding.md:
//   1-3. Admin opens the BPO client console, creates "Sample BPO Client",
//        gets a real access code (real UI, real HTTP routes — not mocked).
//   (between frames 3 and 4, no UI exists for this yet — see
//    docs/bpo-client-onboarding.md's "staff-mediated, not self-service"
//    finding — so a case + one scripted document are created via the same
//    authenticated session's own request context, exactly what the admin
//    console would do if it had a case-creation UI today)
//   4-5. The client signs in with that access code and sees their case,
//        document included, on the real client portal.
//
// SAFETY: refuses to run if NODE_ENV=production or FLY_APP_NAME is set
// (same guard as every other BPO-Mongo-touching script in this repo — this
// creates a real client/case/document against whatever MONGODB_URI points
// at).
//
// CLEANUP: this script does NOT clean up after itself. tests/e2e/helpers's
// demo-step.js's fail() calls process.exit() directly on a failed step,
// which would skip any try/catch cleanup written here. Instead, every
// created id is persisted to STATE_FILE as soon as it exists, and
// make-bpo-flagship.sh's own trap (same mechanism it already uses for the
// data/l1-copilot-handoffs.json side effect) runs
// cleanup-bpo-flagship-capture.js unconditionally on exit — cleanup lives
// at the layer that is actually guaranteed to run.
//
// Scripted/demo data only: the client is named "Sample BPO Client" (no real
// client name), the document is a generated text file, nothing else is
// typed in.

if (process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME) {
  console.error('Refusing to run: this looks like a real deployment (NODE_ENV=production or FLY_APP_NAME set). This script creates real records.');
  process.exit(1);
}

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { createCapture } = require('../helpers/demo-step.js');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = process.env.TSM_LOGIN_PASSWORD || 'dev';
const OUT = path.join(__dirname, 'screenshots', 'bpo-flagship');
const SIDECAR = path.join(__dirname, 'bpo-capture.json'); // matches render-from-manifest.js's sidecar-candidate naming so the quality gate's sensitive-data scan actually runs
const STATE_FILE = path.join(__dirname, '.bpo-flagship-capture-state.json');

const CLIENT_NAME = 'Sample BPO Client';
const CASE_ID = 'tsm-acceptance-bpo-flagship-case';
const DOC_FILENAME = 'sample-engagement-letter.txt';
const DOC_CONTENT = 'Sample engagement letter for a scripted BPO flagship demo. No real client data.';

function recordState(fields) {
  const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { caseId: CASE_ID };
  Object.assign(state, fields);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
// Recorded up front -- the case id is a constant this script controls, not
// something discovered at runtime, so cleanup can find it even if nothing
// past this line ever runs.
recordState({ caseId: CASE_ID });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const { step, writeSidecar, pageErrors } = createCapture({ page, browser, outDir: OUT, base: BASE });

  const lr = await page.request.post(BASE + '/api/auth/login', { data: { password: PASS } });
  if (!lr.ok()) { console.error('admin login failed: HTTP ' + lr.status()); await browser.close(); process.exit(1); }
  console.log('Admin logged in. Capturing to ' + OUT);

  // ---- frames 1-3: admin creates the client, real UI -------------------
  await page.goto(BASE + '/bpo-clients-admin.html', { waitUntil: 'domcontentloaded' });
  await step('admin-console', async () => {}, { see: ['#clientList'], wait: 1200 });

  await step('new-client-form', () => page.locator('#toggleAddBtn').click({ timeout: 4000 }), {
    need: ['#toggleAddBtn'],
    see: ['#newName'],
  });

  await step('client-created', async () => {
    await page.fill('#newName', CLIENT_NAME, { timeout: 4000 });
    await page.locator('#createClientBtn').click({ timeout: 4000 });
  }, {
    need: ['#newName', '#createClientBtn'],
    see: ['#accessCodeBanner'],
    text: ['#accessCodeBanner', /access code/i],
    record: { accessCode: '#accessCodeBanner code' },
  });

  const accessCode = (await page.locator('#accessCodeBanner code').innerText({ timeout: 4000 })).trim();
  const clientId = await page.locator(`.client-card:has-text("${CLIENT_NAME}")`).first().getAttribute('data-client-id');
  if (!accessCode || !clientId) { console.error('could not read back the real access code / client id from the DOM'); await browser.close(); process.exit(1); }
  recordState({ clientId });
  console.log('  created client ' + clientId + ' (access code captured, never logged)');

  // ---- side effect: a case + one document, under the client just created.
  // No admin-console UI for this exists yet (see
  // docs/bpo-client-onboarding.md) -- same authenticated admin session,
  // same real routes proven live in Part 2's acceptance test.
  const caseRes = await page.request.post(BASE + `/api/bpo/work-items/${CASE_ID}`, {
    data: { clientId, payload: { structuredCase: { financialExposure: 4200, recoveryLikelihood: 'LIKELY' } } },
  });
  if (!caseRes.ok()) { console.error('case creation failed: HTTP ' + caseRes.status()); await browser.close(); process.exit(1); }

  const uploadRes = await page.request.post(BASE + `/api/bpo/work-items/${CASE_ID}/documents`, {
    multipart: { file: { name: DOC_FILENAME, mimeType: 'text/plain', buffer: Buffer.from(DOC_CONTENT, 'utf8') } },
  });
  if (!uploadRes.ok()) { console.error('document upload failed: HTTP ' + uploadRes.status()); await browser.close(); process.exit(1); }
  const uploadBody = await uploadRes.json();
  const docId = uploadBody && uploadBody.document && uploadBody.document.docId;
  recordState({ docId });
  console.log('  seeded case ' + CASE_ID + ' with document ' + docId);

  // ---- frames 4-5: the client signs in and sees it, real UI ------------
  const clientLogin = await page.request.post(BASE + '/api/auth/login', { data: { accessCode } });
  if (!clientLogin.ok()) { console.error('client login with the real access code failed: HTTP ' + clientLogin.status()); await browser.close(); process.exit(1); }

  await page.goto(BASE + '/client-portal.html', { waitUntil: 'domcontentloaded' });
  await step('client-signs-in', async () => {}, {
    see: ['#app', '.case-row'],
    text: ['#client-label', new RegExp(CLIENT_NAME, 'i')],
    wait: 1500,
  });

  await step('client-sees-case', () => page.locator('.case-row').first().click({ timeout: 4000 }), {
    need: ['.case-row'],
    see: ['.doc-row.open .doc-list a'],
    record: { document: '.doc-row.open .doc-list' },
  });

  const { n } = writeSidecar(SIDECAR);
  console.log(`\n${n} frames captured -> ${OUT}`);
  if (pageErrors.length) console.warn('page errors seen during capture: ' + [...new Set(pageErrors)].join(' | '));
  await browser.close();
})();
