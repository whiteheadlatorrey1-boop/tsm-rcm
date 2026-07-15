
module.exports = {

 advance(stage){

 const flow = [
  "APPLICATION",
  "DOCUMENT_COLLECTION",
  "AI_REVIEW",
  "UNDERWRITING",
  "CONDITIONS",
  "CLEAR_TO_CLOSE",
  "FUNDING",
  "INVESTOR_DELIVERY",
  "SERVICING"
 ];

 const index = flow.indexOf(stage);

 return {

  current:stage,

  next:
   flow[index + 1] || "COMPLETE",

  completion:
   Math.round(((index+1)/flow.length)*100)

 };

 }

};

