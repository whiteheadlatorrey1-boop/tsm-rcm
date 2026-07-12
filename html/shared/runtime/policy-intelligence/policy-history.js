// TSM Policy History

const history = [];

const __tsmImpl = {

record(policy){

history.push({

...policy,

timestamp:new Date().toISOString()

});

},

list(){

return history;

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMPolicyIntelligencePolicyHistory = __tsmImpl; }
