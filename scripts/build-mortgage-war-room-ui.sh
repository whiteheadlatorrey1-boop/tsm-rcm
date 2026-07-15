#!/bin/bash

set -e

echo "=============================================="
echo " TSM MORTGAGE WAR ROOM UI BUILDER"
echo "=============================================="

mkdir -p html/war-rooms/mortgage
mkdir -p tests/e2e/mortgage


create_page(){

FILE=$1
TITLE=$2
TYPE=$3

cat > "$FILE" <<EOF
<!DOCTYPE html>
<html>
<head>

<title>TSM Mortgage - $TITLE</title>

<link rel="stylesheet" href="../../assets/style.css">

</head>

<body>


<nav class="tsm-nav">

<div class="brand">
TSM // MORTGAGE
</div>

<a href="mortgage-war-room.html">
War Room
</a>

<a href="mortgage-strategist.html">
AI Strategist
</a>

<a href="mortgage-executive-portal.html">
Executive
</a>

</nav>



<div class="sheet">


<header class="hero">

<div class="hero-eyebrow">

<span class="dot"></span>

Mortgage Operations

</div>


<h1>
$TITLE
</h1>


<p class="sub">

TSM Mortgage Intelligence Platform

$type

</p>


</header>



<div class="body">


<div class="cols">


<div class="panel">

<h2>
Mission Queue
</h2>


<div id="mission-list">


Loading Mortgage Missions...


</div>


</div>



<div class="panel">


<h2>
AI Recommendation
</h2>


<div id="ai-output">

Analyzing loan pipeline...


</div>


</div>


</div>



<div class="results">


<h2>
Mortgage Metrics
</h2>


<div class="metrics">


<div>
Loans Processing
<br>
124
</div>


<div>
Conditions
<br>
37
</div>


<div>
Clear To Close
<br>
18
</div>


<div>
Funded Today
<br>
7
</div>


</div>


</div>


</div>


</div>


<script src="mortgage-demo-data.js"></script>


<script>

document.getElementById("mission-list").innerHTML =

TSM_MORTGAGE_DEMO.map(x =>

\`
<div class="panel">

<b>\${x.id}</b>

<br>

Borrower:
\${x.borrower}

<br>

Stage:
\${x.stage}

<br>

Risk:
\${x.risk}

</div>

\`

).join("");



document.getElementById("ai-output").innerHTML=

"AI Recommendation: Review missing documents and prioritize underwriting.";


</script>


</body>
</html>

EOF

}



echo "[1] War Room"

create_page \
html/war-rooms/mortgage/mortgage-war-room.html \
"Mortgage Command War Room" \
"Loan lifecycle command center"


echo "[2] Strategist"

create_page \
html/war-rooms/mortgage/mortgage-strategist.html \
"Mortgage AI Strategist" \
"AI loan optimization"


echo "[3] Executive Portal"

create_page \
html/war-rooms/mortgage/mortgage-executive-portal.html \
"Mortgage Executive Portal" \
"Enterprise lending intelligence"


echo "[4] Loan Processing"

create_page \
html/war-rooms/mortgage/mortgage-loan-processing.html \
"Loan Processing Center" \
"Processor workspace"


echo "[5] Underwriting"

create_page \
html/war-rooms/mortgage/mortgage-underwriting.html \
"Underwriting Command Center" \
"Risk evaluation"


echo "[6] Conditions"

create_page \
html/war-rooms/mortgage/mortgage-conditions.html \
"Conditions Management" \
"Outstanding requirements"


echo "[7] Closing"

create_page \
html/war-rooms/mortgage/mortgage-closing.html \
"Closing Operations" \
"Closing readiness"


echo "Mortgage UI created"
