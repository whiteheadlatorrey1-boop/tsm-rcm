const { chromium } = require("playwright");

(async()=>{

const browser = await chromium.launch({
  headless:true
});

const page = await browser.newPage();

page.on('console', msg => {
  console.log("PAGE:", msg.text());
});

await page.goto(
  "http://localhost:8080/html/tsm-doc-search-multi.html"
);

await page.waitForTimeout(1000);

await page.click("#seed-btn");

await page.waitForTimeout(2000);

const state = await page.evaluate(()=>{

return {

currentVertical:
 typeof currentVertical !== "undefined"
 ? currentVertical
 : "missing",

activeClientId:
 typeof activeClientId !== "undefined"
 ? activeClientId
 : "missing",

clients:
 typeof getClientRegistry==="function"
 ? getClientRegistry()
 : "missing",

storage:
 Object.keys(localStorage)
 .filter(k=>k.includes("tsm"))
 .map(k=>({
   key:k,
   size:localStorage[k].length
 })),

loaded:
 typeof loadIndex==="function"
 ? loadIndex().map(d=>d.fileName)
 : "missing"

};

});

console.log(JSON.stringify(state,null,2));

await browser.close();

})();
