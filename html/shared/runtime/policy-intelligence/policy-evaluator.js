// TSM Policy Evaluator

const __tsmImpl = {

check(action = {}) {

return {

action,

allowed:true,

conditions:[]

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMPolicyIntelligencePolicyEvaluator = __tsmImpl; }
