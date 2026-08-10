#!/usr/bin/env bash
# run-all-demo-specs.sh
# Runs every tests/e2e/demo/*-demo.spec.js (plus the two hand-named
# non-suffixed ones) sequentially against a running local server, and
# prints a clean per-vertical pass/fail summary at the end. Meant to be
# run once after applying 0006-demo-engine-fail-on-click-failure.patch,
# to get a real, trustworthy verdict on every deck in the presentation
# hub -- not just "no uncaught exception."
#
# Usage (from repo root, server already running on :8080):
#   ./run-all-demo-specs.sh

set -uo pipefail

SPECS=(
  bpo-demo
  construction-cashflow-demo
  construction-demo
  construction-finance-demo
  construction-je-demo
  cyber-incident-demo
  finops-demo
  healthcare-demo
  hotelops-demo
  insurance-demo
  l1-platform-demo
  legal-demo
  mortgage-demo
  music-demo
  noc-demo
  plant-incident-demo
  property-accounting-revenue-cycle
  property-revenue-demo
  rcm-os-demo
  realestate-demo
  schools-demo
  supplier-shutdown-demo
)

PASS=()
FAIL=()

for name in "${SPECS[@]}"; do
  echo ""
  echo "================================================================"
  echo "  Running: ${name}.spec.js"
  echo "================================================================"
  if npx playwright test "tests/e2e/demo/${name}.spec.js"; then
    PASS+=("$name")
  else
    FAIL+=("$name")
  fi
done

echo ""
echo "################################################################"
echo "# SUMMARY"
echo "################################################################"
echo ""
echo "PASSED (${#PASS[@]}):"
for n in "${PASS[@]:-}"; do
  [ -n "$n" ] && echo "  ✓ $n"
done

echo ""
echo "FAILED (${#FAIL[@]}):"
for n in "${FAIL[@]:-}"; do
  [ -n "$n" ] && echo "  ✘ $n"
done

echo ""
if [ "${#FAIL[@]}" -eq 0 ]; then
  echo "All demo specs passed cleanly -- no click failures, no timeouts."
  echo "Screenshots feeding the presentation hub decks can be regenerated"
  echo "with confidence: run generate_pptx.py per vertical as needed."
  exit 0
else
  echo "${#FAIL[@]} spec(s) failed. Check for *-CLICK-FAILED.png files under"
  echo "tests/e2e/demo/screenshots/<vertical>/ and the console diagnostics"
  echo "above (selector, visibility, disabled, coveredBy) for each failure."
  exit 1
fi
