// TSM Action Planner

const __tsmExport = {

plan(decision = {}) {

return {

action:
decision.action || "review",

approvalRequired:true

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.actionPlanner = __tsmExport;
}
