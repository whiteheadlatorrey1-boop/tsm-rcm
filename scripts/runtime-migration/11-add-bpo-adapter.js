const fs = require("fs");

console.log("\nTSM BPO Runtime Adapter Installation\n");

const adapterPath =
"html/shared/runtime/adapters/bpo-runtime-adapter.js";

const adapter = `

window.TSMRuntimeAdapters =
window.TSMRuntimeAdapters || {};

window.TSMRuntimeAdapters["bpo"] = {

domain:"bpo",

events:[

"client.intake",
"document.received",
"processing.started",
"processing.completed",
"quality.exception",
"sla.breach",
"delivery.completed",
"invoice.ready"

]

};

`;

fs.writeFileSync(adapterPath, adapter.trim() + "\n");

console.log("✓ bpo-runtime-adapter.js created");


// update runtime validation report if present
const report =
"runtime-validation-report.json";

if(fs.existsSync(report)){

const data = JSON.parse(
fs.readFileSync(report,"utf8")
);

data.adapters =
data.adapters || [];

if(!data.adapters.includes("bpo")){
    data.adapters.push("bpo");
}

fs.writeFileSync(
report,
JSON.stringify(data,null,2)
);

console.log("✓ Runtime validation updated");

}

console.log("\nBPO Runtime Adapter Complete\n");
