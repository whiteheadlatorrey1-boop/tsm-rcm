#!/usr/bin/env bash
# scripts/demo/check-console.sh
#
# Reads reports/logs/console-errors.json (written by
# tests/playwright/demo-warrooms.spec.js during check-playwright.sh) and
# reports any browser console.error() output or uncaught page errors per
# page. This is a separate step from check-playwright.sh so console
# noise can be reviewed/triaged independently of pass/fail navigation
# results — a page can pass navigation and still be worth a WARN here.
#
# Console errors are reported as WARN, not FAIL, by default: many are
# known third-party noise (analytics, font loaders, etc.). Uncaught
# page errors (pageErrors) ARE hard failures, since those indicate a
# script actually crashed.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

ARTIFACT="$LOG_DIR/console-errors.json"

section "check-console: browser console output"

if [ ! -f "$ARTIFACT" ]; then
  warn "no $ARTIFACT found — run check-playwright.sh first (or it was skipped because Playwright isn't installed)"
  finish_check "check-console"
fi

if ! command -v node >/dev/null 2>&1; then
  warn "node not available to parse $ARTIFACT — skipping"
  finish_check "check-console"
fi

# Use node (already a project dependency) instead of jq to avoid adding
# a new tool requirement just for this check.
while IFS= read -r line; do
  case "$line" in
    PASS_LINE*) pass "${line#PASS_LINE }" ;;
    WARN_LINE*) warn "${line#WARN_LINE }" ;;
    FAIL_LINE*) fail "${line#FAIL_LINE }" ;;
  esac
done < <(node --input-type=commonjs -e '
  const data = require(process.argv[1]);
  for (const [label, entry] of Object.entries(data)) {
    if (entry.navigationError) {
      console.log("FAIL_LINE " + label + ": navigation error - " + entry.navigationError);
      continue;
    }
    const pageErrors = entry.pageErrors || [];
    const consoleErrors = entry.consoleErrors || [];
    if (pageErrors.length > 0) {
      console.log("FAIL_LINE " + label + ": " + pageErrors.length + " uncaught page error(s): " + pageErrors.slice(0,3).join(" | "));
    } else if (consoleErrors.length > 0) {
      console.log("WARN_LINE " + label + ": " + consoleErrors.length + " console error(s): " + consoleErrors.slice(0,3).join(" | "));
    } else {
      console.log("PASS_LINE " + label + ": clean console");
    }
  }
' "$ARTIFACT")

finish_check "check-console"
