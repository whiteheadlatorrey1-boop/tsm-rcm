#!/bin/bash
set -e

echo "=== TSM Healthcare Runtime Vertical Repair ==="

FILE="html/tsm-doc-search-multi.html"

if [ ! -f "$FILE" ]; then
  echo "ERROR: Missing $FILE"
  exit 1
fi

echo "[1/6] Backup document search page"

cp "$FILE" "$FILE.backup.$(date +%s)"

echo "[2/6] Force healthcare runtime default"

python3 <<'PY'
from pathlib import Path

p = Path("html/tsm-doc-search-multi.html")
s = p.read_text()

old = 'let currentVertical = "fo";'
new = 'let currentVertical = "hc";'

if old in s:
    s = s.replace(old,new,1)
    print("Changed currentVertical fo -> hc")
else:
    print("currentVertical already changed or pattern not found")

p.write_text(s)
PY


echo "[3/6] Repair healthcare seed runtime assignment"

python3 <<'PY'
from pathlib import Path

p = Path("html/tsm-doc-search-multi.html")
s = p.read_text()

s = s.replace(
"window.currentVertical='hc';",
"currentVertical='hc';"
)

s = s.replace(
'window.currentVertical = "hc";',
'currentVertical = "hc";'
)

p.write_text(s)

print("Seed runtime assignment repaired")
PY


echo "[4/6] Confirm source changes"

grep -n "currentVertical" "$FILE" | head -20


echo "[5/6] Verify healthcare seed in browser"

cat > scripts/.verify-healthcare-runtime.js <<'EOF'
const { chromium } = require("playwright");

(async()=>{

const browser = await chromium.launch({
  headless:true
});

const page = await browser.newPage();

await page.goto(
  "http://localhost:8080/html/tsm-doc-search-multi.html",
  {waitUntil:"networkidle"}
);

const result = await page.evaluate(()=>{

  currentVertical = "hc";

  if(typeof seedDemoData === "function"){
      seedDemoData();
  }

  if(typeof runSearch === "function"){
      runSearch();
  }

  return {
    vertical: currentVertical,
    docs: loadIndex().map(d=>d.fileName),
    storageKeys:Object.keys(localStorage)
      .filter(k=>k.includes("tsm_doc_index"))
  };

});


console.log(JSON.stringify(result,null,2));

await browser.close();

})();
EOF


NODE_PATH=$(npm root) node scripts/.verify-healthcare-runtime.js


echo "[6/6] Run healthcare Playwright demo"

xvfb-run -a npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--headed


rm -f scripts/.verify-healthcare-runtime.js

echo "=== Healthcare Runtime Repair Complete ==="