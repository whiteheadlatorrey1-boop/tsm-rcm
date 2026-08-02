#!/usr/bin/env python3
"""
Wires html/finops-suite/compliance.html into TSMMemory:
  1. Loads tsm-memory-engine.js (matches the /shared/... path convention
     used by supplier-vendor-situation-room.html and logistics-situation-room.html).
  2. Registers the 4 static Priority Alerts as anomalies on load, guarded
     against duplicate registration on repeat visits (checks for an
     already-open anomaly with the same code before writing a new one).
  3. Wires aiScanRisks() (the AI-detected risk flags) to also register
     each finding as an anomaly, so ad-hoc AI-surfaced risks aren't lost.

Run from repo root:
    python3 apply_compliance_memory_wiring.py
"""
import pathlib
import sys

TARGET = pathlib.Path("html/finops-suite/compliance.html")

# ── Anchor 1: add the memory-engine script tag ──────────────────────────
OLD_1 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n'
NEW_1 = OLD_1 + '<script src="/shared/tsm-memory-engine.js?v=phase3"></script>\n'

# ── Anchor 2: register the static Priority Alerts as anomalies ─────────
OLD_2 = """document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
});
window.addEventListener('load', () => {
  document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
});
"""

NEW_2 = OLD_2 + """
// ===== TSM MEMORY: REGISTER PRIORITY ALERTS AS ANOMALIES =====
// Mirrors the Priority Alerts panel above so RCM-OS (and any other reader
// of TSMMemory) can see compliance risk without scraping the DOM. Guarded
// against re-registering the same still-open anomaly on every page load.
const COMPLIANCE_STATIC_ALERTS = [
  { anomalyCode: 'SOX_ENDPOINT_FAILURE', severity: 'CRITICAL',
    title: 'SOX Mapping Endpoint Failure — legacy interface in critical state',
    meta: { exposure: '$240K penalty', framework: 'SOX' } },
  { anomalyCode: 'KYC_AML_DEGRADATION', severity: 'HIGH',
    title: 'KYC/AML Performance Degradation — 150ms latency, 3 verifications blocked',
    meta: { exposure: 'BSA risk', framework: 'AML/KYC' } },
  { anomalyCode: 'OIG_EXCLUSION_OVERDUE', severity: 'HIGH',
    title: 'OIG Exclusion Screening Overdue — 47 staff since Jan 15',
    meta: { exposure: '$1.9M risk', framework: 'OIG/CMS' } },
  { anomalyCode: 'HIPAA_BAA_GAP', severity: 'MEDIUM',
    title: 'HIPAA BAA Gap — 2 business associates missing signed agreements',
    meta: { exposure: 'HIGH priority', framework: 'HIPAA' } }
];

function registerComplianceAnomaliesInMemory() {
  if (!window.TSMMemory) return;
  const existing = window.TSMMemory.get();
  const openCodes = new Set(
    (existing?.anomalies || [])
      .filter(a => a.status === 'open' && a.entityType === 'compliance-flag')
      .map(a => a.anomalyCode)
  );
  COMPLIANCE_STATIC_ALERTS.forEach(alert => {
    if (openCodes.has(alert.anomalyCode)) return;
    window.TSMMemory.registerAnomaly({
      entityType: 'compliance-flag',
      entityId: alert.anomalyCode,
      anomalyCode: alert.anomalyCode,
      title: alert.title,
      severity: alert.severity,
      source: 'compliance-dashboard',
      meta: alert.meta
    });
  });
}
registerComplianceAnomaliesInMemory();
"""

# ── Anchor 3: register AI-detected risks (aiScanRisks) as anomalies too ─
OLD_3 = """    let risks = [];
    try {
      const clean = result.replace(/```json|```/g,'').trim();
      risks = JSON.parse(clean);
    } catch { risks = [{severity:'medium', text: result.slice(0,200)}]; }
    const flagsEl = document.getElementById('riskFlags');
    risks.forEach(r => {
      const div = document.createElement('div');
      div.className = `alert-item ${r.severity}`;
      div.style.padding = '8px 12px';
      div.innerHTML = `<span class=\\"alert-badge ${r.severity}\\"></span>${r.severity.toUpperCase()}</span><span class=\\"alert-text\\" style=\\"font-size:0.78rem\\">${r.text}</span>`;
      flagsEl.appendChild(div);
    });
"""

# NOTE: the innerHTML line above intentionally will NOT match (it has a
# deliberately broken tag) so this anchor is verified against the real
# file content below instead of assumed from memory.
OLD_3_REAL = """    let risks = [];
    try {
      const clean = result.replace(/```json|```/g,'').trim();
      risks = JSON.parse(clean);
    } catch { risks = [{severity:'medium', text: result.slice(0,200)}]; }
    const flagsEl = document.getElementById('riskFlags');
    risks.forEach(r => {
      const div = document.createElement('div');
      div.className = `alert-item ${r.severity}`;
      div.style.padding = '8px 12px';
      div.innerHTML = `<span class="alert-badge ${r.severity}">${r.severity.toUpperCase()}</span><span class="alert-text" style="font-size:0.78rem">${r.text}</span>`;
      flagsEl.appendChild(div);
    });
"""

NEW_3_REAL = """    let risks = [];
    try {
      const clean = result.replace(/```json|```/g,'').trim();
      risks = JSON.parse(clean);
    } catch { risks = [{severity:'medium', text: result.slice(0,200)}]; }
    const flagsEl = document.getElementById('riskFlags');
    risks.forEach(r => {
      const div = document.createElement('div');
      div.className = `alert-item ${r.severity}`;
      div.style.padding = '8px 12px';
      div.innerHTML = `<span class="alert-badge ${r.severity}">${r.severity.toUpperCase()}</span><span class="alert-text" style="font-size:0.78rem">${r.text}</span>`;
      flagsEl.appendChild(div);
      if (window.TSMMemory) {
        window.TSMMemory.registerAnomaly({
          entityType: 'compliance-flag',
          entityId: 'ai_risk_' + r.text.slice(0,40).replace(/[^a-z0-9]+/gi,'_').toLowerCase(),
          anomalyCode: 'AI_DETECTED_RISK',
          title: r.text,
          severity: (r.severity || 'medium').toUpperCase(),
          source: 'compliance-ai-scan',
          meta: {}
        });
      }
    });
"""

def main():
    if not TARGET.exists():
        print(f"ERROR: {TARGET} not found. Run this from the repo root.")
        sys.exit(1)

    text = TARGET.read_text()

    assert text.count(OLD_1) == 1, "Anchor 1 (script tag) not found or not unique"
    assert text.count(OLD_2) == 1, "Anchor 2 (load listeners) not found or not unique"
    assert text.count(OLD_3_REAL) == 1, "Anchor 3 (aiScanRisks loop) not found or not unique"

    text = text.replace(OLD_1, NEW_1)
    text = text.replace(OLD_2, NEW_2)
    text = text.replace(OLD_3_REAL, NEW_3_REAL)

    TARGET.write_text(text)
    print(f"Patched {TARGET} (3 insertions)")

if __name__ == "__main__":
    main()
