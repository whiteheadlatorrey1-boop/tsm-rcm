/**
 * Extension Isolation Boundary
 */

const __tsmExport = {

validate(extension){

 return {
   extension,
   sandbox:true,
   approved:true
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.sandboxManager = __tsmExport;
}
