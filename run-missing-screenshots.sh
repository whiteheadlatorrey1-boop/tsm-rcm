#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

for V in bpo insurance mortgage schools; do
  echo "=== $V ==="
  npx playwright test tests/e2e/demo/${V}-demo.spec.js
  ./tests/e2e/demo/build-video.sh $V 3
done

git add tests/e2e/demo/screenshots/bpo tests/e2e/demo/screenshots/insurance \
        tests/e2e/demo/screenshots/mortgage tests/e2e/demo/screenshots/schools \
        tests/e2e/demo/screenshots/schools-demo.mp4 tests/e2e/demo/screenshots/schools-demo.gif
git commit -m "Add missing demo screenshots: bpo, insurance, mortgage, schools"
git push

echo ""
echo "Next: upload schools-demo.mp4 to demos.tsmatter.com (same as the others)."
echo "Once it's live, paste 'schools video is live' back to me and I'll wire the"
echo "console DATA entry with narration + timestamps (schools has 9 shots, so"
echo "9 steps at 3s/slide: t=0,3,6,9,12,15,18,21,24)."
