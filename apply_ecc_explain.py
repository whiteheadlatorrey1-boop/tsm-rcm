#!/usr/bin/env python3
"""Apply-script: add getExplainItems/renderExplainItems to Enterprise Command
Center's risk panel. Run from repo root: python3 apply_ecc_explain.py
"""
import pathlib

FILE = pathlib.Path("html/l1-copilot/enterprise-command-center.html")
src = FILE.read_text()

OLD_JS = """  function renderRisk(summary, items) {
    document.getElementById('risk-stats').innerHTML = `
      <div class="intel-stat"><div class="intel-stat-label">Normal</div><div class="intel-stat-val" style="color:#3ecf8e">${summary.normal}</div></div>
      <div class="intel-stat"><div class="intel-stat-label">Elevated</div><div class="intel-stat-val" style="color:#f5a623">${summary.elevated}</div></div>
      <div class="intel-stat"><div class="intel-stat-label">Critical</div><div class="intel-stat-val" style="color:#e5484d">${summary.critical}</div></div>
      <div class="intel-stat"><div class="intel-stat-label">Avg Score</div><div class="intel-stat-val" style="color:#00e5ff">${summary.avgScore}</div></div>
    `;
    const listEl = document.getElementById('risk-list');
    const sorted = [...items].sort((a, b) => b.riskScore - a.riskScore);
    listEl.innerHTML = sorted.length ? sorted.map((it) => `
      <div class="intel-list-row">
        <span title="${it.message}">${it.message}</span>
        <span class="risk-badge tier-${it.riskTier}">${it.riskTier} · ${it.riskScore}</span>
      </div>
    `).join('') : '<div class="intel-list-empty">No items currently scored.</div>';
  }"""

NEW_JS = """  // getExplainItems: attaches a real, per-item explanation string to each scored
  // issue, built only from fields the scoring engine actually consumed
  // (status, hoursElapsed/slaHours proximity, module) — no fabricated reasoning.
  function getExplainItems(items) {
    return items.map((it) => {
      const slaHours = it.slaHours || 0;
      const proximity = slaHours ? Math.min(it.hoursElapsed / slaHours, 1.5) : 0;
      const pct = Math.round(proximity * 100);
      const statusLabel = (it.status || 'unknown').replace(/-/g, ' ');
      const explain = `${statusLabel} status on the ${it.module} module, ${it.hoursElapsed}h elapsed of a ${slaHours}h SLA window (${pct}% consumed) — these are the inputs the scoring engine weighted into ${it.riskScore}.`;
      return { ...it, explain };
    });
  }

  function renderExplainItems(it) {
    return `<details class="risk-explain">
      <summary>Why ${it.riskScore}?</summary>
      <div class="risk-explain-body">${escapeHtml(it.explain)}</div>
    </details>`;
  }

  function renderRisk(summary, items) {
    document.getElementById('risk-stats').innerHTML = `
      <div class="intel-stat"><div class="intel-stat-label">Normal</div><div class="intel-stat-val" style="color:#3ecf8e">${summary.normal}</div></div>
      <div class="intel-stat"><div class="intel-stat-label">Elevated</div><div class="intel-stat-val" style="color:#f5a623">${summary.elevated}</div></div>
      <div class="intel-stat"><div class="intel-stat-label">Critical</div><div class="intel-stat-val" style="color:#e5484d">${summary.critical}</div></div>
      <div class="intel-stat"><div class="intel-stat-label">Avg Score</div><div class="intel-stat-val" style="color:#00e5ff">${summary.avgScore}</div></div>
    `;
    const listEl = document.getElementById('risk-list');
    const sorted = getExplainItems([...items].sort((a, b) => b.riskScore - a.riskScore));
    listEl.innerHTML = sorted.length ? sorted.map((it) => `
      <div class="intel-list-row" style="flex-direction:column;align-items:stretch;gap:4px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span title="${it.message}">${it.message}</span>
          <span class="risk-badge tier-${it.riskTier}">${it.riskTier} · ${it.riskScore}</span>
        </div>
        ${renderExplainItems(it)}
      </div>
    `).join('') : '<div class="intel-list-empty">No items currently scored.</div>';
  }"""

OLD_CSS = """  .risk-badge.tier-critical, .risk-badge.status-breached { background: rgba(229,72,77,.15); color: #e5484d; border: 1px solid #e5484d; }"""

NEW_CSS = """  .risk-badge.tier-critical, .risk-badge.status-breached { background: rgba(229,72,77,.15); color: #e5484d; border: 1px solid #e5484d; }
  .risk-explain { font-size: 11px; color: #8a94a6; }
  .risk-explain summary { cursor: pointer; color: #00e5ff; user-select: none; }
  .risk-explain summary::-webkit-details-marker { color: #00e5ff; }
  .risk-explain-body { padding: 4px 0 2px 12px; line-height: 1.4; }"""

assert src.count(OLD_JS) == 1, f"OLD_JS match count: {src.count(OLD_JS)} (expected 1)"
assert src.count(OLD_CSS) == 1, f"OLD_CSS match count: {src.count(OLD_CSS)} (expected 1)"

src = src.replace(OLD_JS, NEW_JS, 1)
src = src.replace(OLD_CSS, NEW_CSS, 1)

FILE.write_text(src)
print("Patched", FILE)
