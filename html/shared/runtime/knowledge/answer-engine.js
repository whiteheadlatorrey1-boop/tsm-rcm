
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
