#!/bin/bash

set -e

echo "=============================================="
echo " TSM MORTGAGE ENTERPRISE INTAKE WIRING"
echo "=============================================="

echo "[1/5] Creating mortgage document classifier"

mkdir -p server/mortgage


cat > server/mortgage/mortgage-router.js <<'EOF'

const mortgagePatterns = [

 "1003",
 "LoanEstimate",
 "ClosingDisclosure",
 "Appraisal",
 "TitleCommitment",
 "Paystub",
 "W2",
 "BankStatement",
 "PurchaseContract"

];


function detectMortgage(document){

 const name =
 (
 document.fileName ||
 document.name ||
 ""
 ).toLowerCase();


 const matched =
 mortgagePatterns.some(
 p => name.includes(p.toLowerCase())
 );


 if(!matched){
   return null;
 }


 return {

   vertical:"mortgage",

   mission:"LOAN_APPLICATION",

   stage:"PROCESSING",

   confidence:95

 };

}



module.exports={
 detectMortgage
};

EOF


echo "[2/5] Creating mortgage mission contract"


cat > server/mortgage/mortgage-mission.js <<'EOF'


function createMortgageMission(doc){

return {

id:
"MTG-"+Date.now(),


vertical:
"mortgage",


type:
"LOAN_APPLICATION",


document:
doc.fileName,


stage:
"PROCESSING",


priority:
"HIGH",


riskScore:
0,


createdAt:
new Date().toISOString()

};


}


module.exports={
createMortgageMission
};


EOF



echo "[3/5] Creating API bridge"


cat > server/mortgage/mortgage-api.js <<'EOF'


const express=require("express");

const router=express.Router();


const {
detectMortgage
}=require("./mortgage-router");


const {
createMortgageMission
}=require("./mortgage-mission");



router.post("/classify",(req,res)=>{


const result =
detectMortgage(req.body);


if(!result){

return res.json({

matched:false

});

}


res.json({

matched:true,

classification:
result,

mission:
createMortgageMission(req.body)

});


});



module.exports=router;

EOF



echo "[4/5] Creating mortgage demo lifecycle"

mkdir -p demo-data/mortgage


cat > demo-data/mortgage/mortgage-lifecycle.json <<'EOF'

{

"loan":"MTG-10001",

"documents":[

"1003.pdf",

"LoanEstimate.pdf",

"Appraisal.pdf",

"ClosingDisclosure.pdf"

],


"workflow":[

"INTAKE",

"PROCESSING",

"UNDERWRITING",

"CONDITIONS",

"CLOSING",

"FUNDING"

]


}

EOF



echo "[5/5] Complete"

echo ""
echo "Mortgage intake wiring created"
