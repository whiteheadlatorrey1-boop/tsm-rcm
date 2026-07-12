#!/usr/bin/env python3
"""Phase 1: replicate the BPO Quality Score wiring (Phase 0) into the 6
templated exec portals. Same three-point patch each time:
  1. Quality Score Engine script tag + canonical-source comment
  2. renderQualityScore() function definition
  3. mount hook ahead of the risk register in render()
Anchor-string matching with assert count == 1 guards, per repo convention.
"""
import sys

VERTICALS = ["approval", "catalog", "cpq", "crm", "mdm", "o2c"]

SCRIPT_TAG_ANCHOR = '<script src="/html/shared/tsm-exec-framework.js"></script>\n<script>\nfunction tick(){document.getElementById(\'clock\').textContent=new Date().toLocaleTimeString();}'

RENDER_FN_ANCHOR = "function render(){\n  const data = loadRelay();"

RISK_REGISTER_ANCHOR = """  if(CFG.explainPath && window.TSMExecFramework){
    const explainItems = getPath(data, CFG.explainPath);
    html += TSMExecFramework.renderRiskRegister(explainItems, { isExec: CFG.isExec });
  }"""

QS_FUNCTION = """// Wires the shared Quality Score Engine to whatever explain items this
// portal already fetches for the risk register (CFG.explainPath), so it's
// one score per relay payload, not a second data path to keep in sync.
function renderQualityScore(explainItems, recordCount){
  if(!window.TSMQualityScoreEngine) return '';
  const q = TSMQualityScoreEngine.fromExplainItems(explainItems || [], { recordCount: recordCount });
  const bandCls = (q.band==='EXCELLENT'||q.band==='STRONG') ? 'green' : (q.band==='ACCEPTABLE') ? 'amber' : 'red';
  const tiles = [
    { val: q.overall, lbl: 'OVERALL' },
    { val: q.accuracy, lbl: 'ACCURACY' },
    { val: q.completeness, lbl: 'COMPLETENESS' },
    { val: q.compliance, lbl: 'COMPLIANCE' },
    { val: q.confidence, lbl: 'CONFIDENCE' }
  ];
  const tileHtml = tiles.map(t=>`<div class="kpi"><div class="kpi-val ${dynamicCls(t.val)}">${t.val}</div><div class="kpi-lbl">${t.lbl}</div></div>`).join('');
  const reasonsHtml = (q.reasons && q.reasons.length)
    ? q.reasons.map(r=>`<div class="list-row"><span class="lbadge">${escapeHtml(String(r.severity).toUpperCase())}</span><span>${escapeHtml(r.claim)}</span></div>`).join('')
    : '<div class="no-items">No open findings driving the score down.</div>';
  return `<div class="sec">
    <div class="sec-hdr">TSM QUALITY SCORE<span class="lbadge" style="margin-left:auto;background:transparent;border-color:var(--${bandCls});color:var(--${bandCls});">${q.band}</span></div>
    <div class="kpi-row">${tileHtml}</div>
    ${reasonsHtml}
  </div>`;
}

"""

QS_MOUNT = """  if(CFG.explainPath){
    const explainItems = getPath(data, CFG.explainPath);
    html += renderQualityScore(explainItems, kpiBase.record_count);
    if(window.TSMExecFramework){
      html += TSMExecFramework.renderRiskRegister(explainItems, { isExec: CFG.isExec });
    }
  }"""


def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()

    assert src.count(SCRIPT_TAG_ANCHOR) == 1, f"{path}: script-tag anchor not found exactly once"
    assert src.count(RENDER_FN_ANCHOR) == 1, f"{path}: render() anchor not found exactly once"
    assert src.count(RISK_REGISTER_ANCHOR) == 1, f"{path}: risk-register anchor not found exactly once"

    new_script_tag = (
        '<script src="/html/shared/tsm-exec-framework.js"></script>\n'
        '<!-- canonical source: ' + path + ' -->\n'
        '<script src="/html/shared/tsm-quality-score-engine.js"></script>\n'
        "<script>\nfunction tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString();}"
    )
    src = src.replace(SCRIPT_TAG_ANCHOR, new_script_tag, 1)

    src = src.replace(RENDER_FN_ANCHOR, QS_FUNCTION + RENDER_FN_ANCHOR, 1)

    src = src.replace(RISK_REGISTER_ANCHOR, QS_MOUNT, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"patched: {path}")


if __name__ == "__main__":
    for v in VERTICALS:
        patch(f"html/war-rooms/{v}/{v}-executive-portal.html")
    print(f"\nDone. {len(VERTICALS)} files patched.")
