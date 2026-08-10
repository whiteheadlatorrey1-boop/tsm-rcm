#!/usr/bin/env bash
# run-bpo-demo-with-retry.sh
# Wraps `npx playwright test tests/e2e/demo/bpo-demo.spec.js` with a
# pre-flight Groq quota check (via groq-quota-check.sh) and automatic
# retry, so a transient rate limit doesn't need a manual "wait and
# re-run by hand" loop.
#
# This is specifically for the token-per-day (TPD) rate limit case,
# not for genuine test/app bugs -- if the spec fails for any other
# reason it will NOT retry, it will just report the failure once, so
# a real bug doesn't get masked by silent retries.
#
# Usage (from repo root, server already running on :8080):
#   ./scripts/run-bpo-demo-with-retry.sh
#
# Env overrides:
#   MAX_WAIT_SECONDS=1800   # give up waiting for quota after this long (default 30 min)
#   POLL_INTERVAL=30        # seconds between quota checks while waiting (default 30s)

set -uo pipefail

MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-1800}"
POLL_INTERVAL="${POLL_INTERVAL:-30}"
SPEC="tests/e2e/demo/bpo-demo.spec.js"

echo "=========================================="
echo "BPO demo — quota-aware run"
echo "=========================================="

waited=0
while true; do
  ./scripts/groq-quota-check.sh
  status=$?

  if [ "$status" -eq 0 ]; then
    echo ""
    echo "Quota looks OK — running $SPEC"
    break
  elif [ "$status" -eq 1 ]; then
    if [ "$waited" -ge "$MAX_WAIT_SECONDS" ]; then
      echo ""
      echo "Still rate-limited after ${MAX_WAIT_SECONDS}s of waiting. Giving up -- run again later or check https://console.groq.com/settings/billing for the actual daily reset time."
      exit 1
    fi
    echo ""
    echo "Rate-limited. Waiting ${POLL_INTERVAL}s before checking again... (${waited}s / ${MAX_WAIT_SECONDS}s elapsed)"
    sleep "$POLL_INTERVAL"
    waited=$((waited + POLL_INTERVAL))
  else
    echo ""
    echo "Quota check failed for a reason other than rate limiting (see output above) -- not retrying, since this may be a real config/auth problem, not a transient one."
    exit 2
  fi
done

npx playwright test "$SPEC"
exit $?
