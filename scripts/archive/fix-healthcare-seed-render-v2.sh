#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=== Healthcare Seed Render Patch v2 ==="

cp "$FILE" "$FILE.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path

p = Path("html/tsm-doc-search-multi.html")
s = p.read_text()

target = "saveIndexForClient(currentVertical, cid, bucket);"

if target not in s:
    raise SystemExit("ERROR: saveIndexForClient line not found")

inject = """
    saveIndexForClient(currentVertical, cid, bucket);
  }

  // TSM E2E demo refresh hook
  try {
    runSearch();
    refreshTotalCount();
  } catch(e) {
    console.warn("Demo refresh skipped", e);
  }

"""

# replace only first occurrence inside seed area
pos = s.find(target)

end = pos + len(target)

before = s[:pos]
after = s[end:]

# avoid duplicate patch
if "TSM E2E demo refresh hook" not in s:
    s = before + inject + after
    p.write_text(s)
    print("Injected render refresh")
else:
    print("Already patched")

PY


echo "Checking injection"

grep -n "TSM E2E demo refresh hook" "$FILE"


echo "Running test"

xvfb-run -a npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--headed
