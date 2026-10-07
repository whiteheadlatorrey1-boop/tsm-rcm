#!/usr/bin/env node
// render-from-manifest.js <vertical> <tier> [--burn]
// Renders a video tier from manifests/<vertical>.json using per-state PNGs.
// Outputs to videos/: <vertical>-<tier>.mp4, .vtt, .png (poster).
// Fails on: missing frame, empty caption, consecutive byte-identical frames, duration drift.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')));
const [vertical, tier] = args;
if (!vertical || !tier) { console.error('Usage: node render-from-manifest.js <vertical> <tier> [--burn]'); process.exit(2); }

const DEMO_DIR = __dirname;
const manifestPath = path.join(DEMO_DIR, 'manifests', `${vertical}.json`);
if (!fs.existsSync(manifestPath)) fail(`missing ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const frameDir = path.join(DEMO_DIR, manifest.frameDir);
if (!fs.existsSync(frameDir)) fail(`missing frame dir ${frameDir}`);

const pad = n => String(n).padStart(3, '0');
const selected = manifest.states
  .filter(s => (s.tiers || []).includes(tier))
  .map(s => ({ ...s,
    dur: tier === 'flagship' ? s.seconds : (s.promoSeconds ?? s.seconds),
    text: tier === 'flagship' ? s.caption : (s.promoCaption || s.caption) }));
if (!selected.length) fail(`no states tagged "${tier}" in ${manifestPath}`);

const files = fs.readdirSync(frameDir).filter(f => f.endsWith('.png')).sort();
const errors = [];
let prevHash = null, prevN = null;
for (const s of selected) {
  const f = files.find(x => x.startsWith(`${pad(s.n)}-`));
  if (!f) { errors.push(`state ${pad(s.n)}: no frame PNG in ${frameDir}`); continue; }
  s.file = path.join(frameDir, f);
  if (!s.text || !s.text.trim()) errors.push(`state ${pad(s.n)}: empty caption for tier "${tier}"`);
  if (!(s.dur > 0)) errors.push(`state ${pad(s.n)}: bad duration`);
  const hash = crypto.createHash('sha1').update(fs.readFileSync(s.file)).digest('hex');
  if (hash === prevHash) errors.push(`states ${pad(prevN)} and ${pad(s.n)} are byte-identical (a capture click was probably skipped)`);
  prevHash = hash; prevN = s.n;
}
if (errors.length) fail('validation failed:\n  - ' + errors.join('\n  - '));

const outDir = path.join(DEMO_DIR, 'videos');
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${vertical}-${tier}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tsm-render-'));

function ffmpeg(a) { return spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' }).status === 0; }

const hasDrawtext = flags.has('--burn') && /drawtext/.test(spawnSync('ffmpeg', ['-hide_banner', '-filters']).stdout.toString());
if (flags.has('--burn') && !hasDrawtext) console.warn('WARN: ffmpeg has no drawtext; rendering without burned-in captions.');

console.log(`Rendering ${vertical}/${tier}: ${selected.length} states`);
const clips = [];
for (const s of selected) {
  const clip = path.join(tmp, `clip-${pad(s.n)}.mp4`);
  let vf = 'scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black';
  if (hasDrawtext) {
    const t = s.text.replace(/[\\':%]/g, ' ');
    vf += `,drawbox=x=0:y=ih-110:w=iw:h=110:color=black@0.6:t=fill,drawtext=text='${t}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h-75`;
  }
  vf += ',format=yuv420p';
  if (!ffmpeg(['-loop', '1', '-framerate', '30', '-i', s.file, '-t', String(s.dur), '-vf', vf, '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', clip])) fail(`ffmpeg failed on state ${pad(s.n)}`);
  clips.push(clip);
  console.log(`  ${pad(s.n)} - ${s.dur}s  ${s.text}`);
}

fs.writeFileSync(path.join(tmp, 'concat.txt'), clips.map(c => `file '${c}'`).join('\n'));
if (!ffmpeg(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'concat.txt'), '-c', 'copy', '-movflags', '+faststart', `${base}.mp4`])) fail('concat failed');
ffmpeg(['-i', selected[0].file, '-vf', 'scale=1280:-2', `${base}.png`]);

const ts = sec => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
let t = 0, vtt = 'WEBVTT\n\n';
selected.forEach((s, i) => { vtt += `${i + 1}\n${ts(t)} --> ${ts(t + s.dur)}\n${s.text}\n\n`; t += s.dur; });
fs.writeFileSync(`${base}.vtt`, vtt);
fs.rmSync(tmp, { recursive: true, force: true });

const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', `${base}.mp4`]).stdout.toString().trim();
const expected = selected.reduce((a, s) => a + s.dur, 0);
console.log(`\nOutput   : ${base}.mp4`);
console.log(`Expected : ${expected}s   Actual: ${parseFloat(probe).toFixed(1)}s`);
if (Math.abs(parseFloat(probe) - expected) > 1.5) fail('duration drift > 1.5s, check frames');
function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
