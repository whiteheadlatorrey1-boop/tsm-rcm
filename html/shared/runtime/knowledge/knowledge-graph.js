
// TSM Knowledge Graph

const knowledgeGraph = {

 connect(entityA,entityB,relationship){

  return {
   entityA,
   entityB,
   relationship,
   status:"CONNECTED"
  };

 },

 query(entity){

  return {
   entity,
   relationships:[]
  };

 }

};

const __tsmExport = knowledgeGraph;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.knowledgeGraph = __tsmExport;
}
