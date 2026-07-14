#!/bin/bash
set -e

echo "=========================================="
echo " TSM HEALTHCARE JS OBJECT REPAIR"
echo "=========================================="

FILE="html/tsm-doc-search-multi.html"

cp "$FILE" "$FILE.bak-js-object-$(date +%s)"

python3 - <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

bad="""
  
 vertical:currentVertical,
 client:activeClientId,
 total:loadIndex().length,
 docs:loadIndex().map(d=>d.fileName)
});
"""

if bad in s:
    s=s.replace(
bad,
"""
"""
    )
    print("Removed corrupted debug object")
else:
    print("Corrupted object not found")

p.write_text(s)
PY


echo "[1] Syntax extraction"

python3 - <<'PY'
from pathlib import Path
import re

html=Path("html/tsm-doc-search-multi.html").read_text()

scripts=re.findall(
    r"<script[^>]*>(.*?)</script>",
    html,
    re.S
)

Path("/tmp/tsm-doc-search-check.js").write_text(
    "\n".join(scripts)
)

print("Extracted",len(scripts),"blocks")
PY


echo "[2] Node syntax check"

node --check /tmp/tsm-doc-search-check.js

echo "=========================================="
echo " JS REPAIR SUCCESS"
echo "=========================================="
