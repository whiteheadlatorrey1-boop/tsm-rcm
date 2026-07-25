#!/usr/bin/env node
/**
 * scripts/runtime-health-report.js
 * Static scan of the repo. Reports:
 *   - localStorage.setItem/getItem counts
 *   - relay-key-like string literals (TSM_* naming)
 *   - setInterval usage (polling)
 *   - 'storage' event listener usage
 *   - RuntimeState / RuntimeEvents adoption (new API usage)
 *   - orphan writers (keys set but never read) and orphan readers (read but never set)
 *
 * Usage: node scripts/runtime-health-report.js [--root=.] [--json]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const JSON_OUT = args.includes('--json');

const SCAN_EXT = new Set(['.html', '.js', '.htm']);
const INCLUDE_BACKUPS = args.includes('--include-backups');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
if (!INCLUDE_BACKUPS) IGNORE_DIRS.add('backups');

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
  // Per-file map of "const KEY = 'LITERAL'" so setItem(KEY, ...) can be
  // resolved back to the actual string key instead of the variable name.
  const map = new Map();
  let m;
  VAR_BINDING_RE.lastIndex = 0;
  while ((m = VAR_BINDING_RE.exec(text))) {
    map.set(m[1], m[2]);
  }
  return map;
}

function extractKey(argText, bindings) {
  const literal = argText.match(/^['"`]([^'"`]+)['"`]/);
  if (literal) return { key: literal[1], resolved: true };
  const identifier = argText.trim().match(/^[A-Za-z_$][A-Za-z0-9_$]*$/);
  if (identifier && bindings.has(argText.trim())) {
    return { key: bindings.get(argText.trim()), resolved: true };
  }
  // Computed/dynamic expression (e.g. VERTICALS[v].storageKey, room.relay) —
  // we cannot safely resolve this to a concrete key.
  return { key: argText.split(',')[0].trim(), resolved: false };
}

function scan(files) {
  const setCalls = [];
  const getCalls = [];
  let pollingCount = 0;
  let storageListenerCount = 0;
  let runtimeStateUsage = 0;
  let runtimeEventsUsage = 0;
  let unresolvedCount = 0;

  const setRe = /localStorage\.setItem\(\s*([^,]+),/g;
  const getRe = /localStorage\.getItem\(\s*([^)]+)\)/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const bindings = buildLocalBindings(text);
    let m;
    while ((m = setRe.exec(text))) {
      const { key, resolved } = extractKey(m[1], bindings);
      if (!resolved) unresolvedCount++;
      setCalls.push({ file, key, resolved });
    }
    while ((m = getRe.exec(text))) {
      const { key, resolved } = extractKey(m[1], bindings);
      if (!resolved) unresolvedCount++;
      getCalls.push({ file, key, resolved });
    }
    pollingCount += (text.match(/setInterval\s*\(/g) || []).length;
    storageListenerCount += (text.match(/addEventListener\(\s*['"`]storage['"`]/g) || []).length;
    runtimeStateUsage += (text.match(/RuntimeState\.(set|get|remove)\(/g) || []).length;
    runtimeEventsUsage += (text.match(/RuntimeEvents\.(publish|subscribe)\(/g) || []).length;
  }

  // Only resolved (literal or variable-resolved-to-literal) keys are eligible
  // for orphan analysis. Unresolved/computed keys are reported separately so
  // they don't masquerade as false orphans in either direction.
  const resolvedSetCalls = setCalls.filter(c => c.resolved);
  const resolvedGetCalls = getCalls.filter(c => c.resolved);
  const writtenKeys = new Set(resolvedSetCalls.map(c => c.key));
  const readKeys = new Set(resolvedGetCalls.map(c => c.key));

  const orphanWriters = [...writtenKeys].filter(k => !readKeys.has(k));
  const orphanReaders = [...readKeys].filter(k => !writtenKeys.has(k));
  const unresolvedKeys = [...new Set(
    [...setCalls, ...getCalls].filter(c => !c.resolved).map(c => c.key)
  )];

  return {
    filesScanned: files.length,
    setItemCount: setCalls.length,
    getItemCount: getCalls.length,
    uniqueWrittenKeys: writtenKeys.size,
    uniqueReadKeys: readKeys.size,
    orphanWriters,
    orphanReaders,
    unresolvedKeys,
    unresolvedCount,
    pollingCount,
    storageListenerCount,
    runtimeStateUsage,
    runtimeEventsUsage
  };
}

function score(result) {
  // Rough heuristic: 100 - penalties. Purely directional, not scientific.
  let s = 100;
  s -= Math.min(30, Math.round(result.orphanWriters.length / 5));
  s -= Math.min(20, Math.round(result.orphanReaders.length / 5));
  s -= Math.min(20, Math.round(result.pollingCount / 50));
  const legacyRatio = result.setItemCount + result.getItemCount
    ? 1 - (result.runtimeStateUsage / (result.setItemCount + result.getItemCount + result.runtimeStateUsage))
    : 0;
  s -= Math.round(legacyRatio * 30);
  return Math.max(0, Math.min(100, s));
}

function main() {
  const files = walk(path.resolve(ROOT));
  const result = scan(files);
  const healthScore = score(result);

  if (JSON_OUT) {
    console.log(JSON.stringify({ ...result, healthScore }, null, 2));
    return;
  }

  console.log('========== TSM Runtime Health ==========');
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log('');
  console.log('localStorage');
  console.log(`  setItem calls: ${result.setItemCount} (${result.uniqueWrittenKeys} unique keys)`);
  console.log(`  getItem calls: ${result.getItemCount} (${result.uniqueReadKeys} unique keys)`);
  console.log(`  Orphan writers (never read): ${result.orphanWriters.length}`);
  console.log(`  Orphan readers (never written): ${result.orphanReaders.length}`);
  console.log('');
  console.log('Polling');
  console.log(`  setInterval calls: ${result.pollingCount}`);
  console.log(`  'storage' event listeners: ${result.storageListenerCount}`);
  console.log('');
  console.log('New runtime adoption');
  console.log(`  RuntimeState calls: ${result.runtimeStateUsage}`);
  console.log(`  RuntimeEvents calls: ${result.runtimeEventsUsage}`);
  console.log('');
  console.log(`Overall Runtime Health: ${healthScore}/100`);
  console.log('=========================================');

  if (result.orphanWriters.length) {
    console.log('\nTop orphan writer keys (sample) — resolved literal keys only:');
    result.orphanWriters.slice(0, 15).forEach(k => console.log('  ' + k));
  }
  if (result.orphanReaders.length) {
    console.log('\nTop orphan reader keys (sample) — resolved literal keys only:');
    result.orphanReaders.slice(0, 15).forEach(k => console.log('  ' + k));
  }
  if (result.unresolvedKeys.length) {
    console.log(`\nUnresolved / computed keys (${result.unresolvedCount} call(s), not counted as orphans either way — check by hand):`);
    result.unresolvedKeys.slice(0, 15).forEach(k => console.log('  ' + k));
  }
}

main();
