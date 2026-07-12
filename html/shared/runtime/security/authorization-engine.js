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

const __tsmExport = {

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.authorizationEngine = __tsmExport;
}
