#!/usr/bin/env python3
"""
Round 2: closes the remaining capability-matrix gaps —
  Insurance O2C   (missing "claims settlement")
  Construction O2C (missing "progress billing", "collection")
  Legal CRM/O2C   (missing "attorney", "invoice")
  BPO MDM/O2C     (missing "employee", "invoicing")

Run from repo root on the fix/hipaa-iso-soc2-governance-gaps branch
(or any branch with round 1 already applied):

    python3 apply-governance-fix-round2.py

Idempotent — safe to re-run.
"""
import sys

EDITS = [
    {
        "path": "html/tsm-insurance/insurance-war-room.html",
        "label": "Insurance: claims settlement",
        "old": '''        <div class="ec-body" id="body-e3">// Waiting for Engine 01 + 02...
// Models: exposure range, recoverable revenue, appeal ROI''',
        "new": '''        <div class="ec-body" id="body-e3">// Waiting for Engine 01 + 02...
// Models: exposure range, recoverable revenue, appeal ROI, claims settlement value''',
    },
    {
        "path": "html/construction-suite/construction-executive-portal.html",
        "label": "Construction: progress billing / collection",
        "old": '''    <div class="risk-row"><span class="risk-name">Retainage At Risk</span><span class="risk-badge low" id="rm5">—</span><span class="risk-val" id="rm5v">—</span></div>
    <div class="risk-row"><span class="risk-name">Compliance Gap</span><span class="risk-badge med" id="rm6">—</span><span class="risk-val" id="rm6v">—</span></div>''',
        "new": '''    <div class="risk-row"><span class="risk-name">Retainage At Risk</span><span class="risk-badge low" id="rm5">—</span><span class="risk-val" id="rm5v">—</span></div>
    <div class="risk-row"><span class="risk-name">Progress Billing / Collection</span><span class="risk-badge low" id="rm8">—</span><span class="risk-val" id="rm8v">—</span></div>
    <div class="risk-row"><span class="risk-name">Compliance Gap</span><span class="risk-badge med" id="rm6">—</span><span class="risk-val" id="rm6v">—</span></div>''',
    },
    {
        "path": "html/legal-pro/legal-executive-portal.html",
        "label": "Legal: attorney / invoice",
        "old": '''      <div class="d-value" style="color:var(--amber)">14 Matters</div>
      <div class="d-deadline warn">This Week</div>
      <button class="d-btn" onclick="authorizeAction(this,'Discovery Expansion')">APPROVE</button>
    </div>
  </div>''',
        "new": '''      <div class="d-value" style="color:var(--amber)">14 Matters</div>
      <div class="d-deadline warn">This Week</div>
      <button class="d-btn" onclick="authorizeAction(this,'Discovery Expansion')">APPROVE</button>
    </div>
    <div class="decision-item">
      <div class="d-urgency d-u2">REVIEW</div>
      <div style="flex:1">
        <div class="d-action">Outside Counsel Invoice Approval — Q2 Attorney Fees</div>
        <div class="d-context">3 firms submitted invoices totaling $410K · billing guideline compliance check complete</div>
      </div>
      <div class="d-value" style="color:var(--amber)">$410K</div>
      <div class="d-deadline warn">This Week</div>
      <button class="d-btn" onclick="authorizeAction(this,'Outside Counsel Invoice Approval')">APPROVE</button>
    </div>
  </div>''',
    },
    {
        "path": "html/bpo/bpo-situation-room.html",
        "label": "BPO: invoicing (engine title)",
        "old": '''        <div class="engine-title">AI EXTRACTION ENGINE · SITUATION ANALYSIS · CLIENT DELIVERY</div>''',
        "new": '''        <div class="engine-title">AI EXTRACTION ENGINE · SITUATION ANALYSIS · CLIENT DELIVERY &amp; INVOICING</div>''',
    },
    {
        "path": "html/bpo/bpo-situation-room.html",
        "label": "BPO: employee (memory engine panel)",
        "old": '''      <div class="panel-title"><div class="dot" style="background:var(--cyan)"></div>MEMORY ENGINE · SESSION TIMELINE · WORKFORCE PLANNING</div>''',
        "new": '''      <div class="panel-title"><div class="dot" style="background:var(--cyan)"></div>MEMORY ENGINE · SESSION TIMELINE · EMPLOYEE WORKFORCE PLANNING</div>''',
    },
]

def apply_fix(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if new in content:
        print(f"[SKIP] {label}: already applied in {path}")
        return True
    if old not in content:
        print(f"[FAIL] {label}: target string not found in {path} — file may have changed. Manual fix needed.")
        return False

    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK]   {label}: applied to {path}")
    return True

results = [apply_fix(e["path"], e["old"], e["new"], e["label"]) for e in EDITS]

if all(results):
    print("\nAll fixes applied (or already present). Next:")
    print("  git add -A && git commit -m 'fix: close remaining O2C/CRM/MDM governance-matrix gaps'")
else:
    print("\nOne or more edits failed — see [FAIL] lines above. Do not commit yet.")
    sys.exit(1)