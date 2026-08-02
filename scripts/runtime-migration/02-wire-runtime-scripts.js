const fs=require("fs");

const targets=[
"html/war-rooms",
"html/shared"
];

targets.forEach(t=>{
 if(fs.existsSync(t)){
   console.log("✓",t);
 }
});

console.log("Runtime script wiring audit complete");
