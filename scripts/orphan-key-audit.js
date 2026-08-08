#!/usr/bin/env node
/**
 * scripts/orphan-key-audit.js
 *
 * Companion to runtime-health-report.js, built for Phase 0 of the
 * prod-readiness plan: dumps the FULL orphan writer/reader lists (not the
 * top-15 console sample) along with every file:line occurrence, so each key
 * can be triaged one by one instead of guessed at from a truncated sample.
 *
 * Does not touch runtime-health-report.js or its scoring -- this is purely
 * an inspection tool that writes its output to disk.
 *
 * Usage: node scripts/orphan-key-audit.js [--root=.] [--out=orphan-key-audit.json]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const OUT = (args.find(a => a.startsWith('--out=')) || '--out=orphan-key-audit.json').split('=')[1];

const SCAN_EXT = new Set(['.html', '.js', '.htm']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'backups']);

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

function extractKey(argText, bindings) {
  const literal = argText.match(/^['"`]([^'"`]+)['"`]/);
  if (literal) return { key: literal[1], resolved: true };
  const identifier = argText.trim().match(/^[A-Za-z_$][A-Za-z0-9_$]*$/);
  if (identifier && bindings.has(argText.trim())) {
    return { key: bindings.get(argText.trim()), resolved: true };
  }
  return { key: argText.split(',')[0].trim(), resolved: false };
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function scan(files) {
  // Same key -> occurrences map for both set and get, tracked separately.
  const setOccurrences = new Map(); // key -> [{file, line}]
  const getOccurrences = new Map();

  const setRe = /localStorage\.setItem\(\s*([^,]+),/g;
  const getRe = /localStorage\.getItem\(\s*([^)]+)\)/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const bindings = buildLocalBindings(text);
    let m;

    setRe.lastIndex = 0;
    while ((m = setRe.exec(text))) {
      const { key, resolved } = extractKey(m[1], bindings);
      if (!resolved) continue;
      const line = lineNumberAt(text, m.index);
      if (!setOccurrences.has(key)) setOccurrences.set(key, []);
      setOccurrences.get(key).push({ file, line });
    }

    getRe.lastIndex = 0;
    while ((m = getRe.exec(text))) {
      const { key, resolved } = extractKey(m[1], bindings);
      if (!resolved) continue;
      const line = lineNumberAt(text, m.index);
      if (!getOccurrences.has(key)) getOccurrences.set(key, []);
      getOccurrences.get(key).push({ file, line });
    }
  }

  const writtenKeys = new Set(setOccurrences.keys());
  const readKeys = new Set(getOccurrences.keys());

  const orphanWriters = [...writtenKeys]
    .filter(k => !readKeys.has(k))
    .map(key => ({ key, occurrences: setOccurrences.get(key), triaged: false, disposition: null }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const orphanReaders = [...readKeys]
    .filter(k => !writtenKeys.has(k))
    .map(key => ({ key, occurrences: getOccurrences.get(key), triaged: false, disposition: null }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return { orphanWriters, orphanReaders };
}

function main() {
  const files = walk(path.resolve(ROOT));
  const { orphanWriters, orphanReaders } = scan(files);

  const output = {
    generatedAt: new Date().toISOString(),
    note: 'disposition: null until triaged. Set to "dead" (confirmed unread, safe to remove/removed) or "fixed" (real bug, patched) or "kept" (intentional legacy, documented) as each key is worked through.',
    summary: {
      orphanWriterCount: orphanWriters.length,
      orphanReaderCount: orphanReaders.length,
    },
    orphanWriters,
    orphanReaders,
  };

  fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify(output, null, 2));
  console.log(`Wrote ${orphanWriters.length} orphan writer keys and ${orphanReaders.length} orphan reader keys to ${OUT}`);
  console.log('Each entry includes every file:line occurrence and a "disposition" field to fill in as you triage.');
}

main();
