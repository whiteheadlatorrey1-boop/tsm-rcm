
// TSM Answer Engine

const answerEngine = {

 answer(question){

  return {
   question,
   answer:null,
   evidence:[],
   confidence:0
  };

 }

};

module.exports = answerEngine;
if (typeof window !== 'undefined') { window.TSMKnowledgeAnswerEngine = answerEngine; }
