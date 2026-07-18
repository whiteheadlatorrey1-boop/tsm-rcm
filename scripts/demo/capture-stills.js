#!/usr/bin/env node
// scripts/demo/capture-stills.js
//
// Captures clean, high-res "hero" stills of every page in
// scripts/demo/demo-pages.conf — for building slides / a commercial reel,
// NOT for regression testing (see tests/playwright/demo-warrooms.spec.js
// for that; it only screenshots on failure).
//
// Stays in sync automatically: reads the same demo-pages.conf the
// certification suite uses, so any page added there shows up here too.
//
// For each page, captures TWO shots:
//   - <label>-hero.png    : above-the-fold viewport shot (1920x1080 @2x)
//                           — what you'd actually put in a commercial
//   - <label>-full.png    : full scrolling page, for reference / slides
//                           that need the whole picture
//
// Output: stills/<group>/<label>-hero.png, stills/<group>/<label>-full.png
// Also writes stills/manifest.json (label, group, path, captured-at)
// so you can script the commercial cut order later instead of doing it
// by hand.
//
// Usage:
//   node server.js &                          # start the app first
//   node scripts/demo/capture-stills.js        # against localhost:8080
//   BASE_URL=http://localhost:4173 node scripts/demo/capture-stills.js
//   node scripts/demo/capture-stills.js --only=music,noc   # filter by group keyword
//   node scripts/demo/capture-stills.js --settle=3000      # longer wait for slow data loads
//   node scripts/demo/capture-stills.js --headed            # watch it run, for debugging bad stills

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CONF_PATH = path.join(REPO_ROOT, 'scripts', 'demo', 'demo-pages.conf');
const OUT_DIR = path.join(REPO_ROOT, 'stills');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith('--only='));
const onlyFilter = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim().toLowerCase()) : null;
const settleArg = args.find((a) => a.startsWith('--settle='));
const settleMs = settleArg ? parseInt(settleArg.split('=')[1], 10) : 2000;
const headed = args.includes('--headed'); // watch it navigate live, for debugging bad stills

function loadPages() {
  const lines = fs.readFileSync(CONF_PATH, 'utf8').split('\n');
  const pages = [];
  let currentGroup = 'ungrouped';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Group headers look like: # --- Approval ---
    const groupMatch = line.match(/^#\s*-{2,}\s*(.+?)\s*-{2,}\s*$/);
    if (groupMatch) {
      currentGroup = groupMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      continue;
    }
    if (line.startsWith('#')) continue;
    const [label, relpath] = line.split('|');
    if (!label || !relpath) continue;
    pages.push({ label: label.trim(), relpath: relpath.trim(), group: currentGroup });
  }
  return pages;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  let pages = loadPages();
  if (onlyFilter) {
    pages = pages.filter((p) => onlyFilter.some((f) => p.group.includes(f) || p.label.includes(f)));
  }
  if (pages.length === 0) {
    console.error('No pages matched. Check --only filter or demo-pages.conf.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Capturing ${pages.length} page(s) against ${BASE_URL} (settle=${settleMs}ms)`);
  console.log('---');

  const browser = await chromium.launch({
    headless: !headed,
    args: ['--disable-dev-shm-usage'], // avoid renderer crashes in Codespaces (64MB /dev/shm cap)
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // crisp 2x stills, worth the file size for commercial use
  });
  const page = await context.newPage();

  const manifest = [];
  let failures = 0;

  for (const { label, relpath, group } of pages) {
    const url = `${BASE_URL}/html/${relpath}`;
    const groupDir = path.join(OUT_DIR, slugify(group));
    fs.mkdirSync(groupDir, { recursive: true });
    const heroPath = path.join(groupDir, `${label}-hero.png`);
    const fullPath = path.join(groupDir, `${label}-full.png`);

    process.stdout.write(`  ${group}/${label} ... `);
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (!response || response.status() >= 400) {
        console.log(`SKIP (HTTP ${response ? response.status() : 'no response'})`);
        failures++;
        continue;
      }
      // Let relay/runtime scripts populate data — these pages pull from
      // localStorage / mock data on load, needs a beat to render fully.
      await page.waitForTimeout(settleMs);

      await page.screenshot({ path: heroPath, fullPage: false });
      await page.screenshot({ path: fullPath, fullPage: true });

      manifest.push({
        label,
        group,
        url,
        hero: path.relative(REPO_ROOT, heroPath),
        full: path.relative(REPO_ROOT, fullPath),
        capturedAt: new Date().toISOString(),
      });
      console.log('OK');
    } catch (err) {
      console.log(`FAIL (${err.message.split('\n')[0]})`);
      failures++;
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('---');
  console.log(`Done: ${manifest.length} captured, ${failures} skipped/failed`);
  console.log(`Stills: ${OUT_DIR}/`);
  console.log(`Manifest: ${path.join(OUT_DIR, 'manifest.json')}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
