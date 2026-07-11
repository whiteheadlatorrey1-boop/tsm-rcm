const fs = require("fs");

console.log("\nTSM Enterprise Runtime Adapter Expansion\n");

const adapterDir = "html/shared/runtime/adapters";

fs.mkdirSync(adapterDir, {recursive:true});

const adapters = {

mdm:[
"mdm.identity.duplicate",
"mdm.merge.request",
"mdm.quality.issue"
],

healthcare:[
"claim.denial",
"coding.risk",
"payer.exception"
],

construction:[
"project.delay",
"change.order",
"schedule.risk"
],

realestate:[
"property.created",
"title.exception",
"closing.delay",
"loan.condition"
],

insurance:[
"claim.risk",
"fraud.signal",
"underwriting.exception"
],

legal:[
"matter.created",
"document.issue",
"compliance.risk"
],

finops:[
"spend.anomaly",
"vendor.risk",
"cost.optimization"
]

};


for(const [domain,events] of Object.entries(adapters)){

const file =
`${adapterDir}/${domain}-runtime-adapter.js`;

const content = `

window.TSMRuntimeAdapters =
window.TSMRuntimeAdapters || {};

window.TSMRuntimeAdapters["${domain}"] = {

domain:"${domain}",

events:${JSON.stringify(events,null,2)}

};

`;

fs.writeFileSync(file,content.trim()+"\n");

console.log("✓",domain);

}


console.log("\nEnterprise adapter catalog complete");

