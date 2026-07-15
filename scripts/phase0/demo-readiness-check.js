#!/usr/bin/env node

/**
 * TSM Phase 0 Demo Readiness Check
 *
 * Final presentation gate:
 * - Server availability
 * - Intake validation
 * - Vertical pages
 * - Executive portals
 * - Playwright certification
 * - Evidence package
 */

const fs = require("fs");
const http = require("http");
const { execSync } = require("child_process");


const BASE =
"http://localhost:8080";


let results = [];


function pass(name,detail=""){

results.push({
name,
status:"PASS",
detail
});

console.log(
`✓ ${name}`
);

}


function fail(name,detail=""){

results.push({
name,
status:"FAIL",
detail
});

console.log(
`✗ ${name}`,
detail
);

}


function checkFile(file,label){

if(fs.existsSync(file)){

pass(label,file);

}

else{

fail(label,file);

}

}


function checkURL(path,label){

return new Promise(resolve=>{


http.get(

BASE + path,

res=>{


if(res.statusCode===200){

pass(
label,
`${path} (${res.statusCode})`
);

}

else{

fail(
label,
`${path} (${res.statusCode})`
);

}


resolve();

}

)
.on(
"error",
err=>{

fail(
label,
err.message
);

resolve();

});


});


}



async function main(){


console.log(`
====================================
 TSM DEMO READINESS CHECK
====================================
`);


// Server

await checkURL(
"/html/tsm-doc-search-multi.html",
"Universal Intake"
);


// Healthcare

await checkURL(
"/html/healthcare/hc-denial-war-room.html",
"Healthcare War Room"
);


await checkURL(
"/html/healthcare/hc-main-strategist.html",
"Healthcare Strategist"
);


await checkURL(
"/html/healthcare/executive-portal.html",
"Healthcare Executive Portal"
);


// Construction

await checkURL(
"/html/construction-suite/construction-strategist.html",
"Construction Strategist"
);


await checkURL(
"/html/construction-suite/construction-executive-portal.html",
"Construction Executive Portal"
);


// BPO

await checkURL(
"/html/war-rooms/bpo/bpo-war-room.html",
"BPO War Room"
);


await checkURL(
"/html/war-rooms/bpo/bpo-executive-portal.html",
"BPO Executive Portal"
);


// MDM

await checkURL(
"/html/war-rooms/mdm/mdm-war-room.html",
"MDM War Room"
);


await checkURL(
"/html/war-rooms/mdm/mdm-executive-portal.html",
"MDM Executive Portal"
);


// Evidence

const evidence =
"reports/demo-certification.json";


if(fs.existsSync(evidence)){


const report =
JSON.parse(
fs.readFileSync(evidence)
);


if(report.status==="READY"){

pass(
"Demo Evidence Certification",
"READY"
);

}

else{

fail(
"Demo Evidence Certification",
report.status
);

}


}
else{

fail(
"Demo Evidence Certification",
"Missing report"
);

}


// Screenshot count

const screenshotDir =
"reports/demo-evidence";


if(fs.existsSync(screenshotDir)){


const count =
fs.readdirSync(screenshotDir)
.filter(
x=>x.endsWith(".png")
)
.length;


if(count>=10){

pass(
"Evidence Screenshots",
`${count} captured`
);

}

else{

fail(
"Evidence Screenshots",
`${count} found`
);

}


}
else{

fail(
"Evidence Screenshots",
"Directory missing"
);

}


// Package

checkFile(
"demo-package/README.md",
"Demo Package"
);


// Summary

console.log(`

====================================
 SUMMARY
====================================

Checks:
${results.length}

Passed:
${results.filter(x=>x.status==="PASS").length}

Failed:
${results.filter(x=>x.status==="FAIL").length}

`);


const failed =
results.filter(
x=>x.status==="FAIL"
);


if(failed.length){

console.log(
"STATUS: NOT READY"
);

process.exit(1);

}


console.log(
`
STATUS:
READY FOR EXECUTIVE DEMO
`
);


}


main();