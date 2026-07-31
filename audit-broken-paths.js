#!/usr/bin/env node
/**
 * audit-broken-paths.js
 *
 * Scans every .html file in the repo for local href/src references
 * (excluding external URLs, mailto:, tel:, #anchors, and data: URIs)
 * and reports any that point to a file that doesn't exist on disk.
 *
 * Usage:
 *   node audit-broken-paths.js                 # report only
 *   node audit-broken-paths.js --root=html      # limit scan to a subfolder
 *   node audit-broken-paths.js --json           # machine-readable output
 *
 * Exit code is 1 if any broken paths were found, 0 otherwise
 * (useful for wiring into CI or a pre-commit hook).
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const rootArg = args.find(a => a.startsWith('--root='));
const asJson = args.includes('--json');
const ROOT = path.resolve(process.cwd(), rootArg ? rootArg.split('=')[1] : '.');

const HTML_EXT = /\.html?$/i;
const ATTR_RE = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '_archive']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (HTML_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isExternalOrSkippable(ref) {
  return (
    ref.startsWith('http://') ||
    ref.startsWith('https://') ||
    ref.startsWith('//') ||
    ref.startsWith('mailto:') ||
    ref.startsWith('tel:') ||
    ref.startsWith('data:') ||
    ref.startsWith('javascript:') ||
    ref.startsWith('#') ||
    ref.trim() === ''
  );
}

function resolveCandidatePaths(sourceFile, ref) {
  // Strip query string / hash fragment before resolving on disk
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return [];

  const candidates = [];

  if (clean.startsWith('/')) {
    // Root-relative: resolve against repo root, but also check common
    // static-mount rewrites this codebase uses (e.g. app.use('/', .../html))
    candidates.push(path.join(ROOT, clean));
    candidates.push(path.join(ROOT, 'html', clean));
  } else {
    // Relative to the file that referenced it
    candidates.push(path.resolve(path.dirname(sourceFile), clean));
  }

  return candidates;
}

function fileExistsAsHtmlOrDir(p) {
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    if (stat.isFile()) return true;
    if (stat.isDirectory()) {
      // directory reference implies an index.html inside it
      return fs.existsSync(path.join(p, 'index.html'));
    }
  }
  return false;
}

function main() {
  const files = walk(ROOT);
  const broken = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = ATTR_RE.exec(content)) !== null) {
      const ref = match[1];
      if (isExternalOrSkippable(ref)) continue;

      const candidates = resolveCandidatePaths(file, ref);
      const resolved = candidates.some(fileExistsAsHtmlOrDir);

      if (!resolved) {
        broken.push({
          file: path.relative(ROOT, file),
          reference: ref,
          triedPaths: candidates.map(c => path.relative(ROOT, c)),
        });
      }
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ scannedFiles: files.length, brokenCount: broken.length, broken }, null, 2));
  } else {
    console.log(`Scanned ${files.length} HTML files under ${path.relative(process.cwd(), ROOT) || '.'}\n`);
    if (broken.length === 0) {
      console.log('✅ No broken local href/src references found.');
    } else {
      console.log(`❌ Found ${broken.length} broken reference(s):\n`);
      for (const b of broken) {
        console.log(`  ${b.file}`);
        console.log(`    -> "${b.reference}"`);
        console.log(`    tried: ${b.triedPaths.join(' | ')}`);
        console.log('');
      }
    }
  }

  process.exit(broken.length > 0 ? 1 : 0);
}

main();