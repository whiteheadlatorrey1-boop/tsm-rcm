// Fails if a platform page (by filename OR content) is not in the registry, or a registry file is missing.
// Intentional exclusions go in "ignore": [paths] in the registry JSON.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/intelligence-core/war-room-registry.json'), 'utf8'));
const NAME = /(war|incident|shutdown|strategist|executive|readiness|continuity|recovery)/i;
const CONTENT = /[A-Z_]+_RELAY|nav-tab|TSM_.*STRAT/;
const ignore = new Set(reg.ignore || []);
function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name.endsWith('.html') && (NAME.test(f.name) || CONTENT.test(fs.readFileSync(p, 'utf8')))) out.push(path.relative(ROOT, p));
  }
  return out;
}
const onDisk = new Set(walk(path.join(ROOT, 'html')));
const registered = new Set(reg.entries.flatMap(e => e.files));
const unregistered = [...onDisk].filter(f => !registered.has(f) && !ignore.has(f));
const missing = [...registered].filter(f => !fs.existsSync(path.join(ROOT, f)));
const unclassified = reg.entries.filter(e => e.status === 'UNCLASSIFIED').length;
console.log(`detected: ${onDisk.size} | registered: ${registered.size} | unclassified entries: ${unclassified}/${reg.entries.length}`);
unregistered.forEach(f => console.log('UNREGISTERED:', f));
missing.forEach(f => console.log('MISSING FILE:', f));
process.exit(unregistered.length || missing.length ? 1 : 0);
