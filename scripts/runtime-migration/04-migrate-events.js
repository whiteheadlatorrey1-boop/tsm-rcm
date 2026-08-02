const fs=require("fs");

if(fs.existsSync("html/shared/runtime/event-bus.js")){
 console.log("✓ Event bus active");
 process.exit(0);
}

process.exit(1);
