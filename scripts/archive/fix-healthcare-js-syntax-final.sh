#!/usr/bin/env bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=========================================="
echo " TSM HEALTHCARE JS SYNTAX REPAIR v2"
echo "=========================================="

cp "$FILE" "$FILE.backup.$(date +%s)"

echo "[1/5] Extracting scripts"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("html/tsm-doc-search-multi.html").read_text()

blocks = re.findall(
    r"<script[^>]*>(.*?)</script>",
    src,
    flags=re.S
)

Path("/tmp/tsm-doc-search-extracted.js").write_text(
    "\n\n".join(blocks)
)

print("Extracted", len(blocks), "script blocks")
PY


echo "[2/5] Running JS syntax check"

node --check /tmp/tsm-doc-search-extracted.js || {
    echo
    echo "=========================================="
    echo " JS STILL BROKEN"
    echo "=========================================="
    exit 1
}


echo "[3/5] Checking healthcare runtime"

grep -n 'currentVertical' "$FILE" | head -5 || true


echo "[4/5] Checking bad debug injections"

grep -n "TSM HC FINAL\|TSM SEARCH STATE\|FINAL DEBUG" "$FILE" || true


echo "[5/5] Running healthcare DOM smoke test"

HEADLESS=true npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--headed=false


echo "=========================================="
echo " COMPLETE"
echo "=========================================="
