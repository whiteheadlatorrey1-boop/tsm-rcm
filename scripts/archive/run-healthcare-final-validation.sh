#!/bin/bash
set -e

echo "================================================"
echo " TSM HEALTHCARE FINAL VALIDATION RUN"
echo "================================================"

ROOT="$(pwd)"
PAGE="html/tsm-doc-search-multi.html"

echo "[1/6] Validate repository"

if [ ! -f "$PAGE" ]; then
  echo "ERROR: Missing $PAGE"
  exit 1
fi


echo "[2/6] Validate JavaScript syntax"

python3 - <<'PY'
from pathlib import Path
import re

html=Path("html/tsm-doc-search-multi.html").read_text()

blocks=re.findall(
    r"<script[^>]*>(.*?)</script>",
    html,
    re.S
)

Path("/tmp/tsm-healthcare-js-check.js").write_text(
    "\n".join(blocks)
)

print("Extracted",len(blocks),"script blocks")
PY

node --check /tmp/tsm-healthcare-js-check.js

echo "JS syntax OK"


echo "[3/6] Ensure server running"

if lsof -i :8080 >/dev/null 2>&1; then
    echo "Server already running on 8080"
else
    echo "Starting TSM server"

    if grep -q '"start"' package.json; then
        npm start > /tmp/tsm-server.log 2>&1 &
    else
        node server.js > /tmp/tsm-server.log 2>&1 &
    fi

    echo "Waiting for port 8080..."

    for i in {1..30}; do
        if lsof -i :8080 >/dev/null 2>&1; then
            echo "Server ready"
            break
        fi
        sleep 1
    done
fi


echo "[4/6] Verify HTTP endpoint"

curl -I \
http://localhost:8080/html/tsm-doc-search-multi.html \
|| {
    echo "Server not responding"
    cat /tmp/tsm-server.log 2>/dev/null || true
    exit 1
}


echo "[5/6] Healthcare DOM diagnostics"

if [ -x scripts/debug-healthcare-dom-state.sh ]; then
    ./scripts/debug-healthcare-dom-state.sh || true
else
    echo "DOM debug script missing"
fi


echo "[6/6] Run healthcare E2E"

npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--reporter=line


echo "================================================"
echo " HEALTHCARE VALIDATION COMPLETE"
echo "================================================"
