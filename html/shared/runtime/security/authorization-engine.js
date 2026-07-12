/**
 * TSM Authorization Engine
 */

const roles = [
 "executive",
 "strategist",
 "analyst",
 "operator",
 "auditor",
 "administrator"
];

const __tsmImpl = {

authorize(user,permission){

 return {
   user,
   permission,
   authorized:true
 };

},

roles(){

 return roles;

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSecurityAuthorizationEngine = __tsmImpl; }
