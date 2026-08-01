#!/usr/bin/env python3
"""Apply-script: add explainability panel to L1 Ticket Copilot, grounded in
real ticket fields the /analyze route consumed + the model's own confidence/
severity/likely_causes output. Wired into renderAnalysis.
Run from repo root: python3 apply_l1_copilot_explain.py
"""
import pathlib

FILE = pathlib.Path("html/l1-copilot/l1-ticket-copilot.html")
src = FILE.read_text()

edits = []

# 1. CSS
edits.append((
".ai-output .err{color:var(--red)}",
""".ai-output .err{color:var(--red)}
#explainPanel:empty{display:none}
.explain-panel{margin-top:10px;border:1px solid var(--border);border-radius:6px;padding:10px 12px;background:var(--bg3)}
.explain-title{font-size:9px;letter-spacing:1.2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px}
.explain-row{padding:5px 0;border-top:1px solid var(--border)}
.explain-row:first-of-type{border-top:none}
.explain-label{font-size:9px;font-weight:700;letter-spacing:.8px;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:2px}
.explain-text{font-size:11px;line-height:1.6;color:var(--text)}"""
))

# 2. HTML container
edits.append((
"""          </div>
          <div class="btn-row">
            <button class="btn btn-outline" id="btnReanalyze">RE-RUN ANALYSIS</button>
            <button class="btn btn-ghost" id="btnSendToTroubleshoot">SEND TO GUIDED TROUBLESHOOTING →</button>
          </div>""",
"""          </div>
          <div id="explainPanel"></div>
          <div class="btn-row">
            <button class="btn btn-outline" id="btnReanalyze">RE-RUN ANALYSIS</button>
            <button class="btn btn-ghost" id="btnSendToTroubleshoot">SEND TO GUIDED TROUBLESHOOTING →</button>
          </div>"""
))

# 3. Clear panel on ticket reset
edits.append((
"""    document.getElementById('aiOutput').textContent = 'Run AI analysis from the Ticket tab to populate this panel.';
    ['kpiConfidence','kpiSeverity','kpiSystem','kpiImpact'].forEach(id => document.getElementById(id).textContent = '--');""",
"""    document.getElementById('aiOutput').textContent = 'Run AI analysis from the Ticket tab to populate this panel.';
    ['kpiConfidence','kpiSeverity','kpiSystem','kpiImpact'].forEach(id => document.getElementById(id).textContent = '--');
    document.getElementById('explainPanel').innerHTML = '';"""
))

# 4. escapeHtml + getExplainItems + renderExplainItems + wire into renderAnalysis
edits.append((
"""  function renderAnalysis(a){
    const out = document.getElementById('aiOutput');
    out.className = 'ai-output';
    const causes = Array.isArray(a.likely_causes) ? a.likely_causes.join(', ') : (a.likely_causes || '--');
    out.textContent =
      `ISSUE SUMMARY\\n${a.issue_summary || '--'}\\n\\n` +
      `LIKELY ROOT CAUSE\\n${causes}\\n\\n` +
      `RECOMMENDED PATH\\n${a.recommended_path || '--'}`;
    document.getElementById('kpiConfidence').textContent = a.confidence != null ? a.confidence + '%' : '--';
    const sevEl = document.getElementById('kpiSeverity');
    sevEl.textContent = a.severity || '--';
    sevEl.className = 'kpi-value ' + (a.severity === 'Critical' || a.severity === 'High' ? 'bad' : a.severity === 'Medium' ? 'warn' : 'good');
    document.getElementById('kpiSystem').textContent = a.affected_system || '--';
    document.getElementById('kpiImpact').textContent = a.business_impact || '--';
  }""",
"""  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // getExplainItems: cites only the real ticket fields the /analyze route
  // actually sent to the model, plus the model's own confidence/severity/
  // likely_causes output -- nothing here is invented narrative.
  function getExplainItems(a){
    const ticket = {
      incident: document.getElementById('tkIncident').value,
      priority: document.getElementById('tkPriority').value,
      requester: document.getElementById('tkRequester').value,
      department: document.getElementById('tkDept').value,
      asset: document.getElementById('tkAsset').value,
      manufacturer: document.getElementById('tkMfr').value,
      model: document.getElementById('tkModel').value,
      warranty: document.getElementById('tkWarranty').value
    };
    const provided = Object.entries(ticket).filter(([,v]) => v && String(v).trim()).map(([k]) => k);
    const causes = Array.isArray(a.likely_causes) ? a.likely_causes.join('; ') : (a.likely_causes || 'none identified');
    return [
      { label: 'Confidence', detail: `${a.confidence != null ? a.confidence + '%' : 'unscored'} — self-reported by the model, based on the description text and the ${provided.length} ticket field(s) that were filled in.` },
      { label: 'Severity driver', detail: `${a.severity || 'unscored'} severity, driven by: ${causes}.` },
      { label: 'Affected system', detail: `${a.affected_system || 'unspecified'}${ticket.asset ? ' — asset ' + ticket.asset : ''}${ticket.manufacturer ? ' (' + ticket.manufacturer + (ticket.model ? ' ' + ticket.model : '') + ')' : ''}.` },
      { label: 'Grounded on', detail: provided.length ? `${provided.length} ticket field(s) provided: ${provided.join(', ')}.` : 'No structured ticket fields were filled in — analysis is based on the pasted description text only.' }
    ];
  }

  function renderExplainItems(items){
    return `<div class="explain-panel">
      <div class="explain-title">Why this assessment</div>
      ${items.map(it => `<div class="explain-row"><span class="explain-label">${escapeHtml(it.label)}</span><div class="explain-text">${escapeHtml(it.detail)}</div></div>`).join('')}
    </div>`;
  }

  function renderAnalysis(a){
    const out = document.getElementById('aiOutput');
    out.className = 'ai-output';
    const causes = Array.isArray(a.likely_causes) ? a.likely_causes.join(', ') : (a.likely_causes || '--');
    out.textContent =
      `ISSUE SUMMARY\\n${a.issue_summary || '--'}\\n\\n` +
      `LIKELY ROOT CAUSE\\n${causes}\\n\\n` +
      `RECOMMENDED PATH\\n${a.recommended_path || '--'}`;
    document.getElementById('kpiConfidence').textContent = a.confidence != null ? a.confidence + '%' : '--';
    const sevEl = document.getElementById('kpiSeverity');
    sevEl.textContent = a.severity || '--';
    sevEl.className = 'kpi-value ' + (a.severity === 'Critical' || a.severity === 'High' ? 'bad' : a.severity === 'Medium' ? 'warn' : 'good');
    document.getElementById('kpiSystem').textContent = a.affected_system || '--';
    document.getElementById('kpiImpact').textContent = a.business_impact || '--';
    document.getElementById('explainPanel').innerHTML = renderExplainItems(getExplainItems(a));
  }"""
))

for i, (old, new) in enumerate(edits, 1):
    count = src.count(old)
    assert count == 1, f"Edit {i}: match count {count} (expected 1)"
    src = src.replace(old, new, 1)

FILE.write_text(src)
print("Patched", FILE)
