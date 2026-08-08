#!/usr/bin/env bash
# build-all-ready-demos.sh
# Builds every vertical demo video that has a real capture spec, copies it
# into html/demo/, commits, and pushes once (triggers Fly auto-deploy).
#
# Skips: noc (no spec/story exists yet), property-revenue (spec is a
# functional KPI test, not a video-capture story — needs to be written
# before it can produce a video).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# id_in_console : spec_file (no .spec.js) : screenshots_dir_arg : video_basename
VERTICALS=(
  "realestate:realestate-demo:realestate:realestate"
  "hotelops:hotelops-demo:hotelops:hotelops"
  "healthcare:healthcare-demo:healthcare:healthcare"
  "construction:construction-demo:construction:construction"
  "bpo:bpo-demo:bpo:bpo"
  "insurance:insurance-demo:insurance:insurance"
  "legal:legal-demo:legal:legal"
  "mortgage:mortgage-demo:mortgage:mortgage"
  "rcm-os:rcm-os-demo:rcm-os:rcm-os"
  "honeywell-cyber:cyber-incident-demo:cyber-incident:cyber-incident"
  "honeywell-plant:plant-incident-demo:plant-incident:plant-incident"
  "honeywell-supplier:supplier-shutdown-demo:supplier-shutdown:supplier-shutdown"
)

echo "==> Installing Playwright Chromium + ffmpeg (skips if already present)"
npx playwright install --with-deps chromium
sudo apt-get update -qq && sudo apt-get install -y ffmpeg

echo "==> Starting TSM server"
node server.js &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  curl -sf http://localhost:8080 >/dev/null && break
  sleep 1
done

FAILED=()
for entry in "${VERTICALS[@]}"; do
  IFS=":" read -r console_id spec_name screenshots_dir video_name <<< "$entry"
  echo ""
  echo "==> [$console_id] Capturing via tests/e2e/demo/${spec_name}.spec.js"
  if ! TSM_BASE_URL=http://localhost:8080 npx playwright test "tests/e2e/demo/${spec_name}.spec.js"; then
    echo "!! [$console_id] capture failed, skipping"
    FAILED+=("$console_id (capture)")
    continue
  fi

  echo "==> [$console_id] Building video"
  if ! tests/e2e/demo/build-video.sh "$screenshots_dir" 3; then
    echo "!! [$console_id] build failed, skipping"
    FAILED+=("$console_id (build)")
    continue
  fi

  # build-video.sh writes to screenshots/<arg>-demo.mp4 (one level up from
  # screenshots/<arg>/, i.e. inside screenshots/ itself) — not tests/e2e/demo/.
  SRC_MP4="tests/e2e/demo/screenshots/${screenshots_dir}-demo.mp4"
  SRC_GIF="tests/e2e/demo/screenshots/${screenshots_dir}-demo.gif"
  cp "$SRC_MP4" "html/demo/${video_name}-demo.mp4"
  cp "$SRC_GIF" "html/demo/${video_name}-demo.gif"
  echo "==> [$console_id] Copied to html/demo/${video_name}-demo.mp4"
done

kill "$SERVER_PID" 2>/dev/null || true
trap - EXIT

echo ""
echo "==> Staging and committing whatever built successfully"
git add html/demo/*.mp4 html/demo/*.gif
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -m "feat(demo): add remaining vertical demo videos to html/demo/

Batch build — see script output above for any verticals that failed
capture or build and were skipped."
  git push origin main
fi

echo ""
if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "==> Done, but these need attention:"
  printf '  - %s\n' "${FAILED[@]}"
else
  echo "==> Done, all 12 built and pushed clean."
fi
echo "==> Still not covered: noc (no spec), property-revenue (needs a real capture spec, not the existing functional test)."