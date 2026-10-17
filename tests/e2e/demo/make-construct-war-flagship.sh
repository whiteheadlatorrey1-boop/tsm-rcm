#!/usr/bin/env bash
# make-construct-war-flagship.sh — capture, render, register and publish the Construction recovery flagship.
#
#   SILENT=1 bash tests/e2e/demo/make-construct-war-flagship.sh   # captions only (start here)
#   bash tests/e2e/demo/make-construct-war-flagship.sh            # narrated (needs a TTS voice, see below)
#   KEEP_GROQ=1 ...                                               # use GROQ_API_KEY for the draft step
#
# Same shape as make-bpo-flagship.sh: fail-loud capture, then render, then register in
# demo-readiness.json (visualReview:false), then publish --only construct-war -- only after the
# capture and render both succeed, so a failed run never leaves the registry pointing at a video
# that does not exist.
#
# No database: the recovery routes serve seeded sample data and keep decision state in memory.
# The one thing written to disk is the audit trail, and this wrapper points it at a throwaway
# directory (CONSTRUCTION_AUDIT_DIR) that the exit trap deletes, so rehearsals and captures never
# touch data/ and never show up in the recording. Run it as a command, never `source` it.
#
# Drafts: GROQ_API_KEY is blanked by default so the draft step is deterministic (template draft,
# labelled as such on screen). KEEP_GROQ=1 keeps your key for a live AI draft; the text then varies
# per run and counts against your Groq quota.
#
# Narration TTS: TSM_TTS_VOICE (Piper .onnx) or TSM_TTS_CMD. If neither is set, looks for
# en_US-ryan-high.onnx in the repo root or ~/.tsm-tts.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEMO="$REPO/tests/e2e/demo"
ID="construct-war"
cd "$REPO"
die() { echo "✗ $*" >&2; exit 1; }
say() { printf '\n▶ %s\n' "$*"; }

command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || die "ffmpeg/ffprobe not installed"
[ -f "$DEMO/manifests/$ID.json" ] || die "missing manifests/$ID.json"
[ "${NODE_ENV:-}" = production ] && die "NODE_ENV=production -- refusing to run this against a real deployment"
[ -n "${FLY_APP_NAME:-}" ] && die "FLY_APP_NAME is set -- refusing to run this against a real deployment"

# --- TTS --------------------------------------------------------------------
NARRATE="--narrate"
if [ "${SILENT:-0}" = 1 ]; then
  NARRATE=""
elif [ -z "${TSM_TTS_VOICE:-}" ] && [ -z "${TSM_TTS_CMD:-}" ]; then
  for v in "$REPO/en_US-ryan-high.onnx" "$HOME/.tsm-tts/en_US-ryan-high.onnx"; do
    [ -f "$v" ] && export TSM_TTS_VOICE="$v" && break
  done
  [ -n "${TSM_TTS_VOICE:-}" ] || die "no TTS voice. Either:
    pip install piper-tts && mkdir -p ~/.tsm-tts && (cd ~/.tsm-tts && python3 -m piper.download_voices en_US-ryan-high)
  or re-run with SILENT=1 for a captions-only render."
fi
[ -n "$NARRATE" ] && echo "TTS: ${TSM_TTS_CMD:-piper $TSM_TTS_VOICE}"

# --- throwaway audit dir + server, cleaned up on any exit --------------------
AUDIT_DIR="$(mktemp -d)"
SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  rm -rf "$AUDIT_DIR"
}
trap cleanup EXIT
export CONSTRUCTION_AUDIT_DIR="$AUDIT_DIR"
[ "${KEEP_GROQ:-0}" = 1 ] || export GROQ_API_KEY=""

if [ -z "${BASE_URL:-}" ]; then
  PORT="${PORT:-3102}"
  export BASE_URL="http://localhost:$PORT"
  export TSM_ADMIN_PASSWORD="${TSM_LOGIN_PASSWORD:-dev}"
  export TSM_LOGIN_PASSWORD="$TSM_ADMIN_PASSWORD"
  export TSM_SESSION_SECRET="${TSM_SESSION_SECRET:-$(openssl rand -hex 32)}"
  say "Starting server on :$PORT (audit dir $AUDIT_DIR)"
  PORT="$PORT" node server.js > "/tmp/$ID-flagship-server.$$.log" 2>&1 &
  SERVER_PID=$!
  for i in $(seq 1 60); do
    curl -fsS -o /dev/null "$BASE_URL/health" 2>/dev/null && break
    kill -0 "$SERVER_PID" 2>/dev/null || die "server exited — see /tmp/$ID-flagship-server.$$.log"
    sleep 1
  done
  curl -fsS -o /dev/null "$BASE_URL/health" || die "server not reachable at $BASE_URL"
else
  : "${TSM_LOGIN_PASSWORD:?set TSM_LOGIN_PASSWORD to the TSM_ADMIN_PASSWORD of that server}"
  export TSM_LOGIN_PASSWORD
  echo "Using the server at $BASE_URL: its audit directory is NOT the throwaway one, so the capture will refuse unless that trail is empty."
fi

# --- 1. capture (fail-loud) ---------------------------------------------------
say "Capturing Construction recovery frames from $BASE_URL"
node "$DEMO/capture-$ID-flagship.js" || die "capture failed — fix the named step; nothing was registered or published"
N=$(ls "$DEMO/screenshots/$ID-flagship"/*.png 2>/dev/null | wc -l)
[ "$N" -eq 12 ] || die "expected 12 frames, got $N — manifests/$ID.json is keyed to 12 states"

# --- 2. render ----------------------------------------------------------------
say "Rendering flagship"
node "$DEMO/render-from-manifest.js" "$ID" flagship --burn $NARRATE

SUFFIX=""; [ -n "$NARRATE" ] && SUFFIX="-narrated"
MP4="$DEMO/videos/$ID-flagship$SUFFIX.mp4"
[ -s "$MP4" ] || die "missing $MP4"
ffmpeg -hide_banner -loglevel error -y -i "$MP4" -vf "fps=4,scale=960:-2:flags=lanczos" \
  "$DEMO/screenshots/$ID-flagship-demo.gif"

# --- 3. register (only now that the video exists) ----------------------------
say "Registering $ID in demo-readiness.json"
node - "$DEMO/demo-readiness.json" "$SUFFIX" "$ID" <<'NODE'
const fs = require('fs');
const [file, suffix, id] = process.argv.slice(2);
const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
const entry = {
  id,
  spec: `tests/e2e/demo/capture-${id}-flagship.js`,
  manifest: `tests/e2e/demo/manifests/${id}.json`,
  frames: `tests/e2e/demo/screenshots/${id}-flagship`,
  mp4: `tests/e2e/demo/videos/${id}-flagship${suffix}.mp4`,
  gif: `tests/e2e/demo/screenshots/${id}-flagship-demo.gif`,
  engineOutput: 'live-demo-data',
  visualReview: false,
};
const i = reg.experiences.findIndex(e => e.id === id);
if (i === -1) reg.experiences.push(entry);
else reg.experiences[i] = { ...entry, visualReview: reg.experiences[i].visualReview === true };
fs.writeFileSync(file, JSON.stringify(reg, null, 2) + '\n');
console.log(i === -1 ? `added ${id}` : `updated ${id} (visualReview kept)`);
NODE

# --- 4. publish just this one, keep the other flagships as published ----------
say "Publishing into the Demo Console"
node "$DEMO/publish-flagship.js" --only "$ID"

# --- 5. verify ------------------------------------------------------------------
say "Verifying"
node "$DEMO/verify-demo-readiness.js" | grep -E "$ID|FAIL" || true
node - "$REPO" "$ID" <<'NODE'
const fs = require('fs'), path = require('path'), vm = require('vm');
const [repo, id] = process.argv.slice(2);
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'html/demo/flagship/flagship-data.js'), 'utf8'), ctx);
const flags = ctx.window.TSM_FLAGSHIP_DATA || [];
const reg = JSON.parse(fs.readFileSync(path.join(repo, 'tests/e2e/demo/demo-readiness.json'), 'utf8')).experiences;
const bad = [];
if (flags.length !== reg.length || !reg.every(e => flags.some(f => f.id === 'flagship-' + e.id))) bad.push(`registry ${reg.length} vs published ${flags.length}`);
for (const f of flags) {
  for (const u of [f.video, f.poster, f.captions]) if (!fs.existsSync(path.join(repo, 'html', u))) bad.push(`${f.id}: missing html${u}`);
  const ts = f.steps.map(s => s.t);
  if (ts[0] !== 0 || ts.some((x, i) => i && x <= ts[i - 1])) bad.push(`${f.id}: step times not increasing`);
  if (f.steps.some(s => ![0, 1, 2].includes(s.chain) || !s.text)) bad.push(`${f.id}: bad stage/text`);
  if (f.steps[0].chain !== 0 || f.steps[f.steps.length - 1].chain !== 2) bad.push(`${f.id}: must start at stage 0 and end at 2`);
}
if (bad.length) { console.error('✗ Demo Console checks (same as wiring test A7):\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ Demo Console: ${flags.length} flagships published, ${id} included, A7 shape checks pass`);
NODE

printf '  %s  %ss  %s\n' "$(basename "$MP4")" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MP4" | xargs printf '%.1f')" "$(du -h "$MP4" | cut -f1)"
cat <<EOF

✓ Construction flagship done. Next:
  1. Watch the WHOLE video: /demo/flagship/$ID-flagship$SUFFIX.mp4 (also in the Demo Console flagship list)
  2. Open every frame in tests/e2e/demo/screenshots/$ID-flagship/
  3. Only if everything holds up, set "visualReview": true for $ID in demo-readiness.json
  4. Commit: tests/e2e/demo/demo-readiness.json html/demo/flagship/ plus the manifest, capture script and wrapper
EOF
