// TSM Policy Evaluator

module.exports = {

check(action = {}) {

return {

action,

allowed:true,

conditions:[]

};

}

};