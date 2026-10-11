#!/usr/bin/env node
// render-from-manifest.js <vertical> <tier> [--burn] [--narrate]
// Renders a video tier from manifests/<vertical>.json using per-state PNGs.
// Outputs to videos/: <vertical>-<tier>.mp4, .vtt, .png (poster).
// Fails on: missing frame, empty caption, consecutive byte-identical frames, duration drift.
//
// --narrate adds a spoken track. Each state needs a "narration" string in the
// manifest (written to be said aloud; the caption stays the short on-screen
// label). Each line is turned into speech, the frame is held for as long as
// the line takes to say, and the output is <vertical>-<tier>-narrated.mp4 with
// the narration as its .vtt transcript. Text-to-speech is whatever command you
// point it at:
//   TSM_TTS_VOICE=/path/to/en_US-ryan-high.onnx        (uses Piper: pip install piper-tts)
//   TSM_TTS_CMD='<any command using {text} and {out}>' ({text} = file holding the line, {out} = WAV to write)
// Fails on: a state with no narration, no TTS configured, or a TTS run that writes no audio.
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
const narrate = flags.has('--narrate');
const LEAD_IN = 0.5, TAIL = 0.9; // seconds of quiet before and after each spoken line
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
  if (narrate && !(s.narration && s.narration.trim())) errors.push(`state ${pad(s.n)}: no "narration" in the manifest (required by --narrate)`);
  const hash = crypto.createHash('sha1').update(fs.readFileSync(s.file)).digest('hex');
  if (hash === prevHash) errors.push(`states ${pad(prevN)} and ${pad(s.n)} are byte-identical (a capture click was probably skipped)`);
  prevHash = hash; prevN = s.n;
}
if (errors.length) fail('validation failed:\n  - ' + errors.join('\n  - '));

const outDir = path.join(DEMO_DIR, 'videos');
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${vertical}-${tier}${narrate ? '-narrated' : ''}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tsm-render-'));

function audioSeconds(file) {
  const out = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]).stdout.toString().trim();
  return parseFloat(out);
}

if (narrate) {
  const template = process.env.TSM_TTS_CMD
    || (process.env.TSM_TTS_VOICE ? `python3 -m piper -m "${process.env.TSM_TTS_VOICE}" -i {text} -f {out}` : null);
  if (!template) fail('--narrate needs a text-to-speech command: set TSM_TTS_VOICE to a Piper voice (.onnx), or TSM_TTS_CMD to any command using {text} and {out}');
  if (!template.includes('{text}') || !template.includes('{out}')) fail('TSM_TTS_CMD must contain {text} and {out}');
  console.log(`Narrating ${selected.length} states`);
  for (const s of selected) {
    const textFile = path.join(tmp, `line-${pad(s.n)}.txt`);
    const wav = path.join(tmp, `line-${pad(s.n)}.wav`);
    fs.writeFileSync(textFile, s.narration.trim() + '\n');
    const cmd = template.split('{text}').join(`"${textFile}"`).split('{out}').join(`"${wav}"`);
    const run = spawnSync('sh', ['-c', cmd], { stdio: ['ignore', 'ignore', 'pipe'] });
    const spoken = fs.existsSync(wav) ? audioSeconds(wav) : NaN;
    if (run.status !== 0 || !(spoken > 0.2)) {
      fail(`text-to-speech produced no audio for state ${pad(s.n)}\n  command: ${cmd}\n  ${(run.stderr || '').toString().trim().split('\n').slice(-3).join('\n  ')}`);
    }
    s.audio = wav;
    // Hold the frame for the whole line. Never shorter than the manifest says.
    s.dur = Math.max(s.dur, Math.ceil((LEAD_IN + spoken + TAIL) * 10) / 10);
  }
}

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
  const made = narrate
    // Same picture, plus the spoken line: a short lead-in, levelled, padded with silence to the clip length.
    ? ffmpeg(['-loop', '1', '-framerate', '30', '-i', s.file, '-i', s.audio,
        '-filter_complex', `[0:v]${vf}[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,adelay=${Math.round(LEAD_IN * 1000)}:all=1,apad,aresample=48000[a]`,
        '-map', '[v]', '-map', '[a]', '-t', String(s.dur), '-r', '30',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', clip])
    : ffmpeg(['-loop', '1', '-framerate', '30', '-i', s.file, '-t', String(s.dur), '-vf', vf, '-r', '30',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', clip]);
  if (!made) fail(`ffmpeg failed on state ${pad(s.n)}`);
  clips.push(clip);
  console.log(`  ${pad(s.n)} - ${s.dur}s  ${s.text}`);
}

fs.writeFileSync(path.join(tmp, 'concat.txt'), clips.map(c => `file '${c}'`).join('\n'));
if (!ffmpeg(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'concat.txt'), '-c', 'copy', '-movflags', '+faststart', `${base}.mp4`])) fail('concat failed');
ffmpeg(['-i', selected[0].file, '-vf', 'scale=1280:-2', `${base}.png`]);

const ts = sec => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
let t = 0, vtt = 'WEBVTT\n\n';
selected.forEach((s, i) => { vtt += `${i + 1}\n${ts(t)} --> ${ts(t + s.dur)}\n${narrate ? s.narration.trim() : s.text}\n\n`; t += s.dur; });
fs.writeFileSync(`${base}.vtt`, vtt);
fs.rmSync(tmp, { recursive: true, force: true });

const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', `${base}.mp4`]).stdout.toString().trim();
const expected = selected.reduce((a, s) => a + s.dur, 0);
console.log(`\nOutput   : ${base}.mp4`);
console.log(`Expected : ${expected}s   Actual: ${parseFloat(probe).toFixed(1)}s`);
if (Math.abs(parseFloat(probe) - expected) > 1.5) fail('duration drift > 1.5s, check frames');
function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
