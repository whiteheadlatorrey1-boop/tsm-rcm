window.TSMAdaptiveRules = {

history:[],

learn(decision){

this.history.push({

decision,

timestamp:new Date().toISOString()

});

return {

status:"RULE_MEMORY_UPDATED"

};

}

};
