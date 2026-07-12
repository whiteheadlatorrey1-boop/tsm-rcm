/**
 * TSM Extension Registry
 * Central capability registration
 */

const extensions = [];

const __tsmExport = {

register(extension){
  extensions.push(extension);

  return extension;
},

list(){
  return extensions;
}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.extensionRegistry = __tsmExport;
}
