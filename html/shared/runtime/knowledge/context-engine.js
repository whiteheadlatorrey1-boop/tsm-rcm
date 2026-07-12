
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

module.exports = contextEngine;
if (typeof window !== 'undefined') { window.TSMKnowledgeContextEngine = contextEngine; }
