#!/usr/bin/env node
/**
 * flat-page-server-audit.js
 *
 * Same HTTP + static-analysis technique as demo-chain-server-audit.js,
 * applied to a flat list of standalone pages (Sweet Music OS / music-command
 * suite, TSM Career Training Platform) rather than war-room chains.
 *
 * For each page:
 *   1. GET it, assert status < 400
 *   2. Every <script src="..."> must also resolve < 400 and not be an
 *      HTML error page served with a 200
 *   3. Every inline <script> block must be syntactically valid JS
 *   4. NEW: detect JS sitting OUTSIDE any <script> tag but adjacent to one
 *      (heuristic: a line matching common JS-statement shapes appearing
 *      immediately after a </script> close, before the next tag) — catches
 *      the "duplicated code pasted without its <script> wrapper" bug found
 *      in presentation-live.html / demo-conductor.html / how-to-guide.html
 *
 * Run: BASE_URL=http://localhost:8099 node tests/scripts/flat-page-server-audit.js
 */

const vm = require('vm');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const REPORT_PATH = path.join(__dirname, '..', '..', 'reports', 'logs', 'flat-page-server-audit.json');

const PAGES = [
  // Sweet Music OS / music-command suite
  '/html/music-command/index.html',
  '/html/music-command/analytics.html',
  '/html/music-command/cadence-builder.html',
  '/html/music-command/demo-conductor.html',
  '/html/music-command/how-to-guide.html',
  '/html/music-command/playback-banger.html',
  '/html/music-command/presentation-live.html',
  '/html/music-command/producer-intel-panel.html',
  '/html/music-command/academy/daw-academy.html',
  '/html/music-command/academy/music-business.html',
  '/html/music-command/academy/music-theory.html',
  '/html/music-command/creation/beat-workbench.html',
  '/html/music-command/creation/song-builder.html',
  '/html/music-command/producer/mastering-coach.html',
  '/html/music-command/producer/mixing-coach.html',
  '/html/music-command/producer/producer-ai.html',
  '/html/music-command/producer/recording-coach.html',
  '/html/music-command/release/marketing.html',
  '/html/music-command/release/release-center.html',
  // TSM Career Training Platform
  '/html/tsm-career-training-platform.html',
];

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
    if (/\bsrc=/i.test(attrs)) continue;
    if (/type=["'](application\/json|application\/ld\+json|text\/template)["']/i.test(attrs)) continue;
    out.push(m[2]);
  }
  return out;
}

function checkInlineScriptSyntax(code, idx) {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    new vm.Script(trimmed);
    return null;
  } catch (e) {
    return `inline <script> block #${idx}: ${e.constructor.name}: ${e.message}`;
  }
}

// Heuristic: find text immediately following a </script> close tag, up to
// the next '<' character. If that stray text looks like JS statements
// (assignment, function call, declaration) rather than incidental
// whitespace, flag it as "code rendered outside a script tag".
function detectOrphanedCodeAfterScript(html) {
  const findings = [];
  const re = /<\/script>([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const chunk = m[1];
    if (!chunk || !chunk.trim()) continue;
    const looksLikeJs = /^\s*(window\.|const\s|let\s|var\s|function\s|document\.|\(function)/.test(chunk);
    if (looksLikeJs) {
      const preview = chunk.trim().slice(0, 80).replace(/\s+/g, ' ');
      findings.push(`orphaned JS-looking text directly after </script> (not inside any script tag): "${preview}..."`);
    }
  }
  return findings;
}

async function auditPage(url, seenAssets) {
  const full = BASE_URL + url;
  const entry = { url, status: null, ok: false, assetErrors: [], scriptErrors: [], orphanErrors: [] };
  try {
    const { status, text } = await fetchText(full);
    entry.status = status;
    if (status >= 400) {
      entry.error = `HTTP ${status}`;
      return entry;
    }

    for (const src of extractScriptSrcs(text)) {
      if (/^https?:\/\//i.test(src)) continue;
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
          const body = await r.text();
          if (/^\s*<(!doctype|html)/i.test(body)) entry.assetErrors.push(`${src} -> HTTP 200 but body is HTML, not JS`);
        }
      } catch (e) {
        entry.assetErrors.push(`${src} -> fetch failed: ${e.message}`);
      }
    }

    extractInlineScripts(text).forEach((code, i) => {
      const err = checkInlineScriptSyntax(code, i);
      if (err) entry.scriptErrors.push(err);
    });

    entry.orphanErrors = detectOrphanedCodeAfterScript(text);

    entry.ok = entry.assetErrors.length === 0 && entry.scriptErrors.length === 0 && entry.orphanErrors.length === 0;
  } catch (e) {
    entry.error = `fetch failed: ${e.message}`;
  }
  return entry;
}

(async () => {
  const seenAssets = new Map();
  const results = [];
  for (const url of PAGES) {
    results.push(await auditPage(url, seenAssets));
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));

  let pass = 0;
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.url}  (HTTP ${r.status ?? '?'})`);
    if (r.ok) { pass++; continue; }
    const msgs = [r.error, ...r.assetErrors, ...r.scriptErrors, ...r.orphanErrors].filter(Boolean);
    msgs.forEach((m) => console.log(`    - ${m}`));
  }
  console.log(`\n=== SUMMARY: ${pass}/${results.length} pages clean, report -> ${REPORT_PATH} ===`);
  process.exit(pass === results.length ? 0 : 1);
})();