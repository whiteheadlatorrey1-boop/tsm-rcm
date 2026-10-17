'use strict';
// scripts/test-no-real-company-names.js
//
// TSM pitches each of these companies directly -- none of them may appear
// on any served page as a client, persona, placement, document source, or
// with invented figures. Fails if any of them (case-insensitive) appears
// anywhere under the served trees: html/ (served at '/' -- see server.js's
// `app.use('/', express.static(...))`), js/, config/, runtime/,
// architecture/, core/ (each has its own static mount in server.js).
//
// The one allowlisted exception is html/private-demos/: real-prospect pitch
// material is permitted to live there, but ONLY because server.js blocks
// that path outright (`app.use('/private-demos', (req,res) => res.status(
// 404).end())`, registered above the html/ static mount) -- this test also
// asserts that guard exists, so the allowlist can't silently go stale if
// the guard is ever removed.

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const SERVED_DIRS = ['html', 'js', 'config', 'runtime', 'architecture', 'core'];
const ALLOWLIST_DIR = path.join(REPO, 'html', 'private-demos');

// Real companies TSM is actively pitching -- none may appear anywhere served.
const REAL_COMPANIES = [
  'ameris',
  'honorhealth',
  /banner[\s-]?health/i,
  /desert[\s-]?financial/i,
  /first american/i,
  /case[\s-]?tech/i,
  'trivago',
  'honeywell',
];

const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.mov', '.webm', '.pptx', '.docx', '.pdf', '.ico', '.woff', '.woff2', '.ttf', '.zip']);

let failed = 0;
function check(name, ok) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) failed++;
}

function matches(line) {
  return REAL_COMPANIES.some((pat) => (typeof pat === 'string' ? line.toLowerCase().includes(pat) : pat.test(line)));
}

function walk(dir, hits) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (full === ALLOWLIST_DIR) continue; // the one permitted exception
    const stat = fs.statSync(full);
    if (stat.isDirectory()) { walk(full, hits); continue; }
    if (SKIP_EXT.has(path.extname(name).toLowerCase())) continue;
    const text = fs.readFileSync(full, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (matches(line)) hits.push({ file: path.relative(REPO, full), line: i + 1, text: line.trim().slice(0, 160) });
    });
  }
}

const hits = [];
for (const d of SERVED_DIRS) walk(path.join(REPO, d), hits);

check('no real-company name found across ' + SERVED_DIRS.join(', '), hits.length === 0);
if (hits.length) {
  console.log('  Found ' + hits.length + ' line(s):');
  for (const h of hits.slice(0, 30)) console.log('  ' + h.file + ':' + h.line + '  ' + h.text);
  if (hits.length > 30) console.log('  ... and ' + (hits.length - 30) + ' more');
}

// The allowlist is only safe because this guard exists and runs before the
// html/ static mount. If someone deletes the guard, this test must fail --
// otherwise html/private-demos/ silently becomes a real public leak.
const serverSrc = fs.readFileSync(path.join(REPO, 'server.js'), 'utf8');
const guardPattern = /app\.use\(\s*['"]\/private-demos['"]\s*,[\s\S]{0,200}?res\.status\(404\)/;
const staticMountIdx = serverSrc.indexOf("app.use('/', express.static(path.join(__dirname, 'html'))");
const guardMatch = guardPattern.exec(serverSrc);
check('server.js blocks /private-demos with a 404 guard before the html/ static mount',
  !!guardMatch && staticMountIdx !== -1 && guardMatch.index < staticMountIdx);

if (failed) { console.error('\n' + failed + ' check(s) failed'); process.exit(1); }
console.log('\nAll real-company-name checks passed');
