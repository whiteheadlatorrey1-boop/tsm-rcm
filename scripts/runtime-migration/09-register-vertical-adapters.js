const fs = require("fs");

console.log("\nTSM Vertical Runtime Adapter Registration\n");

const adapterDir = "html/shared/runtime/adapters";

fs.mkdirSync(adapterDir, { recursive:true });

const domains = {
    mdm:[
        "mdm.identity.duplicate",
        "mdm.merge.request",
        "mdm.quality.issue"
    ],

    healthcare:[
        "claim.denial",
        "coding.risk",
        "payer.exception"
    ],

    construction:[
        "project.delay",
        "change.order",
        "schedule.risk"
    ],

    realestate:[
        "property.created",
        "title.exception",
        "closing.delay",
        "loan.condition"
    ],

    insurance:[
        "claim.risk",
        "fraud.signal",
        "underwriting.exception"
    ],

    legal:[
        "matter.created",
        "document.issue",
        "compliance.risk"
    ],

    finops:[
        "spend.anomaly",
        "vendor.risk",
        "cost.optimization"
    ]
};


for (const [domain,events] of Object.entries(domains)) {

const file =
`${adapterDir}/${domain}-runtime-adapter.js`;

const content = `window.TSMRuntimeAdapters =
window.TSMRuntimeAdapters || {};

window.TSMRuntimeAdapters["${domain}"] = {

 domain:"${domain}",

 events:${JSON.stringify(events,null,2)}

};
`;

fs.writeFileSync(file,content);

console.log("✓",file);

}


const registry = `

(function(global){

const Registry={

version:"1.0.0",

adapters:{},

register(adapter){

this.adapters[adapter.domain]=adapter;

},

health(){

return {

status:"READY",

domains:Object.keys(this.adapters)

};

}

};

global.TSMAdapterRegistry=Registry;

})(window);

`;

fs.writeFileSync(
"html/shared/runtime/adapter-registry.js",
registry.trim()+"\n"
);

console.log("\nAdapter registry complete");

