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
