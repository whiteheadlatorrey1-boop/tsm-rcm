/**
 * Extension Dependency Resolver
 */

const __tsmExport = {

resolve(extension){

 return {
   extension,
   dependencies:[],
   resolved:true
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.dependencyResolver = __tsmExport;
}
