
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

const __tsmExport = answerEngine;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.answerEngine = __tsmExport;
}
