/**
 * Runtime Plugin Loader
 */

const __tsmExport = {

load(plugin){

 return {
   loaded:true,
   plugin,
   timestamp:new Date().toISOString()
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.pluginLoader = __tsmExport;
}
