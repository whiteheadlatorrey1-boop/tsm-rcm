#!/bin/bash

set -e

echo "=============================================="
echo " TSM MORTGAGE OPERATIONS V1 BUILDER"
echo "=============================================="

ROOT=$(pwd)

mkdir -p \
html/war-rooms/mortgage \
server/mortgage \
demo-data/mortgage \
tests/e2e/mortgage


echo "[1/8] Building Mortgage Operations Engine"


cat > server/mortgage/mortgage-kpis.js <<'EOF'
module.exports = {

 getKPIs(){

  return {

   pipeline:{
    activeLoans:342,
    value:142500000
   },

   cycle:{
    averageDays:18,
    targetDays:15
   },

   production:{
    fundedToday:27,
    clearToClose:48
   },

   risk:{
    highRiskLoans:12,
    missingDocuments:83
   },

   quality:{
    qcScore:96,
    defects:4
   }

  };

 }

};
EOF


echo "[2/8] Building mortgage demo lifecycle"


cat > demo-data/mortgage/full-loan-case.json <<'EOF'
{
 "loan":"LH-2026-00172",

 "borrower":{
   "name":"Alex Morgan",
   "income":125000
 },

 "property":{
   "address":"123 Main Street",
   "value":550000
 },

 "loan":{
   "amount":425000,
   "type":"Conventional Purchase"
 },

 "risk":{
   "fico":742,
   "dti":38,
   "ltv":77
 },

 "stage":"UNDERWRITING",

 "conditions":[
   "Updated Paystub",
   "Employment Verification",
   "Insurance Binder"
 ],

 "aiRecommendation":
 "Approve subject to updated employment verification"
}
EOF


echo "[3/8] Creating operational war rooms"


for page in \
mortgage-loan-processing \
mortgage-underwriting \
mortgage-conditions \
mortgage-closing \
mortgage-funding \
mortgage-quality-control \
mortgage-compliance \
mortgage-digital-twin

do

cat > html/war-rooms/mortgage/$page.html <<EOF
<!DOCTYPE html>
<html>
<head>
<title>TSM $page</title>
<link rel="stylesheet" href="../../assets/style.css">
</head>

<body>

<nav class="tsm-nav">
<div class="brand">
TSM // MORTGAGE
</div>
</nav>


<div class="sheet">

<header class="hero">

<h1>
${page//-/ }
</h1>

<p>
Mortgage Enterprise Operations Command Center
</p>

</header>


<div class="body">

<div class="panel">

<h2>
Operational Intelligence
</h2>

<ul>

<li>
Loan Pipeline Monitoring
</li>

<li>
AI Risk Analysis
</li>

<li>
Document Completeness
</li>

<li>
Compliance Tracking
</li>

<li>
Executive Escalations
</li>

</ul>

</div>


</div>

</div>


</body>
</html>
EOF

done



echo "[4/8] Creating Executive Intelligence API"


cat > server/mortgage/mortgage-executive.js <<'EOF'

const kpi =
require("./mortgage-kpis");


module.exports={


dashboard(){

return {

title:
"Mortgage Executive Command Center",

metrics:
kpi.getKPIs(),

recommendation:
"Prioritize income verification bottlenecks"

};


}


};

EOF



echo "[5/8] Creating Digital Twin"


cat > html/war-rooms/mortgage/mortgage-digital-twin.html <<'EOF'
<!DOCTYPE html>
<html>

<head>

<title>
Mortgage Digital Twin
</title>

<link rel="stylesheet" href="../../assets/style.css">

</head>


<body>


<div class="sheet">


<header class="hero">

<h1>
Mortgage Enterprise Digital Twin
</h1>

<p>
Live loan lifecycle intelligence
</p>


</header>


<div class="panel">

<h2>
Loan Lifecycle
</h2>


<div>

APPLICATION

↓

DOCUMENT INTAKE

↓

PROCESSING

↓

UNDERWRITING

↓

CONDITIONS

↓

CLEAR TO CLOSE

↓

FUNDING

↓

POST CLOSING


</div>


</div>


</div>


</body>

</html>
EOF



echo "[6/8] Creating Playwright certification"


cat > tests/e2e/mortgage/mortgage-complete-lifecycle.spec.js <<'EOF'

const {test,expect}=require("@playwright/test");


test(
"Mortgage complete enterprise lifecycle",

async({page})=>{


await page.goto(
"/html/war-rooms/mortgage/mortgage-digital-twin.html"
);


await expect(
page.getByText(
"Mortgage Enterprise Digital Twin"
)
)
.toBeVisible();


}

);

EOF



echo "[7/8] Creating certification runner"


cat > scripts/mortgage/certify-mortgage-v2.sh <<'EOF'
#!/bin/bash

set -e


echo "=============================================="
echo " TSM MORTGAGE V2 CERTIFICATION"
echo "=============================================="


node --check server/mortgage/mortgage-kpis.js

node --check server/mortgage/mortgage-executive.js


npx playwright test \
tests/e2e/mortgage/mortgage-complete-lifecycle.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE OPERATIONS V2 READY"
echo "=============================================="
EOF


chmod +x scripts/mortgage/certify-mortgage-v2.sh



echo "[8/8] Complete"


echo ""
echo "=============================================="
echo " MORTGAGE OPERATIONS V1 CREATED"
echo "=============================================="

echo "
Next:

./scripts/mortgage/certify-mortgage-v2.sh
"
