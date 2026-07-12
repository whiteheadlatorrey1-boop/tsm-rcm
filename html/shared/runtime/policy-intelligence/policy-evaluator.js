// TSM Policy Evaluator

const __tsmExport = {

check(action = {}) {

return {

action,

allowed:true,

conditions:[]

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.policyEvaluator = __tsmExport;
}
