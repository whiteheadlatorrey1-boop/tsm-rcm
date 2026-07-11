/**
 * TSM Deployment Manager
 */

const environments = [
 "development",
 "testing",
 "staging",
 "production"
];

module.exports = {

deploy(target){

 return {
   target,
   status:"deployed",
   timestamp:new Date().toISOString()
 };

},

environments(){

 return environments;

}

};
