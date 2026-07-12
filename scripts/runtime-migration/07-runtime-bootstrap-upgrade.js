const fs = require("fs");

const target = "html/shared/runtime/index.js";
const backup = "html/shared/runtime/index.js.runtime-v1-backup";

console.log("\nTSM Runtime Bootstrap Upgrade\n");

if (!fs.existsSync(target)) {
    console.error("Missing runtime index.js");
    process.exit(1);
}

const current = fs.readFileSync(target, "utf8");

if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, current);
    console.log("✓ Created backup:", backup);
}

const upgraded = `document.addEventListener("DOMContentLoaded",()=>{

console.log("Loading Enterprise Runtime");

const required=[
    "TSMEventBus",
    "TSMRelay",
    "TSMRuleRegistry",
    "TSMRuntime"
];

const missing=required.filter(
    key=>!window[key]
);

if(missing.length){

    console.error(
        "Enterprise Runtime Missing Components:",
        missing
    );

    window.TSMRuntimeHealth={
        status:"FAILED",
        missing
    };

    return;
}

window.TSMRuntime.start({

    source:"runtime-bootstrap",
    version:window.TSMRuntime.version,
    timestamp:new Date().toISOString()

});


window.TSMRuntimeHealth={

    status:"READY",

    runtime:
        window.TSMRuntime.version,

    components:{
        events:true,
        relay:true,
        rules:true
    },

    timestamp:
        new Date().toISOString()

};


console.log(
    "Enterprise Runtime",
    window.TSMRuntime.version,
    "READY"
);

});
`;

fs.writeFileSync(target, upgraded);

console.log("✓ Runtime bootstrap upgraded");
console.log("✓ Runtime health added");
console.log("✓ Existing index.js preserved");
