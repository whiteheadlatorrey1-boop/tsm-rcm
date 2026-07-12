window.TSMAccessControl = {

roles:[
"executive",
"strategist",
"analyst",
"operator",
"auditor"
],

authorize(role){

return this.roles.includes(role);

}

};