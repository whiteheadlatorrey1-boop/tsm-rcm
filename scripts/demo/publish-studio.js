#!/usr/bin/env node
// scripts/demo/publish-studio.js
//
// Publishes a read-only "Demo Studio" data file for html/demo/demo-studio.html:
// for every manifest under tests/e2e/demo/manifests/ that declares an
// `audiences` block, and for every audience that has an actual rendered video
// on disk (tests/e2e/demo/videos/, checked in this preference order:
// <vertical>-<audience>-narrated.mp4, <vertical>-<audience>.mp4, then the
// same for the audience's underlying tier name — so an audience that shares a
// tier with another, already-rendered audience is not re-rendered, it's just
// referenced), this copies that video into html/demo/studio/<vertical>/ and
// records its storyboard (beat, caption, narration, taken straight from the
// manifest) plus a fresh quality-gate result.
//
// This script only reads already-rendered files and writes static data for a
// read-only page — it never captures or renders anything itself, and the page
// it feeds has no "run capture" / "publish" button of its own. Both stay
// CLI-only, per the Demo Studio Phase 4 rule.
//
//   node scripts/demo/publish-studio.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..', '..');
const DEMO_DIR = path.join(REPO, 'tests', 'e2e', 'demo');
const VIDEOS = path.join(DEMO_DIR, 'videos');
const MANIFEST_DIR = path.join(DEMO_DIR, 'manifests');
const OUT = path.join(REPO, 'html', 'demo', 'studio');

function findRender(vertical, audienceName, tier) {
  const candidates = [
    `${vertical}-${audienceName}-narrated`,
    `${vertical}-${audienceName}`,
    `${vertical}-${tier}-narrated`,
    `${vertical}-${tier}`,
  ];
  for (const base of candidates) {
    if (fs.existsSync(path.join(VIDEOS, base + '.mp4'))) return base;
  }
  return null;
}

function probeDuration(mp4) {
  const out = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp4]).stdout.toString().trim();
  return parseFloat(out) || 0;
}

const entries = [];
for (const file of fs.readdirSync(MANIFEST_DIR).filter((f) => f.endsWith('.json'))) {
  const vertical = file.replace(/\.json$/, '');
  const manifest = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, file), 'utf8'));
  if (!manifest.audiences) continue; // not every vertical has story-intelligence fields yet

  const outDir = path.join(OUT, vertical);
  const audiences = [];
  for (const [name, aud] of Object.entries(manifest.audiences)) {
    const base = findRender(vertical, name, aud.tier);
    if (!base) { console.warn(`SKIP ${vertical}/${name}: no rendered video found (tried ${vertical}-${name}* and ${vertical}-${aud.tier}*)`); continue; }

    fs.mkdirSync(outDir, { recursive: true });
    const srcBase = path.join(VIDEOS, base);
    const destName = `${name}`;
    for (const ext of ['.mp4', '.vtt', '.png']) {
      const src = srcBase + ext;
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, destName + ext));
    }

    const mp4 = path.join(outDir, destName + '.mp4');
    const duration = probeDuration(mp4);
    const narrated = /-narrated$/.test(base);
    const sidecarCandidates = [
      path.join(DEMO_DIR, `${vertical}-manifest-capture.json`),
      path.join(DEMO_DIR, `${vertical}-flagship-v3-capture.json`),
      path.join(DEMO_DIR, `${vertical}-capture.json`),
    ].filter((p) => fs.existsSync(p));
    let qualityGate = { ran: false, passed: null, output: 'no capture sidecar found; sensitive-data scan skipped' };
    if (sidecarCandidates.length) {
      const args = ['scripts/demo/quality-gate.js', '--video', mp4, '--sidecar', sidecarCandidates[0], '--expected', String(duration)];
      if (narrated) args.push('--narrated');
      const r = spawnSync('node', args, { cwd: REPO, encoding: 'utf8' });
      qualityGate = { ran: true, passed: r.status === 0, output: (r.stdout + r.stderr).trim() };
    }

    const states = (manifest.states || []).filter((s) => (s.tiers || []).includes(aud.tier));
    const storyboard = states.map((s) => ({
      n: s.n,
      slug: s.slug,
      beat: s.beat || null,
      caption: aud.tier === 'flagship' ? s.caption : (s.promoCaption || s.caption),
      narration: (aud.narrationOverrides || {})[s.n] || (aud.tier === 'flagship' ? s.narration : (s.promoNarration || s.narration)) || null,
    }));

    audiences.push({
      name,
      label: aud.label || name,
      tier: aud.tier,
      targetSeconds: aud.targetSeconds || null,
      durationSeconds: Math.round(duration * 10) / 10,
      video: `/demo/studio/${vertical}/${destName}.mp4`,
      poster: fs.existsSync(path.join(outDir, destName + '.png')) ? `/demo/studio/${vertical}/${destName}.png` : null,
      captions: fs.existsSync(path.join(outDir, destName + '.vtt')) ? `/demo/studio/${vertical}/${destName}.vtt` : null,
      narrated,
      qualityGate,
      storyboard,
    });
    console.log(`published ${vertical}/${name} <- videos/${base}.mp4 (${qualityGate.ran ? (qualityGate.passed ? 'quality gate PASSED' : 'quality gate FAILED') : 'quality gate not run'})`);
  }

  if (audiences.length) {
    entries.push({
      vertical,
      title: manifest.title || vertical,
      desc: manifest.desc || null,
      valueProposition: manifest.valueProposition || null,
      chain: manifest.chain || null,
      audiences,
    });
  }
}

fs.mkdirSync(OUT, { recursive: true });
const banner = '// Generated by scripts/demo/publish-studio.js. Do not edit by hand: re-run it after a render.\n';
fs.writeFileSync(path.join(OUT, 'studio-data.js'), banner + 'window.TSM_STUDIO_DATA = ' + JSON.stringify(entries, null, 2) + ';\n');
console.log(`\nwrote html/demo/studio/studio-data.js (${entries.length} verticals)`);
