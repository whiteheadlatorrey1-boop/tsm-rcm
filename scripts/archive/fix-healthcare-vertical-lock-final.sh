#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=========================================="
echo " TSM HEALTHCARE VERTICAL LOCK"
echo "=========================================="

cp "$FILE" "$FILE.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

if "TSM HC VERTICAL LOCK" in s:
    print("already installed")
    exit()


patch=r"""

/* TSM HC VERTICAL LOCK */

(function(){

const params =
 new URLSearchParams(
   window.location.search
 );


if(
 params.get("sector")==="healthcare" ||
 params.get("sector")==="hc"
){

 console.log(
  "TSM HC VERTICAL LOCK ACTIVE"
 );


 Object.defineProperty(
   window,
   "TSM_FORCE_VERTICAL",
   {
    value:"hc",
    writable:false
   }
 );


 window.addEventListener(
 "DOMContentLoaded",
 ()=>{

   try {

    currentVertical="hc";

    if(typeof activeClientId!=="undefined"){
       activeClientId="__all__";
    }

    console.log(
     "TSM HC LOCKED",
     currentVertical
    );


   }catch(e){

    console.error(
     "HC LOCK FAILED",
     e
    );

   }

 });

}

})();

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

Path("/tmp/hc-lock-check.js").write_text(
"\n".join(blocks)
)

PY


node --check /tmp/hc-lock-check.js


pkill -f "node server" || true
sleep 2

nohup node server.js >/tmp/tsm-server.log 2>&1 &

sleep 5


./scripts/debug-healthcare-dom-state.sh