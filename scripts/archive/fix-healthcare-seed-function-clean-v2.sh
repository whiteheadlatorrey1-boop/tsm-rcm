#!/bin/bash

set -e

FILE="html/tsm-doc-search-multi.html"

echo "=========================================="
echo " CLEAN HEALTHCARE SEED FUNCTION REPAIR v2"
echo "=========================================="

cp "$FILE" "$FILE.backup.$(date +%s)"


python3 <<'PY'
from pathlib import Path
import re

p=Path("html/tsm-doc-search-multi.html")
html=p.read_text()


start = html.find("function seedDemoData")

if start == -1:
    raise SystemExit("seedDemoData not found")


end = html.find("function seedAllVerticals", start)

if end == -1:
    raise SystemExit("seedAllVerticals boundary not found")


print("Replacing chars", start, end)


replacement=r'''
function seedDemoData() {

  console.log("TSM HC CLEAN SEED START");

  currentVertical="hc";
  activeClientId="__all__";

  const now = Date.now();

  const docs = DEMO_DOCS.filter(
      d => d.verticals.includes("hc")
  );


  const index = docs.map((doc,i)=>({

      id: doc.id + "-" + now + "-" + i,

      fileName: doc.fileName,

      documentType: doc.documentType,

      vendor: doc.vendor,

      amount: doc.amount,

      timestamp: now-i,

      tags: doc.tags || [],

      _ext:{
        client:"__all__",
        tags:doc.tags || []
      }

  }));


  localStorage.setItem(
      "tsm_doc_index_hc",
      JSON.stringify(index)
  );


  console.log(
      "TSM HC CLEAN SEEDED",
      index.length,
      index.map(x=>x.fileName)
  );


  if(typeof runSearch === "function"){
      runSearch();
  }


  if(typeof refreshTotalCount === "function"){
      refreshTotalCount();
  }

}


'''

html = html[:start] + replacement + html[end:]

p.write_text(html)

PY


echo "[1] Extracting scripts"

python3 <<'PY'
from pathlib import Path
import re

html=Path("html/tsm-doc-search-multi.html").read_text()

scripts=re.findall(
r"<script[^>]*>(.*?)</script>",
html,
re.S
)

Path("/tmp/hc-check.js").write_text("\n".join(scripts))

print("Extracted",len(scripts),"blocks")
PY


echo "[2] JS syntax"

node --check /tmp/hc-check.js


echo "[3] Restart server"

pkill -f "node.*server" || true

nohup node server.js >/tmp/tsm-server.log 2>&1 &

sleep 5


echo "[4] Healthcare test"

npx playwright test tests/e2e/healthcare-denial-10-phase-demo.spec.js --reporter=line

