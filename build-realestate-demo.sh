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

# 1. Apply fixes — each one is checked and applied independently, so an
#    already-applied fix (e.g. from a previous run reusing this same folder)
#    can never block the others from applying.

EXEC_PORTAL="html/war-rooms/re-war/re-exec-portal.html"
STORY_JSON="demo/realestate-demo.json"
SPEC_JS="tests/e2e/demo/realestate-demo.spec.js"

# Fix 1: empty-string selector breaking nukeAssistant()
if grep -q "^      '',\$" "$EXEC_PORTAL"; then
  echo "[fix 1/3] Removing empty selector from nukeAssistant() in $EXEC_PORTAL"
  sed -i "\%^      '',\$%d" "$EXEC_PORTAL"
else
  echo "[fix 1/3] Already applied, skipping."
fi

# Fix 2: compliance-sweep selector was targeting a nonexistent <button>;
# the real control is div.quick-link
if grep -qF "button[onclick*=\\\"quickFire('Run a compliance sweep\\\"]" "$STORY_JSON"; then
  echo "[fix 2/3] Fixing compliance-sweep selector in $STORY_JSON"
  sed -i "s/button\[onclick\*=\\\\\"quickFire('Run a compliance sweep\\\\\"\]/div.quick-link[onclick*=\\\\\"quickFire('Run a compliance sweep\\\\\"]/" "$STORY_JSON"
else
  echo "[fix 2/3] Already applied, skipping."
fi

# Fix 3: disable the undocumented strategist auto-escalation timer that
# races the manual "Full Strategic Brief" click
if ! grep -q "tsm_auto_mode" "$SPEC_JS"; then
  echo "[fix 3/3] Adding auto-chain guard to $SPEC_JS"
  python3 - "$SPEC_JS" <<'PYEOF'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
marker = "  test.setTimeout(120_000);\n"
guard = marker + (
    "\n"
    "  // The strategist page has an undocumented auto-escalation timer that fires\n"
    "  // 1800ms after load and jumps straight to the Exec Portal unless this flag\n"
    "  // is set. Without it, the manual \"Full Strategic Brief\" click races the\n"
    "  // auto-chain and the recording skips the brief step entirely.\n"
    "  await page.addInitScript(() => {\n"
    "    localStorage.setItem('tsm_auto_mode', 'off');\n"
    "  });\n"
)
if marker in content and "tsm_auto_mode" not in content:
    content = content.replace(marker, guard, 1)
    with open(path, "w") as f:
        f.write(content)
PYEOF
else
  echo "[fix 3/3] Already applied, skipping."
fi

echo
echo "Verifying fixes actually landed..."
grep -qF "div.quick-link[onclick*=" "$STORY_JSON" || { echo "FIX 2 FAILED TO APPLY — aborting."; exit 1; }
grep -qF "tsm_auto_mode" "$SPEC_JS" || { echo "FIX 3 FAILED TO APPLY — aborting."; exit 1; }
if grep -q "^      '',\$" "$EXEC_PORTAL"; then
  echo "FIX 1 FAILED TO APPLY — aborting."
  exit 1
fi
echo "All fixes confirmed present."
echo

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