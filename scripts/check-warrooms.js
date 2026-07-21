const { chromium } = require("playwright");

const pages=[
"/html/war-rooms/war-room-prep.html",
"/html/war-rooms/bpo/bpo-war-room.html"
];

(async()=>{

const browser=await chromium.launch({
 headless:true,
 args:[
 "--disable-gpu",
 "--no-sandbox",
 "--disable-dev-shm-usage"
 ]
});

for(const path of pages){

console.log("\n==============================");
console.log(path);
console.log("==============================");

const page=await browser.newPage();

const errors=[];
const failed=[];


page.on("console",m=>{
 if(m.type()==="error")
   errors.push(m.text());
});


page.on("requestfailed",r=>{
 failed.push(r.url());
});


page.on("response",r=>{
 if(r.status()>=400){
   console.log(
     "BAD RESPONSE:",
     r.status(),
     r.url()
   );
 }
});


try{

const res=await page.goto(
"http://localhost:8080"+path,
{
 waitUntil:"domcontentloaded",
 timeout:60000
}
);

console.log(
"STATUS:",
res.status()
);


await page.waitForTimeout(5000);


console.log(
"HEIGHT:",
await page.evaluate(
()=>document.body.scrollHeight
)
);


console.log(
"NODES:",
await page.evaluate(
()=>document.querySelectorAll("*").length
)
);


}catch(e){

console.log(
"PAGE ERROR:",
e.message
);

}


console.log("Console Errors:",errors);
console.log("Failed Requests:",failed);


await page.close();

}

await browser.close();

})();
