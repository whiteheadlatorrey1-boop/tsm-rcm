#!/usr/bin/env bash
set -euo pipefail

echo "Resolving demo/realestate-demo.json ..."
cat > demo/realestate-demo.json <<'EOF'
{
  "vertical": "realestate",
  "note": "Source-verified 2026-08-02 against whiteheadlatorrey1-boop/tsm-rcm (html/war-rooms/re-war/re-war-room.html + re-strategist.html + re-exec-portal.html) by reading real ids/onclick handlers/functions directly -- NOT live-verified via Playwright (this sandbox hits the same chrome-headless-shell 403 as the Codespace). escalateToStrategist() in re-war-room.html hard-blocks with an alert() if no analysis has run yet, so a quick-fire engine click and its output must come first. Run once in Codespaces and correct any selector drift before treating as final.",
  "steps": [
    { "shot": "001-war-room-load", "goto": "/html/war-rooms/re-war/re-war-room.html", "waitMs": 1500 },

    { "shot": "002-quick-fire-compliance", "click": "div.quick-link[onclick*=\"quickFire('Run a compliance sweep\"]", "waitFor": "#feedBody", "waitMs": 3500 },

    { "shot": "003-feed-output", "waitFor": "#feedMeta", "waitMs": 500 },

    { "shot": "004-escalate-to-strategist", "click": "button.tb-btn.escalate[onclick=\"escalateToStrategist()\"]", "waitMs": 2000 },

    { "shot": "005-strategist-load", "waitFor": "#panel-brief", "waitMs": 800 },

    { "shot": "006-run-full-brief", "click": "button[onclick=\"runFullBrief()\"]", "waitFor": "#briefBody", "waitMs": 4000 },

    { "shot": "007-brief-metrics", "waitFor": "#brief-pipeline", "waitMs": 600 },

    { "shot": "008-escalate-to-exec", "click": "button.tb-btn.escalate[onclick=\"escalateToExec()\"]", "waitMs": 2000 },

    { "shot": "009-exec-portal-kpis", "waitFor": "#kpi-pipeline", "waitMs": 800 },

    { "shot": "010-exec-explainability", "waitFor": ".tsmk-explain", "waitMs": 600 }
  ]
}
EOF

echo "Resolving tests/e2e/demo/realestate-demo.spec.js ..."
cat > tests/e2e/demo/realestate-demo.spec.js <<'EOF'
const { test } = require('@playwright/test');
const path = require('path');
const { runStory, loadStory } = require('../../../demo/demo-engine');

// Point this at your running TSM server (Codespace forwarded port or localhost).
const BASE_URL = process.env.TSM_BASE_URL || 'http://localhost:8080';

test('Real Estate executive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  test.setTimeout(120_000);

  page.on('dialog', async (dialog) => {
    console.warn(`[demo-engine] unexpected ${dialog.type()} on ${page.url()}: "${dialog.message()}"`);
    await dialog.dismiss();
  });

  // The strategist page has an undocumented auto-escalation timer that fires
  // 1800ms after load and jumps straight to the Exec Portal unless this flag
  // is set. Without it, the manual "Full Strategic Brief" click races the
  // auto-chain and the recording skips the brief step entirely.
  await page.addInitScript(() => {
    localStorage.setItem('tsm_auto_mode', 'off');
  });

  const story = loadStory(path.join(__dirname, '../../../demo/realestate-demo.json'));
  const outDir = path.join(__dirname, 'screenshots', 'realestate');

  await runStory(page, {
    steps: story.steps,
    outDir,
    baseURL: BASE_URL,
  });
});
EOF

echo "Validating JSON syntax ..."
node -e "JSON.parse(require('fs').readFileSync('demo/realestate-demo.json','utf8')); console.log('JSON OK')"

echo "Checking for leftover conflict markers ..."
if grep -rn '^<<<<<<<\|^=======$\|^>>>>>>>' demo/realestate-demo.json tests/e2e/demo/realestate-demo.spec.js; then
  echo "ERROR: conflict markers still present, aborting." >&2
  exit 1
fi
echo "No conflict markers left. Clean."

git add demo/realestate-demo.json tests/e2e/demo/realestate-demo.spec.js

echo "Continuing rebase ..."
GIT_EDITOR=true git rebase --continue

echo "Done. Current state:"
git status
git log --oneline -8
