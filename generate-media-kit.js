// generate-media-kit.js
//
// Generates a clean marketing/media screenshot library from the live
// TSM-Consultz war rooms, strategists, and executive portals.
//
// USAGE (run from repo root, with `node server.js` already running):
//   BASE_URL=http://localhost:4173 node generate-media-kit.js
//
// Output lands in ./media/<vertical>/<page>.png
//
// NOTES:
//   - BPO's strategist (bpo-strategist-v2.html) is deliberately SKIPPED —
//     known deterministic renderer crash as of 2026-07-13, see
//     war-room-prep-workflows.spec.js for details. War room + executive
//     portal for BPO are still captured.
//   - Screenshots are full-page. Review each one before public use —
//     check for placeholder/test data, misaligned UI, or debugging
//     artifacts per the standard caution on repurposing test captures.
//   - Uses a real browser (chromium), same dependency as your Playwright
//     suite — no extra install needed if `npx playwright install` has
//     already been run.

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const OUT_DIR = path.join(__dirname, 'media');
const SETTLE_MS = Number(process.env.SETTLE_MS || 1500); // extra time after load for animations/data
const VIEWPORT = { width: 1920, height: 1080 };

// --- Chain definitions (mirrors tests/playwright/war-room-prep-workflows.spec.js) ---

const sectorChains = [
  {
    slug: 'healthcare',
    pages: {
      'war-room': '/html/healthcare/hc-denial-war-room.html',
      'strategist': '/html/healthcare/hc-main-strategist.html',
      'executive-dashboard': '/html/healthcare/executive-portal.html',
    },
  },
  {
    slug: 'finops',
    pages: {
      'war-room': '/html/finops-suite/finops-war-room.html',
      'strategist': '/html/finops-suite/finops-main-strategist.html',
      'executive-dashboard': '/html/finops-suite/finops-executive-portal.html',
    },
  },
  {
    slug: 'insurance',
    pages: {
      'war-room': '/html/tsm-insurance/insurance-war-room.html',
      'strategist': '/html/tsm-insurance/insurance-strategist.html',
      'executive-dashboard': '/html/tsm-insurance/insurance-executive-portal.html',
    },
  },
  {
    slug: 'construction',
    pages: {
      'project-controls': '/html/construction-suite/construction-war-room.html',
      'strategist': '/html/construction-suite/construction-strategist.html',
      'executive-dashboard': '/html/construction-suite/construction-executive-portal.html',
    },
  },
  {
    slug: 'legal',
    pages: {
      'war-room': '/html/legal-pro/legal-war-room.html',
      'strategist': '/html/legal-pro/legal-main-strategist.html',
      'executive-dashboard': '/html/legal-pro/legal-executive-portal.html',
    },
  },
  {
    slug: 'real-estate',
    pages: {
      'war-room': '/html/reo-pro/re-war-room.html',
      'strategist': '/html/reo-pro/re-strategist.html',
      'executive-dashboard': '/html/reo-pro/re-exec-portal.html',
    },
  },
  {
    slug: 'bpo',
    pages: {
      'war-room': '/html/bpo/bpo-situation-room.html',
      // 'strategist' intentionally omitted — bpo-strategist-v2.html crashes
      // the renderer as of 2026-07-13. Re-add once root-caused and fixed.
      'executive-dashboard': '/html/bpo/bpo-executive-portal.html',
    },
  },
];

// SAP-phase war rooms, useful for the "Enterprise Runtime architecture" /
// platform-capability side of a deck rather than industry-specific slides.
const phaseChains = [
  { name: 'O2C', dir: 'o2c', domain: 'o2c' },
  { name: 'CRM', dir: 'crm', domain: 'crm' },
  { name: 'CPQ', dir: 'cpq', domain: 'cpq' },
  { name: 'Catalog', dir: 'catalog', domain: 'catalog' },
  { name: 'Approval', dir: 'approval', domain: 'approval' },
  { name: 'MDM', dir: 'mdm', domain: 'mdm' },
  { name: 'Governance', dir: 'governance', domain: 'governance' },
  { name: 'Digital Twin', dir: 'digital-twin', domain: 'digital-twin', warRoomFile: 'digital-twin.html' },
  { name: 'NOC', dir: 'noc', domain: 'noc' },
].map((p) => ({
  slug: `enterprise/${p.dir}`,
  pages: {
    'war-room': `/html/war-rooms/${p.dir}/${p.warRoomFile || `${p.domain}-war-room.html`}`,
    'strategist': `/html/war-rooms/${p.dir}/${p.domain}-strategist.html`,
    'executive-dashboard': `/html/war-rooms/${p.dir}/${p.domain}-executive-portal.html`,
  },
}));

phaseChains.push({
  slug: 'enterprise/integration-hub',
  pages: {
    'war-room': '/html/war-rooms/integration-hub/integration-hub.html',
    'strategist': '/html/war-rooms/integration-hub/integration-hub-strategist.html',
    'executive-dashboard': '/html/war-rooms/integration-hub/integration-hub-executive-portal.html',
  },
});

// Cross-vertical / workflow-level shots — good for the "how it works"
// section of a deck or website, not tied to one industry.
const workflowShots = {
  slug: 'workflow',
  pages: {
    'doc-search-entry': '/html/tsm-doc-search-multi.html',
    'wip-command-center': '/html/tsm-wip-command-center.html',
  },
};

const allChains = [...sectorChains, ...phaseChains, workflowShots];

// --- Runner ---

async function shootPage(page, url, outPath, label) {
  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(SETTLE_MS);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`  OK   ${label} -> ${path.relative(__dirname, outPath)}`);
    return true;
  } catch (e) {
    console.log(`  FAIL ${label} (${url}): ${e.message.split('\n')[0]}`);
    return false;
  }
}

(async () => {
  console.log(`Media kit generation starting against ${BASE_URL}`);
  console.log(`Output: ${OUT_DIR}\n`);

  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  let ok = 0, fail = 0;

  for (const chain of allChains) {
    console.log(`${chain.slug}:`);
    for (const [name, url] of Object.entries(chain.pages)) {
      const outPath = path.join(OUT_DIR, chain.slug, `${name}.png`);
      const success = await shootPage(page, url, outPath, name);
      success ? ok++ : fail++;
    }
    console.log('');
  }

  await browser.close();

  console.log(`Done. ${ok} captured, ${fail} failed.`);
  if (fail > 0) {
    console.log('Some pages failed — check output above before treating the kit as complete.');
    process.exitCode = 1;
  }
})();