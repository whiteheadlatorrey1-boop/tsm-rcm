const fs = require('fs');
const path = require('path');

const mediaDir = path.join(__dirname, 'media');
const categories = fs.readdirSync(mediaDir, { withFileTypes: true });

function walk(dir, rel = '') {
  let items = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relPath = path.join(rel, entry.name);
    if (entry.isDirectory()) {
      items = items.concat(walk(full, relPath));
    } else if (entry.name.endsWith('.png')) {
      items.push(relPath.replace(/\\/g, '/'));
    }
  }
  return items;
}

const images = walk(mediaDir).sort();
const html = `<!DOCTYPE html><html><head><title>Media Kit Gallery</title>
<style>body{font-family:sans-serif;background:#111;color:#eee;padding:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.card{background:#1a1a1a;border-radius:8px;padding:10px}
.card img{width:100%;border-radius:4px}
.card p{font-size:12px;color:#999;word-break:break-all;margin:6px 0 0}</style></head>
<body><h1>Media Kit — ${images.length} images</h1><div class="grid">
${images.map(img => `<div class="card"><img src="media/${img}" loading="lazy"><p>${img}</p></div>`).join('\n')}
</div></body></html>`;

fs.writeFileSync(path.join(__dirname, 'media-gallery.html'), html);
console.log(`Gallery written to media-gallery.html (${images.length} images)`);
