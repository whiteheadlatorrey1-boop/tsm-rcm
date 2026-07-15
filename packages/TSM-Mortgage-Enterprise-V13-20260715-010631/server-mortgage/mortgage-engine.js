
const MortgageEngine={

 analyzeLoan(doc){

  return {

   borrower:doc.borrower || "Unknown",

   riskScore:72,

   missingDocuments:[

    "Bank Statement",

    "Insurance Binder"

   ],

   recommendation:

   "Request missing documents before underwriting"

  };

 },


calculateRisk(){

 return {

  score:72,

  level:"MEDIUM"

 };

 }

};


module.exports=MortgageEngine;

