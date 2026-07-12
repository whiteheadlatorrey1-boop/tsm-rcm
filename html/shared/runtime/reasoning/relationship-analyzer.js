// TSM Relationship Analyzer

const __tsmExport = {

analyze(entities = []) {

return {

entities,

relationships:[],

mapped:true

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.relationshipAnalyzer = __tsmExport;
}
