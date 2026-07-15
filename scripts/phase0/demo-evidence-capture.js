#!/usr/bin/env node

/**
 * TSM Phase 0 Demo Evidence Capture
 *
 * Generates executive presentation screenshots
 * from validated TSM application paths.
 *
 * Output:
 * reports/demo-evidence/
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.cwd();

const evidenceDir =
    path.join(ROOT,"reports/demo-evidence");


fs.mkdirSync(
    evidenceDir,
    {
        recursive:true
    }
);


console.log(`
=========================================
 TSM DEMO EVIDENCE CAPTURE
=========================================
`);


// --------------------------------------
// Create Playwright Capture Test
// --------------------------------------

const testFile =
"tests/e2e/demo-evidence-capture.spec.js";


const content = `

const {test}=require("@playwright/test");


const pages = [

{
name:"01-intake",
url:"/html/tsm-doc-search-multi.html"
},


{
name:"02-healthcare-war-room",
url:"/html/healthcare/hc-denial-war-room.html"
},


{
name:"03-healthcare-strategist",
url:"/html/healthcare/hc-main-strategist.html"
},


{
name:"04-healthcare-executive",
url:"/html/healthcare/executive-portal.html"
},


{
name:"05-construction-strategist",
url:"/html/construction-suite/construction-strategist.html"
},


{
name:"06-construction-executive",
url:"/html/construction-suite/construction-executive-portal.html"
},


{
name:"07-bpo-war-room",
url:"/html/war-rooms/bpo/bpo-war-room.html"
},


{
name:"08-bpo-executive",
url:"/html/war-rooms/bpo/bpo-executive-portal.html"
},


{
name:"09-mdm-war-room",
url:"/html/war-rooms/mdm/mdm-war-room.html"
},


{
name:"10-mdm-executive",
url:"/html/war-rooms/mdm/mdm-executive-portal.html"
}

];


for(const pageData of pages){


test(
\`Capture \${pageData.name}\`,

async({page})=>{


await page.goto(
pageData.url,
{
waitUntil:"networkidle"
}
);


await page.screenshot({

path:
\`reports/demo-evidence/\${pageData.name}.png\`,

fullPage:true

});


}

);


}

`;



fs.mkdirSync(
path.dirname(
path.join(ROOT,testFile)
),
{
recursive:true
}
);


fs.writeFileSync(
testFile,
content
);


console.log(
"CREATED:",
testFile
);


// --------------------------------------
// Run Capture
// --------------------------------------

console.log(`
Starting Playwright capture...
`);


try{


execSync(

`npx playwright test ${testFile}`,

{
stdio:"inherit"
}

);


}

catch(error){

console.error(
"Capture failed"
);

process.exit(1);

}


// --------------------------------------
// Report
// --------------------------------------

const files =
fs.readdirSync(evidenceDir);


fs.writeFileSync(

"reports/demo-certification.json",

JSON.stringify(

{

status:"READY",

screenshots:
files,

count:
files.length,

timestamp:
new Date().toISOString()

},

null,

2

)

);



console.log(`
=========================================

DEMO EVIDENCE COMPLETE

Screenshots:
${files.length}

Location:
reports/demo-evidence/

Certification:
reports/demo-certification.json

=========================================
`);

