#!/usr/bin/env node
/**
 * scripts/validate-patch.js
 *
 * File-level validator to run BEFORE marking a patch "applied". Built to
 * catch the recurring injector bug seen repeatedly in this repo's patch
 * history: a patch tool reports success but actually (a) drops a
 * <script src="..."> tag it claimed to add, or (b) writes a premature
 * </body></html> — closing the document early, so everything the patch
 * meant to append after it either never lands or lands as dead trailing
 * markup outside <html>.
 *
 * This is deliberately a static, dependency-free checker (no jsdom/parser)
 * so it has zero setup cost and can run on every patch, every time.
 *
 * Checks per HTML file:
 *   1. Premature close — </body> and/or </html> appear before the end of
 *      the file (i.e. there is non-whitespace content, especially another
 *      <script> tag, AFTER the closing tags). This is the exact shape of
 *      the recurring bug.
 *   2. Duplicate close — more than one </body> or </html>.
 *   3. Unbalanced <script> — mismatched <script ...> vs </script> counts
 *      (a dropped/half-written include tag often shows up as an odd count).
 *   4. Dead local targets — every local (non-http, non-#) <script src="...">
 *      and href="....html" resolves to a real file on disk. This is what
 *      catches "the include was added as a comment/typo, not a real tag"
 *      and the plain old dead-link case.
 *
 * Usage:
 *   node scripts/validate-patch.js file1.html file2.html ...
 *   node scripts/validate-patch.js                 # defaults to `git diff --name-only` HTML files
 *   node scripts/validate-patch.js --all            # scans every .html file under html/
 *
 * Exit code: 0 only if every checked file is clean. Non-zero (and a
 * printed ❌ list) otherwise — treat that as "do not mark this patch
 * applied yet."
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    console.log('\u2705 ' + label);
    pass++;
  } else {
    const line = '\u274c ' + label + (detail !== undefined ? ' \u2014 ' + detail : '');
    console.log(line);
    failures.push(line);
    fail++;
  }
}

// Mirrors server.js's `app.use('/prefix', express.static(...))` mounts.
// Order matters for prefixes that share a leading segment (none currently do,
// but keep specific-before-generic just in case).
const STATIC_ALIASES = [
  ['/html/runtime', 'html/runtime'],
  ['/html', 'html'],
  ['/js', 'html/tsm-insurance/public/js'], // first-mounted wins in express; checked first here too
  ['/js', 'html/js'],
  ['/bpo', 'html/bpo'],
  ['/shared', 'html/shared'],
  ['/insurance', 'html/tsm-insurance'],
  ['/construction', 'html/construction-suite'],
  ['/runtime', 'runtime'],
  ['/architecture', 'architecture'],
  ['/core', 'core'],
  ['/', 'html'], // catch-all app.use(express.static('html'))
];

function resolveAbsoluteUrl(urlPath) {
  // Try each alias; for aliases with multiple candidate dirs (e.g. /js),
  // any one resolving to a real file counts as "not dead" — matches
  // express's fallthrough-to-next-mount behavior.
  const candidates = STATIC_ALIASES.filter(([prefix]) =>
    prefix === '/' ? true : (urlPath === prefix || urlPath.startsWith(prefix + '/')));
  for (const [prefix, dir] of candidates) {
    const rest = urlPath.slice(prefix.length);
    const abs = path.join(REPO_ROOT, dir, rest);
    if (fs.existsSync(abs)) return abs;
  }
  // No candidate resolved — return the most specific candidate's path (or a
  // root-join fallback) so the caller can still report *something* useful.
  if (candidates.length) {
    const [prefix, dir] = candidates[0];
    return path.join(REPO_ROOT, dir, urlPath.slice(prefix.length));
  }
  return path.join(REPO_ROOT, urlPath);
}

function resolveTargetPath(fileDir, link) {
  if (/^https?:\/\//i.test(link) || link.startsWith('//')) return null; // external, skip
  if (link.startsWith('#')) return null; // in-page anchor, skip
  const clean = link.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean.startsWith('/')) {
    return resolveAbsoluteUrl(clean);
  }
  return path.join(fileDir, clean);
}

function validateFile(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(abs)) {
    check(`${relPath}: file exists`, false, 'file not found on disk');
    return;
  }
  const content = fs.readFileSync(abs, 'utf8');
  const dir = path.dirname(abs);

  // ── Check 1 & 2: premature/duplicate </body> and </html> ──
  // Exclude matches inside <script>...</script> blocks — those are commonly
  // JS string literals building HTML (e.g. `"</body></html>"`), not real
  // document structure, and would otherwise be false positives.
  const scriptSpans = [];
  {
    const openRe = /<script(?:\s[^>]*)?>/gi;
    let om;
    while ((om = openRe.exec(content))) {
      const closeIdx = content.indexOf('</script>', om.index + om[0].length);
      scriptSpans.push([om.index, closeIdx === -1 ? content.length : closeIdx]);
    }
  }
  const insideScript = (idx) => scriptSpans.some(([s, e]) => idx > s && idx < e);

  const bodyCloseMatches = [...content.matchAll(/<\/body\s*>/gi)].filter(m => !insideScript(m.index));
  const htmlCloseMatches = [...content.matchAll(/<\/html\s*>/gi)].filter(m => !insideScript(m.index));

  check(`${relPath}: exactly one </body>`, bodyCloseMatches.length <= 1,
    `found ${bodyCloseMatches.length}`);
  check(`${relPath}: exactly one </html>`, htmlCloseMatches.length <= 1,
    `found ${htmlCloseMatches.length}`);

  if (htmlCloseMatches.length >= 1) {
    const lastHtmlClose = htmlCloseMatches[htmlCloseMatches.length - 1];
    const trailing = content.slice(lastHtmlClose.index + lastHtmlClose[0].length);
    const trailingMeaningful = trailing.trim();
    check(`${relPath}: nothing meaningful after </html>`,
      trailingMeaningful.length === 0,
      `${trailingMeaningful.length} trailing chars, starts: ${JSON.stringify(trailingMeaningful.slice(0, 80))}`);
  }

  if (bodyCloseMatches.length >= 1 && htmlCloseMatches.length >= 1) {
    const firstBodyClose = bodyCloseMatches[0];
    const lastHtmlClose = htmlCloseMatches[htmlCloseMatches.length - 1];
    const between = content.slice(firstBodyClose.index + firstBodyClose[0].length, lastHtmlClose.index);
    const strayScript = /<script[\s>]/i.test(between);
    check(`${relPath}: no <script> tag stranded between </body> and </html>`,
      !strayScript, 'a <script> tag appears after </body> but before </html> — likely a dropped include');
  }

  // ── Check 3: balanced <script> tags ──
  const scriptOpens = [...content.matchAll(/<script(?:\s[^>]*)?>/gi)]
    .filter(m => !/\/>\s*$/.test(m[0])); // exclude self-closing (shouldn't happen for script, but safe)
  const scriptCloses = [...content.matchAll(/<\/script\s*>/gi)];
  check(`${relPath}: balanced <script>/</script> tags`,
    scriptOpens.length === scriptCloses.length,
    `${scriptOpens.length} opening vs ${scriptCloses.length} closing`);

  // ── Check 4: dead local script src / href targets ──
  const deadTargets = [];
  const srcMatches = [...content.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
  for (const m of srcMatches) {
    const target = resolveTargetPath(dir, m[1]);
    if (target && !fs.existsSync(target)) deadTargets.push(`script src="${m[1]}"`);
  }
  const hrefMatches = [...content.matchAll(/href=["']([^"'#][^"']*\.html[^"']*)["']/gi)]
    .filter(m => !insideScript(m.index));
  for (const m of hrefMatches) {
    const target = resolveTargetPath(dir, m[1]);
    if (target && !fs.existsSync(target)) deadTargets.push(`href="${m[1]}"`);
  }
  check(`${relPath}: no dead local script/href targets`,
    deadTargets.length === 0,
    deadTargets.length ? deadTargets.join(', ') : undefined);
}

function collectFiles() {
  const args = process.argv.slice(2);
  if (args.includes('--all')) {
    const out = execSync('find html -iname "*.html"', { cwd: REPO_ROOT, encoding: 'utf8' });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  }
  const explicit = args.filter(a => !a.startsWith('--'));
  if (explicit.length) return explicit;
  // default: whatever HTML files are currently staged/modified vs HEAD
  try {
    const out = execSync('git diff --name-only HEAD -- "*.html"', { cwd: REPO_ROOT, encoding: 'utf8' });
    const files = out.split('\n').map(s => s.trim()).filter(Boolean);
    if (files.length) return files;
  } catch (e) { /* not a git repo or no diff, fall through */ }
  console.log('No files given, --all not set, and no modified .html files vs HEAD. Nothing to validate.');
  return [];
}

const files = collectFiles();
if (files.length === 0) {
  process.exit(0);
}

console.log(`Validating ${files.length} file(s)...\n`);
for (const f of files) {
  validateFile(f);
}

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) {
  console.log('\nDo NOT mark this patch "applied" until the above are resolved.');
  process.exit(1);
}
process.exit(0);
