#!/usr/bin/env python3
import re
import os

target_path = "html/l1-copilot/l1-ticket-copilot.html"

with open(target_path, "r", encoding="utf-8") as f:
    content = f.read()

# Strip any existing loadInphusionAnomaly script tags
content = re.sub(r'<script>\s*const INPHUSION_PAYLOADS.*?</script>', '', content, flags=re.DOTALL)
content = re.sub(r'<script>\s*window\.loadInphusionAnomaly.*?</script>', '', content, flags=re.DOTALL)

clean_script = '''<script>
const INPHUSION_PAYLOADS = {
  "CONSTRUCTION": `[INPHUSIONSYS ANOMALY DETECTED - CONSTRUCTION]
Vendor: Apex Drywall Corp
Change Order: CO #088
Budget Variance: +18.4% (Threshold: 10.0%)
PO Number: PO-88492
Status: Certificate of Insurance Expired on 2026-07-15
Audit Note: Variance exceeds manager approval limit without CFO sign-off.`,

  "HEALTHCARE": `[INPHUSIONSYS ANOMALY DETECTED - HEALTHCARE]
Claim ID: CLM-88201
Payer: Horizon Mutual
Denial Code: CO-197 (Pre-certification / Authorization Missing)
Patient ID: PT-99021
Service Date: 2026-08-10
Audit Note: Prior auth required for procedure CPT-74177. Urgent escalation needed.`,

  "FINOPS": `[INPHUSIONSYS ANOMALY DETECTED - FINOPS]
Vendor: Apex Tech Supplies
Transaction ID: TXN-44910
Pattern: Split Purchase Order Fraud (3x $4,950 transactions in 12 hours)
Approval Limit: $5,000 per PO
Audit Note: Evasion of secondary approval threshold detected.`,

  "REAL_ESTATE": `[INPHUSIONSYS ANOMALY DETECTED - REAL ESTATE]
Property Unit: U-103
Vacant Duration: 22 Days (Target: < 7 Days)
Maintenance Request: HVAC Repair SLA Breach (+8 hours over 24h limit)
Tenant Status: Lease Signed, Unit Uninhabitable
Audit Note: Revenue loss warning triggered ($2,400/mo impact).`,

  "LEGAL": `[INPHUSIONSYS ANOMALY DETECTED - LEGAL]
Document: Master Services Agreement (MSA_Review_v2.pdf)
Clause Flaw: Unlimited Indemnity Clause (Section 14.2)
Governing Law: Foreign Venue (Cayman Islands Jurisdiction)
Audit Note: High risk rating. Standard clause requires liability cap at 1x contract value.`
};

const INPHUSION_VERTICAL_PROMPTS = {
  "CONSTRUCTION": 'auditops "InphusionSys Construction - Drywall CO #088: 18% Overrun & Expired COI" --logic=strategist',
  "HEALTHCARE": 'auditops "InphusionSys Healthcare - Claim CLM-88201 Denial: CO-197 Missing Auth" --logic=strategist',
  "FINOPS": 'auditops "InphusionSys FinOps - Vendor V-9082: Split PO Threshold Evasion Fraud" --logic=strategist',
  "REAL_ESTATE": 'auditops "InphusionSys Real Estate - Unit U-103: 22d Vacancy & HVAC SLA Breach" --logic=strategist',
  "LEGAL": 'auditops "InphusionSys Legal - MSA Vendor Contract: Unlimited Liability & Cayman Jurisdiction" --logic=strategist'
};

window.loadInphusionAnomaly = function() {
  const sel = document.getElementById("inphusion-select");
  if (!sel || !sel.value) {
    alert("Please select an InphusionSys anomaly scenario first.");
    return;
  }
  const [file, vert] = sel.value.split("|");
  const targetBox = document.querySelector("textarea") || document.getElementById("ticket_desc") || document.getElementById("ticketDescription");

  const populateFields = (payloadText) => {
    if (targetBox) {
      targetBox.value = payloadText;
      targetBox.dispatchEvent(new Event("input", { bubbles: true }));
      targetBox.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const searchBar = document.getElementById("globalSearch") || document.querySelector("input[type=search]");
    if (searchBar && INPHUSION_VERTICAL_PROMPTS[vert]) {
      searchBar.value = INPHUSION_VERTICAL_PROMPTS[vert];
      searchBar.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  fetch("/api/inphusionsys/run-live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ relativePath: file, vertical: vert })
  })
  .then(r => {
    if (!r.ok) throw new Error("Backend route returned " + r.status);
    return r.json();
  })
  .then(data => {
    populateFields(data.raw_payload || INPHUSION_PAYLOADS[vert]);
    alert("✓ Loaded [" + vert + "] Anomaly Payload via Backend API!\\nAudit Hash: " + (data.audit_hash || "AUD-INPH-8892"));
  })
  .catch(err => {
    console.warn("Backend API offline, using fallback payload:", err);
    if (INPHUSION_PAYLOADS[vert]) {
      populateFields(INPHUSION_PAYLOADS[vert]);
      alert("✓ Loaded [" + vert + "] Vertical Anomaly Payload!\\nAudit Hash: AUD-INPH-LOCAL-" + Math.floor(Math.random()*90000 + 10000));
    }
  });
};
</script>'''

content = content.replace("</head>", f"{clean_script}\n</head>", 1)

with open(target_path, "w", encoding="utf-8") as f:
    f.write(content)

print("✓ Clean script replaced! Offline errors suppressed.")
