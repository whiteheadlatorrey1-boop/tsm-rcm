/**
 * Enterprise Capability Catalog
 */

const capabilities=[];

const __tsmExport = {

register(capability){

 capabilities.push(capability);

 return capabilities;

},

list(){

 return capabilities;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.capabilityCatalog = __tsmExport;
}
