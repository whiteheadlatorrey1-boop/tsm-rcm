const fs = require("fs");
const path = require("path");

console.log(`
============================================================
TSM Runtime Enterprise Command Center Installation
============================================================
`);

const ROOT = process.cwd();

const files = {

"html/shared/runtime/command-center/dashboard-engine.js": `
window.TSMCommandDashboard = {

build(){

return {

health:
window.TSMTwinHealth ?
window.TSMTwinHealth.calculate() :
null,

missions:
window.TSMMissionStore ?
window.TSMMissionStore.list() :
[],

timestamp:
new Date().toISOString()

};

}

};
`,

"html/shared/runtime/command-center/kpi-engine.js": `
window.TSMKPIEngine = {

calculate(){

return {

enterprise_health:
window.TSMTwinHealth ?
window.TSMTwinHealth.calculate().health :
0,

missions:
window.TSMMissionStore ?
window.TSMMissionStore.items.length :
0,

timestamp:
new Date().toISOString()

};

}

};
`,

"html/shared/runtime/command-center/risk-board.js": `
window.TSMRiskBoard = {

generate(){

return {

risks:
window.TSMRuntimeHealth || {},

timestamp:
new Date().toISOString()

};

}

};
`,

"html/shared/runtime/command-center/executive-summary.js": `
window.TSMExecutiveSummary = {

generate(){

return {

status:"READY",

summary:
"Enterprise command intelligence active",

timestamp:
new Date().toISOString()

};

}

};
`,

"html/shared/runtime/command-center/command-feed.js": `
window.TSMCommandFeed = {

events:[],

push(event){

this.events.push({

timestamp:
new Date().toISOString(),

event

});

}

};
`,

"html/shared/runtime/command-center/alert-center.js": `
window.TSMAlertCenter = {

alerts:[],

create(alert){

this.alerts.push({

timestamp:
new Date().toISOString(),

alert

});

}

};
`
};


const dir =
path.join(
ROOT,
"html/shared/runtime/command-center"
);

fs.mkdirSync(dir,{recursive:true});

console.log("✓ html/shared/runtime/command-center");


Object.entries(files).forEach(([file,data])=>{

const target = path.join(ROOT,file);

if(!fs.existsSync(target)){

fs.writeFileSync(
target,
data.trim()
);

}

console.log("✓",file);

});


console.log(`
Enterprise Command Center Layer Complete
`);
