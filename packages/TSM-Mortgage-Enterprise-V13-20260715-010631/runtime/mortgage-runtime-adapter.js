
window.TSMMortgageAdapter = {

 vertical:"mortgage",

 missionTypes:[
  "LOAN_APPLICATION",
  "DOCUMENT_COLLECTION",
  "UNDERWRITING",
  "CONDITIONS",
  "APPRAISAL",
  "TITLE",
  "ESCROW",
  "CLOSING",
  "FUNDING",
  "POST_CLOSING",
  "QC_REVIEW",
  "COMPLIANCE",
  "SERVICING"
 ],

 route(document){

   return {
     vertical:"mortgage",
     stage:"PROCESSING",
     mission:"DOCUMENT_COLLECTION",
     confidence:95
   };

 },

 metrics(){

   return {
    pipelineLoans:124,
    conditions:37,
    clearToClose:18,
    fundedToday:7,
    avgDaysToClose:19
   };

 }

};

console.log("Mortgage Runtime Adapter Loaded");

