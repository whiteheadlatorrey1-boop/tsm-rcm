#!/bin/bash
set -e

echo "=============================================="
echo " MORTGAGE DEMO DATA BUILDER"
echo "=============================================="


mkdir -p demo-data/mortgage


cat > demo-data/mortgage/loan-demo.json <<'EOF'
{
 "loanId":"LH-2026-00172",
 "borrower":"Alex Morgan",
 "property":"123 Main Street",
 "loanType":"Conventional Purchase",
 "amount":425000,
 "stage":"UNDERWRITING",
 "riskScore":67,
 "conditions":[
   "Updated Paystub",
   "Employment Verification",
   "Insurance Binder"
 ],
 "recommendation":
 "Complete missing income verification"
}
EOF


echo "Mortgage demo data created"