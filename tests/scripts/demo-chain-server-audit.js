#!/usr/bin/env node
/**
 * demo-chain-server-audit.js
 *
 * Server-side stand-in for tests/playwright/war-room-prep-workflows.spec.js.
 * A real browser (Playwright/Chromium) can't be provisioned in this sandbox —
 * cdn.playwright.dev is not in the network egress allowlist — so this script
 * reproduces the same chain-walk at the HTTP + static-analysis level instead
 * of the DOM level:
 *
 *   For every URL in every chain (sector chains, SAP-phase chains, Honeywell
 *   scenario chain, plus the doc-search-multi.html entry-point link checks):
 *     1. GET the page, assert status < 400
 *     2. Extract every <script src="..."> and assert that asset also
 *        resolves with status < 400 (a 404 HTML error page served in place
 *        of a .js file is the single most common real cause of the
 *        "SyntaxError: Unexpected token '<'" bug this branch exists to fix)
 *     3. Parse every inline <script>...</script> block with Node's vm module
 *        and assert it's syntactically valid JS (catches stray/empty/
 *        malformed <script> tags directly, without needing a live DOM)
 *
 * This does NOT click buttons, seed relay/localStorage, or exercise runtime
 * behavior (AUTO-RUN demo playback, relay completion polling) — that needs
 * a real browser and should still be run via Playwright in Codespaces/CI.
 * This is the structural/parse-time layer only.
 *
 * Run: node tests/scripts/demo-chain-server-audit.js
 * Requires a running `node server.js` at BASE_URL (default http://localhost:8080)
 */

const vm = require('vm');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const DOC_SEARCH = '/html/tsm-doc-search-multi.html';
const REPORT_PATH = path.join(__dirname, '..', '..', 'reports', 'logs', 'demo-chain-server-audit.json');

// ---- Chain definitions (mirrors war-room-prep-workflows.spec.js) ----------

const sectorChains = [
  { name: 'Healthcare', warRoom: '/html/healthcare/hc-denial-war-room.html', strategist: '/html/healthcare/hc-main-strategist.html', executive: '/html/healthcare/executive-portal.html' },
  { name: 'FinOps', warRoom: '/html/finops-suite/finops-war-room.html', strategist: '/html/finops-suite/finops-main-strategist.html', executive: '/html/finops-suite/finops-executive-portal.html' },
  { name: 'Insurance', warRoom: '/html/tsm-insurance/insurance-war-room.html', strategist: '/html/tsm-insurance/insurance-strategist.html', executive: '/html/tsm-insurance/insurance-executive-portal.html' },
  { name: 'Construction', warRoom: '/html/construction-suite/construction-war-room.html', strategist: '/html/construction-suite/construction-strategist.html', executive: '/html/construction-suite/construction-executive-portal.html' },
  { name: 'Legal', warRoom: '/html/legal-pro/legal-war-room.html', strategist: '/html/legal-pro/legal-main-strategist.html', executive: '/html/legal-pro/legal-executive-portal.html' },
  { name: 'Real Estate', warRoom: '/html/reo-pro/re-war-room.html', strategist: '/html/reo-pro/re-strategist.html', executive: '/html/reo-pro/re-exec-portal.html' },
  { name: 'BPO (demo chain)', warRoom: '/html/bpo/bpo-situation-room.html', strategist: '/html/bpo/bpo-strategist-v2.html', executive: '/html/bpo/bpo-executive-portal.html' },
];

const phaseChainsRaw = [
  { name: 'O2C', domain: 'o2c', dir: 'o2c' },
  { name: 'CRM', domain: 'crm', dir: 'crm' },
  { name: 'CPQ', domain: 'cpq', dir: 'cpq' },
  { name: 'Catalog', domain: 'catalog', dir: 'catalog' },
  { name: 'Approval', domain: 'approval', dir: 'approval' },
  { name: 'MDM', domain: 'mdm', dir: 'mdm' },
  { name: 'Governance', domain: 'governance', dir: 'governance' },
  { name: 'Digital Twin', domain: 'digital-twin', dir: 'digital-twin', warRoomFile: 'digital-twin.html' },
  { name: 'BPO Services (SAP phase)', domain: 'bpo', dir: 'bpo', warRoomFile: 'bpo-war-room.html' },
  { name: 'NOC', domain: 'noc', dir: 'noc' },
];
const phaseChains = phaseChainsRaw.map((p) => ({
  name: p.name,
  warRoom: `/html/war-rooms/${p.dir}/${p.warRoomFile || `${p.domain}-war-room.html`}`,
  strategist: `/html/war-rooms/${p.dir}/${p.domain}-strategist.html`,
  executive: `/html/war-rooms/${p.dir}/${p.domain}-executive-portal.html`,
}));
phaseChains.push({
  name: 'Integration Hub',
  warRoom: '/html/war-rooms/integration-hub/integration-hub.html',
  strategist: '/html/war-rooms/integration-hub/integration-hub-strategist.html',
  executive: '/html/war-rooms/integration-hub/integration-hub-executive-portal.html',
});

const honeywellScenarios = [
  { name: 'Honeywell — Plant Incident', warRoom: '/html/plant-incident.html' },
  { name: 'Honeywell — Cyber Incident', warRoom: '/html/cyber-incident.html' },
  { name: 'Honeywell — Supplier Shutdown', warRoom: '/html/supplier-shutdown.html' },
];
const honeywellStrategist = '/html/war-rooms/honeywell-strategist.html';
const honeywellExecutive = '/html/war-rooms/honeywell-executive-portal.html';

// ---- HTTP + parse helpers --------------------------------------------------

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'manual' });
  const text = await res.text();
  return { status: res.status, text };
}

function extractScriptSrcs(html) {
  const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function extractInlineScripts(html) {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\bsrc=/i.test(attrs)) continue; // external, not inline
    if (/type=["'](application\/json|application\/ld\+json|text\/template)["']/i.test(attrs)) continue;
    out.push(m[2]);
  }
  return out;
}

function checkInlineScriptSyntax(code, idx) {
  const trimmed = code.trim();
  if (!trimmed) return null; // empty <script></script> is valid (if unusual) JS
  try {
    new vm.Script(trimmed);
    return null;
  } catch (e) {
    return `inline <script> block #${idx}: ${e.constructor.name}: ${e.message}`;
  }
}

async function auditPage(url, label, results, seenAssets) {
  const full = BASE_URL + url;
  const entry = { label, url, status: null, ok: false, assetErrors: [], scriptErrors: [] };
  try {
    const { status, text } = await fetchText(full);
    entry.status = status;
    if (status >= 400) {
      entry.error = `HTTP ${status}`;
      results.push(entry);
      return entry;
    }

    // External script asset check
    for (const src of extractScriptSrcs(text)) {
      if (/^https?:\/\//i.test(src)) continue; // skip CDN/external
      const assetUrl = src.startsWith('/') ? BASE_URL + src : BASE_URL + path.posix.join(path.posix.dirname(url), src);
      if (seenAssets.has(assetUrl)) {
        if (seenAssets.get(assetUrl) >= 400) entry.assetErrors.push(`${src} -> HTTP ${seenAssets.get(assetUrl)}`);
        continue;
      }
      try {
        const r = await fetch(assetUrl);
        seenAssets.set(assetUrl, r.status);
        if (r.status >= 400) entry.assetErrors.push(`${src} -> HTTP ${r.status}`);
        else {
          // A 200 that actually serves an HTML error/fallback page (not JS) is
          // the classic "Unexpected token '<'" trigger even though status is OK.
          const body = await r.text();
          const looksLikeHtml = /^\s*<(!doctype|html)/i.test(body);
          if (looksLikeHtml) entry.assetErrors.push(`${src} -> HTTP 200 but body is HTML, not JS (would throw SyntaxError: Unexpected token '<' when executed)`);
        }
      } catch (e) {
        entry.assetErrors.push(`${src} -> fetch failed: ${e.message}`);
      }
    }

    // Inline script syntax check
    extractInlineScripts(text).forEach((code, i) => {
      const err = checkInlineScriptSyntax(code, i);
      if (err) entry.scriptErrors.push(err);
    });

    entry.ok = entry.assetErrors.length === 0 && entry.scriptErrors.length === 0;
  } catch (e) {
    entry.error = `fetch failed: ${e.message}`;
  }
  results.push(entry);
  return entry;
}

async function auditChain(chain, results, seenAssets) {
  const wr = await auditPage(chain.warRoom, `${chain.name} war room`, results, seenAssets);
  const st = await auditPage(chain.strategist, `${chain.name} strategist`, results, seenAssets);
  const ex = await auditPage(chain.executive, `${chain.name} executive portal`, results, seenAssets);
  return { name: chain.name, ok: wr.ok && st.ok && ex.ok, steps: [wr, st, ex] };
}

// ---- Main -------------------------------------------------------------

(async () => {
  const results = [];
  const seenAssets = new Map();
  const chainSummaries = [];

  // Entry point + link-wiring checks
  const entry = await auditPage(DOC_SEARCH, 'Doc Search Multi (entry point)', results, seenAssets);
  const { text: docSearchHtml } = await fetchText(BASE_URL + DOC_SEARCH).catch(() => ({ text: '' }));
  const linkChecks = [];
  for (const chain of [...sectorChains, ...phaseChains]) {
    const linked = docSearchHtml.includes(chain.warRoom);
    linkChecks.push({ chain: chain.name, warRoom: chain.warRoom, linkedFromDocSearch: linked });
  }

  // Sector chains
  for (const chain of sectorChains) {
    chainSummaries.push({ group: 'sector', ...(await auditChain(chain, results, seenAssets)) });
  }
  // SAP phase chains
  for (const chain of phaseChains) {
    chainSummaries.push({ group: 'phase', ...(await auditChain(chain, results, seenAssets)) });
  }
  // Honeywell scenario chain
  for (const scenario of honeywellScenarios) {
    const sc = await auditPage(scenario.warRoom, scenario.name, results, seenAssets);
    const st = await auditPage(honeywellStrategist, 'Honeywell strategist', results, seenAssets);
    const ex = await auditPage(honeywellExecutive, 'Honeywell executive portal', results, seenAssets);
    chainSummaries.push({ group: 'honeywell', name: scenario.name, ok: sc.ok && st.ok && ex.ok, steps: [sc, st, ex] });
  }

  // ---- Report ----
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify({ entry, linkChecks, chainSummaries }, null, 2));

  console.log('\n=== ENTRY POINT ===');
  console.log(`doc-search-multi.html: ${entry.ok ? 'OK' : 'FAIL'} (HTTP ${entry.status})`);
  if (!entry.ok) console.log('  ', entry.error || entry.assetErrors.concat(entry.scriptErrors).join('; '));

  const unlinked = linkChecks.filter((l) => !l.linkedFromDocSearch);
  console.log(`\nLink wiring: ${linkChecks.length - unlinked.length}/${linkChecks.length} chains discoverable from doc-search-multi.html`);
  unlinked.forEach((l) => console.log(`  ✗ NOT LINKED: ${l.chain} (${l.warRoom})`));

  console.log('\n=== CHAINS ===');
  for (const group of ['sector', 'phase', 'honeywell']) {
    const inGroup = chainSummaries.filter((c) => c.group === group);
    if (!inGroup.length) continue;
    console.log(`\n-- ${group.toUpperCase()} --`);
    for (const c of inGroup) {
      console.log(`${c.ok ? '✓' : '✗'} ${c.name}`);
      if (!c.ok) {
        for (const step of c.steps) {
          if (step.ok) continue;
          const msgs = [step.error, ...step.assetErrors, ...step.scriptErrors].filter(Boolean);
          console.log(`    [${step.label}] HTTP ${step.status ?? '?'}`);
          msgs.forEach((m) => console.log(`      - ${m}`));
        }
      }
    }
  }

  const totalChains = chainSummaries.length;
  const passChains = chainSummaries.filter((c) => c.ok).length;
  console.log(`\n=== SUMMARY: ${passChains}/${totalChains} chains clean, ${unlinked.length} unlinked, report -> ${REPORT_PATH} ===`);

  process.exit(passChains === totalChains && unlinked.length === 0 && entry.ok ? 0 : 1);
})();