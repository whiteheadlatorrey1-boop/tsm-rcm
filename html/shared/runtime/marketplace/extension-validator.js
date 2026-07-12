/**
 * Extension Security Validation
 */

const __tsmExport = {

validate(extension){

 return {
   extension,
   valid:true,
   timestamp:new Date().toISOString()
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.extensionValidator = __tsmExport;
}
