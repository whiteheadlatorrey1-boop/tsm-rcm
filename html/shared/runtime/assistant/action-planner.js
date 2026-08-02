// TSM Action Planner

module.exports = {

plan(decision = {}) {

return {

action:
decision.action || "review",

approvalRequired:true

};

}

};