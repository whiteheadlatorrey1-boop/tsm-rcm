#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=== Fix Healthcare Demo Client Scope ==="

cp "$FILE" "$FILE.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

old = """
  const forThisVertical = DEMO_DOCS.filter(d => d.verticals.includes(currentVertical));
"""

new = """
  // Force demo client visibility
  activeClientId = "__all__";

  const forThisVertical = DEMO_DOCS.filter(d => d.verticals.includes(currentVertical));
"""

if old in s:
    s=s.replace(old,new,1)
    print("Injected active client override")
else:
    print("Pattern not found")

p.write_text(s)
PY


echo "Running healthcare test"

xvfb-run -a npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--headed