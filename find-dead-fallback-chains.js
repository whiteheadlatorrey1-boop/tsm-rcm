#!/usr/bin/env node
/**
 * find-dead-fallback-chains.js
 *
 * Flags the exact bug found in html/healthcare/executive-portal.html:
 *
 *   var raw = relayJson
 *     || JSON.parse(localStorage.getItem('TSM_HC_RELAY') || '{}')   // <-- always truthy ({})
 *     || JSON.parse(localStorage.getItem('TSM_RELAY_DATA') || '{}'); // <-- dead, never runs
 *
 * `JSON.parse(x || '{}')` always evaluates to a truthy value (at worst an
 * empty object), so if this expression appears as a NON-FINAL clause in an
 * `||` chain, every clause after it is unreachable dead code -- and the
 * "empty object" silently stands in for real data with no visible error.
 *
 * This is NOT a bug when the same expression is the only/last thing being
 * assigned, e.g.:
 *
 *   var x = JSON.parse(localStorage.getItem('key') || '{}');   // fine
 *   var y = a || JSON.parse(localStorage.getItem('key') || '{}'); // fine (last clause)
 *
 * So this script only flags occurrences where the expression is followed
 * by another `||` clause -- i.e. it has a fallback after it that can never
 * fire. It does not modify anything; this is a finder, not a patcher,
 * because the correct fix depends on which keys are actually live for
 * each vertical (as we found for healthcare) and that needs a human read
 * per occurrence, not a blind rewrite.
 *
 * Usage:
 *   node find-dead-fallback-chains.js [--root=/path] [--json=out.json]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const rootArg = args.find(a => a.startsWith('--root='));
const jsonArg = args.find(a => a.startsWith('--json='));
const ROOT = path.resolve(rootArg ? rootArg.split('=')[1] : '.');
const JSON_OUT = jsonArg ? jsonArg.split('=')[1] : null;
const SELF_PATH = path.resolve(__filename);

const EXT_OK = new Set(['.html', '.js']);
const IGNORE_DIR_PATTERNS = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /\.broken-tag-backups/,
  /-backups(\/|$)/,
  /^backups(\/|$)/,
  /(^|\/)backups(\/|$)/,
  /\.dupe-backups/,
  /\.tdz-fix-backups/,
  /\.workflow-wire-backups/,
];

function isIgnored(relPath) {
  return IGNORE_DIR_PATTERNS.some(rx => rx.test(relPath));
}

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
      if (path.resolve(full) === SELF_PATH) continue;
      out.push(full);
    }
  }
}

// Matches: JSON.parse( localStorage.getItem('KEY') || '{}' )
// followed by whitespace/newlines and another `||` -- the dangerous shape.
// Also allows sessionStorage as an equally-dangerous variant.
const DANGEROUS_RE =
  /JSON\.parse\(\s*(?:localStorage|sessionStorage)\.getItem\(\s*(["'])((?:(?!\1).)+)\1\s*\)\s*\|\|\s*(["'])(\{\}|\[\])\3\s*\)\s*\|\|/gs;

// Same expression but as the LAST clause (no trailing ||) -- safe, reported
// separately only for context, never flagged as a bug.
const SAFE_TERMINAL_RE =
  /JSON\.parse\(\s*(?:localStorage|sessionStorage)\.getItem\(\s*(["'])((?:(?!\1).)+)\1\s*\)\s*\|\|\s*(["'])(\{\}|\[\])\3\s*\)(?!\s*\|\|)/gs;

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

function main() {
  const files = [];
  walk(ROOT, files);

  const dangerous = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let m;

    DANGEROUS_RE.lastIndex = 0;
    while ((m = DANGEROUS_RE.exec(content))) {
      dangerous.push({
        file,
        line: lineOf(content, m.index),
        key: m[2],
        snippet: m[0].replace(/\s+/g, ' ').trim(),
      });
    }
  }

  console.log('========== Dead-Fallback Chain Finder ==========');
  console.log(`Root: ${ROOT}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Dangerous mid-chain occurrences found: ${dangerous.length}`);
  console.log('==================================================\n');
  console.log('These are cases where JSON.parse(getItem(K) || \'{}\') sits in the');
  console.log('MIDDLE of an || chain -- everything after it is dead code, and an');
  console.log('empty object silently stands in for missing data with no error.\n');

  for (const d of dangerous) {
    console.log(`- ${path.relative(ROOT, d.file)}:${d.line}`);
    console.log(`    key: "${d.key}"`);
    console.log(`    ${d.snippet}`);
    console.log('');
  }

  if (dangerous.length === 0) {
    console.log('No mid-chain occurrences of this pattern found.');
  } else {
    console.log(`${dangerous.length} location(s) to review by hand -- for each, check:`);
    console.log('  1. Is the key in question ever actually written anywhere?');
    console.log('  2. Is the clause AFTER it (now dead) the one pointing at the real key?');
    console.log('  3. What does the calling context pass as the first argument -- is it');
    console.log('     ever actually populated, or always null/undefined like the healthcare case?');
  }

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify(dangerous, null, 2));
    console.log(`\nWrote raw match data to ${JSON_OUT}`);
  }
}

main();