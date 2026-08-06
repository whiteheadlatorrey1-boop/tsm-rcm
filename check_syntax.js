const fs = require('fs');
const { extractInlineScripts } = require('./scripts/inline-script-parser');

const path = process.argv[2];
if (!path) {
  console.error('Usage: node check_syntax.js <path-to-html-file>');
  process.exit(1);
}

const html = fs.readFileSync(path, 'utf8');
const scripts = extractInlineScripts(html);
console.log('Found', scripts.length, 'inline script block(s) in', path);

scripts.forEach((content, i) => {
  const trimmed = content.trim();
  if (!trimmed) { console.log('Script block', i, '(empty, skipped)'); return; }
  try {
    new Function(content);
    console.log('Script block', i, 'OK');
  } catch (e) {
    console.log('Script block', i, 'SYNTAX ERROR:', e.message);
  }
});
