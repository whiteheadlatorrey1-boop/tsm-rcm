#!/usr/bin/env python3
import re
import os

target_path = "html/l1-copilot/l1-ticket-copilot.html"

if not os.path.exists(target_path):
    print(f"Error: {target_path} not found")
    exit(1)

with open(target_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Strip out all existing inphusionsys elements and script tags
content = re.sub(r'<div id="inphusionsys-bar".*?</div>', '', content, flags=re.DOTALL)
content = re.sub(r'<div id="inphusionsys-switcher".*?</div>', '', content, flags=re.DOTALL)
content = re.sub(r'<script>\s*window\.loadInphusionAnomaly.*?</script>', '', content, flags=re.DOTALL)

# 2. Define clean single UI element
clean_ui = '''<div id="inphusionsys-bar" style="margin: 12px 0; padding: 10px 14px; background: rgba(0, 255, 204, 0.08); border: 1px solid #00ffcc; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
  <div style="display:flex; align-items:center; gap:8px;">
    <span style="color:#00ffcc; font-weight:bold; font-size:12px; letter-spacing:1px; font-family:monospace;">⚡ INPHUSIONSYS ANOMALY SUITE:</span>
    <select id="inphusion-select" style="background:#0d1117; color:#00ffcc; border:1px solid #00ffcc; padding:4px 8px; border-radius:3px; font-size:12px; font-family:monospace;">
      <option value="">-- Select InphusionSys Vertical Test Anomaly --</option>
      <option value="construction/CN_CO_Poisoned_Variance.txt|CONSTRUCTION">Construction: Drywall CO #088 (18% Overrun & Expired COI)</option>
      <option value="healthcare/HC_Claim_Denial_CO197.txt|HEALTHCARE">Healthcare: Claim CLM-88201 (CO-197 Missing Auth)</option>
      <option value="finops/FO_Split_PO_Fraud.txt|FINOPS">FinOps: Split PO Fraud (Threshold Evasion)</option>
      <option value="real-estate/RE_SLA_Breach_U103.txt|REAL_ESTATE">Real Estate: Unit U-103 (22d Vacant & SLA Breach)</option>
      <option value="legal/LG_MSA_Poisoned_Indemnity.txt|LEGAL">Legal: MSA Review (Unlimited Liability & Foreign Venue)</option>
    </select>
  </div>
  <button id="inphusion-load-btn" type="button" onclick="window.loadInphusionAnomaly()" style="background:#00ffcc; color:#000; border:none; padding:6px 14px; font-weight:bold; font-size:11px; border-radius:3px; cursor:pointer; font-family:monospace;">LOAD ANOMALY INTO TICKET</button>
</div>'''

# 3. Define robust JavaScript handler
js_script = '''<script>
window.loadInphusionAnomaly = function() {
  const sel = document.getElementById("inphusion-select");
  if (!sel || !sel.value) {
    alert("Please select an InphusionSys anomaly scenario first.");
    return;
  }
  const [file, vert] = sel.value.split("|");
  
  fetch("/api/inphusionsys/run-live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ relativePath: file, vertical: vert })
  })
  .then(r => r.json())
  .then(data => {
    const targetBox = document.querySelector("textarea") || document.getElementById("ticket_desc") || document.getElementById("ticketDescription");
    if (targetBox && data.raw_payload) {
      targetBox.value = data.raw_payload;
      targetBox.dispatchEvent(new Event("input", { bubbles: true }));
      targetBox.dispatchEvent(new Event("change", { bubbles: true }));
    }
    alert("✓ Loaded [" + vert + "] Anomaly Payload!\\nCryptographic Audit Hash: " + data.audit_hash);
  })
  .catch(err => {
    console.error("InphusionSys Load Error:", err);
    alert("Error loading scenario. Ensure backend server is running on port 8080.");
  });
};
</script>'''

# 4. Inject into HTML content
if "TICKET DESCRIPTION" in content:
    content = content.replace("TICKET DESCRIPTION", f"{clean_ui}\nTICKET DESCRIPTION", 1)
else:
    content = content.replace("</body>", f"{clean_ui}\n</body>", 1)

content = content.replace("</head>", f"{js_script}\n</head>", 1)

with open(target_path, "w", encoding="utf-8") as f:
    f.write(content)

print("✓ Successfully cleaned duplicates and installed Python-verified InphusionSys handler!")
