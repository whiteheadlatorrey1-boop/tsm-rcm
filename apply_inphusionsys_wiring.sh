#!/usr/bin/env bash
set -e

echo "============================================================"
echo " INPHUSIONSYS — MOUNT EXPRESS ROUTE & FRONT-END SWITCHER"
echo "============================================================"

# 1. Mount Route in Express Entry Point (server.js or app.js)
SERVER_FILE=""
if [ -f "server.js" ]; then
  SERVER_FILE="server.js"
elif [ -f "server/app.js" ]; then
  SERVER_FILE="server/app.js"
elif [ -f "app.js" ]; then
  SERVER_FILE="app.js"
fi

if [ -n "$SERVER_FILE" ]; then
  if ! grep -q "inphusionsys" "$SERVER_FILE"; then
    echo "Mounting /api/inphusionsys route in $SERVER_FILE..."
    # Inject route require and app.use before server listen or router export
    sed -i '/const express/a const inphusionsysRouter = require("./server/routes/inphusionsys");' "$SERVER_FILE" 2>/dev/null || true
    sed -i '/app.use(express.json/a app.use("/api/inphusionsys", inphusionsysRouter);' "$SERVER_FILE" 2>/dev/null || true
    echo "✓ Mounted route in $SERVER_FILE"
  else
    echo "✓ InphusionSys route already mounted in $SERVER_FILE"
  fi
else
  echo "⚠️ Warning: No primary server.js / app.js found. Be sure to manually add:"
  echo '   const inphusionsysRouter = require("./server/routes/inphusionsys");'
  echo '   app.use("/api/inphusionsys", inphusionsysRouter);'
fi

# 2. Inject Front-End Scenario Switcher UI Component into l1-ticket-copilot.html
TARGET_HTML="html/l1-copilot/l1-ticket-copilot.html"

if [ -f "$TARGET_HTML" ]; then
  if ! grep -q "inphusionsys-switcher" "$TARGET_HTML"; then
    echo "Injecting InphusionSys Scenario Switcher UI into $TARGET_HTML..."
    
    # Create HTML snippet for dropdown
    SWITCHER_HTML='<div id="inphusionsys-switcher" style="margin: 10px 0; padding: 10px; background: rgba(0, 255, 204, 0.05); border: 1px solid #00ffcc; border-radius: 4px; display: flex; align-items: center; gap: 12px;"><strong style="color: #00ffcc;">InphusionSys Demo Suite:</strong><select id="inphusion-scenario-select" style="background: #0d1117; color: #e6edf3; border: 1px solid #30363d; padding: 6px 10px; border-radius: 4px; flex-grow: 1;"><option value="">-- Select InphusionSys Anomaly Scenario --</option><option value="construction/CN_CO_Poisoned_Variance.txt|CONSTRUCTION">Construction: Drywall CO #088 (18% Overrun & Expired COI)</option><option value="healthcare/HC_Claim_Denial_CO197.txt|HEALTHCARE">Healthcare: Claim CLM-88201 (CO-197 Missing Auth)</option><option value="finops/FO_Split_PO_Fraud.txt|FINOPS">FinOps: Split Purchase Order (Threshold Evasion)</option><option value="real-estate/RE_SLA_Breach_U103.txt|REAL_ESTATE">Real Estate: Unit U-103 (22d Vacant & 8h SLA Breach)</option><option value="legal/LG_MSA_Poisoned_Indemnity.txt|LEGAL">Legal: MSA Review (Unlimited Liability & Foreign Venue)</option></select><button id="load-inphusion-btn" style="background: #00ffcc; color: #000; border: none; padding: 6px 14px; font-weight: bold; border-radius: 4px; cursor: pointer;">Load Scenario</button></div>'

    # Create JS handler script
    SWITCHER_JS='<script>document.addEventListener("DOMContentLoaded", function() { const btn = document.getElementById("load-inphusion-btn"); if (btn) { btn.addEventListener("click", function() { const sel = document.getElementById("inphusion-scenario-select"); if (!sel.value) return alert("Select a scenario"); const [file, vert] = sel.value.split("|"); fetch("/api/inphusionsys/run-live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relativePath: file, vertical: vert }) }).then(r => r.json()).then(data => { const ticketBox = document.querySelector("textarea") || document.querySelector("input[type=text]"); if (ticketBox && data.raw_payload) { ticketBox.value = data.raw_payload; } console.log("Loaded InphusionSys Scenario:", data); alert("Loaded " + vert + " Scenario!\nAudit Hash: " + data.audit_hash); }).catch(e => console.error("Error loading scenario:", e)); }); } });</script>'

    # Append before closing body tag
    sed -i "s|</body>|${SWITCHER_HTML}\n${SWITCHER_JS}\n</body>|" "$TARGET_HTML"
    echo "✓ InphusionSys Switcher UI wired into $TARGET_HTML"
  else
    echo "✓ InphusionSys Switcher UI already present in $TARGET_HTML"
  fi
fi

echo "============================================================"
echo " WIRING COMPLETE"
echo "============================================================"
