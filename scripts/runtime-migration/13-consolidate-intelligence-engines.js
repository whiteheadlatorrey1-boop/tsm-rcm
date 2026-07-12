const fs=require("fs");
const path=require("path");

console.log("\nTSM Runtime Intelligence Consolidation\n");

const removals=[
"html/shared/runtime/mission/engine.js",
"html/shared/runtime/quality/engine.js"
];


removals.forEach(file=>{

if(fs.existsSync(file)){

fs.unlinkSync(file);

console.log("✓ Removed duplicate:",file);

}

});


const checks=[
"html/shared/runtime/mission/mission-engine.js",
"html/shared/runtime/mission/mission-store.js",
"html/shared/runtime/mission/mission-router.js",
"html/shared/runtime/quality/quality-engine.js",
"html/shared/runtime/intelligence/exception-engine.js",
"html/shared/runtime/intelligence/cross-domain-engine.js",
"html/shared/runtime/intelligence/cross-mesh.js"
];


checks.forEach(file=>{

if(fs.existsSync(file)){

console.log("✓ Canonical:",file);

}
else{

console.error("Missing:",file);

}

});


console.log("\nRuntime intelligence namespace consolidated\n");
