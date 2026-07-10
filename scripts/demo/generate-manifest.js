#!/usr/bin/env node
/**
 * Generates html/demo/manifest.json by scanning reports/screenshots/.
 *
 * Expected layout:
 *   reports/screenshots/<vertical-id>/war-room.png
 *   reports/screenshots/<vertical-id>/strategist.png
 *   reports/screenshots/<vertical-id>/executive-portal.png
 *   reports/screenshots/<vertical-id>/meta.json   (optional: { "label": "...", "captions": { "war-room": "...", ... } })
 *
 * Copies each screenshot into html/demo/screenshots/<vertical-id>/<stage>.png
 * (kept outside reports/, which is gitignored) and writes html/demo/manifest.json.
 *
 * Run: node scripts/demo/generate-manifest.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'reports', 'screenshots');
const OUT_SCREENSHOT_DIR = path.join(ROOT, 'html', 'demo', 'screenshots');
const OUT_MANIFEST = path.join(ROOT, 'html', 'demo', 'manifest.json');

const STAGE_ORDER = ['war-room', 'strategist', 'executive-portal'];
const STAGE_LABELS = {
  'war-room': 'Live Signal',
  'strategist': 'AI Synthesis',
  'executive-portal': 'Executive Decision'
};

function titleCase(id) {
  return id.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.warn(`[generate-manifest] ${SRC_DIR} does not exist yet — writing empty manifest.`);
    fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });
    fs.writeFileSync(OUT_MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), verticals: [] }, null, 2));
    return;
  }

  const verticalDirs = fs.readdirSync(SRC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const verticals = [];

  for (const vId of verticalDirs) {
    const vSrcDir = path.join(SRC_DIR, vId);
    let meta = {};
    const metaPath = path.join(vSrcDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {
        console.warn(`[generate-manifest] bad meta.json for ${vId}: ${e.message}`);
      }
    }

    const stages = [];
    for (const stage of STAGE_ORDER) {
      const pngPath = path.join(vSrcDir, `${stage}.png`);
      const jpgPath = path.join(vSrcDir, `${stage}.jpg`);
      const srcFile = fs.existsSync(pngPath) ? pngPath : (fs.existsSync(jpgPath) ? jpgPath : null);
      if (!srcFile) continue;

      const ext = path.extname(srcFile);
      const outDir = path.join(OUT_SCREENSHOT_DIR, vId);
      fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, `${stage}${ext}`);
      fs.copyFileSync(srcFile, outFile);

      stages.push({
        stage,
        label: (meta.captions && meta.captions[stage + '_label']) || STAGE_LABELS[stage],
        caption: (meta.captions && meta.captions[stage]) || '',
        file: `screenshots/${vId}/${stage}${ext}`
      });
    }

    if (!stages.length) {
      console.warn(`[generate-manifest] ${vId} has no war-room/strategist/executive-portal images — skipping.`);
      continue;
    }

    verticals.push({
      id: vId,
      label: meta.label || titleCase(vId),
      stages
    });
  }

  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), verticals }, null, 2));
  console.log(`[generate-manifest] wrote ${OUT_MANIFEST} with ${verticals.length} vertical(s).`);
}

main();
