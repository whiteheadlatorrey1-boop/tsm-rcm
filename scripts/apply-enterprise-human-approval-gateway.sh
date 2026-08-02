#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Human Approval Gateway"
echo "=========================================="

RUNTIME="html/shared/runtime/enterprise"
DATA="data/enterprise-lab"
REPORT="reports/human-approval-gateway-report.txt"

mkdir -p "$RUNTIME"
mkdir -p "$DATA"
mkdir -p reports

BACKUP="backups/human-approval-gateway/$(date +%Y%m%d_%H%M%S)"

echo ""
echo "Creating backup..."

mkdir -p "$BACKUP"


for file in \
"$DATA/approval-policies.json" \
"$RUNTIME/human-approval-gateway.js" \
"$RUNTIME/approval-policy-engine.js" \
"$RUNTIME/approval-notification-engine.js"
do

if [ -f "$file" ]; then
cp "$file" "$BACKUP/"
fi

done


echo "Backup:"
echo "$BACKUP"



echo ""
echo "Creating Approval Policies..."


cat > "$DATA/approval-policies.json" <<'EOF'
{
"approvalPolicies":

[

{
"id":"HIGH_FINANCIAL_IMPACT",

"condition":
"financialImpact > 50000",

"approval":

[
"CFO",
"Executive"
]

},


{
"id":"CUSTOMER_IMPACT",

"condition":
"customerImpact > 80",

"approval":
[
"Business Owner"
]

},


{
"id":"AUTONOMOUS_LOW_RISK",

"condition":
"risk == LOW",

"approval":
[
"AUTO"
]

}

]

}
EOF


echo "CREATED:"
echo "$DATA/approval-policies.json"



echo ""
echo "Installing Human Approval Gateway..."


cat > "$RUNTIME/human-approval-gateway.js" <<'EOF'
(function(){


window.TSMApprovalGateway = {


requests:[],


submit(mission){


const request = {


id:
"APR-" +
Date.now(),


mission:
mission.id,


status:
"PENDING",


created:
new Date()
.toISOString()


};


this.requests.push(request);


window.dispatchEvent(

new CustomEvent(

"TSM_APPROVAL_REQUEST",

{
detail:request
}

)

);


return request;


},



approve(id,user){


let request =
this.requests.find(
r=>r.id===id
);


if(request){

request.status =
"APPROVED";

request.approvedBy =
user;

}


return request;


},



reject(id,user){


let request =
this.requests.find(
r=>r.id===id
);


if(request){

request.status =
"REJECTED";

request.rejectedBy =
user;

}


return request;


}


};


})();
EOF



echo "CREATED:"
echo "$RUNTIME/human-approval-gateway.js"



echo ""
echo "Installing Approval Policy Engine..."


cat > "$RUNTIME/approval-policy-engine.js" <<'EOF'
(function(){


window.TSMApprovalPolicy = {


evaluate(mission){


if(
mission.financialImpact > 50000
){

return "EXECUTIVE_APPROVAL";

}


if(
mission.customerImpact > 80
){

return "BUSINESS_APPROVAL";

}


return "AUTO_APPROVED";


}


};


})();
EOF



echo "CREATED:"
echo "$RUNTIME/approval-policy-engine.js"



echo ""
echo "Installing Approval Notification Engine..."


cat > "$RUNTIME/approval-notification-engine.js" <<'EOF'
(function(){


window.TSMApprovalNotify = {


send(request){


const event = {


type:
"APPROVAL_NOTIFICATION",


approvalId:
request.id,


message:
"Enterprise approval required",


timestamp:
new Date()
.toISOString()


};


window.dispatchEvent(

new CustomEvent(

"TSM_APPROVAL_NOTIFICATION",

{
detail:event
}

)

);


return event;


}


};


})();
EOF


echo "CREATED:"
echo "$RUNTIME/approval-notification-engine.js"



echo ""
echo "Creating Manifest..."


cat > "$RUNTIME/human-approval-gateway-manifest.json" <<'EOF'
{

"name":
"TSM Human Approval Gateway",


"purpose":
"Govern autonomous enterprise actions",


"flow":

[

"Mission Decision",

"Risk Evaluation",

"Approval Request",

"Human Review",

"Execution Authorization",

"Sentinel Evidence"

]

}
EOF



echo ""
echo "Generating Report..."


cat > "$REPORT" <<EOF
TSM Enterprise Human Approval Gateway

STATUS:
READY


CREATED:

Approval Policies
Human Approval Gateway
Approval Policy Engine
Approval Notification Engine
Gateway Manifest


CONNECTED:

Decision Intelligence
Autonomous Execution
Sentinel Governance
Executive Command Center


ENTERPRISE FLOW:

Decision
 |
Risk Check
 |
Approval
 |
Authorization
 |
Execution
 |
Evidence


EOF



echo ""
echo "=========================================="
echo "HUMAN APPROVAL GATEWAY READY"
echo ""
echo "Report:"
echo "$REPORT"
echo "=========================================="