const fs=require("fs");

const runtime="html/shared/runtime/runtime.js";

if(fs.existsSync(runtime)){
 console.log("✓ runtime.js detected");
 console.log("✓ bootstrap layer already exists");
 process.exit(0);
}

console.log("Runtime bootstrap missing");
process.exit(1);
