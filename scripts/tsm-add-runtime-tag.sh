#!/usr/bin/env bash
# TSM RUNTIME ROLLOUT — Phase 1 (additive only)
#
# Inserts a single line before </body> on each target demo page:
#   <script src="/html/core/tsm-runtime.js"></script>
# Does NOT touch, remove, or reorder any existing <script> tags.
#
# Safety:
#   - Skips a file if it already contains tsm-runtime.js
#   - Writes a .bak copy of every file it touches (once), so `git diff`
#     and manual revert are both trivial
#   - DRY RUN by default. Pass --apply to actually write changes.
#
# Usage:
#   ./scripts/tsm-add-runtime-tag.sh            # dry run, shows what would change
#   ./scripts/tsm-add-runtime-tag.sh --apply    # actually inserts the tag

set -euo pipefail
cd "$(dirname "$0")/.."

APPLY=false
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=true
fi

TAG='  <script src="/html/core/tsm-runtime.js"></script>'

# Exact page list — the demo surface as confirmed:
#   7 legacy verticals (war-room, strategist, executive-portal)
#   10 /html/war-rooms/ verticals (war-room, strategist, executive-portal)
#   career training platform, war-room-prep.html
PAGES=(
  # --- legacy verticals ---
  html/healthcare/hc-denial-war-room.html
  html/healthcare/hc-main-strategist.html
  html/healthcare/executive-portal.html
  html/finops-suite/finops-war-room.html
  html/finops-suite/finops-main-strategist.html
  html/finops-suite/finops-executive-portal.html
  html/tsm-insurance/insurance-war-room.html
  html/tsm-insurance/insurance-strategist.html
  html/tsm-insurance/insurance-executive-portal.html
  html/construction-suite/construction-war-room.html
  html/construction-suite/construction-strategist.html
  html/construction-suite/construction-executive-portal.html
  html/legal-pro/legal-war-room.html
  html/legal-pro/legal-main-strategist.html
  html/legal-pro/legal-executive-portal.html
  html/reo-pro/re-war-room.html
  html/reo-pro/re-strategist.html
  html/reo-pro/re-exec-portal.html
  html/bpo/bpo-situation-room.html
  html/bpo/bpo-strategist-v2.html
  html/bpo/bpo-executive-portal.html
  # --- /html/war-rooms/ verticals ---
  html/war-rooms/approval/approval-war-room.html
  html/war-rooms/approval/approval-strategist.html
  html/war-rooms/approval/approval-executive-portal.html
  html/war-rooms/bpo/bpo-war-room.html
  html/war-rooms/bpo/bpo-strategist.html
  html/war-rooms/bpo/bpo-executive-portal.html
  html/war-rooms/catalog/catalog-war-room.html
  html/war-rooms/catalog/catalog-strategist.html
  html/war-rooms/catalog/catalog-executive-portal.html
  html/war-rooms/cpq/cpq-war-room.html
  html/war-rooms/cpq/cpq-strategist.html
  html/war-rooms/cpq/cpq-executive-portal.html
  html/war-rooms/crm/crm-war-room.html
  html/war-rooms/crm/crm-strategist.html
  html/war-rooms/crm/crm-executive-portal.html
  html/war-rooms/digital-twin/digital-twin.html
  html/war-rooms/digital-twin/digital-twin-strategist.html
  html/war-rooms/digital-twin/digital-twin-executive-portal.html
  html/war-rooms/governance/governance-war-room.html
  html/war-rooms/governance/governance-strategist.html
  html/war-rooms/governance/governance-executive-portal.html
  html/war-rooms/integration-hub/integration-hub.html
  html/war-rooms/integration-hub/integration-hub-strategist.html
  html/war-rooms/integration-hub/integration-hub-executive-portal.html
  html/war-rooms/mdm/mdm-war-room.html
  html/war-rooms/mdm/mdm-strategist.html
  html/war-rooms/mdm/mdm-executive-portal.html
  html/war-rooms/o2c/o2c-war-room.html
  html/war-rooms/o2c/o2c-strategist.html
  html/war-rooms/o2c/o2c-executive-portal.html
  # --- misc ---
  html/war-rooms/war-room-prep.html
  html/tsm-career-training-platform.html
)

CHANGED=0
SKIPPED_MISSING=0
SKIPPED_ALREADY=0

for page in "${PAGES[@]}"; do
  if [[ ! -f "$page" ]]; then
    echo "MISSING   $page"
    SKIPPED_MISSING=$((SKIPPED_MISSING+1))
    continue
  fi
  if grep -q 'tsm-runtime.js' "$page"; then
    echo "ALREADY   $page"
    SKIPPED_ALREADY=$((SKIPPED_ALREADY+1))
    continue
  fi
  if ! grep -qi '</body>' "$page"; then
    echo "NO </body> tag found, skipping   $page"
    continue
  fi

  if $APPLY; then
    cp "$page" "$page.bak"
    # Insert tag on the line immediately before the first </body> (case-insensitive)
    awk -v tag="$TAG" '
      BEGIN{done=0}
      {
        if (!done && tolower($0) ~ /<\/body>/) { print tag; done=1 }
        print
      }
    ' "$page.bak" > "$page"
    echo "APPLIED   $page  (backup: $page.bak)"
  else
    echo "WOULD ADD $page"
  fi
  CHANGED=$((CHANGED+1))
done

echo ""
echo "----------------------------------------"
if $APPLY; then
  echo "Applied to:   $CHANGED files"
else
  echo "Would apply to: $CHANGED files  (dry run — rerun with --apply)"
fi
echo "Already had it: $SKIPPED_ALREADY"
echo "Missing/not found: $SKIPPED_MISSING"