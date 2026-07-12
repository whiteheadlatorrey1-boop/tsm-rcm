/**
 * Integration Catalog
 */

const integrations=[];

const __tsmExport = {

register(adapter){

 integrations.push(adapter);

 return integrations;

},

list(){

 return integrations;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.integrationRegistry = __tsmExport;
}
