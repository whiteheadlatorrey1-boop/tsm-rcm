#!/usr/bin/env node
/**
 * fix-key-mismatches.js
 *
 * Detects the "writer suffixes the key, reader reads the bare key" bug
 * pattern across the whole repo, e.g.:
 *
 *   localStorage.setItem("TSM_EXEC_CONFIRMED_construction-suite_" + vertical, ...)
 *   localStorage.getItem('TSM_EXEC_CONFIRMED_construction-suite')   // always null
 *
 * Fix strategy (deliberately conservative):
 *   - The WRITER side is never touched.
 *   - The READER call is replaced with a small IIFE that:
 *       1. still tries the exact bare key first (in case anything
 *          currently relies on that behavior), then
 *       2. falls back to scanning localStorage for any key that starts
 *          with the writer's real literal prefix, and uses the first
 *          match it finds (localStorage.key(i) scan).
 *   - Every matched pair is reported. Ambiguous cases (one bare reader
 *     key matched by more than one writer prefix) are reported but
 *     patched with ALL candidate prefixes checked in order, so nothing
 *     is silently dropped -- you can narrow it by hand afterward.
 *
 * Usage:
 *   node fix-key-mismatches.js                 # dry run, prints report + diffs
 *   node fix-key-mismatches.js --apply          # writes changes, makes .bak backups
 *   node fix-key-mismatches.js --root=/path     # scan a different root (default: cwd)
 *   node fix-key-mismatches.js --json=out.json  # also dump the raw match data
 *
 * Safe by construction:
 *   - Every file that gets modified is copied to "<file>.bak" first
 *     (never overwritten if a .bak already exists from a prior run --
 *     the script will refuse and tell you to clean up first).
 *   - Only files under the given root are touched; the ignore list below
 *     matches your health-report noise sources (.broken-tag-backups,
 *     *-backups, node_modules, .git).
 *   - The script's OWN file is always excluded from scanning (matched by
 *     absolute path), so keeping example key literals in its comments/doc
 *     block can never cause it to "fix" itself.
 *   - Nothing is written at all unless --apply is passed.
 *
 * Patterns detected (v2):
 *   1. String concatenation:  setItem("LITERAL" + expr, ...)  /  getItem('LITERAL')
 *   2. Template literal:      setItem(`LITERAL${expr}`, ...)  /  getItem(`LITERAL`)
 *   3. Same-file constant:    const PREFIX = "LITERAL"; ... setItem(PREFIX + expr, ...)
 *      (identifier is resolved against a const/let/var string declaration
 *      in the SAME file only -- cross-file constant resolution is not
 *      attempted, since that starts to require real static analysis rather
 *      than a safe mechanical pattern match.)
 *
 * What this script deliberately does NOT attempt: matching two DIFFERENT
 * literal strings that merely look related (e.g. "TSM_HC_RELAY" vs
 * "TSM_HEALTHCARE_STRATEGIST_RELAY"). That's a naming-convention guess,
 * not a mechanically verifiable bug pattern -- wiring those together
 * automatically risks connecting two things that were never meant to be
 * connected. Those need a manual read, not this script.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const rootArg = args.find(a => a.startsWith('--root='));
const jsonArg = args.find(a => a.startsWith('--json='));
const ROOT = path.resolve(rootArg ? rootArg.split('=')[1] : '.');
const JSON_OUT = jsonArg ? jsonArg.split('=')[1] : null;

const EXT_OK = new Set(['.html', '.js']);
const IGNORE_DIR_PATTERNS = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /\.broken-tag-backups/,
  /-backups(\/|$)/,
  /^backups(\/|$)/,
  /(^|\/)backups(\/|$)/,
  /\.dupe-backups/,
];

function isIgnored(relPath) {
  return IGNORE_DIR_PATTERNS.some(rx => rx.test(relPath));
}

const SELF_PATH = path.resolve(__filename);

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (isIgnored(rel)) continue;
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (EXT_OK.has(path.extname(entry.name))) {
      if (path.resolve(full) === SELF_PATH) continue; // never scan/patch ourselves
      out.push(full);
    }
  }
}

// --- extraction -------------------------------------------------------

// --- pattern 1: string concatenation -----------------------------------
// Writer: localStorage.setItem("LITERAL" + <expr>, ...)
const SETITEM_CONCAT_RE =
  /localStorage\.setItem\(\s*(["'])((?:(?!\1).)+)\1\s*\+/g;

// Reader: localStorage.getItem('LITERAL')  -- bare, single/double quotes only
// here; backtick bare-vs-interpolated is handled separately below so we
// don't mistake `PREFIX_${x}` for a plain string.
const GETITEM_BARE_RE =
  /localStorage\.getItem\(\s*(["'])((?:(?!\1).)+)\1\s*\)/g;

// --- pattern 2: template literals ---------------------------------------
// Writer: localStorage.setItem(`LITERAL${expr}`, ...) -- literal is
// whatever precedes the first ${.
const SETITEM_TEMPLATE_RE =
  /localStorage\.setItem\(\s*`([^`$]*)\$\{/g;

// Reader: localStorage.getItem(`LITERAL`) -- backtick string with NO
// interpolation at all (if it had ${...} it wouldn't be a bare read).
const GETITEM_TEMPLATE_BARE_RE =
  /localStorage\.getItem\(\s*`([^`$]+)`\s*\)/g;

// --- pattern 3: same-file constant prefix --------------------------------
// const/let/var NAME = "LITERAL";  (single/double-quoted only, no
// interpolation -- a template-literal-valued constant is out of scope)
const CONST_DECL_RE =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])((?:(?!\2).)+)\2\s*[;,]/g;

// Writer using an identifier: localStorage.setItem(PREFIX + expr, ...)
const SETITEM_IDENT_CONCAT_RE =
  /localStorage\.setItem\(\s*([A-Za-z_$][\w$]*)\s*\+/g;

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const writers = [];
  const readers = [];

  let m;

  // pattern 1: concat writer
  SETITEM_CONCAT_RE.lastIndex = 0;
  while ((m = SETITEM_CONCAT_RE.exec(content))) {
    writers.push({ file, literal: m[2], line: lineOf(content, m.index) });
  }

  // pattern 1: bare reader (quote-delimited)
  GETITEM_BARE_RE.lastIndex = 0;
  while ((m = GETITEM_BARE_RE.exec(content))) {
    readers.push({
      file,
      literal: m[2],
      line: lineOf(content, m.index),
      matchStart: m.index,
      matchText: m[0],
    });
  }

  // pattern 2: template writer
  SETITEM_TEMPLATE_RE.lastIndex = 0;
  while ((m = SETITEM_TEMPLATE_RE.exec(content))) {
    if (m[1].length === 0) continue; // no literal prefix, nothing to key off
    writers.push({ file, literal: m[1], line: lineOf(content, m.index) });
  }

  // pattern 2: bare template reader (no ${...} inside)
  GETITEM_TEMPLATE_BARE_RE.lastIndex = 0;
  while ((m = GETITEM_TEMPLATE_BARE_RE.exec(content))) {
    readers.push({
      file,
      literal: m[1],
      line: lineOf(content, m.index),
      matchStart: m.index,
      matchText: m[0],
    });
  }

  // pattern 3: resolve same-file const identifiers, then find
  // setItem(IDENT + expr, ...) writers using them
  const constMap = new Map(); // identifier -> literal
  CONST_DECL_RE.lastIndex = 0;
  while ((m = CONST_DECL_RE.exec(content))) {
    constMap.set(m[1], m[3]);
  }
  if (constMap.size > 0) {
    SETITEM_IDENT_CONCAT_RE.lastIndex = 0;
    while ((m = SETITEM_IDENT_CONCAT_RE.exec(content))) {
      const literal = constMap.get(m[1]);
      if (literal) {
        writers.push({ file, literal, line: lineOf(content, m.index) });
      }
    }
  }

  return { content, writers, readers };
}

// --- main ---------------------------------------------------------------

function main() {
  const files = [];
  walk(ROOT, files);

  const allWriters = []; // { file, literal, line }
  const perFile = new Map(); // file -> { content, readers }

  for (const file of files) {
    const { content, writers, readers } = scanFile(file);
    if (writers.length) allWriters.push(...writers);
    if (readers.length) perFile.set(file, { content, readers });
  }

  // dedupe writer literals but remember all locations for reporting
  const writerLiteralLocations = new Map(); // literal -> [{file,line}]
  for (const w of allWriters) {
    if (!writerLiteralLocations.has(w.literal)) writerLiteralLocations.set(w.literal, []);
    writerLiteralLocations.get(w.literal).push({ file: w.file, line: w.line });
  }
  const writerLiterals = [...writerLiteralLocations.keys()];

  const report = []; // one entry per patched reader occurrence
  const fileEdits = new Map(); // file -> array of {matchStart, matchText, replacement}

  for (const [file, { content, readers }] of perFile) {
    for (const r of readers) {
      // Find every writer literal that strictly extends this bare reader
      // literal (writer = reader + <something>). That "something" is what
      // makes it a suffixed/scoped key the bare reader can never match.
      const candidates = writerLiterals.filter(
        w => w !== r.literal && w.startsWith(r.literal) && w.length > r.literal.length
      );
      if (candidates.length === 0) continue;

      report.push({
        readerFile: file,
        readerLine: r.line,
        readerKey: r.literal,
        writerPrefixes: candidates,
        writerLocations: candidates.map(c => writerLiteralLocations.get(c)).flat(),
        ambiguous: candidates.length > 1,
      });

      const replacement = buildFallbackExpr(r.literal, candidates);
      if (!fileEdits.has(file)) fileEdits.set(file, []);
      fileEdits.get(file).push({
        matchStart: r.matchStart,
        matchText: r.matchText,
        replacement,
      });
    }
  }

  // --- print report ---
  console.log('========== Key Mismatch Fixer ==========');
  console.log(`Root: ${ROOT}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writing files)' : 'DRY RUN (no files written)'}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Writer literal keys found: ${writerLiterals.length}`);
  console.log(`Mismatched reader occurrences found: ${report.length}`);
  console.log('=========================================\n');

  for (const entry of report) {
    console.log(`- ${path.relative(ROOT, entry.readerFile)}:${entry.readerLine}`);
    console.log(`    reads bare key: "${entry.readerKey}"`);
    for (const wp of entry.writerPrefixes) {
      const locs = writerLiteralLocations.get(wp)
        .map(l => `${path.relative(ROOT, l.file)}:${l.line}`)
        .join(', ');
      console.log(`    writer prefix : "${wp}"  (written at ${locs})`);
    }
    if (entry.ambiguous) {
      console.log(`    ⚠ ambiguous: ${entry.writerPrefixes.length} candidate prefixes -- all will be checked, in order, by the patched fallback`);
    }
    console.log('');
  }

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
    console.log(`Wrote raw match data to ${JSON_OUT}\n`);
  }

  if (report.length === 0) {
    console.log('Nothing to patch.');
    return;
  }

  // --- apply or show diffs ---
  for (const [file, edits] of fileEdits) {
    const original = fs.readFileSync(file, 'utf8');
    // apply edits back-to-front so earlier matchStart offsets stay valid
    edits.sort((a, b) => b.matchStart - a.matchStart);
    let patched = original;
    for (const e of edits) {
      const before = patched.slice(0, e.matchStart);
      const after = patched.slice(e.matchStart + e.matchText.length);
      patched = before + e.replacement + after;
    }

    console.log(`----- ${path.relative(ROOT, file)} -----`);
    for (const e of [...edits].sort((a, b) => a.matchStart - b.matchStart)) {
      console.log(`  - ${e.matchText}`);
      console.log(`  + ${e.replacement}`);
    }
    console.log('');

    if (APPLY) {
      const bakPath = file + '.bak';
      if (fs.existsSync(bakPath)) {
        console.log(`  ! SKIPPED WRITE: ${bakPath} already exists (refusing to overwrite a prior backup). Remove or rename it, then re-run.`);
        continue;
      }
      fs.copyFileSync(file, bakPath);
      fs.writeFileSync(file, patched, 'utf8');
      console.log(`  ✓ patched (backup at ${path.relative(ROOT, bakPath)})`);
    }
  }

  if (!APPLY) {
    console.log('\nDry run only -- no files were changed. Re-run with --apply to write these changes (backups are made automatically).');
  }
}

function buildFallbackExpr(bareKey, prefixes) {
  const prefixList = prefixes.map(p => JSON.stringify(p)).join(', ');
  return (
    `(function(){` +
    `var __v = localStorage.getItem(${JSON.stringify(bareKey)}); ` +
    `if (__v !== null) return __v; ` +
    `var __prefixes = [${prefixList}]; ` +
    `for (var __p = 0; __p < __prefixes.length; __p++) { ` +
    `for (var __i = 0; __i < localStorage.length; __i++) { ` +
    `var __k = localStorage.key(__i); ` +
    `if (__k && __k.indexOf(__prefixes[__p]) === 0) { return localStorage.getItem(__k); } ` +
    `} } ` +
    `return null; })()`
  );
}

main();