#!/usr/bin/env bash
# prod-ready-sweep.sh
# Run in the Codespace (has Chromium + network path — this sandbox does not).
#
# Runs every demo spec, then greps each run's captured console log for the
# exact signal strings demo-engine.js emits on a silently-swallowed failure
# (click errors, waitFor/waitForFunction timeouts, apiLogin/apiPost failures,
# page console errors) plus any *-CLICK-FAILED.png screenshot artifacts.
# A Playwright "1 passed" can still contain every one of these — this script
# is what actually tells you if a run is clean.
#
# Usage:
#   chmod +x prod-ready-sweep.sh
#   ./prod-ready-sweep.sh
#
# Requires server running at $TSM_BASE_URL (default http://localhost:8080).
# Start it first: node server.js &

set -uo pipefail

BASE_URL="${TSM_BASE_URL:-http://localhost:8080}"
LOG_DIR="prod-ready-logs"
mkdir -p "$LOG_DIR"

# All specs to clear except finops (already confirmed clean 2026-08-07).
SPECS=(
  realestate-demo
  hotelops-demo
  healthcare-demo
  l1-platform-demo
  construction-demo
  construction-cashflow-demo
  construction-finance-demo
  construction-je-demo
  bpo-demo
  insurance-demo
  legal-demo
  mortgage-demo
  rcm-os-demo
  property-revenue-demo
  property-accounting-revenue-cycle
  schools-demo
  noc-demo
  cyber-incident-demo
  plant-incident-demo
  supplier-shutdown-demo
  music-demo
)

PASS=()
FAIL=()

for spec in "${SPECS[@]}"; do
  spec_file="tests/e2e/demo/${spec}.spec.js"
  if [ ! -f "$spec_file" ]; then
    echo "SKIP  $spec  (spec file not found: $spec_file)"
    FAIL+=("$spec :: spec file missing")
    continue
  fi

  log_file="${LOG_DIR}/${spec}.log"
  echo "=== Running $spec ==="
  TSM_BASE_URL="$BASE_URL" npx playwright test "$spec_file" --reporter=list > "$log_file" 2>&1
  pw_exit=$?

  # Real failure signal, independent of Playwright's own exit code:
  bad=0
  reasons=()

  if [ $pw_exit -ne 0 ]; then
    bad=1
    reasons+=("playwright exit $pw_exit")
  fi

  if grep -q "\[demo-engine\] click .* FAILED" "$log_file"; then
    bad=1
    reasons+=("click failure")
  fi
  if grep -q "\[demo-engine\].*apiLogin FAILED\|\[demo-engine\].*apiLogin threw" "$log_file"; then
    bad=1
    reasons+=("apiLogin failure")
  fi
  if grep -q "\[demo-engine\].*apiPost FAILED\|\[demo-engine\].*apiPost threw" "$log_file"; then
    bad=1
    reasons+=("apiPost failure")
  fi
  if grep -q "\[demo-engine\] waitFor .* timed out\|\[demo-engine\] waitForFunction .* timed out" "$log_file"; then
    bad=1
    reasons+=("waitFor/waitForFunction timeout")
  fi
  if grep -q "\[page console error\]" "$log_file"; then
    bad=1
    reasons+=("browser console error")
  fi
  if grep -q "is not https://" "$log_file"; then
    bad=1
    reasons+=("insecure baseURL — session cookie silently dropped")
  fi

  # Any -CLICK-FAILED.png captured for this spec's screenshot dir
  shot_hits=$(find tests/e2e/demo/screenshots -iname "*-CLICK-FAILED.png" -newer "$spec_file" 2>/dev/null | wc -l)
  if [ "$shot_hits" -gt 0 ]; then
    bad=1
    reasons+=("$shot_hits CLICK-FAILED screenshot(s) captured")
  fi

  if [ $bad -eq 0 ]; then
    echo "CLEAN $spec"
    PASS+=("$spec")
  else
    echo "FAIL  $spec :: ${reasons[*]}  (see $log_file)"
    FAIL+=("$spec :: ${reasons[*]}")
  fi
  echo
done

echo "=========================================="
echo "PROD-READY SWEEP RESULT"
echo "=========================================="
echo "Clean (${#PASS[@]}):"
for s in "${PASS[@]}"; do echo "  OK    $s"; done
echo
echo "Needs fixing (${#FAIL[@]}):"
for s in "${FAIL[@]}"; do echo "  FAIL  $s"; done
echo
echo "Full logs in ./${LOG_DIR}/ — read the FAIL ones step-by-step, not just the summary line."
