#!/usr/bin/env bash
set -e

echo "=== Healthcare DOM Runtime Debug ==="

ROOT="$(pwd)"

cat > "$ROOT/hc-dom-debug.js" <<'JS'
const { chromium } = require('@playwright/test');

(async()=>{

const browser = await chromium.launch({
  headless:true
});

const page = await browser.newPage();

page.on('console', msg=>{
 console.log("BROWSER:", msg.text());
});

page.on('pageerror', err=>{
 console.log("PAGE ERROR:", err.message);
});


await page.goto(
'http://localhost:8080/html/tsm-doc-search-multi.html',
{
 waitUntil:'networkidle'
}
);


await page.waitForTimeout(3000);


const state = await page.evaluate(()=>{

return {

url: location.href,

vertical: window.currentVertical,

client: window.activeClientId,

storage:Object.keys(localStorage)
.filter(k=>k.includes("tsm_doc_index"))
.map(k=>{

let value=[];

try{
 value=JSON.parse(localStorage[k])
 .map(x=>x.fileName);
}catch(e){}

return {
 key:k,
 docs:value
};

}),


documentHasFile:
document.body.innerText.includes(
"Denial_CLM-HC-7731_Aetna.pdf"
),


results:
document.querySelector("#results-container")
?.innerText || "NO RESULTS CONTAINER"

};

});


console.log(
JSON.stringify(state,null,2)
);


await browser.close();

})();
JS


NODE_PATH="$ROOT/node_modules" node "$ROOT/hc-dom-debug.js"

rm "$ROOT/hc-dom-debug.js"

