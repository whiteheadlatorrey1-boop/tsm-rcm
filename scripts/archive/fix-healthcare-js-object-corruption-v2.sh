#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=========================================="
echo " TSM HEALTHCARE JS OBJECT REPAIR v2"
echo "=========================================="

cp "$FILE" "$FILE.bak-corruption-v2-$(date +%s)"

python3 - <<'PY'
from pathlib import Path
import re

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

pattern=r"""
\s*vertical:currentVertical,
\s*client:activeClientId,
\s*total:loadIndex\(\)\.length,
\s*docs:loadIndex\(\)\.map\(d=>d\.fileName\)
\s*\}\);
"""

m=re.search(pattern,s)

if m:
    s=s[:m.start()]+"\n"+s[m.end():]
    print("Removed orphan debug object")
else:
    print("Exact corruption not found")

p.write_text(s)

PY


echo "[1] Rebuilding JS extraction"

python3 - <<'PY'
from pathlib import Path
import re

html=Path("html/tsm-doc-search-multi.html").read_text()

blocks=re.findall(
    r"<script[^>]*>(.*?)</script>",
    html,
    re.S
)

Path("/tmp/tsm-doc-search-check.js").write_text(
    "\n".join(blocks)
)

print("Extracted",len(blocks),"script blocks")
PY


echo "[2] Syntax validation"

node --check /tmp/tsm-doc-search-check.js

echo "=========================================="
echo " HEALTHCARE JS SYNTAX CLEAN"
echo "=========================================="
