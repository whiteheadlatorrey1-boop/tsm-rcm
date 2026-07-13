const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('Usage: node check_syntax.js <path-to-html-file>');
  process.exit(1);
}
const html = fs.readFileSync(path, 'utf8');
const re = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;
const scripts = [...html.matchAll(re)];
console.log('Found', scripts.length, 'inline script block(s) in', path);
scripts.forEach((m, i) => {
  try {
    new Function(m[1]);
    console.log('Script block', i, 'OK');
  } catch (e) {
    console.log('Script block', i, 'SYNTAX ERROR:', e.message);
  }
});