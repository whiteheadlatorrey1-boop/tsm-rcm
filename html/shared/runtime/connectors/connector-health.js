/**
 * Connector Monitoring
 */

const __tsmExport = {

check(name){

 return {
   connector:name,
   healthy:true,
   timestamp:new Date().toISOString()
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.connectorHealth = __tsmExport;
}
