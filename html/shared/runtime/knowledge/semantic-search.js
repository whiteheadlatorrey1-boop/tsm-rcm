
// TSM Semantic Search

const semanticSearch = {

 search(query){

  return {
   query,
   matches:[],
   relevanceScore:0
  };

 }

};

const __tsmExport = semanticSearch;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.semanticSearch = __tsmExport;
}
