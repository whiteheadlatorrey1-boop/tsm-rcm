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

module.exports = {

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
