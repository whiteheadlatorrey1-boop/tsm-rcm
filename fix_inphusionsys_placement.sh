#!/usr/bin/env bash
set -e

TARGET_HTML="html/l1-copilot/l1-ticket-copilot.html"

# 1. Clean up old bottom injection if present
sed -i '/id="inphusionsys-switcher"/d' "$TARGET_HTML"
sed -i '/id="inphusion-scenario-select"/d' "$TARGET_HTML"
sed -i '/load-inphusion-btn/d' "$TARGET_HTML"

# 2. Define the inline UI bar matching the dark cyan theme
INLINE_UI='<div id="inphusionsys-bar" style="margin: 12px 0; padding: 10px 14px; background: rgba(0, 255, 204, 0.08); border: 1px solid #00ffcc; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"><div style="display:flex; align-items:center; gap:8px;"><span style="color:#00ffcc; font-weight:bold; font-size:12px; letter-spacing:1px;">⚡ INPHUSIONSYS ANOMALY SUITE:</span><select id="inphusion-select" style="background:#0d1117; color:#00ffcc; border:1px solid #00ffcc; padding:4px 8px; border-radius:3px; font-size:12px; font-family:monospace;"><option value="">-- Select InphusionSys Vertical Test Anomaly --</option><option value="construction/CN_CO_Poisoned_Variance.txt|CONSTRUCTION">Construction: Drywall CO #088 (18% Overrun & Expired COI)</option><option value="healthcare/HC_Claim_Denial_CO197.txt|HEALTHCARE">Healthcare: Claim CLM-88201 (CO-197 Missing Auth)</option><option value="finops/FO_Split_PO_Fraud.txt|FINOPS">FinOps: Split PO Fraud (Threshold Evasion)</option><option value="real-estate/RE_SLA_Breach_U103.txt|REAL_ESTATE">Real Estate: Unit U-103 (22d Vacant & SLA Breach)</option><option value="legal/LG_MSA_Poisoned_Indemnity.txt|LEGAL">Legal: MSA Review (Unlimited Liability & Foreign Venue)</option></select></div><button id="inphusion-load-btn" type="button" style="background:#00ffcc; color:#000; border:none; padding:5px 14px; font-weight:bold; font-size:11px; border-radius:3px; cursor:pointer; font-family:monospace;">LOAD ANOMALY INTO TICKET</button></div>'

# 3. Inject directly above TICKET DESCRIPTION section
sed -i "/TICKET DESCRIPTION/i ${INLINE_UI}" "$TARGET_HTML"

# 4. Inject front-end script handler
JS_SCRIPT='<script>document.addEventListener("DOMContentLoaded", function(){ const btn = document.getElementById("inphusion-load-btn"); if(!btn) return; btn.addEventListener("click", function(){ const sel = document.getElementById("inphusion-select"); if(!sel.value){ alert("Please select an InphusionSys scenario first."); return; } const [file, vert] = sel.value.split("|"); fetch("/api/inphusionsys/run-live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relativePath: file, vertical: vert }) }).then(r => r.json()).then(data => { const txt = document.querySelector("textarea") || document.getElementById("ticket-description"); if(txt && data.raw_payload) { txt.value = data.raw_payload; } alert("Loaded [" + vert + "] Anomaly Payload!\nAudit Hash Generated: " + data.audit_hash); }).catch(e => { console.error("Error loading scenario:", e); }); }); });</script>'

sed -i "s|</body>|${JS_SCRIPT}\n</body>|" "$TARGET_HTML"

echo "✓ InphusionSys switcher successfully placed above Ticket Description!"
