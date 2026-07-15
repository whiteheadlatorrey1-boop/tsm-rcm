#!/bin/bash
set -e

echo "=============================================="
echo " MORTGAGE DIGITAL TWIN BUILDER"
echo "=============================================="


mkdir -p html/war-rooms/mortgage


cat > html/war-rooms/mortgage/mortgage-digital-twin.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
<title>TSM Mortgage Digital Twin</title>
<link rel="stylesheet" href="../../assets/style.css">
</head>

<body>

<div class="sheet">

<h1>Mortgage Enterprise Digital Twin</h1>

<div class="panel">

APPLICATIONS
↓
DOCUMENT COLLECTION
↓
PROCESSING
↓
UNDERWRITING
↓
CONDITIONS
↓
CLEAR TO CLOSE
↓
CLOSING
↓
FUNDING
↓
SERVICING

</div>

</div>

</body>
</html>
EOF


echo "Digital Twin created"