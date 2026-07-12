
// TSM Context Engine

const contextEngine = {

 build(subject){

  return {
   subject,
   activeSignals:[],
   historicalContext:[],
   relatedEntities:[]
  };

 }

};

const __tsmExport = contextEngine;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.contextEngine = __tsmExport;
}
