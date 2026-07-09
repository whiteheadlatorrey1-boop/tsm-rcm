#!/usr/bin/env bash

set -euo pipefail

echo "================================="
echo " TSM MDM Frontend v2 Installer"
echo " War Room | Strategist | Executive"
echo "================================="


BACKUP="backup-mdm-frontend-$(date +%Y%m%d-%H%M%S)"

echo "[1/6] Creating backup..."

mkdir -p "$BACKUP"

if [ -d html/war-rooms/mdm ]; then
    cp -r html/war-rooms/mdm "$BACKUP/"
fi

echo "Backup: $BACKUP"


echo "[2/6] Creating directories..."

mkdir -p \
html/war-rooms/mdm \
shared


echo "[3/6] Creating MDM stylesheet..."

cat > shared/tsm-mdm.css <<'EOF'

.mdm-shell {

font-family:
system-ui,
-apple-system,
sans-serif;

padding:24px;

}


.mdm-grid {

display:grid;

grid-template-columns:
repeat(auto-fit,minmax(260px,1fr));

gap:20px;

}


.mdm-card {

background:#111827;

color:white;

padding:20px;

border-radius:16px;

box-shadow:
0 8px 25px rgba(0,0,0,.25);

}


.mdm-score {

font-size:42px;

font-weight:900;

}


.mdm-risk {

border-left:
5px solid #ef4444;

}


.mdm-mission {

border-left:
5px solid #3b82f6;

}


.mdm-label {

opacity:.7;

font-size:12px;

text-transform:uppercase;

}


EOF


echo "[4/6] Creating MDM War Room..."

cat > html/war-rooms/mdm/mdm-war-room.html <<'EOF'

<!DOCTYPE html>

<html>

<head>

<title>TSM MDM War Room</title>

<link rel="stylesheet" href="/shared/tsm-mdm.css">

</head>


<body>

<div class="mdm-shell">

<h1>MDM Command Center</h1>

<div class="mdm-grid">


<div class="mdm-card">

<div class="mdm-label">
Enterprise Data Trust
</div>

<div id="healthScore"
class="mdm-score">
--
</div>

</div>


<div class="mdm-card">

<h2>Domains</h2>

<div id="domains">
Loading...
</div>

</div>


<div class="mdm-card mdm-risk">

<h2>Anomalies</h2>

<div id="anomalies">
Loading...
</div>

</div>


<div class="mdm-card mdm-mission">

<h2>Mission Queue</h2>

<div id="missions">
Loading...
</div>

</div>


</div>

</div>


<script src="/js/mdm-live-data.js"></script>


<script>

TSM_MDM_LIVE.start();


window.addEventListener(
"TSM_MDM_UPDATED",
(e)=>{


const data=e.detail;


document.getElementById(
"healthScore"
).innerText =
(data.catalog.healthScore || "--")
+"%";


document.getElementById(
"domains"
).innerHTML =
data.catalog.domains
.map(d =>
`${d.name}: ${d.score}%`
)
.join("<br>");


document.getElementById(
"anomalies"
).innerHTML =
data.anomalies
.map(a =>
`${a.finding}<br>
Risk: ${a.riskScore}`
)
.join("<hr>");


document.getElementById(
"missions"
).innerHTML =
data.missions
.map(m =>
`${m.id}<br>
${m.finding}<br>
${m.completion_pct}%`
)
.join("<hr>");

});


</script>


</body>

</html>

EOF



echo "[5/6] Creating Strategist + Executive pages..."

cat > html/war-rooms/mdm/mdm-strategist.html <<'EOF'

<!DOCTYPE html>

<html>

<head>

<title>MDM Strategist</title>

<link rel="stylesheet" href="/shared/tsm-mdm.css">

</head>

<body>

<div class="mdm-shell">

<h1>MDM Strategist</h1>


<div class="mdm-card">

<h2>Understand</h2>

<p>
Analyze enterprise data quality,
duplicates, ownership gaps,
and governance exposure.
</p>

</div>


<div class="mdm-card">

<h2>Decide</h2>

<p>
Recommend remediation,
approval paths,
and ownership actions.
</p>

</div>


<div class="mdm-card">

<h2>Execute</h2>

<p>
Create governance missions
and remediation workflows.
</p>

</div>


</div>


<script src="/js/mdm-live-data.js"></script>

<script>

TSM_MDM_LIVE.start();

</script>


</body>

</html>

EOF



cat > html/war-rooms/mdm/mdm-executive-portal.html <<'EOF'

<!DOCTYPE html>

<html>

<head>

<title>MDM Executive Portal</title>

<link rel="stylesheet" href="/shared/tsm-mdm.css">

</head>


<body>

<div class="mdm-shell">


<h1>
MDM Executive Portal
</h1>


<div class="mdm-card">

<h2>
Enterprise Data Trust Index
</h2>


<div id="score"
class="mdm-score">
--
</div>


</div>


</div>


<script src="/js/mdm-live-data.js"></script>


<script>

TSM_MDM_LIVE.start();


window.addEventListener(
"TSM_MDM_UPDATED",
(e)=>{

document.getElementById(
"score"
).innerText =
e.detail.catalog.healthScore
+"%";

});


</script>


</body>

</html>

EOF


echo "[6/6] Validation..."

test -f shared/tsm-mdm.css
test -f html/war-rooms/mdm/mdm-war-room.html
test -f html/war-rooms/mdm/mdm-strategist.html
test -f html/war-rooms/mdm/mdm-executive-portal.html


echo ""
echo "================================="
echo " MDM Frontend v2 COMPLETE"
echo "================================="

echo ""
echo "Created:"
echo "✓ shared/tsm-mdm.css"
echo "✓ mdm-war-room.html"
echo "✓ mdm-strategist.html"
echo "✓ mdm-executive-portal.html"
