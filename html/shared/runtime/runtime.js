(function(global){

const Runtime={

version:"1.0.0",

events:global.TSMEventBus,

relay:global.TSMRelay,

rules:global.TSMRuleRegistry,

start(opts){

console.log("TSM Runtime Started",opts);

}

};

global.TSMRuntime=Runtime;

})(window);
