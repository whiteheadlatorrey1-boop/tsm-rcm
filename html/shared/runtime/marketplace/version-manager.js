/**
 * Extension Version Control
 */

const __tsmExport = {

check(extension){

 return {
   extension,
   version:"1.0.0",
   compatible:true
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.versionManager = __tsmExport;
}
