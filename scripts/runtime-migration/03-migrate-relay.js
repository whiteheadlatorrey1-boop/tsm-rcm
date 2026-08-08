const fs=require("fs");

if(fs.existsSync("html/shared/runtime/relay.js")){
 console.log("✓ Enterprise relay active");
 process.exit(0);
}

process.exit(1);
