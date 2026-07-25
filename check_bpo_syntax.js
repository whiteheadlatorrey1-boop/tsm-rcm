const fs = require('fs');
const html = fs.readFileSync('html/bpo/bpo-strategist-v2.html', 'utf8');
const re = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;
const scripts = [...html.matchAll(re)];
console.log('Found', scripts.length, 'inline script block(s)');
scripts.forEach((m, i) => {
  try {
    new Function(m[1]);
    console.log('Script block', i, 'OK');
  } catch (e) {
    console.log('Script block', i, 'SYNTAX ERROR:', e.message);
  }
});