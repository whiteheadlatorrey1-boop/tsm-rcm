
// TSM Document Intelligence

const documentIntelligence = {

 analyze(document){

  return {
   document,
   entities:[],
   insights:[],
   status:"ANALYZED"
  };

 }

};

module.exports = documentIntelligence;
if (typeof window !== 'undefined') { window.TSMKnowledgeDocumentIntelligence = documentIntelligence; }
