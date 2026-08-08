#!/usr/bin/env python3
"""Apply-script: add explainability panel to Legal case-strategist.html and
fix the hardcoded RISK/SLA badges to reflect the AI's own parsed output.
Run from repo root: python3 apply_legal_explain.py
"""
import pathlib

FILE = pathlib.Path("html/legal-pro/case-strategist.html")
src = FILE.read_text()

edits = []

# 1. HTML: explain-panel container after confidence bar
edits.append((
"""    <div class="confidence-bar">
      <div class="cb-label"><span>AI CONFIDENCE</span><span id="conf-pct">0%</span></div>
      <div class="cb-track"><div class="cb-fill" id="conf-fill"></div></div>
    </div>
    <div class="bnca-actions">""",
"""    <div class="confidence-bar">
      <div class="cb-label"><span>AI CONFIDENCE</span><span id="conf-pct">0%</span></div>
      <div class="cb-track"><div class="cb-fill" id="conf-fill"></div></div>
    </div>
    <div id="explain-panel"></div>
    <div class="bnca-actions">"""
))

# 2. CSS: explain-panel styles before EP LINK block
edits.append((
"/* EP LINK */",
"""/* EXPLAIN PANEL */
#explain-panel:empty{display:none}
.explain-panel{margin-top:14px;border:1px solid var(--b2);border-radius:10px;padding:12px 14px;background:rgba(255,255,255,.02)}
.explain-title{font-size:10px;letter-spacing:.12em;color:var(--m);margin-bottom:8px;font-weight:700}
.explain-row{display:flex;gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid var(--b2)}
.explain-row:first-of-type{border-top:none}
.explain-node{font-size:10px;font-weight:900;color:var(--a);letter-spacing:.08em;min-width:74px}
.explain-score{font-size:10px;color:var(--m);min-width:44px}
.explain-text{font-size:11px;color:var(--t);line-height:1.5;opacity:.85}

/* EP LINK */"""
))

# 3. JS globals: escapeHtml + getExplainItems + renderExplainItems + lastMatterMeta
edits.append((
"""let currentScenario = 'billing';
let lastBNCA = '';""",
"""let currentScenario = 'billing';
let lastBNCA = '';
let lastMatterMeta = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// getExplainItems: surfaces the real node scores and intake fields that fed
// this BNCA run, ranked by score — not narrative filler.
function getExplainItems(scenario, meta, conf) {
  const ranked = Object.entries(scenario.scores).sort((a, b) => b[1] - a[1]);
  return ranked.slice(0, 3).map(([node, score]) => ({
    node,
    score,
    explain: `${score}/100 in the ${scenario.name} scenario for ${meta.matterName} (${meta.matterType}, owner: ${meta.partner}, SLA pressure: ${meta.sla}, hours/financial at risk: ${meta.hoursRisk}) — factored into the ${conf}% confidence assessment.`
  }));
}

function renderExplainItems(items) {
  return `<div class="explain-panel">
    <div class="explain-title">TOP RISK DRIVERS · WHY THIS ASSESSMENT</div>
    ${items.map((it) => `<div class="explain-row">
      <span class="explain-node">${escapeHtml(it.node.toUpperCase())}</span>
      <span class="explain-score">${it.score}/100</span>
      <div class="explain-text">${escapeHtml(it.explain)}</div>
    </div>`).join('')}
  </div>`;
}"""
))

# 4. Capture real matter-intake meta in runBNCA
edits.append((
"""  const escalation = document.getElementById('escalation-priority').value;
  const scenario = SCENARIOS[currentScenario];""",
"""  const escalation = document.getElementById('escalation-priority').value;
  const scenario = SCENARIOS[currentScenario];
  lastMatterMeta = { matterName, matterType, partner, sla, hoursRisk, escalation };"""
))

# 5. finalizeBNCA: parse real RISK LEVEL / SLA PRESSURE, fix hardcoded badges,
#    render explain panel
edits.append((
"""  // Extract confidence
  const confMatch = text.match(/CONFIDENCE:\\s*(\\d+)%/i);
  const conf = confMatch ? parseInt(confMatch[1]) : 89;

  // Update stats
  document.getElementById('stat-matters').textContent = '4';
  document.getElementById('stat-risk').textContent = conf > 88 ? 'HIGH' : 'MED';
  document.getElementById('stat-conf').textContent = conf + '%';
  document.getElementById('conf-pct').textContent = conf + '%';
  document.getElementById('conf-fill').style.width = conf + '%';

  // Risk badge
  const riskBadge = document.getElementById('risk-badge');
  const slaBadge = document.getElementById('sla-badge');
  riskBadge.textContent = 'RISK: HIGH';
  riskBadge.style.color = '#ff4d6a';
  riskBadge.style.borderColor = 'rgba(255,77,106,.3)';
  slaBadge.textContent = 'SLA: PRESSURED';
  slaBadge.style.color = '#f5a623';""",
"""  // Extract confidence, risk level, and SLA pressure from the AI's own
  // structured output — this is the actual assessment it produced, not a
  // fixed placeholder.
  const confMatch = text.match(/CONFIDENCE:\\s*(\\d+)%/i);
  const conf = confMatch ? parseInt(confMatch[1]) : 89;
  const riskMatch = text.match(/RISK LEVEL:\\s*(CRITICAL|HIGH|MEDIUM|LOW)/i);
  const riskLevel = riskMatch ? riskMatch[1].toUpperCase() : 'MEDIUM';
  const slaMatch = text.match(/SLA PRESSURE:\\s*(.+)/i);
  const slaText = slaMatch ? slaMatch[1].trim().split(/\\n|─/)[0].slice(0, 40) : 'MONITORING';

  // Update stats
  document.getElementById('stat-matters').textContent = '4';
  document.getElementById('stat-risk').textContent = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'HIGH' : riskLevel === 'MEDIUM' ? 'MED' : 'LOW';
  document.getElementById('stat-conf').textContent = conf + '%';
  document.getElementById('conf-pct').textContent = conf + '%';
  document.getElementById('conf-fill').style.width = conf + '%';

  // Risk/SLA badges — now driven by the parsed AI assessment instead of a
  // hardcoded value, so they actually vary with the scenario/matter run.
  const riskBadge = document.getElementById('risk-badge');
  const slaBadge = document.getElementById('sla-badge');
  const riskColors = { CRITICAL: '#ff4d6a', HIGH: '#ff4d6a', MEDIUM: '#f5a623', LOW: '#00ffc6' };
  riskBadge.textContent = 'RISK: ' + riskLevel;
  riskBadge.style.color = riskColors[riskLevel] || '#f5a623';
  riskBadge.style.borderColor = (riskColors[riskLevel] || '#f5a623') + '4d';
  slaBadge.textContent = 'SLA: ' + slaText.toUpperCase();
  slaBadge.style.color = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? '#f5a623' : '#00ffc6';

  // Explainability panel — real node scores + intake fields + parsed confidence
  if (lastMatterMeta) {
    const scenario = SCENARIOS[currentScenario];
    const items = getExplainItems(scenario, lastMatterMeta, conf);
    document.getElementById('explain-panel').innerHTML = renderExplainItems(items);
  }"""
))

for i, (old, new) in enumerate(edits, 1):
    count = src.count(old)
    assert count == 1, f"Edit {i}: match count {count} (expected 1)"
    src = src.replace(old, new, 1)

FILE.write_text(src)
print("Patched", FILE)
