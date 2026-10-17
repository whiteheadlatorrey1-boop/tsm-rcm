#!/usr/bin/env bash
# make-bpo-flagship.sh — capture, render, register and publish the BPO flagship.
#
#   set -a; . ~/.tsm-mongo.env; set +a   # a TEST database -- never production
#   bash tests/e2e/demo/make-bpo-flagship.sh            # narrated flagship
#   SILENT=1 bash tests/e2e/demo/make-bpo-flagship.sh   # no TTS: captions only
#
# Same shape as make-l1-flagship.sh: fail-loud capture, then render, then
# register in demo-readiness.json (visualReview:false), then publish --only
# bpo -- only after the capture and render both succeed, so a failed run
# never leaves demo-readiness.json pointing at a video that does not exist.
#
# This flagship is the only one that touches a real database (BPO client/
# case/document creation, via server/tsm-ledger-service.js) -- MONGODB_URI
# MUST be set before running this, pointed at a TEST database, never
# production. capture-bpo-flagship.js refuses outright if NODE_ENV=production
# or FLY_APP_NAME is set.
#
# Cleanup: capture-bpo-flagship.js cannot clean up after itself (see its own
# header comment -- tests/e2e/helpers/demo-step.js's fail() calls
# process.exit() directly on a failed step, bypassing any try/catch in the
# caller). So cleanup lives here instead, in the one place guaranteed to run
# regardless of how the capture process exits: this trap, exactly the same
# mechanism already used below for the data/l1-copilot-handoffs.json side
# effect in make-l1-flagship.sh.
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
[ -f "$DEMO/manifests/bpo.json" ] || die "missing manifests/bpo.json"
: "${MONGODB_URI:?MONGODB_URI must be set, pointed at a TEST database -- e.g. set -a; . ~/.tsm-mongo.env; set +a}"
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

# --- protect local data the capture may write, clean up Mongo regardless ---
CLIENTS_JSON="data/clients.json"
CLIENTS_JSON_STATE=absent
if git ls-files --error-unmatch "$CLIENTS_JSON" >/dev/null 2>&1; then
  git diff --quiet -- "$CLIENTS_JSON" && CLIENTS_JSON_STATE=tracked-clean || CLIENTS_JSON_STATE=tracked-dirty
elif [ -f "$CLIENTS_JSON" ]; then
  CLIENTS_JSON_STATE=untracked; cp "$CLIENTS_JSON" "/tmp/bpo-clients-json.$$.bak"
fi

SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  node "$DEMO/cleanup-bpo-flagship-capture.js" || true
  case "$CLIENTS_JSON_STATE" in
    tracked-clean) git checkout -- "$CLIENTS_JSON" 2>/dev/null || true ;;
    untracked)     cp "/tmp/bpo-clients-json.$$.bak" "$CLIENTS_JSON"; rm -f "/tmp/bpo-clients-json.$$.bak" ;;
    absent)        [ -f "$CLIENTS_JSON" ] && ! git ls-files --error-unmatch "$CLIENTS_JSON" >/dev/null 2>&1 && rm -f "$CLIENTS_JSON" || true ;;
  esac
}
trap cleanup EXIT

if [ -z "${BASE_URL:-}" ]; then
  PORT="${PORT:-3101}"
  export BASE_URL="http://localhost:$PORT"
  export TSM_ADMIN_PASSWORD="${TSM_LOGIN_PASSWORD:-dev}"
  export TSM_LOGIN_PASSWORD="$TSM_ADMIN_PASSWORD"
  export TSM_SESSION_SECRET="${TSM_SESSION_SECRET:-$(openssl rand -hex 32)}"
  export TSM_DOC_ENCRYPTION_KEY="${TSM_DOC_ENCRYPTION_KEY:-$(openssl rand -base64 32)}"
  say "Starting server on :$PORT"
  PORT="$PORT" node server.js > "/tmp/bpo-flagship-server.$$.log" 2>&1 &
  SERVER_PID=$!
  for i in $(seq 1 60); do
    curl -fsS -o /dev/null "$BASE_URL/bpo-clients-admin.html" 2>/dev/null && break
    kill -0 "$SERVER_PID" 2>/dev/null || die "server exited — see /tmp/bpo-flagship-server.$$.log"
    sleep 1
  done
  curl -fsS -o /dev/null "$BASE_URL/bpo-clients-admin.html" || die "server not reachable at $BASE_URL"
else
  : "${TSM_LOGIN_PASSWORD:?set TSM_LOGIN_PASSWORD to the TSM_ADMIN_PASSWORD of that server}"
  export TSM_LOGIN_PASSWORD
fi

# --- 1. capture (fail-loud) ---------------------------------------------------
say "Capturing BPO frames from $BASE_URL"
node "$DEMO/capture-bpo-flagship.js" || die "capture failed — fix the named step; nothing was registered or published"
N=$(ls "$DEMO/screenshots/bpo-flagship"/*.png 2>/dev/null | wc -l)
[ "$N" -eq 5 ] || die "expected 5 frames, got $N — manifests/bpo.json is keyed to 5 states"

# --- 2. render ----------------------------------------------------------------
say "Rendering flagship"
node "$DEMO/render-from-manifest.js" bpo flagship --burn $NARRATE

SUFFIX=""; [ -n "$NARRATE" ] && SUFFIX="-narrated"
MP4="$DEMO/videos/bpo-flagship$SUFFIX.mp4"
[ -s "$MP4" ] || die "missing $MP4"
ffmpeg -hide_banner -loglevel error -y -i "$MP4" -vf "fps=4,scale=960:-2:flags=lanczos" \
  "$DEMO/screenshots/bpo-flagship-demo.gif"

# --- 3. register (only now that the video exists) ----------------------------
say "Registering bpo in demo-readiness.json"
node - "$DEMO/demo-readiness.json" "$SUFFIX" <<'NODE'
const fs = require('fs');
const [file, suffix] = process.argv.slice(2);
const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
const entry = {
  id: 'bpo',
  spec: 'tests/e2e/demo/capture-bpo-flagship.js',
  manifest: 'tests/e2e/demo/manifests/bpo.json',
  frames: 'tests/e2e/demo/screenshots/bpo-flagship',
  mp4: `tests/e2e/demo/videos/bpo-flagship${suffix}.mp4`,
  gif: 'tests/e2e/demo/screenshots/bpo-flagship-demo.gif',
  engineOutput: 'live-demo-data',
  visualReview: false,
};
const i = reg.experiences.findIndex(e => e.id === 'bpo');
if (i === -1) reg.experiences.push(entry);
else reg.experiences[i] = { ...entry, visualReview: reg.experiences[i].visualReview === true };
fs.writeFileSync(file, JSON.stringify(reg, null, 2) + '\n');
console.log(i === -1 ? 'added bpo' : 'updated bpo (visualReview kept)');
NODE

# --- 4. publish just BPO, keep the other flagships as published --------------
say "Publishing into the Demo Console"
node "$DEMO/publish-flagship.js" --only bpo

# --- 5. verify ------------------------------------------------------------------
say "Verifying"
node "$DEMO/verify-demo-readiness.js" | grep -E "bpo|FAIL" || true
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
console.log(`✓ Demo Console: ${flags.length} flagships published, BPO included, A7 shape checks pass`);
NODE

for f in "$MP4"; do
  printf '  %s  %ss  %s\n' "$(basename "$f")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | xargs printf '%.1f')" \
    "$(du -h "$f" | cut -f1)"
done
cat <<EOF

✓ BPO flagship done. Next:
  1. Watch it: /demo/flagship/bpo-flagship.mp4 (also in the Demo Console flagship list)
  2. If every frame holds up, set "visualReview": true for bpo in demo-readiness.json
  3. Commit: tests/e2e/demo/demo-readiness.json html/demo/flagship/
EOF
