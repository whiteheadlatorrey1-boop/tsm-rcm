#!/bin/bash

set -e

echo "======================================"
echo "TSM Enterprise Lab Scenario Seeder"
echo "======================================"


mkdir -p data/enterprise-lab


echo "Creating simulated SMB companies..."


cat > data/enterprise-lab/companies.json <<'EOF'
{

"companies":[


{
"id":"CCU-CON-001",
"name":"Great Lakes Construction Group",
"vertical":"construction",
"employees":85,
"systems":[
"SAP",
"Procore",
"QuickBooks"
],
"pilot":"CCU"
},


{
"id":"CCU-HC-001",
"name":"Battle Creek Medical Partners",
"vertical":"healthcare",
"employees":220,
"systems":[
"Epic",
"Revenue Cycle",
"Claims"
],
"pilot":"CCU"
},


{
"id":"CCU-FIN-001",
"name":"Midwest Manufacturing Finance",
"vertical":"finops",
"employees":60,
"systems":[
"SAP FI",
"ERP",
"Banking"
],
"pilot":"CCU"
},


{
"id":"CCU-INS-001",
"name":"Great Lakes Insurance Services",
"vertical":"insurance",
"employees":45,
"systems":[
"Policy Admin",
"Claims",
"CRM"
],
"pilot":"CCU"
},


{
"id":"CCU-BPO-001",
"name":"Lake Michigan Business Services",
"vertical":"bpo",
"employees":150,
"systems":[
"CRM",
"Workforce",
"Ticketing"
],
"pilot":"CCU"
},


{
"id":"CCU-SCH-001",
"name":"Battle Creek Charter Network",
"vertical":"schools",
"employees":300,
"systems":[
"SIS",
"Finance",
"Grants"
],
"pilot":"CCU"
}


]

}
EOF



echo "Creating users..."


cat > data/enterprise-lab/users.json <<'EOF'
{

"users":[


{
"name":"Executive Sponsor",
"role":"CEO",
"access":"executive-portal"
},


{
"name":"Operations Manager",
"role":"operator",
"access":"war-room"
},


{
"name":"Financial Analyst",
"role":"analyst",
"access":"sentinel"
},


{
"name":"System Administrator",
"role":"admin",
"access":"enterprise-runtime"
}


]

}
EOF



echo "Creating enterprise assets..."


cat > data/enterprise-lab/devices.json <<'EOF'
{

"devices":[

{
"type":"Laptop",
"count":85
},

{
"type":"Mobile",
"count":120
},

{
"type":"Servers",
"count":8
},

{
"type":"Network Devices",
"count":35
}

]

}
EOF



echo "Creating services..."


cat > data/enterprise-lab/services.json <<'EOF'
{

"services":[


{
"name":"SAP",
"category":"ERP"
},

{
"name":"CRM",
"category":"Customer Management"
},

{
"name":"Accounting",
"category":"Finance"
},

{
"name":"HR",
"category":"People"
},

{
"name":"Ticketing",
"category":"Operations"
}


]

}
EOF



echo "Creating SAP phase scenarios..."


cat > data/enterprise-lab/sap-transactions.json <<'EOF'
{

"transactions":[


{
"phase":"O2C",
"issue":"Invoice delay",
"impact":"Revenue leakage"
},


{
"phase":"MDM",
"issue":"Duplicate supplier",
"impact":"Payment risk"
},


{
"phase":"WIP",
"issue":"Project cost overrun",
"impact":"Margin loss"
},


{
"phase":"GOV",
"issue":"Compliance exception",
"impact":"Audit risk"
}


]

}
EOF



echo "Creating mission queue..."


cat > data/enterprise-lab/missions.json <<'EOF'
{

"missions":[


{
"id":"MISSION-001",
"vertical":"construction",
"title":"Late subcontractor invoice detected",
"sap_phase":"O2C",
"sentinel_priority":"HIGH"
},


{
"id":"MISSION-002",
"vertical":"healthcare",
"title":"Claim denial spike detected",
"sap_phase":"Revenue Cycle",
"sentinel_priority":"CRITICAL"
},


{
"id":"MISSION-003",
"vertical":"finops",
"title":"Vendor spend anomaly detected",
"sap_phase":"MDM",
"sentinel_priority":"HIGH"
},


{
"id":"MISSION-004",
"vertical":"insurance",
"title":"Claims processing delay",
"sap_phase":"Workflow",
"sentinel_priority":"MEDIUM"
}


]

}
EOF



echo "Creating Sentinel baselines..."


cat > data/enterprise-lab/sentinel-baselines.json <<'EOF'
{

"baseline":{


"financial_health":85,

"operational_health":82,

"compliance":90,

"security":88

}

}
EOF



echo ""
echo "Running validation..."

find data/enterprise-lab -type f | sort


echo ""
echo "======================================"
echo "ENTERPRISE LAB READY"
echo "======================================"