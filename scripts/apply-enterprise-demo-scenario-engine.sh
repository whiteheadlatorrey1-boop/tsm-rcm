#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Demo Scenario Engine"
echo "=========================================="

BASE="data/enterprise-demo"

mkdir -p "$BASE"


echo ""
echo "Creating executive demo scenarios..."


cat > "$BASE/demo-scenarios.json" <<'EOF'
[
{
"id":"DEMO-CONSTRUCTION-001",
"vertical":"construction",
"title":"Permit Delay Risk Analysis",
"source":"permit-package.pdf",
"objective":"Identify permit blockers and schedule impact",
"documents":
[
"permit",
"proposal",
"field-report"
],
"expected_flow":
[
"construction-war-room",
"construction-strategist",
"construction-executive-portal",
"sentinel"
],
"decision":
"Escalate permit dependency and notify project leadership"
},


{
"id":"DEMO-HEALTHCARE-001",
"vertical":"healthcare",
"title":"Claim Denial Investigation",
"source":"claim-batch.pdf",
"objective":"Analyze denial patterns and recover revenue",
"documents":
[
"claim",
"EOB",
"payer-policy"
],
"expected_flow":
[
"healthcare-war-room",
"healthcare-strategist",
"healthcare-executive-portal",
"sentinel"
],
"decision":
"Generate appeal package and prioritize high-value recovery"
},


{
"id":"DEMO-FINOPS-001",
"vertical":"finops",
"title":"Enterprise Spend Optimization",
"source":"sap-transactions.csv",
"objective":"Detect abnormal spend and recommend action",
"documents":
[
"SAP",
"invoice",
"purchase-order"
],
"expected_flow":
[
"finops-war-room",
"finops-strategist",
"finops-executive-portal",
"sentinel"
],
"decision":
"Freeze anomaly and initiate approval workflow"
},


{
"id":"DEMO-MORTGAGE-001",
"vertical":"mortgage",
"title":"Loan Processing Exception",
"source":"loan-package.pdf",
"objective":"Identify underwriting risk",
"documents":
[
"application",
"income",
"credit"
],
"expected_flow":
[
"mortgage-war-room",
"mortgage-strategist",
"mortgage-executive-portal",
"sentinel"
],
"decision":
"Route exception to underwriting leadership"
},


{
"id":"DEMO-REAL-ESTATE-001",
"vertical":"real-estate",
"title":"Property Transaction Intelligence",
"source":"property-package.pdf",
"objective":"Analyze transaction readiness",
"documents":
[
"contract",
"inspection",
"title"
],
"expected_flow":
[
"real-estate-war-room",
"real-estate-strategist",
"real-estate-executive-portal",
"sentinel"
],
"decision":
"Approve transaction readiness"
},


{
"id":"DEMO-LEGAL-001",
"vertical":"legal",
"title":"Contract Risk Review",
"source":"contract.pdf",
"objective":"Identify contractual exposure",
"documents":
[
"agreement",
"clause",
"policy"
],
"expected_flow":
[
"legal-war-room",
"legal-strategist",
"legal-executive-portal",
"sentinel"
],
"decision":
"Flag legal exposure and recommend remediation"
},


{
"id":"DEMO-INSURANCE-001",
"vertical":"insurance",
"title":"Policy Claim Intelligence",
"source":"claim-file.pdf",
"objective":"Analyze claim liability",
"documents":
[
"policy",
"claim",
"inspection"
],
"expected_flow":
[
"insurance-war-room",
"insurance-strategist",
"insurance-executive-portal",
"sentinel"
],
"decision":
"Approve, deny, or escalate claim"
},


{
"id":"DEMO-BPO-001",
"vertical":"bpo",
"title":"Customer Operations Optimization",
"source":"service-tickets.csv",
"objective":"Improve operational throughput",
"documents":
[
"tickets",
"SLA",
"process"
],
"expected_flow":
[
"bpo-war-room",
"bpo-strategist",
"bpo-executive-portal",
"sentinel"
],
"decision":
"Optimize workflow automation"
},


{
"id":"DEMO-SCHOOLS-001",
"vertical":"schools",
"title":"Student Services Intelligence",
"source":"student-records.pdf",
"objective":"Identify operational improvement opportunities",
"documents":
[
"records",
"attendance",
"services"
],
"expected_flow":
[
"schools-war-room",
"schools-strategist",
"schools-executive-portal",
"sentinel"
],
"decision":
"Create improvement mission"
}

]
EOF



echo "Installing Demo Scenario Runtime..."


mkdir -p html/shared/runtime/demo


cat > html/shared/runtime/demo/demo-scenario-engine.js <<'EOF'
(function(){

window.TSMDemoScenarioEngine = {


load(){

return fetch(
"data/enterprise-demo/demo-scenarios.json"
)
.then(r=>r.json());

},


launch(id){

return this.load()
.then(
scenarios=>{

const scenario =
scenarios.find(
x=>x.id===id
);


if(!scenario)
throw new Error(
"Scenario not found"
);


return window
.TSMEnterpriseMissionOrchestrator
.createMission({

vertical:
scenario.vertical,

source:
"executive-demo",

objective:
scenario.objective,

scenario:
scenario.id

});


});

}


};


})();
EOF



echo "Creating demo launcher manifest..."


cat > html/shared/runtime/demo/demo-launcher.json <<EOF
{
"demo_ready":true,
"scenarios":
"data/enterprise-demo/demo-scenarios.json",

"supported_verticals":
[
"construction",
"healthcare",
"finops",
"mortgage",
"real-estate",
"legal",
"insurance",
"bpo",
"schools"
]

}
EOF



mkdir -p reports


cat > reports/enterprise-demo-scenario-engine-report.txt <<EOF
TSM Enterprise Demo Scenario Engine

CREATED:

Demo Scenario Library
Mission Launcher
Executive Demo Manifest

Supported:

Construction
Healthcare
FinOps
Mortgage
Real Estate
Legal
Insurance
BPO
Schools


STATUS:
READY FOR EXECUTIVE DEMO

EOF


echo ""
echo "=========================================="
echo "ENTERPRISE DEMO SCENARIO ENGINE READY"
echo ""
echo "Report:"
echo "reports/enterprise-demo-scenario-engine-report.txt"
echo "=========================================="