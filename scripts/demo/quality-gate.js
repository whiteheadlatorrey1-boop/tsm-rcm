#!/usr/bin/env node
// scripts/demo/quality-gate.js
//
// Standalone, re-usable quality gate for a rendered demo video. Checks:
//   1. frames present   — the source frame PNGs the render used still exist
//   2. dimensions        — the output video is 1920x1080
//   3. duration           — within 1.5s of the plan (sum of state durations)
//   4. audio present      — when the render is narrated, an audio stream exists
//      and is non-empty
//   5. sensitive-data scan of the sidecar's recorded on-screen text: emails,
//      phone numbers, SSN-shaped numbers, API-key-shaped tokens, and literal
//      "tsm_session". Any hit is a hard failure — demo captures run against
//      real app state and must never surface real session/user data.
//
// Usage:
//   node scripts/demo/quality-gate.js --video <path.mp4> --sidecar <path.json>
//     --expected <seconds> [--narrated] [--frame-dir <dir>] [--frame-count <n>]
//
// Exit 0 on pass; exit 1 and a list of every failure (not just the first) otherwise.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
}
const has = (name) => process.argv.includes(name);

const video = arg('--video');
const sidecarPath = arg('--sidecar');
const expected = parseFloat(arg('--expected'));
const narrated = has('--narrated');
const frameDir = arg('--frame-dir');
const frameCount = arg('--frame-count') ? parseInt(arg('--frame-count'), 10) : null;

if (!video || !sidecarPath || !Number.isFinite(expected)) {
  console.error('Usage: node quality-gate.js --video <path.mp4> --sidecar <path.json> --expected <seconds> [--narrated] [--frame-dir <dir>] [--frame-count <n>]');
  process.exit(2);
}

const failures = [];

// 1. frames present
if (frameDir) {
  if (!fs.existsSync(frameDir)) {
    failures.push(`frame directory missing: ${frameDir}`);
  } else {
    const count = fs.readdirSync(frameDir).filter((f) => f.endsWith('.png')).length;
    if (frameCount != null && count < frameCount) failures.push(`expected at least ${frameCount} frame PNGs in ${frameDir}, found ${count}`);
    else if (count === 0) failures.push(`no frame PNGs found in ${frameDir}`);
  }
}

// 2 & 3 & 4. video probe: dimensions, duration, audio stream
if (!fs.existsSync(video)) {
  failures.push(`video file missing: ${video}`);
} else {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', video]);
  let info;
  try { info = JSON.parse(probe.stdout.toString()); } catch (e) { failures.push(`ffprobe failed to parse ${video}: ${e.message}`); info = null; }
  if (info) {
    const vStream = (info.streams || []).find((s) => s.codec_type === 'video');
    const aStream = (info.streams || []).find((s) => s.codec_type === 'audio');
    if (!vStream) failures.push(`no video stream in ${video}`);
    else if (vStream.width !== 1920 || vStream.height !== 1080) failures.push(`dimensions are ${vStream.width}x${vStream.height}, expected 1920x1080`);

    const duration = parseFloat((info.format || {}).duration);
    if (!(duration > 0)) failures.push(`could not read a duration for ${video}`);
    else if (Math.abs(duration - expected) > 1.5) failures.push(`duration ${duration.toFixed(1)}s is more than 1.5s from the planned ${expected.toFixed(1)}s`);

    if (narrated) {
      if (!aStream) failures.push(`--narrated was set but ${video} has no audio stream`);
      else if (!(parseFloat(aStream.duration || info.format.duration) > 0.5)) failures.push(`audio stream in ${video} is effectively empty`);
    }
  }
}

// 5. sensitive-data scan of the sidecar
const PATTERNS = [
  { name: 'email address', re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  { name: 'phone number', re: /\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/ },
  { name: 'SSN-shaped number', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: 'API-key-shaped token', re: /\b(?:sk|pk|api|key|token)[-_][A-Za-z0-9]{16,}\b/i },
  { name: 'tsm_session value', re: /\btsm_session\b\s*[:=]\s*\S+/i },
];
if (!fs.existsSync(sidecarPath)) {
  failures.push(`sidecar missing: ${sidecarPath}`);
} else {
  const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
  const strings = [];
  (function walk(v) {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  })(sidecar);
  for (const s of strings) {
    for (const p of PATTERNS) {
      const m = p.re.exec(s);
      if (m) failures.push(`sensitive-data scan: possible ${p.name} in sidecar text: "${m[0].slice(0, 40)}" (in: "${s.slice(0, 80)}")`);
    }
  }
}

if (failures.length) {
  console.error('QUALITY GATE FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`QUALITY GATE PASSED: ${path.basename(video)} (${expected.toFixed(1)}s planned${narrated ? ', narrated' : ''})`);
process.exit(0);
