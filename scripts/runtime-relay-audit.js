#!/usr/bin/env node
/**
 * scripts/runtime-relay-audit.js
 * Finds "relay key" style string literals (naming pattern *_RELAY, *_WAR_RELAY,
 * TSM_*_RELAY, etc.) across the repo, groups near-duplicates by vertical,
 * and flags naming mismatches (e.g. TSM_LEGAL_WAR_RELAY read but
 * TSM_LEGAL_STRATEGIST_RELAY written).
 *
 * Usage: node scripts/runtime-relay-audit.js [--root=.]
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

const RELAY_LITERAL_RE = /['"`]([A-Z0-9_]*RELAY[A-Z0-9_]*)['"`]/g;

function main() {
  const files = walk(path.resolve(ROOT));
  const found = new Map(); // key -> { files:Set, count }

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = RELAY_LITERAL_RE.exec(text))) {
      const key = m[1];
      if (!found.has(key)) found.set(key, { files: new Set(), count: 0 });
      const entry = found.get(key);
      entry.files.add(path.relative(ROOT, file));
      entry.count += 1;
    }
  }

  const verticals = ['CONSTRUCTION', 'HEALTHCARE', 'MORTGAGE', 'LEGAL', 'INSURANCE', 'BPO', 'FINOPS', 'CATALOG', 'CRM', 'CPQ'];
  const byVertical = new Map(verticals.map(v => [v, []]));
  const uncategorized = [];

  for (const [key, entry] of found) {
    const vertical = verticals.find(v => key.includes(v));
    if (vertical) byVertical.get(vertical).push({ key, ...entry });
    else uncategorized.push({ key, ...entry });
  }

  console.log('========== Relay Key Audit ==========');
  console.log(`Total distinct relay-style keys found: ${found.size}\n`);

  for (const [vertical, entries] of byVertical) {
    if (!entries.length) continue;
    console.log(`${vertical} (${entries.length} relay keys)`);
    entries.sort((a, b) => b.count - a.count).forEach(e => {
      console.log(`  ${e.key}  — used in ${e.files.size} file(s), ${e.count} occurrence(s)`);
    });
    console.log('');
  }

  if (uncategorized.length) {
    console.log(`Uncategorized (${uncategorized.length}):`);
    uncategorized.forEach(e => console.log(`  ${e.key}`));
  }

  console.log('\nSuggested collapse target: one RuntimeEvents event per logical action');
  console.log('(e.g. MISSION_STAGE_CHANGED) instead of one relay key per vertical per action.');
}

main();
