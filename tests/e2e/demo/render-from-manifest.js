#!/usr/bin/env node
// render-from-manifest.js <vertical> <tier> [--burn] [--narrate] [--audience <name>] [--plain]
// Renders a video tier (or, with --audience, a named audience cut) from
// manifests/<vertical>.json using per-state PNGs.
// Outputs to videos/: <vertical>-<tier|audience>.mp4, .vtt, .png (poster).
// Fails on: missing frame, empty caption, consecutive byte-identical frames, duration drift.
//
// --narrate adds a spoken track. Each state needs a "narration" string in the
// manifest (written to be said aloud; the caption stays the short on-screen
// label). Each line is turned into speech, the frame is held for as long as
// the line takes to say, and the output is <...>-narrated.mp4 with the
// narration as its .vtt transcript. Text-to-speech is whatever command you
// point it at:
//   TSM_TTS_VOICE=/path/to/en_US-ryan-high.onnx        (uses Piper: pip install piper-tts)
//   TSM_TTS_CMD='<any command using {text} and {out}>' ({text} = file holding the line, {out} = WAV to write)
// Fails on: a state with no narration, no TTS configured, or a TTS run that writes no audio.
//
// --audience <name> renders the cut named in manifest.audiences[name] instead
// of a plain tier: that entry's `tier` selects the states (same mechanism as
// a plain tier) and its optional `narrationOverrides` (keyed by state n) swap
// in different narration text for this cut only — captions are never
// overridden, only what is said aloud. Fails if the resulting cut has no
// state tagged with one of the four beats (pain, intelligence, wow, proof,
// value) for each of pain/wow/proof/value — a cut missing any of those is
// not a complete story.
//
// By default the render gets a generated title card, a chapter card at each
// beat change, and a closing card with manifest.valueProposition, all drawn
// with ffmpeg drawtext/drawbox. --plain skips all of that and reproduces the
// original bare output (frames + burned captions only).
//
// After rendering, scripts/demo/quality-gate.js runs automatically against
// the output. If it fails, the render is deleted (refusing to leave
// something publishable behind) and this script exits non-zero.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const audienceIdx = argv.indexOf('--audience');
const audienceName = audienceIdx > -1 ? argv[audienceIdx + 1] : null;
const positional = argv.filter((a, i) => !a.startsWith('--') && (audienceIdx === -1 || i !== audienceIdx + 1));
const flags = new Set(argv.filter(a => a.startsWith('--')));
const [vertical, tierArg] = positional;
if (!vertical || (!tierArg && !audienceName)) { console.error('Usage: node render-from-manifest.js <vertical> <tier> [--burn] [--narrate] [--audience <name>] [--plain]'); process.exit(2); }

const DEMO_DIR = __dirname;
const manifestPath = path.join(DEMO_DIR, 'manifests', `${vertical}.json`);
if (!fs.existsSync(manifestPath)) fail(`missing ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const frameDir = path.join(DEMO_DIR, manifest.frameDir);
if (!fs.existsSync(frameDir)) fail(`missing frame dir ${frameDir}`);

let tier = tierArg;
let audience = null;
let narrationOverrides = {};
if (audienceName) {
  audience = (manifest.audiences || {})[audienceName];
  if (!audience) fail(`no audience "${audienceName}" in ${manifestPath} (have: ${Object.keys(manifest.audiences || {}).join(', ') || 'none'})`);
  tier = audience.tier;
  narrationOverrides = audience.narrationOverrides || {};
}
const outName = audienceName ? `${vertical}-${audienceName}` : `${vertical}-${tier}`;

const pad = n => String(n).padStart(3, '0');
const narrate = flags.has('--narrate');
const plain = flags.has('--plain');
const LEAD_IN = 0.5, TAIL = 0.9; // seconds of quiet before and after each spoken line
const selected = manifest.states
  .filter(s => (s.tiers || []).includes(tier))
  .map(s => ({ ...s,
    dur: tier === 'flagship' ? s.seconds : (s.promoSeconds ?? s.seconds),
    text: tier === 'flagship' ? s.caption : (s.promoCaption || s.caption),
    say: narrationOverrides[s.n] || (tier === 'flagship' ? s.narration : (s.promoNarration || s.narration)) }));
if (!selected.length) fail(`no states tagged "${tier}" in ${manifestPath}`);

if (audience) {
  const required = ['pain', 'intelligence', 'wow', 'proof', 'value'].filter(b => ['pain', 'wow', 'proof', 'value'].includes(b));
  const have = new Set(selected.map(s => s.beat).filter(Boolean));
  const missing = required.filter(b => !have.has(b));
  if (missing.length) fail(`audience "${audienceName}": cut is missing beat(s): ${missing.join(', ')} — every audience cut needs at least one pain, wow, proof and value beat`);
  if (audience.targetSeconds) {
    const [lo, hi] = audience.targetSeconds;
    const planned = selected.reduce((a, s) => a + s.dur, 0);
    if (planned < lo || planned > hi) console.warn(`WARN: audience "${audienceName}" planned duration ${planned}s is outside its target ${lo}-${hi}s (not a hard failure, but worth trimming states)`);
  }
}

const files = fs.readdirSync(frameDir).filter(f => f.endsWith('.png')).sort();
const errors = [];
let prevHash = null, prevN = null;
for (const s of selected) {
  const f = files.find(x => x.startsWith(`${pad(s.n)}-`));
  if (!f) { errors.push(`state ${pad(s.n)}: no frame PNG in ${frameDir}`); continue; }
  s.file = path.join(frameDir, f);
  if (!s.text || !s.text.trim()) errors.push(`state ${pad(s.n)}: empty caption for tier "${tier}"`);
  if (!(s.dur > 0)) errors.push(`state ${pad(s.n)}: bad duration`);
  if (narrate && !(s.say && s.say.trim())) errors.push(`state ${pad(s.n)}: no "narration" in the manifest (required by --narrate)`);
  const hash = crypto.createHash('sha1').update(fs.readFileSync(s.file)).digest('hex');
  if (hash === prevHash) errors.push(`states ${pad(prevN)} and ${pad(s.n)} are byte-identical (a capture click was probably skipped)`);
  prevHash = hash; prevN = s.n;
}
if (errors.length) fail('validation failed:\n  - ' + errors.join('\n  - '));

const outDir = path.join(DEMO_DIR, 'videos');
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${outName}${narrate ? '-narrated' : ''}`);
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
    fs.writeFileSync(textFile, s.say.trim() + '\n');
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

const hasDrawtext = (flags.has('--burn') || !plain) && /drawtext/.test(spawnSync('ffmpeg', ['-hide_banner', '-filters']).stdout.toString());
if (flags.has('--burn') && !hasDrawtext) console.warn('WARN: ffmpeg has no drawtext; rendering without burned-in captions.');

// TSM brand colors used for generated cards.
const BG = '0x0b1220', ACCENT = '0x00d4b8', FG = '0xffffff';
const BEAT_LABEL = { pain: 'THE PROBLEM', intelligence: 'HOW IT WORKS', wow: 'THE MOMENT', proof: 'THE PROOF', value: 'THE VALUE' };
const esc = t => (t || '').replace(/[\\':%]/g, ' ');

function makeCard(clipPath, seconds, big, small, withAudio) {
  const vf = [
    `drawtext=text='${esc(big)}':fontcolor=${FG}:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2${small ? '-40' : ''}`,
    small ? `drawtext=text='${esc(small)}':fontcolor=${ACCENT}:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2+50` : null,
  ].filter(Boolean).join(',');
  const args = ['-f', 'lavfi', '-i', `color=c=${BG}:s=1920x1080:d=${seconds}`];
  if (withAudio) args.push('-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`);
  args.push('-vf', vf, '-r', '30');
  if (withAudio) args.push('-shortest', '-c:a', 'aac', '-b:a', '160k', '-ac', '2');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', clipPath);
  if (!ffmpeg(args)) fail(`ffmpeg failed making card ${clipPath}`);
}

console.log(`Rendering ${vertical}/${outName}: ${selected.length} states`);
const clips = [];
let cardSeconds = 0;

if (!plain) {
  const titleClip = path.join(tmp, 'card-title.mp4');
  makeCard(titleClip, 3.5, manifest.title, audienceName ? `${audienceName[0].toUpperCase()}${audienceName.slice(1)} cut` : null, narrate);
  clips.push(titleClip);
  cardSeconds += 3.5;
}

let lastBeat = null;
for (const s of selected) {
  if (!plain && s.beat && s.beat !== lastBeat) {
    const chapterClip = path.join(tmp, `card-chapter-${pad(s.n)}.mp4`);
    makeCard(chapterClip, 1.6, BEAT_LABEL[s.beat] || s.beat.toUpperCase(), null, narrate);
    clips.push(chapterClip);
    cardSeconds += 1.6;
  }
  lastBeat = s.beat || lastBeat;

  const clip = path.join(tmp, `clip-${pad(s.n)}.mp4`);
  let vf = 'scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black';
  if (hasDrawtext) {
    const t = esc(s.text);
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

if (!plain && manifest.valueProposition) {
  const closingClip = path.join(tmp, 'card-closing.mp4');
  makeCard(closingClip, 4, manifest.valueProposition, null, narrate);
  clips.push(closingClip);
  cardSeconds += 4;
}

fs.writeFileSync(path.join(tmp, 'concat.txt'), clips.map(c => `file '${c}'`).join('\n'));
if (!ffmpeg(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'concat.txt'), '-c', 'copy', '-movflags', '+faststart', `${base}.mp4`])) fail('concat failed');
ffmpeg(['-i', selected[0].file, '-vf', 'scale=1280:-2', `${base}.png`]);

const ts = sec => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
// Cards are not part of the step-cue .vtt (publish-flagship.js expects one cue per state); they
// only exist inside the rendered mp4's own timeline, offset by the title card's length.
let t = plain ? 0 : 3.5, vtt = 'WEBVTT\n\n';
selected.forEach((s, i) => { vtt += `${i + 1}\n${ts(t)} --> ${ts(t + s.dur)}\n${narrate ? s.say.trim() : s.text}\n\n`; t += s.dur; });
fs.writeFileSync(`${base}.vtt`, vtt);
fs.rmSync(tmp, { recursive: true, force: true });

const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', `${base}.mp4`]).stdout.toString().trim();
const statesSeconds = selected.reduce((a, s) => a + s.dur, 0);
const expected = statesSeconds + cardSeconds;
console.log(`\nOutput   : ${base}.mp4`);
console.log(`Expected : ${expected}s   Actual: ${parseFloat(probe).toFixed(1)}s`);
if (Math.abs(parseFloat(probe) - expected) > 1.5) fail('duration drift > 1.5s, check frames');

// Quality gate: frames present, 1920x1080, duration within plan, audio present when narrated,
// and a sensitive-data scan of the sidecar. Refuses to leave a failing render behind.
const sidecarCandidates = [
  path.join(DEMO_DIR, `${vertical}-manifest-capture.json`),
  path.join(DEMO_DIR, `${vertical}-flagship-v3-capture.json`),
  path.join(DEMO_DIR, `${vertical}-capture.json`),
].filter(p => fs.existsSync(p));
const sidecar = sidecarCandidates[0];
if (!sidecar) {
  console.warn(`WARN: no capture sidecar found for "${vertical}" next to the manifest; skipping the quality gate's sensitive-data scan.`);
} else {
  const gateArgs = ['scripts/demo/quality-gate.js', '--video', `${base}.mp4`, '--sidecar', sidecar, '--expected', String(expected), '--frame-dir', frameDir, '--frame-count', String(selected.length)];
  if (narrate) gateArgs.push('--narrated');
  const gate = spawnSync('node', gateArgs, { cwd: path.join(DEMO_DIR, '..', '..', '..'), stdio: 'inherit' });
  if (gate.status !== 0) {
    for (const ext of ['.mp4', '.vtt', '.png']) { try { fs.unlinkSync(`${base}${ext}`); } catch (e) {} }
    fail('quality gate failed — render deleted, not safe to publish');
  }
}

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
