#!/usr/bin/env bash
# Run this in an environment with real network access (your Codespace, or
# any machine that isn't locked to a restricted egress allowlist).
#
# What it does:
#   1. Applies the nukeAssistant() empty-selector fix to re-exec-portal.html
#      (skips cleanly if already applied)
#   2. Installs deps + a real Playwright Chromium
#   3. Starts the local TSM server
#   4. Runs the realestate-demo Playwright spec to capture screenshots
#   5. Stitches them into realestate-demo.mp4 / .gif via build-video.sh
set -euo pipefail

REPO_DIR="${1:-tsm-rcm}"

if [ ! -d "$REPO_DIR" ]; then
  git clone https://github.com/whiteheadlatorrey1-boop/tsm-rcm.git "$REPO_DIR"
fi
cd "$REPO_DIR"

# 1. Apply the fix (idempotent — no-op if already applied)
if grep -q "^      '',$" html/war-rooms/re-war/re-exec-portal.html 2>/dev/null; then
  echo "Applying nukeAssistant() empty-selector fix..."
  git apply --check ../fix-nukeAssistant-empty-selector.patch 2>/dev/null \
    && git apply ../fix-nukeAssistant-empty-selector.patch \
    || sed -i "/^      '',$/d" html/war-rooms/re-war/re-exec-portal.html
else
  echo "Fix already present, skipping."
fi

# 2. Install deps + real browser binary
npm install
npx playwright install chromium --with-deps

# 3. Start the server in the background
node server.js &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 2

# 4. Run the demo spec (captures numbered screenshots)
TSM_BASE_URL=http://localhost:8080 \
  npx playwright test tests/e2e/demo/realestate-demo.spec.js

# 5. Build the mp4/gif from the captured frames
chmod +x tests/e2e/demo/build-video.sh
tests/e2e/demo/build-video.sh realestate 3

echo
echo "Done. Output:"
echo "  tests/e2e/demo/realestate-demo.mp4"
echo "  tests/e2e/demo/realestate-demo.gif"