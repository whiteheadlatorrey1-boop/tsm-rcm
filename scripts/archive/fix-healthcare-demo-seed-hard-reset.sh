#!/bin/bash

set -e

FILE="html/tsm-doc-search-multi.html"

echo "=========================================="
echo " TSM HEALTHCARE DEMO SEED HARD RESET"
echo "=========================================="

cp "$FILE" "$FILE.backup.$(date +%s)"

python3 <<'PY'
from pathlib import Path
import re

p=Path("html/tsm-doc-search-multi.html")
html=p.read_text()

# 1. Force healthcare startup
html=re.sub(
r'let currentVertical\s*=\s*".*?";',
'let currentVertical = "hc";',
html
)

# 2. Force demo client
html=re.sub(
r'let activeClientId\s*=\s*.*?;',
'let activeClientId = "__all__";',
html
)


# 3. Replace seedDemoData beginning
pattern=r'function seedDemoData\(\) \{'

inject=r'''
function seedDemoData() {

  console.log("TSM HC FORCE SEED START");

  currentVertical="hc";
  activeClientId="__all__";

  const now=Date.now();

  const docs = DEMO_DOCS.filter(
    d=>d.verticals.includes("hc")
  );

  const index=[];

  docs.forEach((doc,i)=>{

    index.push({
      id:doc.id+"-"+now+"-"+i,
      fileName:doc.fileName,
      documentType:doc.documentType,
      vendor:doc.vendor,
      amount:doc.amount,
      timestamp:now,
      _ext:{
        client:"__all__",
        tags:doc.tags||[]
      },
      tags:doc.tags||[]
    });

  });


  localStorage.setItem(
    "tsm_doc_index_hc",
    JSON.stringify(index)
  );


  console.log(
    "TSM HC FORCE SEEDED",
    index.length,
    index.map(x=>x.fileName)
  );


  if(typeof runSearch==="function"){
     runSearch();
  }

  if(typeof refreshTotalCount==="function"){
     refreshTotalCount();
  }

}


'''

html=re.sub(pattern,inject,html,count=1)


# 4 Add auto seed after page load
marker="</body>"

hook="""

<script>
window.addEventListener("load",()=>{

 setTimeout(()=>{

   if(window.location.search.includes("sector=healthcare")){
       console.log("TSM HC AUTO BOOTSTRAP");
       seedDemoData();
   }

 },500);

});
</script>

"""

html=html.replace(marker,hook+marker)

p.write_text(html)

PY


echo "[1] Syntax check"

python3 - <<'PY'
from pathlib import Path
import re

html=Path("html/tsm-doc-search-multi.html").read_text()
scripts=re.findall(r"<script[^>]*>(.*?)</script>",html,re.S)
Path("/tmp/hc-check.js").write_text("\n".join(scripts))
PY

node --check /tmp/hc-check.js


echo "[2] Restart server"

pkill -f "node.*server" || true

nohup node server.js >/tmp/tsm-server.log 2>&1 &

sleep 5


echo "[3] Run healthcare test"

npx playwright test tests/e2e/healthcare-denial-10-phase-demo.spec.js --reporter=line


echo "DONE"

