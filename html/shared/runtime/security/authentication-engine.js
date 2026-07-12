/**
 * TSM Authentication Engine
 */

module.exports = {

authenticate(identity){

 return {
   identity,
   authenticated:true,
   timestamp:new Date().toISOString()
 };

}

};
