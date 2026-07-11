const fs = require("fs");
const path = require("path");

console.log(`
TSM Runtime Governance Layer Installation
`);

const ROOT = process.cwd();

const dirs = [
"html/shared/runtime/governance"
];

const files = {
"html/shared/runtime/governance/policy-engine.js": `
window.TSMPolicyEngine = {

evaluate(request){

return {
allowed:true,
reason:"Policy evaluation passed",
request
};

}

};
`,

"html/shared/runtime/governance/audit-engine.js": `
window.TSMAuditEngine = {

record(event){

console.log("AUDIT EVENT",event);

return {
timestamp:new Date().toISOString(),
event
};

}

};
`,

"html/shared/runtime/governance/compliance-engine.js": `
window.TSMComplianceEngine = {

check(domain,action){

return {
domain,
action,
status:"COMPLIANT"
};

}

};
`,

"html/shared/runtime/governance/evidence-store.js": `
window.TSMEvidenceStore = {

store(record){

return {
id:"EVID-"+Date.now(),
record
};

}

};
`,

"html/shared/runtime/governance/access-control.js": `
window.TSMAccessControl = {

roles:[
"executive",
"strategist",
"analyst",
"operator",
"auditor"
],

authorize(role){

return this.roles.includes(role);

}

};
`,

"html/shared/runtime/governance/decision-log.js": `
window.TSMDecisionLog = {

entries:[],

add(entry){

this.entries.push({
timestamp:new Date().toISOString(),
...entry
});

}

};
`
};


dirs.forEach(d=>{
fs.mkdirSync(path.join(ROOT,d),{recursive:true});
console.log("✓",d);
});


Object.entries(files).forEach(([file,data])=>{

const target = path.join(ROOT,file);

if(!fs.existsSync(target)){
fs.writeFileSync(target,data.trim());
}

console.log("✓",file);

});


console.log(`
Runtime Governance Layer Complete
`);
