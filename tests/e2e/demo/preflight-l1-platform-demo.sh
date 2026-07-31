#!/usr/bin/env bash
# tests/e2e/demo/preflight-l1-platform-demo.sh
#
# Pre-flight sanity check for l1-platform-demo.spec.js.
# Curls each target page and greps for the exact selectors the spec
# depends on, BEFORE spending time on a real Playwright/browser run.
# This catches the recurring "script tag leak" / missing-selector class
# of bugs (unclosed <script>, premature </body></html>, orphaned code)
# with a fast fail and a clear message pointing at which page/selector
# is broken, instead of a generic Playwright timeout.
#
# Usage:
#   TSM_BASE_URL=http://localhost:8080 bash preflight-l1-platform-demo.sh
#
# Exit code 0 = all selectors found, safe to run the real spec.
# Exit code 1 = one or more pages failed a check; details printed.

set -uo pipefail

BASE_URL="${TSM_BASE_URL:-http://localhost:8080}"
FAIL=0

check_page() {
  local path="$1"; shift
  local label="$1"; shift
  local html
  echo "── ${label} (${path}) ──"

  html=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  if [[ "$html" != "200" ]]; then
    echo "  ✗ HTTP ${html} fetching ${path}"
    FAIL=1
    return
  fi
  echo "  ✓ HTTP 200"

  html=$(curl -s "${BASE_URL}${path}")

  # every remaining arg is a selector-ish string we expect to find verbatim
  for needle in "$@"; do
    if grep -qF -- "$needle" <<< "$html"; then
      echo "  ✓ found: $needle"
    else
      echo "  ✗ MISSING: $needle"
      FAIL=1
    fi
  done

  # structural sanity: exactly one opening/closing <script> balance-ish check
  local open_tags close_tags
  open_tags=$(grep -oc '<script' <<< "$html" || true)
  close_tags=$(grep -oc '</script>' <<< "$html" || true)
  if [[ "$open_tags" -ne "$close_tags" ]]; then
    echo "  ✗ SCRIPT TAG MISMATCH: ${open_tags} <script> vs ${close_tags} </script> — likely a leaked/injected patch"
    FAIL=1
  fi

  # structural sanity: page must end with a real </html>
  if ! grep -q '</html>' <<< "$html"; then
    echo "  ✗ MISSING closing </html> tag"
    FAIL=1
  fi

  echo ""
}

echo "Preflight check against ${BASE_URL}"
echo "========================================"
echo ""

check_page "/html/l1-copilot/enterprise-command-center.html" "Stop 1: Enterprise Command Center" \
  'id="l1a-fab"' 'id="l1a-panel"' 'id="l1a-close"'

check_page "/html/l1-copilot/l1-ticket-copilot.html" "Stop 2: L1 Ticket Copilot" \
  'id="tkIncident"' 'data-section="vmware"' 'id="vmwComponent"' \
  'id="vmwCategory"' 'id="vmwEnv"' 'id="btnOpenVmwModule"'

check_page "/html/l1-copilot/vmware-copilot.html" "Stop 3: VMware Copilot" \
  'id="ctxBanner"' 'id="l1a-fab"' 'id="l1a-panel"' 'id="l1a-close"'

# topology.html is intentionally NOT checked here — it's a source snippet
# (no <html>/<body> wrapper) meant to be pasted into another page's
# layout, and it's already embedded in enterprise-command-center.html
# (the "twin-panels" section). It isn't a real standalone stop.

echo "========================================"
if [[ "$FAIL" -eq 0 ]]; then
  echo "✓ All checks passed — safe to run the real spec:"
  echo "  npx playwright test tests/e2e/demo/l1-platform-demo.spec.js"
  exit 0
else
  echo "✗ One or more checks failed — fix the page(s) above before running Playwright."
  echo "  (A Playwright run against a broken page will just time out with a less useful error.)"
  exit 1
fi
