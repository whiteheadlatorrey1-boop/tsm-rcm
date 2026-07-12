// TSM Action Planner

const __tsmImpl = {

plan(decision = {}) {

return {

action:
decision.action || "review",

approvalRequired:true

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMAssistantActionPlanner = __tsmImpl; }
