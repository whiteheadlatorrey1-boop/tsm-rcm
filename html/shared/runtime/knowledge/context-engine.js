
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
