#!/usr/bin/env bash
# scripts/demo/check-playwright.sh
#
# Starts `node server.js` on a dedicated test port, waits for it to
# respond, runs the Playwright spec (tests/playwright/demo-warrooms.spec.js)
# against it, then tears the server down. Results land in
# reports/logs/playwright-results.json (read by check-console.sh) and
# reports/screenshots/ (failure screenshots).
#
# Gracefully SKIPS (warn, exit 0) rather than failing the whole
# certification run if Playwright / its browsers aren't installed —
# run `npx playwright install --with-deps chromium` once to enable this
# check. This lets demo-certify.sh still run everything else in
# environments (like a bare CI runner) where the browser can't be
# installed, without masking real failures once it IS installed.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

TEST_PORT="${DEMO_TEST_PORT:-4173}"
export BASE_URL="http://localhost:$TEST_PORT"
SERVER_LOG="$LOG_DIR/server.log"
SERVER_PID=""

section "check-playwright: end-to-end page + console checks"

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
}
trap cleanup EXIT

if [ ! -d "$REPO_ROOT/node_modules/.bin" ] || ! "$REPO_ROOT/node_modules/.bin/playwright" --version >/dev/null 2>&1; then
  warn "Playwright is not installed — run 'npm install -D @playwright/test && npx playwright install --with-deps chromium'"
  warn "Skipping end-to-end checks (page-existence, assets, navigation, runtime, and relay checks still ran)."
  finish_check "check-playwright"
fi

info "starting server on port $TEST_PORT ..."
( cd "$REPO_ROOT" && PORT="$TEST_PORT" node server.js > "$SERVER_LOG" 2>&1 ) &
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

info "server ready, running Playwright spec ..."
if ( cd "$REPO_ROOT" && "$REPO_ROOT/node_modules/.bin/playwright" test -c tests/playwright/playwright.config.js ); then
  pass "all Playwright page checks passed"
else
  fail "one or more Playwright page checks failed — see reports/logs/playwright-results.json and reports/screenshots/"
fi

finish_check "check-playwright"
