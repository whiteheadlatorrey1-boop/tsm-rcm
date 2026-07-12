
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

module.exports = semanticSearch;
if (typeof window !== 'undefined') { window.TSMKnowledgeSemanticSearch = semanticSearch; }
