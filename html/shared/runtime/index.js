document.addEventListener("DOMContentLoaded",()=>{

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
