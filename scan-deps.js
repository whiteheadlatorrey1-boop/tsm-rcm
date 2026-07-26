const fs = require('fs');
const path = require('path');

const root = process.cwd();
const visited = new Set();
const missing = new Set();
const entry = path.resolve(root, 'server.js');

function resolveLocal(fromFile, req) {
  const base = path.resolve(path.dirname(fromFile), req);
  const candidates = [base, base + '.js', base + '.json', path.join(base, 'index.js'), path.join(base, 'index.json')];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function scan(file) {
  const rel = path.relative(root, file);
  if (visited.has(rel)) return;
  visited.add(rel);
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch (e) { missing.add(rel); return; }
  const re = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(content))) {
    const resolved = resolveLocal(file, m[1]);
    if (resolved) {
      if (resolved.endsWith('.json')) visited.add(path.relative(root, resolved));
      else scan(resolved);
    } else {
      missing.add(m[1] + '  (required from ' + rel + ')');
    }
  }
}

scan(entry);
const files = Array.from(visited).sort();
fs.writeFileSync('claude-deps-filelist.txt', files.join('\n'));
console.log('--- Resolved local files (' + files.length + ') ---');
files.forEach(f => console.log(f));
if (missing.size) {
  console.log('\n--- UNRESOLVED requires (check manually) ---');
  missing.forEach(m => console.log(m));
}
