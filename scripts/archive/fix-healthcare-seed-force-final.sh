#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=========================================="
echo " FORCE HEALTHCARE SEED EXECUTION"
echo "=========================================="

cp "$FILE" "$FILE.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

if "TSM FORCE HC SEED" in s:
    print("already installed")
    exit()


patch=r"""

/* TSM FORCE HC SEED */

window.addEventListener("load",()=>{

 console.log("TSM FORCE HC SEED START");


 setTimeout(()=>{

   try {

     currentVertical="hc";
     activeClientId="__all__";


     console.log(
       "BEFORE SEED",
       {
        vertical:currentVertical,
        demoCount:
          typeof DEMO_DOCS !== "undefined"
          ? DEMO_DOCS.length
          : "missing"
       }
     );


     if(typeof seedAllVerticals==="function"){

        seedAllVerticals();

     }
     else if(typeof seedDemoData==="function"){

        seedDemoData();

     }
     else {

        console.error(
          "NO SEED FUNCTION"
        );

     }


     const keys=
       Object.keys(localStorage)
       .filter(k=>k.includes("tsm_doc_index"));


     console.log(
       "AFTER SEED STORAGE",
       keys.map(k=>({
          key:k,
          size:localStorage.getItem(k).length
       }))
     );


     if(typeof runSearch==="function"){
        runSearch();
     }


   }
   catch(e){

      console.error(
        "FORCE SEED ERROR",
        e
      );

   }


 },1000);


});

"""

s += patch

p.write_text(s)

PY


python3 - <<'PY'
from pathlib import Path
import re

s=Path("html/tsm-doc-search-multi.html").read_text()

blocks=re.findall(
r"<script[^>]*>(.*?)</script>",
s,
re.S
)

Path("/tmp/hc-final-check.js").write_text(
"\n".join(blocks)
)

PY

node --check /tmp/hc-final-check.js


pkill -f "node server" || true
sleep 2

nohup node server.js >/tmp/tsm-server.log 2>&1 &

sleep 5


echo "RUN DEBUG"

./scripts/debug-healthcare-dom-state.sh