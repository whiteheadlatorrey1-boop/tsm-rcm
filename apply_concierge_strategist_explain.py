#!/usr/bin/env python3
"""Apply-script: add the full explainability table to concierge-strategist.html.
Run from repo root: python3 apply_concierge_strategist_explain.py
"""
import pathlib

FILE = pathlib.Path("html/concierge/concierge-strategist.html")
src = FILE.read_text()

edits = []

edits.append((
"function renderLiveMissionsRegister(){",
"""function renderExplainItems(items){
  if(!items || !items.length){
    return `<div class="sec"><div class="sec-hdr"><span class="lbl">EXPLAINABILITY &mdash; WHY EACH ITEM IS FLAGGED</span></div><div class="no-items">Nothing currently flagged.</div></div>`;
  }
  const catLabel = {
    maintenance: 'Maintenance', ota_overcharge: 'OTA Overcharge', compliance: 'Compliance',
    iot: 'IoT Sensor', reservation: 'Reservation', front_desk: 'Front Desk', vip: 'VIP Readiness',
    housekeeping: 'Housekeeping', staffing: 'Staffing', incident: 'Incident', airbnb: 'Airbnb/STR'
  };
  const rows = items.map(it => `<tr>
    <td>${escapeHtml(catLabel[it.category] || it.category)}</td>
    <td>${it.severity ? `<span class="impact">${escapeHtml(it.severity.toUpperCase())}</span>` : ''}</td>
    <td>${escapeHtml(it.explain)}</td>
  </tr>`).join('');
  return `<div class="sec">
    <div class="sec-hdr"><span class="lbl">EXPLAINABILITY &mdash; WHY EACH ITEM IS FLAGGED</span><span class="sec-hdr-note">${items.length} flagged, sorted by severity</span></div>
    <table class="aq-table">
      <thead><tr><th>Category</th><th>Severity</th><th>Reason (real per-record data)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderLiveMissionsRegister(){"""
))

edits.append((
"""  html += renderAirbnbRegister(data.airbnb_risks ? data.airbnb_risks.items : []);
  html += renderLiveMissionsRegister();""",
"""  html += renderAirbnbRegister(data.airbnb_risks ? data.airbnb_risks.items : []);
  html += renderExplainItems(data.explain_items);
  html += renderLiveMissionsRegister();"""
))

for i, (old, new) in enumerate(edits, 1):
    count = src.count(old)
    assert count == 1, f"Edit {i}: match count {count} (expected 1)"
    src = src.replace(old, new, 1)

FILE.write_text(src)
print("Patched", FILE)
