/**
 * Credential Boundary Manager
 */

const __tsmImpl = {

validate(){

 return {
   authorized:true
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMConnectorsCredentialManager = __tsmImpl; }
