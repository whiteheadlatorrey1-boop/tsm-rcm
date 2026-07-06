#!/usr/bin/env bash
# scripts/demo/demo-certify.sh
#
# Master runner for the demo certification suite. Runs every check-*.sh
# in order, captures each one's pass/fail/warn tally, and writes a final
# readiness report to reports/demo-readiness.txt.
#
# Usage:
#   bash scripts/demo/demo-certify.sh              # run everything
#   bash scripts/demo/demo-certify.sh --skip-e2e   # skip check-playwright/check-console
#
# Exit code is non-zero if any check reported a FAIL. WARN never fails
# the run but is always shown in the summary.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SKIP_E2E=0
for arg in "$@"; do
  case "$arg" in
    --skip-e2e) SKIP_E2E=1 ;;
  esac
done

CHECKS=(check-pages check-assets check-navigation check-runtime check-relays)
if [ "$SKIP_E2E" -eq 0 ]; then
  CHECKS+=(check-playwright check-console)
fi

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_WARN=0
declare -a RESULT_LINES

echo "${C_BOLD}TSM-Consultz Demo Certification Suite${C_RESET}"
echo "Run started: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "Repo: $REPO_ROOT"

for check in "${CHECKS[@]}"; do
  echo ""
  echo "${C_BOLD}#### Running $check.sh ####${C_RESET}"
  out="$(bash "./$check.sh" 2>&1)"
  status=$?
  echo "$out"

  summary_line="$(echo "$out" | grep -E "^SUMMARY\[$check\]" | tail -1)"
  p="$(echo "$summary_line" | grep -oE 'pass=[0-9]+' | cut -d= -f2)"
  f="$(echo "$summary_line" | grep -oE 'fail=[0-9]+' | cut -d= -f2)"
  w="$(echo "$summary_line" | grep -oE 'warn=[0-9]+' | cut -d= -f2)"
  p="${p:-0}"; f="${f:-0}"; w="${w:-0}"

  TOTAL_PASS=$((TOTAL_PASS + p))
  TOTAL_FAIL=$((TOTAL_FAIL + f))
  TOTAL_WARN=$((TOTAL_WARN + w))

  if [ "$status" -eq 0 ]; then
    RESULT_LINES+=("$check: OK  (pass=$p fail=$f warn=$w)")
  else
    RESULT_LINES+=("$check: FAILED  (pass=$p fail=$f warn=$w)")
  fi
done

echo ""
echo "${C_BOLD}== Demo Certification Summary ==${C_RESET}"
for line in "${RESULT_LINES[@]}"; do
  case "$line" in
    *FAILED*) echo "  ${C_RED}✗${C_RESET} $line" ;;
    *) echo "  ${C_GREEN}✓${C_RESET} $line" ;;
  esac
done
echo ""
echo "  TOTAL: pass=$TOTAL_PASS fail=$TOTAL_FAIL warn=$TOTAL_WARN"

{
  echo "TSM-Consultz Demo Readiness Report"
  echo "Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo ""
  for line in "${RESULT_LINES[@]}"; do echo "$line"; done
  echo ""
  echo "TOTAL: pass=$TOTAL_PASS fail=$TOTAL_FAIL warn=$TOTAL_WARN"
  echo ""
  if [ "$TOTAL_FAIL" -eq 0 ]; then
    echo "READY: no blocking failures found."
  else
    echo "NOT READY: $TOTAL_FAIL failure(s) must be fixed before the demo."
  fi
} > "$READINESS_FILE"

echo ""
echo "Full report written to: $READINESS_FILE"

if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo "${C_RED}${C_BOLD}NOT READY — $TOTAL_FAIL failure(s).${C_RESET}"
  exit 1
else
  echo "${C_GREEN}${C_BOLD}READY.${C_RESET}"
  exit 0
fi
