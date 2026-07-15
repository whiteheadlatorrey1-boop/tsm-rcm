#!/bin/bash

set -e

echo "======================================"
echo " TSM MORTGAGE VERTICAL FOUNDATION"
echo "======================================"

ROOT=$(pwd)

mkdir -p \
html/war-rooms/mortgage \
html/shared/runtime/adapters \
server/mortgage \
tests/e2e/mortgage \
demo-documents/mortgage


echo "[1/8] Creating Mortgage Runtime Adapter"

cat > html/shared/runtime/adapters/mortgage-runtime-adapter.js <<'EOF'

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

EOF


echo "[2/8] Creating Mortgage Engine"


cat > server/mortgage/mortgage-engine.js <<'EOF'

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

EOF



echo "[3/8] Creating Mortgage Router"


cat > server/mortgage/mortgage-router.js <<'EOF'


const express=require("express");

const router=express.Router();


router.get("/health",(req,res)=>{

res.json({

sector:"mortgage",

status:"online"

});

});


router.get("/pipeline",(req,res)=>{

res.json({

loans:124,

conditions:37,

funded:7

});

});


module.exports=router;

EOF



echo "[4/8] Creating Mortgage Rules"


cat > server/mortgage/mortgage-rules.js <<'EOF'


module.exports={


documents:[

"1003",

"ClosingDisclosure",

"LoanEstimate",

"Appraisal",

"TitleCommitment",

"Paystub",

"W2",

"BankStatement"

],


checks:[

"Income Verification",

"Asset Verification",

"Compliance Review",

"Fraud Review"

]


};

EOF



echo "[5/8] Creating KPI Engine"


cat > server/mortgage/mortgage-kpis.js <<'EOF'


module.exports={

dashboard(){

return {

applications:240,

processing:83,

underwriting:42,

clearToClose:18,

funded:12,

averageCloseDays:19,

complianceScore:98

};


}

};


EOF



echo "[6/8] Creating Demo Data"


cat > html/war-rooms/mortgage/mortgage-demo-data.js <<'EOF'


window.TSM_MORTGAGE_DEMO=[


{

id:"MTG-10001",

borrower:"Jordan Smith",

loanType:"Conventional",

amount:425000,

stage:"UNDERWRITING",

risk:42,

documents:[

"1003.pdf",

"Paystub.pdf",

"W2.pdf",

"BankStatement.pdf"

]

},


{

id:"MTG-10002",

borrower:"Taylor Brown",

loanType:"FHA",

amount:315000,

stage:"CONDITIONS",

risk:67

}


];


EOF



echo "[7/8] Creating Demo Documents"


touch \
demo-documents/mortgage/1003.pdf \
demo-documents/mortgage/LoanEstimate.pdf \
demo-documents/mortgage/ClosingDisclosure.pdf \
demo-documents/mortgage/Appraisal.pdf \
demo-documents/mortgage/TitleCommitment.pdf \
demo-documents/mortgage/BankStatement.pdf \
demo-documents/mortgage/Paystub.pdf \
demo-documents/mortgage/W2.pdf


echo "[8/8] Complete"


echo ""
echo "Mortgage foundation created."
echo ""
echo "Next:"
echo "1. Build war room UI"
echo "2. Add executive portal"
echo "3. Wire enterprise intake"
echo "4. Add Playwright certification"
