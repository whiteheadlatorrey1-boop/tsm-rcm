const fs=require("fs");

console.log("\nTSM Runtime Dependency Check\n");

const required=[
"event-bus.js",
"relay.js",
"rule-registry.js",
"runtime.js",
"index.js"
];

const runtimePath="html/shared/runtime";

let failed=false;

required.forEach(file=>{

const exists=
fs.existsSync(`${runtimePath}/${file}`);

console.log(
exists ? "✓" : "✗",
file
);

if(!exists) failed=true;

});

if(failed){
 process.exit(1);
}

console.log("\nRuntime dependency chain verified");
