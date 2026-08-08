#!/usr/bin/env bash
# fix-missing-demos.sh
# Builds the finops + l1platform demo videos, drops them where the console
# expects them, and pushes — which triggers the existing fly-deploy.yml
# auto-deploy on push to main. Run from the repo root in the Codespace.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

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

echo "==> Capturing finops demo"
TSM_BASE_URL=http://localhost:8080 npx playwright test tests/e2e/demo/finops-demo.spec.js

echo "==> Capturing l1-platform demo"
TSM_BASE_URL=http://localhost:8080 npx playwright test tests/e2e/demo/l1-platform-demo.spec.js

kill "$SERVER_PID" 2>/dev/null || true
trap - EXIT

echo "==> Building videos"
chmod +x tests/e2e/demo/build-video.sh
tests/e2e/demo/build-video.sh finops 3
tests/e2e/demo/build-video.sh l1-platform 3

echo "==> Copying into html/demo/ (renaming l1-platform -> l1platform to match console DATA ids)"
# NOTE: build-video.sh's OUT_MP4 is "$DIR/../${VERTICAL}-demo.mp4" where
# DIR="screenshots/${VERTICAL}" — that ".." only goes up one level, landing
# the output inside screenshots/, not in tests/e2e/demo/ directly.
cp tests/e2e/demo/screenshots/finops-demo.mp4      html/demo/finops-demo.mp4
cp tests/e2e/demo/screenshots/finops-demo.gif       html/demo/finops-demo.gif
cp tests/e2e/demo/screenshots/l1-platform-demo.mp4  html/demo/l1platform-demo.mp4
cp tests/e2e/demo/screenshots/l1-platform-demo.gif  html/demo/l1platform-demo.gif

echo "==> Committing and pushing (triggers Fly auto-deploy)"
git add html/demo/finops-demo.mp4 html/demo/finops-demo.gif \
        html/demo/l1platform-demo.mp4 html/demo/l1platform-demo.gif
git commit -m "feat(demo): add finops + l1platform demo videos to html/demo/

Fixes the two 404s on tsm-demo-console.html — these were built but never
committed under html/demo/, which is the only path express.static + the
Fly auto-deploy actually serve from."
git push origin main

echo "==> Done. Fly deploy will pick this up automatically from the push."
