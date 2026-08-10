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
RATE_LIMITED=()

for spec in "${SPECS[@]}"; do
  spec_file="tests/e2e/demo/${spec}.spec.js"
  if [ ! -f "$spec_file" ]; then
    echo "SKIP  $spec  (spec file not found: $spec_file)"
    FAIL+=("$spec :: spec file missing")
    continue
  fi

  # Each demo-engine spec writes to its own screenshots/<name> dir, and that
  # <name> is NOT a fixed transform of the spec filename (legal-demo ->
  # 'legal', rcm-os-demo -> 'rcm-os', construction-cashflow-demo ->
  # 'construction-cashflow', etc). Pull it straight from the spec file so
  # CLICK-FAILED detection is scoped to THIS spec only — a prior version of
  # this script searched the whole screenshots/ tree and double-counted
  # earlier specs' failures onto every later spec in the run.
  shot_subdir=$(grep -oE "screenshots'\s*,\s*'[^']+'" "$spec_file" | sed -E "s/screenshots'\s*,\s*'([^']+)'/\1/" | head -1)

  # Some specs (e.g. property-accounting-revenue-cycle) are plain Playwright
  # tests, not demo-engine/runStory-based — they have no outDir and no
  # CLICK-FAILED concept. Skip that check for those, run everything else.
  uses_demo_engine=0
  grep -q "demo-engine" "$spec_file" && uses_demo_engine=1

  # Snapshot screenshot count BEFORE this run, scoped to this spec's own dir,
  # so we only count failures THIS run produced, not leftovers from earlier
  # sweeps sitting in the same directory.
  before_count=0
  if [ $uses_demo_engine -eq 1 ] && [ -n "$shot_subdir" ]; then
    shot_dir="tests/e2e/demo/screenshots/${shot_subdir}"
    before_count=$(find "$shot_dir" -iname "*-CLICK-FAILED.png" 2>/dev/null | wc -l)
  fi

  log_file="${LOG_DIR}/${spec}.log"
  echo "=== Running $spec ==="
  TSM_BASE_URL="$BASE_URL" npx playwright test "$spec_file" --reporter=list > "$log_file" 2>&1
  pw_exit=$?

  # Real failure signal, independent of Playwright's own exit code:
  bad=0
  rate_limited=0
  reasons=()

  # Check for Groq/server rate-limit responses FIRST and separately — this
  # is expected, budget-driven noise (shared org account, TPM ~8000/min,
  # TPD ~200000/day), not a real bug. Flag it distinctly so it doesn't get
  # triaged like a genuine regression.
  if grep -q "429\|Rate limit exceeded\|AI rate limit exceeded\|rate_limit_exceeded" "$log_file"; then
    rate_limited=1
    reasons+=("Groq/API rate limit hit — re-run later, not a code bug")
  fi

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

  # CLICK-FAILED screenshots newly created by THIS run, in THIS spec's own dir.
  if [ $uses_demo_engine -eq 1 ] && [ -n "$shot_subdir" ]; then
    shot_dir="tests/e2e/demo/screenshots/${shot_subdir}"
    after_count=$(find "$shot_dir" -iname "*-CLICK-FAILED.png" 2>/dev/null | wc -l)
    new_hits=$(( after_count - before_count ))
    if [ "$new_hits" -gt 0 ]; then
      bad=1
      reasons+=("$new_hits new CLICK-FAILED screenshot(s) in $shot_dir")
    fi
  fi

  if [ $bad -eq 0 ] && [ $rate_limited -eq 0 ]; then
    echo "CLEAN $spec"
    PASS+=("$spec")
  elif [ $rate_limited -eq 1 ] && [ $bad -eq 0 ]; then
    echo "RATE-LIMITED $spec :: re-run once token budget resets  (see $log_file)"
    RATE_LIMITED+=("$spec")
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
echo "Rate-limited, not a bug — re-run later (${#RATE_LIMITED[@]}):"
for s in "${RATE_LIMITED[@]}"; do echo "  RETRY $s"; done
echo
echo "Needs fixing (${#FAIL[@]}):"
for s in "${FAIL[@]}"; do echo "  FAIL  $s"; done
echo
echo "Full logs in ./${LOG_DIR}/ — read the FAIL ones step-by-step, not just the summary line."
