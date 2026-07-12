/**
 * Credential Boundary Manager
 */

const __tsmExport = {

validate(){

 return {
   authorized:true
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.credentialManager = __tsmExport;
}
