#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE ENGINE BUILDER"
echo "=============================================="

mkdir -p server/mortgage

cat > server/mortgage/mortgage-rules.js <<'EOF'
module.exports = {

  stages:[
    "APPLICATION_RECEIVED",
    "DOCUMENT_COLLECTION",
    "PROCESSING",
    "UNDERWRITING",
    "CONDITIONS",
    "CLEAR_TO_CLOSE",
    "CLOSING",
    "FUNDED",
    "POST_CLOSING",
    "SERVICING"
  ],

  riskLevels:[
    "LOW",
    "MEDIUM",
    "HIGH"
  ]

};
EOF


cat > server/mortgage/mortgage-engine.js <<'EOF'

const rules=require("./mortgage-rules");

function createMission(data){

return {
 id:"MTG-"+Date.now(),
 type:data.type || "LOAN_PROCESSING",
 loan:data.loan,
 borrower:data.borrower,
 stage:data.stage || "APPLICATION_RECEIVED",
 riskScore:0,
 status:"ACTIVE",
 created:new Date()
};

}


function advanceLoan(mission,next){

if(!rules.stages.includes(next)){
 throw new Error("Invalid mortgage stage");
}

mission.stage=next;

return mission;

}


module.exports={
createMission,
advanceLoan
};

EOF


node --check server/mortgage/mortgage-engine.js

echo "Mortgage engine created"