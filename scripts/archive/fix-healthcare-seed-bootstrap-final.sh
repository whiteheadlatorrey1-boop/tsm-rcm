#!/bin/bash
set -e

echo "=========================================="
echo " TSM HEALTHCARE SEED BOOTSTRAP FINAL FIX"
echo "=========================================="

FILE="html/tsm-doc-search-multi.html"

cp "$FILE" "$FILE.backup.$(date +%s)"

echo "[1/5] Inject healthcare auto bootstrap"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")

html=p.read_text()

marker="/* TSM HC BOOTSTRAP */"

if marker in html:
    print("Bootstrap already installed")
    raise SystemExit


patch=r"""

/* TSM HC BOOTSTRAP */

window.addEventListener("DOMContentLoaded",()=>{

  console.log("TSM HC BOOTSTRAP START");

  try {

    if(typeof currentVertical !== "undefined"){
        currentVertical="hc";
    }

    if(typeof activeClientId !== "undefined"){
        activeClientId="__all__";
    }


    setTimeout(()=>{

      console.log("TSM HC SEED EXECUTE");

      if(typeof seedDemoData==="function"){
          seedDemoData();
      }

      else if(typeof seedAllVerticals==="function"){
          seedAllVerticals();
      }


      if(typeof runSearch==="function"){
          runSearch();
      }


      if(typeof refreshTotalCount==="function"){
          refreshTotalCount();
      }


      console.log("TSM HC STORAGE CHECK",
      Object.keys(localStorage)
      .filter(k=>k.includes("tsm_doc_index_hc"))
      );


    },500);


  }catch(e){

      console.error(
        "TSM HC BOOT ERROR",
        e
      );

  }

});

"""

html += patch

p.write_text(html)

PY


echo "[2/5] Validate syntax"

python3 <<'PY'
from pathlib import Path
import re

html=Path("html/tsm-doc-search-multi.html").read_text()

scripts=re.findall(
r"<script[^>]*>(.*?)</script>",
html,
re.S
)

Path("/tmp/hc-check.js").write_text(
"\n".join(scripts)
)

print("Extracted",len(scripts),"blocks")

PY


node --check /tmp/hc-check.js


echo "[3/5] Restart server"

pkill -f "node server" || true

sleep 2

nohup node server.js >/tmp/tsm-server.log 2>&1 &


echo "[4/5] Wait"

sleep 5


echo "[5/5] Run healthcare test"

npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js