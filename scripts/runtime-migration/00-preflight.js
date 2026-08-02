const fs = require("fs");

const required = [
"html/shared/runtime/runtime.js",
"html/shared/runtime/index.js",
"html/shared/runtime/event-bus.js",
"html/shared/runtime/relay.js",
"html/shared/runtime/rule-registry.js"
];

console.log("\nTSM Runtime Preflight\n");

let failed=false;

required.forEach(file=>{
 if(fs.existsSync(file)){
   console.log("✓",file);
 } else {
   console.log("✗",file);
   failed=true;
 }
});

if(failed){
 process.exit(1);
}

console.log("\nRuntime foundation detected.");
