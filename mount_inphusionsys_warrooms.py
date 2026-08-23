#!/usr/bin/env python3
import re
import os
import json

# Explicit file mapping based on workspace directory scan
VERTICAL_FILE_MAP = {
    "HEALTHCARE": [
        "html/healthcare/hc-denial-war-room.html",
        "html/healthcare/hc-main-strategist.html",
        "html/healthcare-command.html"
    ],
    "CONSTRUCTION": [
        "construction.html",
        "html/construction-suite/construction-command-pro.html",
        "html/construction.html"
    ],
    "REAL_ESTATE": [
        "html/war-rooms/pm-copilot/pm-strategist.html",
        "html/war-rooms/re-war/re-war-room.html"
    ],
    "LEGAL": [
        "html/construction-suite/legal.html",
        "html/legal-main-strategist.html",
        "html/legal-pro/case-strategist.html"
    ],
    "FINOPS": [
        "html/finops-command-suite-v2.html",
        "html/finops-accounting.html",
        "html/finops-suite/finops-war/finops-war-room.html",
        "html/financial-command.html"
    ]
}

SCENARIOS = {
    "HEALTHCARE": [
        {"id": "HC_CLAIM_CO197", "label": "Healthcare: Claim CLM-88201 Denial (CO-197 Missing Pre-Auth)", "payload": "[INPHUSIONSYS ANOMALY DETECTED - HEALTHCARE]\nClaim ID: CLM-88201\nPayer: Horizon Mutual\nDenial Code: CO-197 (Pre-certification / Authorization Missing)\nPatient ID: PT-99021\nService Date: 2026-08-10\nAudit Note: Prior auth required for procedure CPT-74177. Urgent escalation needed.", "prompt": 'auditops "InphusionSys Healthcare - Claim CLM-88201 Denial: CO-197 Missing Auth" --logic=strategist'},
        {"id": "HC_TIMELY_FILING", "label": "Healthcare: Claim CLM-90112 Timely Filing SLA Risk", "payload": "[INPHUSIONSYS ANOMALY DETECTED - HEALTHCARE]\nClaim ID: CLM-90112\nPayer: Aetna Choice\nIssue: 82 Days Since Service Date (90-Day Timely Filing Limit)\nUnbilled Amount: $14,250.00\nAudit Note: High revenue leakage risk. Immediate clearinghouse submission required.", "prompt": 'auditops "InphusionSys Healthcare - Claim CLM-90112: 82-Day Timely Filing Risk" --logic=strategist'}
    ],
    "CONSTRUCTION": [
        {"id": "CN_CO_POISONED", "label": "Construction: Drywall CO #088 (+18.4% Overrun & Expired COI)", "payload": "[INPHUSIONSYS ANOMALY DETECTED - CONSTRUCTION]\nVendor: Apex Drywall Corp\nChange Order: CO #088\nBudget Variance: +18.4% (Threshold: 10.0%)\nPO Number: PO-88492\nStatus: Certificate of Insurance Expired on 2026-07-15\nAudit Note: Variance exceeds manager approval limit without CFO sign-off.", "prompt": 'auditops "InphusionSys Construction - Drywall CO #088: 18% Overrun & Expired COI" --logic=strategist'},
        {"id": "CN_MATERIAL_SPIKE", "label": "Construction: Structural Steel PO #9910 Variance Spike", "payload": "[INPHUSIONSYS ANOMALY DETECTED - CONSTRUCTION]\nVendor: Allied Steel Framing\nPO Number: PO-9910\nBudget Variance: +32.1% against original estimate\nAudit Note: Price escalation clause triggered without market benchmark justification.", "prompt": 'auditops "InphusionSys Construction - PO #9910: +32.1% Steel Escalation Anomaly" --logic=strategist'}
    ],
    "REAL_ESTATE": [
        {"id": "RE_SLA_BREACH", "label": "Real Estate: Unit U-103 (22d Vacancy & HVAC SLA Breach)", "payload": "[INPHUSIONSYS ANOMALY DETECTED - REAL ESTATE]\nProperty Unit: U-103\nVacant Duration: 22 Days (Target: < 7 Days)\nMaintenance Request: HVAC Repair SLA Breach (+8 hours over 24h limit)\nTenant Status: Lease Signed, Unit Uninhabitable\nAudit Note: Revenue loss warning triggered ($2,400/mo impact).", "prompt": 'auditops "InphusionSys Real Estate - Unit U-103: 22d Vacancy & HVAC SLA Breach" --logic=strategist'},
        {"id": "RE_LEASE_COMMISSION", "label": "Real Estate: Commercial Unit C-400 Lease Dispute", "payload": "[INPHUSIONSYS ANOMALY DETECTED - REAL ESTATE]\nTenant: Metro Retail Partners\nLease Escalation: Unscheduled +5% Rent Increase\nCompliance Status: Missing Tenant Estoppel Certificate\nAudit Note: Tenant disputing escalation index rate.", "prompt": 'auditops "InphusionSys Real Estate - Commercial Unit C-400 Rent Escalation Anomaly" --logic=strategist'}
    ],
    "LEGAL": [
        {"id": "LG_MSA_POISONED", "label": "Legal: MSA Contract Review (Unlimited Liability & Cayman Law)", "payload": "[INPHUSIONSYS ANOMALY DETECTED - LEGAL]\nDocument: Master Services Agreement (MSA_Review_v2.pdf)\nClause Flaw: Unlimited Indemnity Clause (Section 14.2)\nGoverning Law: Foreign Venue (Cayman Islands Jurisdiction)\nAudit Note: High risk rating. Standard clause requires liability cap at 1x contract value.", "prompt": 'auditops "InphusionSys Legal - MSA Vendor Contract: Unlimited Liability & Cayman Jurisdiction" --logic=strategist'},
        {"id": "LG_IP_ASSIGNMENT", "label": "Legal: Vendor SLA - Missing IP Assignment Clause", "payload": "[INPHUSIONSYS ANOMALY DETECTED - LEGAL]\nDocument: Software Consulting SOW #14\nVendor: DevCore Global\nFlaw: Section 8 omits Work-For-Hire Intellectual Property Assignment\nAudit Note: Potential IP ownership dispute upon code delivery.", "prompt": 'auditops "InphusionSys Legal - SOW #14 Missing Work-For-Hire IP Clause" --logic=strategist'}
    ],
    "FINOPS": [
        {"id": "FO_SPLIT_PO", "label": "FinOps: Split PO Threshold Evasion Fraud", "payload": "[INPHUSIONSYS ANOMALY DETECTED - FINOPS]\nVendor: Apex Tech Supplies\nTransaction ID: TXN-44910\nPattern: Split Purchase Order Fraud (3x $4,950 transactions in 12 hours)\nApproval Limit: $5,000 per PO\nAudit Note: Evasion of secondary approval threshold detected.", "prompt": 'auditops "InphusionSys FinOps - Vendor V-9082: Split PO Threshold Evasion Fraud" --logic=strategist'},
        {"id": "FO_DUPLICATE_INV", "label": "FinOps: Duplicate Invoice Billing Anomaly", "payload": "[INPHUSIONSYS ANOMALY DETECTED - FINOPS]\nVendor: CloudServe Infrastructure\nInvoice #: INV-99012 & INV-99012-A\nAmount: $18,400.00\nPattern: Identical line items submitted across separate billing cycles\nAudit Note: Duplicate payment risk flagged.", "prompt": 'auditops "InphusionSys FinOps - Invoice INV-99012 Duplicate Payment Flag" --logic=strategist'}
    ]
}

def resolve_target_path(candidates):
    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate
        # Secondary fallback search across tree
        file_name = os.path.basename(candidate)
        for root, _, files in os.walk("."):
            if file_name in files:
                return os.path.join(root, file_name)
    return None

for vert, candidate_paths in VERTICAL_FILE_MAP.items():
    path = resolve_target_path(candidate_paths)
    if not path:
        print(f"Skipping {vert} - No valid file target found.")
        continue

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    options_html = f'<option value="">-- Select InphusionSys {vert.title()} War Room Anomaly --</option>\n'
    scenarios_json = {}
    for sc in SCENARIOS[vert]:
        options_html += f'      <option value="{sc["id"]}">{sc["label"]}</option>\n'
        scenarios_json[sc["id"]] = sc

    bar_html = f'''
<!-- INPHUSIONSYS WAR ROOM CONTROL BAR -->
<div id="inphusionsys-warroom-bar" style="margin: 14px 0; padding: 12px 16px; background: rgba(0, 255, 204, 0.06); border: 1px solid #00ffcc; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
  <div style="display:flex; align-items:center; gap:10px;">
    <span style="color:#00ffcc; font-weight:bold; font-size:12px; letter-spacing:1px; font-family:monospace;">⚡ INPHUSIONSYS [{vert}] WAR ROOM SUITE:</span>
    <select id="inphusion-warroom-select" style="background:#0d1117; color:#00ffcc; border:1px solid #00ffcc; padding:6px 10px; border-radius:4px; font-size:12px; font-family:monospace;">
      {options_html}
    </select>
  </div>
  <button type="button" onclick="window.runInphusionWarRoomScenario()" style="background:#00ffcc; color:#000; border:none; padding:7px 14px; font-weight:bold; font-size:11px; border-radius:4px; cursor:pointer; font-family:monospace; letter-spacing:0.5px;">INJECT ANOMALY INTO WAR ROOM ⚡</button>
</div>
<!-- END INPHUSIONSYS WAR ROOM CONTROL BAR -->
'''

    script_html = f'''
<script>
const INPHUSION_WARROOM_SCENARIOS = {json.dumps(scenarios_json)};

window.runInphusionWarRoomScenario = function() {{
  const sel = document.getElementById("inphusion-warroom-select");
  if (!sel || !sel.value) {{
    alert("Please select an InphusionSys anomaly scenario for this War Room first.");
    return;
  }}
  const sc = INPHUSION_WARROOM_SCENARIOS[sel.value];
  if (!sc) return;

  const mainInput = document.querySelector("textarea") || document.getElementById("audit_input") || document.getElementById("documentText") || document.getElementById("promptInput");
  if (mainInput) {{
    mainInput.value = sc.payload;
    mainInput.dispatchEvent(new Event("input", {{ bubbles: true }}));
    mainInput.dispatchEvent(new Event("change", {{ bubbles: true }}));
  }}

  const searchInput = document.getElementById("globalSearch") || document.querySelector("input[type=search]") || document.getElementById("cmdInput");
  if (searchInput) {{
    searchInput.value = sc.prompt;
    searchInput.dispatchEvent(new Event("input", {{ bubbles: true }}));
  }}

  const runBtn = document.getElementById("run-analysis-btn") || document.getElementById("btn-analyze") || document.querySelector("button[type=submit]");
  if (runBtn) {{
    runBtn.click();
  }}

  alert("✓ Injected [" + sel.value + "] into {vert} War Room!\\nAudit Hash: AUD-INPH-" + Math.floor(Math.random()*90000 + 10000));
}};
</script>
'''

    content = re.sub(r'<!-- INPHUSIONSYS WAR ROOM CONTROL BAR -->.*?<!-- END INPHUSIONSYS WAR ROOM CONTROL BAR -->', '', content, flags=re.DOTALL)
    content = re.sub(r'<script>\s*const INPHUSION_WARROOM_SCENARIOS.*?</script>', '', content, flags=re.DOTALL)

    if "<body" in content:
        content = re.sub(r'(<body[^>]*>)', r'\1\n' + bar_html, content, count=1)
    else:
        content = bar_html + content

    if "</head>" in content:
        content = content.replace("</head>", f"{script_html}\n</head>", 1)
    else:
        content = script_html + content

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✓ Successfully mounted InphusionSys War Room Suite in {vert} -> ({path})")
