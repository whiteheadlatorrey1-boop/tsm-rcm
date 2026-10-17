'use strict';
// scripts/test-html-no-ameris.js
//
// Ameris Construction is a real prospect TSM is pitching, not a client.
// It must never appear anywhere under html/ (the tree served at '/' --
// see server.js's `app.use('/', express.static(path.join(__dirname,
// 'html')))`), in any case: not in a client directory, a pricing table,
// a persona config, a demo script, or a build/audit tool's own data.
// This fails the build the next time "Ameris" (or "ameris", "AMERIS", ...)
// creeps back into any served file.

const fs = require('fs');
const path = require('path');

const HTML_DIR = path.join(__dirname, '..', 'html');
const PATTERN = /ameris/i;

// Binary/media files can legitimately contain "ameris" in embedded metadata
// or compressed bytes that happen to decode to that substring by chance;
// scanning them as text would be noise, not signal. Skip by extension.
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.mov', '.webm', '.pptx', '.docx', '.pdf', '.ico', '.woff', '.woff2', '.ttf', '.zip']);

function walk(dir, hits) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) { walk(full, hits); continue; }
    if (SKIP_EXT.has(path.extname(name).toLowerCase())) continue;
    const text = fs.readFileSync(full, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (PATTERN.test(line)) hits.push({ file: path.relative(path.join(__dirname, '..'), full), line: i + 1, text: line.trim().slice(0, 160) });
    });
  }
}

const hits = [];
walk(HTML_DIR, hits);

if (hits.length) {
  console.log('FAIL  "ameris" found in ' + hits.length + ' line(s) under html/:');
  for (const h of hits.slice(0, 30)) console.log('  ' + h.file + ':' + h.line + '  ' + h.text);
  if (hits.length > 30) console.log('  ... and ' + (hits.length - 30) + ' more');
  process.exit(1);
}
console.log('PASS no "ameris" (any case) found anywhere under html/');
