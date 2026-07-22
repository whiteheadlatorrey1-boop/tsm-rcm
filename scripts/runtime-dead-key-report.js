#!/usr/bin/env node
/**
 * scripts/runtime-dead-key-report.js
 * Flags localStorage keys that are only ever written (never read) or
 * only ever read (never written) — candidates for deletion or for a
 * missing-consumer bug, respectively.
 *
 * This intentionally reuses simpler logic than runtime-health-report.js
 * and prints a flat, copy-pasteable removal list.
 *
 * Usage: node scripts/runtime-dead-key-report.js [--root=.]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const INCLUDE_BACKUPS = args.includes('--include-backups');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
if (!INCLUDE_BACKUPS) IGNORE_DIRS.add('backups');
const SCAN_EXT = new Set(['.html', '.htm', '.js']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (SCAN_EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const VAR_BINDING_RE = /(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*['"`]([^'"`]+)['"`]/g;

function buildLocalBindings(text) {
  const map = new Map();
  let m;
  VAR_BINDING_RE.lastIndex = 0;
  while ((m = VAR_BINDING_RE.exec(text))) map.set(m[1], m[2]);
  return map;
}

function literalKey(argText, bindings) {
  const m = argText.match(/^['"`]([^'"`]+)['"`]/);
  if (m) return m[1];
  const identifier = argText.trim();
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(identifier) && bindings.has(identifier)) {
    return bindings.get(identifier);
  }
  return null; // skip dynamic/computed keys — can't safely judge those
}

function main() {
  const files = walk(path.resolve(ROOT));
  const writers = new Map(); // key -> Set(files)
  const readers = new Map();

  const setRe = /localStorage\.setItem\(\s*([^,]+),/g;
  const getRe = /localStorage\.getItem\(\s*([^)]+)\)/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const bindings = buildLocalBindings(text);
    const rel = path.relative(ROOT, file);
    let m;
    while ((m = setRe.exec(text))) {
      const key = literalKey(m[1], bindings);
      if (!key) continue;
      if (!writers.has(key)) writers.set(key, new Set());
      writers.get(key).add(rel);
    }
    while ((m = getRe.exec(text))) {
      const key = literalKey(m[1], bindings);
      if (!key) continue;
      if (!readers.has(key)) readers.set(key, new Set());
      readers.get(key).add(rel);
    }
  }

  const allKeys = new Set([...writers.keys(), ...readers.keys()]);
  const deadWrites = [];
  const deadReads = [];

  for (const key of allKeys) {
    const w = writers.get(key);
    const r = readers.get(key);
    if (w && !r) deadWrites.push({ key, files: [...w] });
    if (r && !w) deadReads.push({ key, files: [...r] });
  }

  console.log('========== Dead Key Report ==========');
  console.log(`Write-only keys (safe removal candidates): ${deadWrites.length}`);
  deadWrites.forEach(d => console.log(`  ${d.key}   (written in ${d.files.length} file(s))`));

  console.log(`\nRead-only keys (likely missing writer / dead feature): ${deadReads.length}`);
  deadReads.forEach(d => console.log(`  ${d.key}   (read in ${d.files.length} file(s))`));

  console.log('\nNote: only literal string keys are analyzed. Computed keys (e.g.');
  console.log('clientScopedKey(vertical, clientId)) are skipped — audit those by hand.');
}

main();
