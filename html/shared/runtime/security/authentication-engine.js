/**
 * TSM Authentication Engine
 */

const __tsmImpl = {

authenticate(identity){

 return {
   identity,
   authenticated:true,
   timestamp:new Date().toISOString()
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSecurityAuthenticationEngine = __tsmImpl; }
