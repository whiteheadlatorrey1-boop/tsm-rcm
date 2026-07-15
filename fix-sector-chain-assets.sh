#!/usr/bin/env bash
# Fixes discovered by demo-chain-server-audit.js run (2026-07-14):
#   1. 13 files across the 7 sector war-room chains load
#      tsm-runtime-lock.js / tsm-event-contract.js / tsm-autonomy-layer.js
#      via a RELATIVE path (./html/js/...), which only resolves for pages
#      sitting directly in html/. Every nested war room 404s on it.
#      (Same bulk-automation-pass pattern as the stray-<script> bug —
#       137 files repo-wide have this; this script only touches the 13
#       in the sector chains war-room-prep-workflows.spec.js walks.)
#   2. tsm-mission-guide.js is referenced by Insurance/Legal/Real Estate
#      war rooms but doesn't exist anywhere in the repo. Stubbed as a
#      no-op so pages stop 404ing; real implementation still needed.
#
# Run from repo root: bash fix-sector-chain-assets.sh

set -euo pipefail

FILES=(
  html/healthcare/hc-denial-war-room.html
  html/finops-suite/finops-war-room.html
  html/finops-suite/finops-main-strategist.html
  html/finops-suite/finops-executive-portal.html
  html/tsm-insurance/insurance-war-room.html
  html/tsm-insurance/insurance-executive-portal.html
  html/construction-suite/construction-war-room.html
  html/construction-suite/construction-executive-portal.html
  html/legal-pro/legal-war-room.html
  html/legal-pro/legal-executive-portal.html
  html/reo-pro/re-war-room.html
  html/reo-pro/re-exec-portal.html
  html/bpo/bpo-executive-portal.html
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "WARN: $f not found, skipping" >&2
    continue
  fi
  sed -i 's#src="\./html/js/#src="/html/js/#g' "$f"
  echo "fixed: $f"
done

mkdir -p html/js html/tsm-insurance/public/js

STUB='/**
 * TSM Mission Guide — stub
 *
 * The real tsm-mission-guide.js was referenced by Insurance, Legal, and
 * Real Estate war rooms but never existed anywhere in the repo (confirmed
 * via repo-wide search, 2026-07-14). This stub exists only to stop the
 * 404 -> failed script load on those pages. It intentionally does nothing.
 *
 * TODO: implement the real mission-guide panel/logic, or remove the
 * <script> tags referencing this file if the feature was abandoned.
 */
(function (global) {
  '"'"'use strict'"'"';
  if (global.TSMMissionGuide) return;
  global.TSMMissionGuide = {
    __stub: true,
    init: function () { /* no-op */ },
  };
})(typeof window !== '"'"'undefined'"'"' ? window : this);
'

printf '%s' "$STUB" > html/js/tsm-mission-guide.js
printf '%s' "$STUB" > html/tsm-insurance/public/js/tsm-mission-guide.js
echo "stubbed: html/js/tsm-mission-guide.js"
echo "stubbed: html/tsm-insurance/public/js/tsm-mission-guide.js"

echo ""
echo "Done. Verify no relative refs remain in the touched files:"
grep -l 'src="\./html/js/' "${FILES[@]}" 2>/dev/null && echo "  ^ still relative, check manually" || echo "  clean"