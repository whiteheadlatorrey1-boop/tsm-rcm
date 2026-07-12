
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

module.exports = knowledgeGraph;
