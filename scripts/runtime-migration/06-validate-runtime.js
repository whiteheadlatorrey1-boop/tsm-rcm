const fs=require("fs");

const report={
 runtime:"Enterprise Runtime V1",
 timestamp:new Date().toISOString(),
 components:{
  runtime:fs.existsSync("html/shared/runtime/runtime.js"),
  events:fs.existsSync("html/shared/runtime/event-bus.js"),
  relay:fs.existsSync("html/shared/runtime/relay.js"),
  rules:fs.existsSync("html/shared/runtime/rule-registry.js")
 }
};

fs.writeFileSync(
"runtime-validation-report.json",
JSON.stringify(report,null,2)
);

console.log(report);
console.log("\nRuntime Validation Complete");
