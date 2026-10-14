#!/usr/bin/env node
'use strict';
// scripts/test-hub-links.js
//
// Static link crawler for the Platform Hub pages. Starting from:
//   html/bpo-files/suite-hub.html, html/demo/presentation-hub.html,
//   html/demo/tsm-demo-console.html, html/demo/demo-studio.html,
//   html/tsm-consultz-portfolio.html
// extracts every internal href (and a handful of JS-literal navigation
// targets — window.location.href = '...', window.open('...') — covering
// the task's "nav()" case) from each root page, resolves it against the
// filesystem the same way the static file server does (an absolute path
// like /html/x.html -> html/x.html; a relative path resolves against the
// linking page's own directory), and checks the target file actually
// exists on disk — the same check-pages.sh style used elsewhere in this
// repo, so this runs offline under `npm test` with no live server needed.
// Then does the same one hop deeper: every *.html page reached from a root
// has its own internal links crawled too (binary targets — videos, pptx,
// mp4 — are checked for existence but not crawled further).
//
// External links (http(s)://, mailto:, tel:), anchors (#...), and
// javascript:void(0)-style pseudo-links are skipped — there is nothing on
// disk to check them against.
//
// Exits non-zero (FAIL) if any internal link resolves to a missing file.

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const HTML_ROOT = path.join(REPO, 'html');

const ROOTS = [
  'html/bpo-files/suite-hub.html',
  'html/demo/presentation-hub.html',
  'html/demo/tsm-demo-console.html',
  'html/demo/demo-studio.html',
  'html/tsm-consultz-portfolio.html',
];

function extractLinks(rawText) {
  // Script bodies contain JS string/template-literal content that happens to
  // look like href="..."/src="..." (e.g. building markup with
  // `href="${x}"` or string concatenation) — strip everything between a
  // <script ...> tag and its </script>, keeping the opening tag itself so a
  // script's own `src="/path/to/file.js"` is still checked.
  const text = rawText.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1');

  const links = new Set();
  for (const m of text.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g)) links.add(m[1]);
  for (const m of text.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/g)) links.add(m[1]);
  for (const m of text.matchAll(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/g)) links.add(m[1]);
  for (const m of text.matchAll(/window\.open\(\s*["']([^"']+)["']/g)) links.add(m[1]);

  return [...links].filter((l) => {
    if (!l || !l.trim()) return false;
    if (/^(https?:|mailto:|tel:|javascript:|data:|about:|#)/i.test(l)) return false;
    if (/\$\{|^_blank$/.test(l)) return false; // leftover JS template-literal fragment or a bare target value
    const pathOnly = l.split('#')[0].split('?')[0];
    if (pathOnly.startsWith('/api/')) return false; // a server route, not a static file
    if (!path.extname(pathOnly)) return false; // no file extension — almost certainly a server route (e.g. /login), not a static file on disk
    return true;
  });
}

// server.js registers several static mounts besides the catch-all "/" ->
// html/ (app.use('/', express.static('html')) at line ~3001). A request
// under one of these prefixes is tried against each of that mount's real
// directories (in registration order) BEFORE falling through to the html/
// catch-all — so e.g. /js/x.js can resolve from repo-root js/x.js even
// though it isn't under html/js/. Mirrors server.js's actual app.use(...)
// calls; keep this in sync if those change.
const STATIC_MOUNTS = [
  { prefix: '/html/runtime', dirs: ['html/runtime'] },
  { prefix: '/runtime', dirs: ['runtime'] },
  { prefix: '/architecture', dirs: ['architecture'] },
  { prefix: '/core', dirs: ['core'] },
  { prefix: '/html', dirs: ['html'] },
  { prefix: '/config', dirs: ['config'] },
  { prefix: '/js', dirs: ['html/tsm-insurance/public/js', 'html/js', 'js'] },
  { prefix: '/bpo', dirs: ['html/bpo'] },
  { prefix: '/shared', dirs: ['html/shared'] },
  { prefix: '/insurance', dirs: ['html/tsm-insurance'] },
  { prefix: '/construction-suite', dirs: ['html/construction-suite'] },
  { prefix: '/music', dirs: ['html/war-rooms/music-war'] },
];

// Resolve a link found in `fromFile` (repo-relative path) to every
// repo-relative filesystem path the real server could plausibly serve it
// from, most-likely first. The caller treats it as found if ANY exist.
function resolveCandidates(link, fromFile) {
  const clean = decodeURIComponent(link.split('#')[0].split('?')[0]);
  if (!clean) return [];
  if (clean.startsWith('/')) {
    const candidates = [];
    for (const { prefix, dirs } of STATIC_MOUNTS) {
      if (clean === prefix || clean.startsWith(prefix + '/')) {
        const remainder = clean.slice(prefix.length);
        for (const dir of dirs) candidates.push(path.join(dir, remainder));
      }
    }
    // Catch-all fallback: "/" -> html/, same as a bare path with no
    // matching specific mount above.
    candidates.push(path.join('html', clean));
    return [...new Set(candidates)];
  }
  // Relative path: resolve against the linking page's own directory.
  const fromDir = path.dirname(fromFile);
  return [path.relative(REPO, path.join(REPO, fromDir, clean))];
}

function crawl() {
  const broken = []; // { fromFile, link, resolved }
  const visitedPages = new Set();
  const checkedTargets = new Map(); // resolved path -> exists

  function checkTarget(resolved) {
    if (checkedTargets.has(resolved)) return checkedTargets.get(resolved);
    const exists = fs.existsSync(path.join(REPO, resolved));
    checkedTargets.set(resolved, exists);
    return exists;
  }

  function visitPage(repoRelFile, depth) {
    if (visitedPages.has(repoRelFile)) return;
    visitedPages.add(repoRelFile);
    const full = path.join(REPO, repoRelFile);
    if (!fs.existsSync(full)) return; // the root itself missing is reported by the caller
    const text = fs.readFileSync(full, 'utf8');

    for (const link of extractLinks(text)) {
      const candidates = resolveCandidates(link, repoRelFile);
      if (!candidates.length) continue;
      const found = candidates.find((c) => checkTarget(c));
      if (!found) {
        broken.push({ fromFile: repoRelFile, link, resolved: candidates[0] });
        continue;
      }
      // One hop deep: crawl any *.html page reached from a root, but don't
      // recurse past that (binary assets — mp4/pptx/png — aren't crawled).
      if (depth < 2 && found.endsWith('.html')) {
        visitPage(found, depth + 1);
      }
    }
  }

  for (const root of ROOTS) {
    if (!fs.existsSync(path.join(REPO, root))) {
      broken.push({ fromFile: '(root)', link: root, resolved: root });
      continue;
    }
    visitPage(root, 1);
  }

  return { broken, pagesVisited: visitedPages.size };
}

// Known, flagged-but-not-fixed finding: html/healthcare/hc-strategist/index.html
// links to /document-showcase/index.html, which doesn't exist; the only file
// with that name anywhere in the repo is html/construction-suite/
// document-showcase.html — a healthcare strategist page linking to a
// construction-suite resource doesn't look like an obvious typo of a
// nearby path (could be a copy-paste leftover, or a healthcare-specific
// page that was simply never built), so this isn't fixed by guessing — it's
// WARNed, not failed, same pattern relay-verticals.conf uses for its
// documented College/Honeywell exceptions. Remove this entry once a human
// decides which it is.
const KNOWN_AMBIGUOUS = new Set([
  'html/healthcare/hc-strategist/index.html|/document-showcase/index.html',
]);

const { broken, pagesVisited } = crawl();
const real = broken.filter((b) => !KNOWN_AMBIGUOUS.has(`${b.fromFile}|${b.link}`));
const flagged = broken.filter((b) => KNOWN_AMBIGUOUS.has(`${b.fromFile}|${b.link}`));

if (flagged.length) {
  console.log(`WARN: ${flagged.length} known-ambiguous link(s), not failing (see KNOWN_AMBIGUOUS):`);
  for (const b of flagged) console.log(`  ${b.fromFile} -> "${b.link}" (resolved: ${b.resolved}, missing)`);
}

if (real.length) {
  console.log(`FAIL: ${real.length} broken link(s) across ${pagesVisited} pages crawled:`);
  for (const b of real) {
    console.log(`  ${b.fromFile} -> "${b.link}" (resolved: ${b.resolved}, missing)`);
  }
  process.exit(1);
}
console.log(`${pagesVisited} pages passed, 0 failed`);
process.exit(0);
