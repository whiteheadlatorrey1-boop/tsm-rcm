#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
APP="html/finops-suite/tsm-rcm-os.html"
SIM="html/finops-suite/rcm-os-simulation.html"

echo "Installing RCM-OS anomaly simulation..."

mkdir -p "$(dirname "$SIM")"

cat > "$SIM" <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RCM-OS Simulation Lab</title>
<style>
:root{
  --bg:#07111a;
  --panel:#101b2d;
  --panel2:#142238;
  --border:#293a55;
  --text:#eef4ff;
  --muted:#91a2bd;
  --accent:#f0a62b;
  --good:#31d09a;
  --bad:#ff6577;
  --warn:#f5c451;
}
*{box-sizing:border-box}
body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
header{
  padding:24px 32px;
  border-bottom:1px solid var(--border);
  background:#091321;
}
h1{margin:0 0 6px;font-size:26px}
.sub{color:var(--muted)}
.wrap{
  max-width:1200px;
  margin:auto;
  padding:26px;
}
.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:20px;
}
.card{
  background:var(--panel);
  border:1px solid var(--border);
  border-radius:14px;
  padding:20px;
}
.card h2{
  margin:0 0 15px;
  font-size:17px;
}
label{
  display:block;
  color:var(--muted);
  font-size:12px;
  margin:14px 0 6px;
}
input,select{
  width:100%;
  padding:11px 12px;
  border-radius:8px;
  border:1px solid var(--border);
  background:#091321;
  color:var(--text);
}
button{
  border:0;
  border-radius:8px;
  padding:11px 16px;
  cursor:pointer;
  font-weight:700;
  margin:8px 6px 0 0;
}
.primary{background:var(--accent);color:#111}
.secondary{background:#20314b;color:white}
.good{background:var(--good);color:#07111a}
.danger{background:var(--bad);color:white}
.kpis{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
}
.kpi{
  padding:14px;
  background:var(--panel2);
  border:1px solid var(--border);
  border-radius:10px;
}
.kpi small{color:var(--muted)}
.kpi strong{display:block;font-size:20px;margin-top:5px}
.status{
  padding:15px;
  border-radius:10px;
  margin-top:15px;
  background:#19263a;
  border:1px solid var(--border);
}
.status.bad{border-color:var(--bad)}
.status.good{border-color:var(--good)}
.log{
  height:220px;
  overflow:auto;
  background:#050b12;
  border-radius:8px;
  padding:14px;
  font-family:monospace;
  font-size:12px;
  white-space:pre-wrap;
}
.action{
  border-left:3px solid var(--accent);
  padding:10px 12px;
  margin:8px 0;
  background:#152238;
}
@media(max-width:800px){
  .grid{grid-template-columns:1fr}
  .kpis{grid-template-columns:1fr 1fr}
}
</style>
</head>

<body>
<header>
  <h1>RCM-OS Simulation Lab</h1>
  <div class="sub">
    Controlled anomaly injection and remediation testing for the Reconciliation Command Center
  </div>
</header>

<div class="wrap">

  <div class="card">
    <h2>1. Select Simulation Scenario</h2>

    <select id="scenario">
      <option value="cash">Cash Receipt Variance</option>
      <option value="ap">AP Invoice Exception</option>
      <option value="ar">AR Posting Gap</option>
      <option value="gl">GL / Budget Variance</option>
      <option value="escrow">Escrow / Tax Insurance Exception</option>
    </select>

    <label>Expected / Budgeted Amount</label>
    <input id="expected" type="number" value="125000">

    <label>Actual / Reported Amount</label>
    <input id="actual" type="number" value="92500">

    <label>Corrected Amount</label>
    <input id="corrected" type="number" value="125000">

    <label>Reference / Explanation</label>
    <input id="reference"
           value="Bank receipt batch / operating account reconciliation">

    <button class="danger" onclick="injectAnomaly()">
      ⚠ Inject Anomaly
    </button>

    <button class="secondary" onclick="loadNormal()">
      Load Normal Baseline
    </button>

    <button class="good" onclick="remediate()">
      ✓ Apply Correction
    </button>

    <button class="primary" onclick="sendToRCMOS()">
      ▶ Send To RCM-OS
    </button>
  </div>

  <div class="card">
    <h2>2. Reconciliation Result</h2>

    <div class="kpis">
      <div class="kpi">
        <small>Expected</small>
        <strong id="kExpected">$0</strong>
      </div>
      <div class="kpi">
        <small>Actual</small>
        <strong id="kActual">$0</strong>
      </div>
      <div class="kpi">
        <small>Variance</small>
        <strong id="kVariance">$0</strong>
      </div>
      <div class="kpi">
        <small>Confidence</small>
        <strong id="kConfidence">—</strong>
      </div>
    </div>

    <div id="status" class="status">
      No simulation loaded.
    </div>

    <div id="actions"></div>
  </div>

  <div class="card">
    <h2>3. RCM-OS Event Stream</h2>
    <div id="log" class="log">Simulation initialized.\n</div>
  </div>

  <div class="card">
    <h2>4. Remediation Test</h2>

    <div class="action">
      <strong>Step 1 — Detect</strong><br>
      Inject an abnormal transaction or reconciliation value.
    </div>

    <div class="action">
      <strong>Step 2 — Investigate</strong><br>
      Review the expected value, actual value, variance and evidence reference.
    </div>

    <div class="action">
      <strong>Step 3 — Correct</strong><br>
      Enter the verified corrected value.
    </div>

    <div class="action">
      <strong>Step 4 — Reconcile</strong><br>
      RCM-OS recalculates the variance and closes the exception when appropriate.
    </div>
  </div>

</div>

<script>
const KEY = "TSM_RCM_OS_SIMULATION";
const CHANNEL = "tsm-rcm-os-simulation";

function money(n){
  return new Intl.NumberFormat("en-US",{
    style:"currency",
    currency:"USD",
    maximumFractionDigits:2
  }).format(Number(n)||0);
}

function log(message){
  const box=document.getElementById("log");
  box.textContent +=
    "["+new Date().toLocaleTimeString()+"] "+message+"\\n";
  box.scrollTop=box.scrollHeight;
}

function scenarioName(){
  return document.getElementById("scenario")
    .selectedOptions[0].textContent;
}

function getData(){
  const expected=Number(document.getElementById("expected").value)||0;
  const actual=Number(document.getElementById("actual").value)||0;
  const corrected=Number(document.getElementById("corrected").value)||0;

  const variance=actual-expected;
  const pct=expected ? (variance/expected)*100 : 0;

  return {
    source:"RCM-OS Simulation Lab",
    scenario:document.getElementById("scenario").value,
    scenarioName:scenarioName(),
    expected,
    actual,
    corrected,
    variance,
    variancePct:pct,
    reference:document.getElementById("reference").value,
    timestamp:new Date().toISOString(),
    status:"ANOMALY"
  };
}

function render(data){
  document.getElementById("kExpected").textContent=money(data.expected);
  document.getElementById("kActual").textContent=money(data.actual);
  document.getElementById("kVariance").textContent=money(data.variance);

  const confidence=Math.max(
    0,
    Math.min(100,100-Math.abs(data.variancePct))
  );

  document.getElementById("kConfidence").textContent=
    Math.round(confidence)+"%";

  const status=document.getElementById("status");
  const actions=document.getElementById("actions");

  if(Math.abs(data.variance) < 0.01){
    status.className="status good";
    status.innerHTML="<strong>✓ RECONCILED</strong><br>"+
      "No remaining variance detected.";
    actions.innerHTML=
      "<div class='action'>Exception closed. " +
      "Evidence reference: "+data.reference+"</div>";
  }else{
    status.className="status bad";
    status.innerHTML="<strong>⚠ ANOMALY DETECTED</strong><br>"+
      scenarioName()+" — variance "+money(data.variance)+
      " ("+data.variancePct.toFixed(2)+"%)";

    actions.innerHTML=
      "<div class='action'><strong>Recommended Action:</strong><br>"+
      "Investigate source transaction and supporting evidence.</div>"+
      "<div class='action'><strong>Control:</strong><br>"+
      "Do not close the reconciliation until corrected value is verified.</div>";
  }
}

function save(data){
  localStorage.setItem(KEY,JSON.stringify(data));

  try{
    const bc=new BroadcastChannel(CHANNEL);
    bc.postMessage(data);
    bc.close();
  }catch(e){}

  window.dispatchEvent(new StorageEvent("storage",{
    key:KEY,
    newValue:JSON.stringify(data)
  }));
}

function injectAnomaly(){
  const data=getData();
  data.status="ANOMALY";
  save(data);
  render(data);

  log("ANOMALY INJECTED");
  log("Scenario: "+data.scenarioName);
  log("Expected: "+money(data.expected));
  log("Actual:   "+money(data.actual));
  log("Variance: "+money(data.variance));
  log("Variance %: "+data.variancePct.toFixed(2)+"%");
}

function remediate(){
  const data=getData();

  data.actual=data.corrected;
  data.variance=data.actual-data.expected;
  data.variancePct=data.expected
    ? (data.variance/data.expected)*100
    : 0;

  data.status=
    Math.abs(data.variance)<0.01
      ? "RECONCILED"
      : "REMEDIATION_REQUIRED";

  save(data);
  render(data);

  if(data.status==="RECONCILED"){
    log("CORRECTION APPLIED");
    log("Corrected amount: "+money(data.corrected));
    log("Variance cleared.");
    log("RECONCILIATION CLOSED.");
  }else{
    log("Correction applied but variance remains.");
  }
}

function loadNormal(){
  document.getElementById("expected").value=125000;
  document.getElementById("actual").value=125000;
  document.getElementById("corrected").value=125000;
  document.getElementById("reference").value=
    "Verified operating account / supporting documentation";

  const data=getData();
  data.status="BASELINE";
  save(data);
  render(data);
  log("NORMAL BASELINE LOADED");
}

function sendToRCMOS(){
  const data=JSON.parse(localStorage.getItem(KEY)||"{}");

  if(!data.scenario){
    injectAnomaly();
  }

  log("Opening RCM-OS...");
  window.open("/html/finops-suite/tsm-rcm-os.html?simulation=1","_blank");
}

document.getElementById("scenario").addEventListener("change",()=>{
  log("Scenario changed to "+scenarioName());
});

const existing=localStorage.getItem(KEY);
if(existing){
  try{render(JSON.parse(existing));}catch(e){}
}
</script>
</body>
</html>
HTML

echo "Created $SIM"

# Optional bridge: append a safe, self-contained simulation listener.
if [[ -f "$APP" ]] && ! grep -q "TSM_RCM_OS_SIMULATION_BRIDGE" "$APP"; then

cat >> "$APP" <<'HTML'

<!-- TSM_RCM_OS_SIMULATION_BRIDGE -->
<script>
(function(){
  const KEY="TSM_RCM_OS_SIMULATION";
  const CHANNEL="tsm-rcm-os-simulation";

  function money(n){
    return new Intl.NumberFormat("en-US",{
      style:"currency",
      currency:"USD"
    }).format(Number(n)||0);
  }

  function show(data){
    if(!data || !data.scenario) return;

    let box=document.getElementById("tsmSimulationOverlay");

    if(!box){
      box=document.createElement("div");
      box.id="tsmSimulationOverlay";

      Object.assign(box.style,{
        position:"fixed",
        right:"18px",
        bottom:"18px",
        width:"330px",
        zIndex:"99999",
        background:"#101b2d",
        color:"#eef4ff",
        border:"1px solid #f0a62b",
        borderRadius:"12px",
        padding:"16px",
        boxShadow:"0 15px 40px rgba(0,0,0,.45)",
        fontFamily:"Inter,system-ui,sans-serif"
      });

      document.body.appendChild(box);
    }

    const variance=Number(data.variance)||0;
    const reconciled=Math.abs(variance)<0.01;

    box.innerHTML=
      "<div style='font-size:11px;color:#f0a62b;letter-spacing:.08em'>"+
      "SIMULATION FEED</div>"+
      "<strong style='display:block;margin:6px 0 10px'>"+
      data.scenarioName+"</strong>"+
      "<div style='font-size:12px;line-height:1.7'>"+
      "Expected: "+money(data.expected)+"<br>"+
      "Actual: "+money(data.actual)+"<br>"+
      "Variance: <strong>"+money(variance)+"</strong><br>"+
      "Status: <strong style='color:"+
      (reconciled?"#31d09a":"#ff6577")+"'>"+
      (reconciled?"RECONCILED":"ANOMALY DETECTED")+
      "</strong></div>"+
      "<div style='margin-top:10px;font-size:11px;color:#91a2bd'>"+
      (data.reference||"Simulation evidence")+
      "</div>";
  }

  function load(){
    try{
      const data=JSON.parse(localStorage.getItem(KEY)||"null");
      if(data) show(data);
    }catch(e){}
  }

  window.addEventListener("storage",function(e){
    if(e.key===KEY) load();
  });

  try{
    const bc=new BroadcastChannel(CHANNEL);
    bc.onmessage=function(e){show(e.data)};
  }catch(e){}

  window.TSM_RCM_OS_SIMULATION={
    load,
    get:()=>JSON.parse(localStorage.getItem(KEY)||"null")
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",load);
  }else{
    load();
  }
})();
</script>
HTML

echo "Added simulation bridge to $APP"

else
  echo "RCM-OS application not found or bridge already installed."
fi

echo
echo "=============================================="
echo " RCM-OS SIMULATION INSTALLED"
echo "=============================================="
echo
echo "Simulation:"
echo "  /html/finops-suite/rcm-os-simulation.html"
echo
echo "RCM-OS:"
echo "  /html/finops-suite/tsm-rcm-os.html"
echo
echo "Test:"
echo "  1. Open simulation"
echo "  2. Click Inject Anomaly"
echo "  3. Click Send To RCM-OS"
echo "  4. Verify anomaly overlay"
echo "  5. Return to simulator"
echo "  6. Change Corrected Amount"
echo "  7. Click Apply Correction"
echo "  8. Verify RECONCILED"
echo
echo "Review:"
git diff -- "$SIM" "$APP" 2>/dev/null || true
