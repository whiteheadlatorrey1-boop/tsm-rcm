#!/usr/bin/env node
/**
 * scripts/runtime-migration-report.js
 * Per-file migration scorecard: how much of each page still uses raw
 * localStorage vs. RuntimeState/RuntimeEvents, and whether it polls.
 *
 * Usage: node scripts/runtime-migration-report.js [--root=.] [--md]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const MARKDOWN = args.includes('--md');

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

function analyzeFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const directLocalStorage = (text.match(/localStorage\.(setItem|getItem)\(/g) || []).length;
  const usesRuntimeState = /RuntimeState\.(set|get|remove)\(/.test(text);
  const usesRuntimeEvents = /RuntimeEvents\.(publish|subscribe)\(/.test(text);
  const polling = (text.match(/setInterval\s*\(/g) || []).length;

  let s = 100;
  s -= Math.min(50, directLocalStorage * 2);
  s -= Math.min(20, polling * 5);
  if (!usesRuntimeState) s -= 15;
  if (!usesRuntimeEvents) s -= 15;
  s = Math.max(0, s);

  return {
    file: path.relative(ROOT, file),
    directLocalStorage,
    usesRuntimeState,
    usesRuntimeEvents,
    polling,
    score: s
  };
}

function main() {
  const files = walk(path.resolve(ROOT)).filter(f => path.extname(f) !== '.js' || f.includes('/html/'));
  const rows = files.map(analyzeFile)
    .filter(r => r.directLocalStorage > 0 || r.usesRuntimeState || r.polling > 0)
    .sort((a, b) => a.score - b.score);

  if (MARKDOWN) {
    console.log('| Page | Direct localStorage | RuntimeState | RuntimeEvents | Polling | Score |');
    console.log('|---|---:|:---:|:---:|---:|---:|');
    rows.forEach(r => {
      console.log(`| ${r.file} | ${r.directLocalStorage} | ${r.usesRuntimeState ? '✅' : '❌'} | ${r.usesRuntimeEvents ? '✅' : '❌'} | ${r.polling} | ${r.score} |`);
    });
  } else {
    rows.forEach(r => {
      console.log(`${String(r.score).padStart(3)}  ${r.file}  (localStorage:${r.directLocalStorage} polling:${r.polling} state:${r.usesRuntimeState ? 'y' : 'n'} events:${r.usesRuntimeEvents ? 'y' : 'n'})`);
    });
  }

  console.log(`\n${rows.length} files with migration-relevant activity out of ${files.length} scanned.`);
}

main();
