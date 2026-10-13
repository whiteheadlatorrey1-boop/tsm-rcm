#!/usr/bin/env bash
# make-l1-flagship.sh — capture, render, register and publish the L1 flagship.
#
#   bash tests/e2e/demo/make-l1-flagship.sh            # narrated flagship + executive promo
#   SILENT=1 bash tests/e2e/demo/make-l1-flagship.sh   # no TTS: captions only
#   BASE_URL=http://localhost:3100 ...                 # use a server you already started
#
# Order matters: the readiness registry and flagship-data.js are only touched
# after the capture and both renders succeed, so a failed run never leaves
# demo-readiness.json pointing at a video that does not exist.
#
# Narration TTS: TSM_TTS_VOICE (Piper .onnx) or TSM_TTS_CMD. If neither is set,
# looks for en_US-ryan-high.onnx in the repo root or ~/.tsm-tts.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEMO="$REPO/tests/e2e/demo"
cd "$REPO"
die() { echo "✗ $*" >&2; exit 1; }
say() { printf '\n▶ %s\n' "$*"; }

command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || die "ffmpeg/ffprobe not installed"
[ -f "$DEMO/manifests/l1.json" ] || die "missing manifests/l1.json"
node -e "const m=require('$DEMO/manifests/l1.json');if(m.frameDir!=='screenshots/l1-platform-flagship-v3')process.exit(1)" \
  || die "manifests/l1.json is not the v3-keyed manifest"

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

# --- protect local data the capture may write ------------------------------
HANDOFFS="data/l1-copilot-handoffs.json"
HANDOFFS_STATE=absent
if git ls-files --error-unmatch "$HANDOFFS" >/dev/null 2>&1; then
  git diff --quiet -- "$HANDOFFS" && HANDOFFS_STATE=tracked-clean || HANDOFFS_STATE=tracked-dirty
elif [ -f "$HANDOFFS" ]; then
  HANDOFFS_STATE=untracked; cp "$HANDOFFS" "/tmp/l1-handoffs.$$.bak"
fi

# --- server -----------------------------------------------------------------
SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  case "$HANDOFFS_STATE" in
    tracked-clean) git checkout -- "$HANDOFFS" 2>/dev/null || true ;;
    untracked)     cp "/tmp/l1-handoffs.$$.bak" "$HANDOFFS"; rm -f "/tmp/l1-handoffs.$$.bak" ;;
    absent)        [ -f "$HANDOFFS" ] && ! git ls-files --error-unmatch "$HANDOFFS" >/dev/null 2>&1 && rm -f "$HANDOFFS" || true ;;
  esac
}
trap cleanup EXIT

if [ -z "${BASE_URL:-}" ]; then
  PORT="${PORT:-3100}"
  export BASE_URL="http://localhost:$PORT"
  export TSM_ADMIN_PASSWORD="${TSM_LOGIN_PASSWORD:-dev}"
  export TSM_LOGIN_PASSWORD="$TSM_ADMIN_PASSWORD"
  export TSM_SESSION_SECRET="${TSM_SESSION_SECRET:-$(openssl rand -hex 32)}"
  say "Starting server on :$PORT"
  PORT="$PORT" node server.js > "/tmp/l1-flagship-server.$$.log" 2>&1 &
  SERVER_PID=$!
  for i in $(seq 1 60); do
    curl -fsS -o /dev/null "$BASE_URL/html/l1-copilot/l1-ticket-copilot.html" 2>/dev/null && break
    kill -0 "$SERVER_PID" 2>/dev/null || die "server exited — see /tmp/l1-flagship-server.$$.log"
    sleep 1
  done
  curl -fsS -o /dev/null "$BASE_URL/html/l1-copilot/l1-ticket-copilot.html" || die "server not reachable at $BASE_URL"
else
  : "${TSM_LOGIN_PASSWORD:?set TSM_LOGIN_PASSWORD to the TSM_ADMIN_PASSWORD of that server}"
  export TSM_LOGIN_PASSWORD
fi

# --- 1. capture (fail-loud) ---------------------------------------------------
say "Capturing L1 v3 frames from $BASE_URL"
node "$DEMO/capture-l1-flagship-v3.js" || die "capture failed — fix the named step; nothing was registered or published"
N=$(ls "$DEMO/screenshots/l1-platform-flagship-v3"/*.png 2>/dev/null | wc -l)
[ "$N" -eq 32 ] || die "expected 32 frames, got $N — the manifest is keyed to 32 v3 steps"

# --- 2. render ----------------------------------------------------------------
say "Rendering flagship"
node "$DEMO/render-from-manifest.js" l1 flagship --burn $NARRATE
say "Rendering executive promo"
node "$DEMO/render-from-manifest.js" l1 promo --burn $NARRATE

SUFFIX=""; [ -n "$NARRATE" ] && SUFFIX="-narrated"
MP4="$DEMO/videos/l1-flagship$SUFFIX.mp4"
[ -s "$MP4" ] || die "missing $MP4"
# GIF preview, same location pattern as the other flagships
ffmpeg -hide_banner -loglevel error -y -i "$MP4" -vf "fps=4,scale=960:-2:flags=lanczos" \
  "$DEMO/screenshots/l1-flagship-demo.gif"

# --- 3. register (only now that the video exists) ----------------------------
say "Registering l1 in demo-readiness.json"
node - "$DEMO/demo-readiness.json" "$SUFFIX" <<'NODE'
const fs = require('fs');
const [file, suffix] = process.argv.slice(2);
const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
const entry = {
  id: 'l1',
  spec: 'tests/e2e/demo/capture-l1-flagship-v3.js',
  manifest: 'tests/e2e/demo/manifests/l1.json',
  frames: 'tests/e2e/demo/screenshots/l1-platform-flagship-v3',
  mp4: `tests/e2e/demo/videos/l1-flagship${suffix}.mp4`,
  gif: 'tests/e2e/demo/screenshots/l1-flagship-demo.gif',
  engineOutput: 'live-demo-data',
  visualReview: false,
};
const i = reg.experiences.findIndex(e => e.id === 'l1');
if (i === -1) reg.experiences.push(entry);
else reg.experiences[i] = { ...entry, visualReview: reg.experiences[i].visualReview === true };
fs.writeFileSync(file, JSON.stringify(reg, null, 2) + '\n');
console.log(i === -1 ? 'added l1' : 'updated l1 (visualReview kept)');
NODE

# --- 4. publish just L1, keep the other flagships as published ---------------
say "Publishing into the Demo Console"
node "$DEMO/publish-flagship.js" --only l1

# --- 5. verify ------------------------------------------------------------------
say "Verifying"
node "$DEMO/verify-demo-readiness.js" | grep -E "l1|FAIL" || true
node - "$REPO" <<'NODE'
const fs = require('fs'), path = require('path'), vm = require('vm');
const repo = process.argv[2];
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
console.log(`✓ Demo Console: ${flags.length} flagships published, L1 included, A7 shape checks pass`);
NODE

for f in "$MP4" "$DEMO/videos/l1-promo$SUFFIX.mp4"; do
  printf '  %s  %ss  %s\n' "$(basename "$f")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | xargs printf '%.1f')" \
    "$(du -h "$f" | cut -f1)"
done
cat <<EOF

✓ L1 flagship done. Next:
  1. Watch it:  /demo/flagship/l1-flagship.mp4 (also in the Demo Console flagship list)
  2. Executive promo (not published): tests/e2e/demo/videos/l1-promo$SUFFIX.mp4
  3. If every frame holds up, set "visualReview": true for l1 in demo-readiness.json
  4. Commit: tests/e2e/demo/demo-readiness.json html/demo/flagship/
EOF
