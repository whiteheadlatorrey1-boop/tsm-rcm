#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=== Fix Healthcare Seed Render Refresh ==="

cp "$FILE" "$FILE.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

needle="""
    saveIndexForClient(currentVertical, cid, bucket);
  }
}
"""

replacement="""
    saveIndexForClient(currentVertical, cid, bucket);
  }

  // Force UI refresh after demo seed
  if (typeof runSearch === "function") {
      runSearch();
  }

  if (typeof refreshTotalCount === "function") {
      refreshTotalCount();
  }

}
"""

if needle in s:
    s=s.replace(needle,replacement,1)
    print("Seed refresh injected")
else:
    print("Seed block pattern not found")

p.write_text(s)
PY


echo "Running healthcare test"

xvfb-run -a npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--headed