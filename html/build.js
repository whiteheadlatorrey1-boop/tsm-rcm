#!/usr/bin/env node
/**
 * TSM Shell — Build-time JS Obfuscator
 * Processes all HTML files under ./html, obfuscates inline <script> blocks,
 * writes obfuscated output back in place (or to ./dist if preferred).
 *
 * Usage:
 *   node build.js              — obfuscates all HTML in ./html in place
 *   node build.js --dry-run    — shows what would be processed, no writes
 *   node build.js --file path  — obfuscate a single file
 *
 * Run BEFORE committing to GitHub.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const HTML_DIR  = __dirname; // build.js lives inside html/ already -- don't join 'html' again
const DRY_RUN   = process.argv.includes('--dry-run');
const SINGLE    = (() => {
  const idx = process.argv.indexOf('--file');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// Obfuscation profile — strong but keeps app functional
const OBF_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,          // keep false — adds bulk, not much protection
  debugProtection: false,
  debugProtectionInterval: 2000,
  disableConsoleOutput: false,       // keep console for your own debugging on Fly.io
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,              // keep false — would break window.* calls
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,      // keep false — too verbose
  target: 'browser',
  seed: 0,                           // 0 = random seed each run
};

// Scripts to SKIP obfuscation (external libs inlined, JSON data blocks, etc.)
const SKIP_PATTERNS = [
  /^\/\/ SKIP-OBFUSCATION/,          // manual escape hatch — add this comment to skip a block
  /^\s*\{[\s\S]{0,50}"cells"\s*:/,   // Jupyter-style JSON blobs
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getAllHtmlFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function shouldSkip(scriptContent) {
  return SKIP_PATTERNS.some(p => p.test(scriptContent));
}

function obfuscateInlineScripts(html, filePath) {
  // Match inline <script> blocks — NOT <script src="...">
  const scriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  let modified = false;
  let count = 0;

  const result = html.replace(scriptRegex, (fullMatch, scriptContent) => {
    const trimmed = scriptContent.trim();
    if (!trimmed || shouldSkip(trimmed)) return fullMatch;

    try {
      const obfuscated = JavaScriptObfuscator.obfuscate(trimmed, OBF_OPTIONS).getObfuscatedCode();
      modified = true;
      count++;
      return fullMatch.replace(scriptContent, '\n' + obfuscated + '\n');
    } catch (err) {
      console.warn(`  ⚠  Skipped block in ${path.relative(__dirname, filePath)}: ${err.message.slice(0, 80)}`);
      return fullMatch;
    }
  });

  return { result, modified, count };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
function processFile(filePath) {
  const rel = path.relative(__dirname, filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const { result, modified, count } = obfuscateInlineScripts(html, filePath);

  if (!modified) {
    console.log(`  —  ${rel} (no inline scripts)`);
    return;
  }

  if (DRY_RUN) {
    console.log(`  ✓  ${rel} — would obfuscate ${count} script block(s)`);
    return;
  }

  fs.writeFileSync(filePath, result, 'utf8');
  console.log(`  ✓  ${rel} — obfuscated ${count} script block(s)`);
}

function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   TSM Shell — JS Obfuscation Pipeline    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  if (DRY_RUN) console.log('  [DRY RUN — no files will be written]\n');

  if (SINGLE) {
    const abs = path.resolve(SINGLE);
    if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1); }
    processFile(abs);
  } else {
    const files = getAllHtmlFiles(HTML_DIR);
    console.log(`  Found ${files.length} HTML files in ./html\n`);
    let done = 0;
    for (const f of files) {
      processFile(f);
      done++;
    }
    console.log(`\n  Done — processed ${done} files.`);
  }

  if (DRY_RUN) console.log('\n  Re-run without --dry-run to apply.\n');
}

main();
