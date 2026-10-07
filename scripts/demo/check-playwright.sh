#!/usr/bin/env bash
# scripts/demo/check-playwright.sh
#
# Playwright certification.
#
# Default:
#   Starts the local server on DEMO_TEST_PORT and tests localhost.
#
# Deployed mode:
#   DEMO_BASE_URL=https://tsm-shell.fly.dev
#   Tests the deployed runtime directly and does not start a local server.
#
# Results:
#   reports/logs/playwright-results.json
#   reports/screenshots/

set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

TEST_PORT="${DEMO_TEST_PORT:-4173}"
DEPLOYED_BASE_URL="${DEMO_BASE_URL:-}"
SERVER_LOG="$LOG_DIR/server.log"
SERVER_PID=""

section "check-playwright: end-to-end page + console checks"

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

if [ ! -d "$REPO_ROOT/node_modules/.bin" ] || \
   ! "$REPO_ROOT/node_modules/.bin/playwright" --version >/dev/null 2>&1; then
  warn "Playwright is not installed — run 'npm install -D @playwright/test && npx playwright install --with-deps chromium'"
  warn "Skipping end-to-end checks (page-existence, assets, navigation, runtime, and relay checks still ran)."
  finish_check "check-playwright"
fi

if [ -n "$DEPLOYED_BASE_URL" ]; then
  export BASE_URL="${DEPLOYED_BASE_URL%/}"
  info "deployed mode: $BASE_URL"
else
  export BASE_URL="http://localhost:$TEST_PORT"

  info "starting local server on port $TEST_PORT ..."
  (
    cd "$REPO_ROOT" &&
    PORT="$TEST_PORT" node server.js > "$SERVER_LOG" 2>&1
  ) &
  SERVER_PID=$!

  ready=0
  for _ in $(seq 1 30); do
    if curl -sf "http://localhost:$TEST_PORT/" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done

  if [ "$ready" -ne 1 ]; then
    fail "server never became ready on port $TEST_PORT — see $SERVER_LOG"
    finish_check "check-playwright"
  fi

  info "local server ready"
fi

info "running Playwright against $BASE_URL ..."

if (
  cd "$REPO_ROOT" &&
  BASE_URL="$BASE_URL" \
  TSM_BASE_URL="$BASE_URL" \
  "$REPO_ROOT/node_modules/.bin/playwright" \
    test -c tests/playwright/playwright.config.js
); then
  pass "all Playwright page checks passed"
else
  fail "one or more Playwright page checks failed — see reports/logs/playwright-results.json and reports/screenshots/"
fi

finish_check "check-playwright"
