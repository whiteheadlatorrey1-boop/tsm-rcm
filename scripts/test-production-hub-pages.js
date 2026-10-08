'use strict';
// Guards the pages linked from html/bpo-files/suite-hub.html: every link resolves, inline
// scripts compile, local script/style refs resolve through the same static mounts the
// server uses, and the specific markup defects fixed in this change stay fixed.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HUB = path.join(ROOT, 'html/bpo-files/suite-hub.html');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL', m)); };
const isFile = p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } };

// Mirrors the express.static mounts in server.js that these pages depend on.
const MOUNTS = [
  ['/music/', ['html/war-rooms/music-war/']],
  ['/js/', ['html/tsm-insurance/public/js/', 'html/js/', 'js/']],
  ['/html/', ['html/']],
  ['/core/', ['core/']], ['/config/', ['config/']], ['/runtime/', ['runtime/']], ['/architecture/', ['architecture/']],
  ['/', ['html/']]
];
function resolve(ref, fromFile) {
  const p = ref.split('#')[0].split('?')[0];
  if (!p) return true;
  if (!p.startsWith('/')) return isFile(path.resolve(path.dirname(fromFile), p));
  for (const [prefix, dirs] of MOUNTS) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    if (dirs.some(d => isFile(path.join(ROOT, d, rest)))) return true;
  }
  return isFile(path.join(ROOT, p));
}

const hub = fs.readFileSync(HUB, 'utf8');
const links = [...new Set([...hub.matchAll(/href="([^"]+)"/g)].map(m => m[1]))]
  .filter(h => !/^(https?:|mailto:|#|javascript:)/.test(h));
ok(links.length > 50, 'hub lists its pages (' + links.length + ')');

let pages = 0;
for (const link of links) {
  if (!resolve(link, HUB)) { ok(false, 'hub link resolves: ' + link); continue; }
  const p = link.split('#')[0].split('?')[0];
  const file = !p.startsWith('/') ? path.resolve(path.dirname(HUB), p)
    : [path.join(ROOT, p), path.join(ROOT, 'html', p)].find(isFile);
  if (!/\.html$/i.test(file)) continue;
  pages++;
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  let bad = null;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=|type\s*=\s*["']?(application\/(ld\+)?json|text\/template|text\/html|importmap|module)/i.test(m[1])) continue;
    try { new vm.Script(m[2]); } catch (e) { bad = e.message; break; }
  }
  ok(!bad, rel + ' inline scripts compile' + (bad ? ': ' + bad : ''));
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*"([^"]+)"/gi)].map(m => m[1])
    .filter(r => !/^(https?:|\/\/|data:|#|javascript:)/i.test(r) && !/\$\{|\{\{|\+/.test(r));
  const miss = [...new Set(refs)].filter(r => /\.(js|css)(\?|$)/i.test(r) && !resolve(r, file));
  ok(miss.length === 0, rel + ' local script/style refs resolve' + (miss.length ? ': ' + miss.join(', ') : ''));
}
ok(pages > 60, 'audited ' + pages + ' hub pages');

// Specific defects fixed here
for (const f of ['healthcare-thermal-continuity', 'aerospace-maintenance-readiness', 'life-sciences-production-continuity', 'industrial-capital-project-recovery', 'honeywell-cross-domain-cascade']) {
  const h = fs.readFileSync(path.join(ROOT, 'html/war-rooms', f + '.html'), 'utf8');
  ok(h.includes('src="../../js/tsm-guide-engine.js"') && !/src="js\/tsm-guide-engine\.js"/.test(h), f + ' loads the guide engine from /js');
}
const re = fs.readFileSync(path.join(ROOT, 'html/war-rooms/re-war/re-war-room.html'), 'utf8');
ok((re.match(/\bid="btnPaste"/g) || []).length === 1 && (re.match(/\bid="btnUpload"/g) || []).length === 1, 're-war-room has one paste and one upload button');
ok(!/switchDocMode\('(paste|upload)'\)"='block'/.test(re), 're-war-room has no garbled button attributes');
const cc = fs.readFileSync(path.join(ROOT, 'html/concierge-command.html'), 'utf8');
ok(!/<button\b[^>]*\bid="btnSynth"[^>]*\bid="btnSynth"/.test(cc), 'concierge btnSynth has a single id attribute');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
