const fs=require("fs");

if(fs.existsSync("html/shared/runtime/rule-registry.js")){
 console.log("✓ Rule registry active");
 process.exit(0);
}

process.exit(1);
