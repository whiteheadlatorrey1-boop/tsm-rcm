#!/usr/bin/env python3
"""Apply-script: add condensed top-4 explainability cards to
concierge-executive-portal.html.
Run from repo root: python3 apply_concierge_exec_explain.py
"""
import pathlib

FILE = pathlib.Path("html/concierge/concierge-executive-portal.html")
src = FILE.read_text()

edits = []

edits.append((
"function renderPortfolio(portfolio){",
"""function renderExplainTop(explainItems){
  const items = (explainItems||[]).slice(0, 4);
  if(!items.length){
    return `<div class="sec"><div class="sec-hdr"><span class="lbl">WHY THESE ITEMS ARE FLAGGED</span></div><div class="no-items">Nothing currently flagged.</div></div>`;
  }
  const catLabel = {
    maintenance: 'Maintenance', ota_overcharge: 'OTA Overcharge', compliance: 'Compliance',
    iot: 'IoT Sensor', reservation: 'Reservation', front_desk: 'Front Desk', vip: 'VIP Readiness',
    housekeeping: 'Housekeeping', staffing: 'Staffing', incident: 'Incident', airbnb: 'Airbnb/STR'
  };
  const rows = items.map((it, idx) => `
    <div class="risk-item">
      <div class="risk-rank">${idx+1}</div>
      <div class="risk-body">
        <div class="risk-title"><b>${escapeHtml(catLabel[it.category] || it.category)}</b>${it.severity ? ' &mdash; ' + escapeHtml(it.severity.toUpperCase()) : ''}</div>
        <div class="risk-action">${escapeHtml(it.explain)}</div>
      </div>
    </div>`).join('');
  return `<div class="sec">
    <div class="sec-hdr"><span class="lbl">WHY THESE ITEMS ARE FLAGGED</span><span class="sec-hdr-note">top ${items.length} of ${(explainItems||[]).length}, by severity</span></div>
    ${rows}
  </div>`;
}

function renderPortfolio(portfolio){"""
))

edits.append((
"""  html += renderAirbnbRisks(data.airbnb_risks);
  html += renderPortfolio(data.portfolio);""",
"""  html += renderAirbnbRisks(data.airbnb_risks);
  html += renderExplainTop(data.explain_items);
  html += renderPortfolio(data.portfolio);"""
))

for i, (old, new) in enumerate(edits, 1):
    count = src.count(old)
    assert count == 1, f"Edit {i}: match count {count} (expected 1)"
    src = src.replace(old, new, 1)

FILE.write_text(src)
print("Patched", FILE)
