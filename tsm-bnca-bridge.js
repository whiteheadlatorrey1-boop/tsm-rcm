#!/usr/bin/env python3
"""
TSM BNCA Bridge Injector
Injects tsm-bnca-bridge.js into all app pages and wires the Strategist to read all nodes.
"""

import os, re, sys

BASE = 'html'

# ── Node definitions for each app ────────────────────────────────────────────
NODES = {
    'construction-suite/construction-pro.html': {
        'id': 'auditops_pro',
        'name': 'AuditOps · Construction Pro',
        'subtitle': '30 modules · 7 domains',
        'status': 'READY',
        'metrics': {'modules': '30', 'domains': '7'},
        'flags': [],
        'priority': 'HIGH',
    },
    'construction-suite/compliance.html': {
        'id': 'compliance',
        'name': 'Construction Compliance',
        'subtitle': 'OSHA · Davis-Bacon · EPA · SWPPP',
        'status': 'READY',
        'metrics': {'osha': 'ACTIVE', 'davis_bacon': 'ACTIVE'},
        'flags': [],
        'priority': 'HIGH',
    },
    'construction-suite/legal.html': {
        'id': 'legal',
        'name': 'Construction Legal',
        'subtitle': 'Liens · Disputes · Bonds · Default',
        'status': 'READY',
        'metrics': {'lien_states': '50'},
        'flags': [],
        'priority': 'MEDIUM',
    },
    'construction-suite/auditops-tax.html': {
        'id': 'tax',
        'name': 'Construction Tax Prep',
        'subtitle': '§179 · S-Corp · Depreciation · QBI',
        'status': 'READY',
        'metrics': {'s179': 'ACTIVE', 'qbi': 'ACTIVE'},
        'flags': [],
        'priority': 'MEDIUM',
    },
    'construction-suite/construction-command.html': {
        'id': 'command',
        'name': 'Construction Command',
        'subtitle': 'Multi-node intelligence hub',
        'status': 'READY',
        'metrics': {'nodes': '7'},
        'flags': [],
        'priority': 'HIGH',
    },
    'finops-suite/financial/index.html': {
        'id': 'financial_intel',
        'name': 'Financial Intel',
        'subtitle': 'Fund accounting · Grant restrictions · Form 990',
        'status': 'READY',
        'metrics': {'hrsa_grant': '$480K', 'form_990': '84%', 'overdue_reports': '1'},
        'flags': ['HRSA grant report overdue', 'Form 990 at 84% completion'],
        'priority': 'HIGH',
    },
}

BRIDGE_SCRIPT = '<script src="/tsm-bnca-bridge.js"></script>'

def make_reporter(node):
    flags = str(node['flags']).replace("'", '"')
    metrics = str(node['metrics']).replace("'", '"')
    return f"""
<script>
// TSM BNCA NODE REPORT — {node['name']}
(function(){{
  function reportBNCA(){{
    if(typeof TSM_BNCA === 'undefined') return;
    TSM_BNCA.report('{node['id']}', {{
      name: '{node['name']}',
      subtitle: '{node['subtitle']}',
      status: '{node['status']}',
      metrics: {metrics},
      flags: {flags},
      priority: '{node['priority']}'
    }});
  }}
  setInterval(reportBNCA, 10000);
  setTimeout(reportBNCA, 1500);
}})();
</script>"""

def inject_app(rel_path, node):
    path = os.path.join(BASE, rel_path)
    if not os.path.exists(path):
        print(f'⚠️  MISSING: {path}')
        return

    html = open(path, encoding='utf-8').read()
    original = html

    # Remove any existing BNCA reporter block to avoid duplicates
    html = re.sub(r'\n?<script>\s*// TSM BNCA NODE REPORT[^<]*(?:<[^/].*?>|</(?!script).*?>|[^<])*?</script>', '', html, flags=re.DOTALL)
    # Remove old TSM_BNCA reporter if present (finops financial already had one)
    html = re.sub(r'\n?<script>\s*// BNCA NODE REPORT[^<]*(?:<[^/].*?>|</(?!script).*?>|[^<])*?</script>', '', html, flags=re.DOTALL)

    # Inject bridge script before </body> if not already there
    if '/tsm-bnca-bridge.js' not in html:
        html = html.replace('</body>', BRIDGE_SCRIPT + '\n</body>', 1)

    # Inject reporter before </body>
    html = html.replace('</body>', make_reporter(node) + '\n</body>', 1)

    if html != original:
        open(path, 'w', encoding='utf-8').write(html)
        print(f'✅ Injected BNCA reporter → {path}')
    else:
        print(f'— No change: {path}')

# ── Strategist: replace the bare textarea with full BNCA dashboard ────────────
def patch_strategist():
    path = os.path.join(BASE, 'war-rooms/construct-war/construction-strategist.html')
    if not os.path.exists(path):
        print(f'⚠️  MISSING: {path}')
        return

    html = open(path, encoding='utf-8').read()
    original = html

    BNCA_UI = """
<!-- TSM BNCA CROSS-APP DASHBOARD -->
<div id="tsm-bnca-panel" style="margin-top:24px;font-family:monospace;">
  <div style="color:#00FFC6;font-size:11px;letter-spacing:2px;margin-bottom:12px;">⚡ LIVE NODE BNCA FEED</div>
  <div id="tsm-bnca-nodes" style="display:grid;gap:10px;"></div>
  <div style="margin-top:16px;display:flex;gap:10px;">
    <button onclick="tsmBncaSynthesize()" style="background:#00FFC6;color:#001;border:none;padding:10px 20px;font-family:monospace;font-size:12px;cursor:pointer;letter-spacing:1px;">⚡ SYNTHESIZE ALL → BNCA</button>
    <button onclick="tsmBncaRefresh()" style="background:transparent;color:#00FFC6;border:1px solid #00FFC6;padding:10px 20px;font-family:monospace;font-size:12px;cursor:pointer;">↻ REFRESH</button>
  </div>
  <div id="tsm-bnca-output" style="margin-top:16px;padding:16px;border:1px solid rgba(0,255,200,0.2);border-radius:8px;background:#021018;color:#eafff7;min-height:80px;white-space:pre-wrap;"></div>
</div>

<script src="/tsm-bnca-bridge.js"></script>
<script>
function tsmBncaRefresh() {
  const nodes = TSM_BNCA.readAll();
  const container = document.getElementById('tsm-bnca-nodes');
  if (!container) return;

  if (!nodes.length) {
    container.innerHTML = '<div style="color:#555;font-size:12px;">No node data yet. Open any app to generate BNCA data.</div>';
    return;
  }

  container.innerHTML = nodes.map(n => {
    const age = TSM_BNCA.ageMinutes(n);
    const flagHtml = (n.flags||[]).map(f => `<div style="color:#FF6B6B;font-size:10px;">⚠ ${f}</div>`).join('');
    const metricHtml = Object.entries(n.metrics||{}).map(([k,v]) => `<span style="color:#00FFC6;">${k}:</span> ${v}`).join(' · ');
    const priorityColor = n.priority === 'HIGH' ? '#FF6B6B' : n.priority === 'MEDIUM' ? '#FFB347' : '#00FFC6';
    return `<div style="border:1px solid rgba(0,255,200,0.15);border-radius:6px;padding:12px;background:#0a1a14;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="color:#00FFC6;font-size:12px;font-weight:bold;">${n.name}</span>
        <span style="color:${priorityColor};font-size:10px;letter-spacing:1px;">${n.priority||''} · ${age}m ago</span>
      </div>
      <div style="color:#556;font-size:10px;margin-bottom:6px;">${n.subtitle||''}</div>
      <div style="font-size:10px;color:#aaa;margin-bottom:4px;">${metricHtml}</div>
      ${flagHtml}
    </div>`;
  }).join('');
}

async function tsmBncaSynthesize() {
  const nodes = TSM_BNCA.readAll();
  const out = document.getElementById('tsm-bnca-output');
  if (!nodes.length) { out.textContent = 'No node data available. Open apps first.'; return; }

  out.textContent = '⚡ Synthesizing BNCA from ' + nodes.length + ' nodes...';

  const summary = nodes.map(n => {
    const flags = (n.flags||[]).length ? '\\nFlags: ' + n.flags.join(', ') : '';
    const metrics = Object.entries(n.metrics||{}).map(([k,v])=>k+': '+v).join(', ');
    return `NODE: ${n.name} (${n.priority} priority)\\nStatus: ${n.status}\\nMetrics: ${metrics}${flags}`;
  }).join('\\n\\n');

  const prompt = `You are the TSM Construction Strategist. Synthesize the following live node reports into a single Best Next Course of Action (BNCA). Dollar-rank every recommendation. Output: Executive Summary, Top 3 Priority Actions with dollar impact, Risk Flags, 90-Day Horizon.\\n\\nNODE REPORTS:\\n${summary}`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ message: prompt, node: 'strategist' })
    });
    const data = await res.json();
    out.textContent = data.response || data.message || JSON.stringify(data);
  } catch(e) {
    // Fallback: show structured summary if API unavailable
    out.textContent = '=== TSM BNCA SYNTHESIS ===\\n\\n' + nodes.map(n =>
      `▸ ${n.name} [${n.priority}]\\n  ${(n.flags||[]).join(' | ') || 'No flags'}`
    ).join('\\n\\n') + '\\n\\n⚡ Connect AI endpoint to generate full BNCA narrative.';
  }
}

// Auto-refresh on load and every 30s
tsmBncaRefresh();
setInterval(tsmBncaRefresh, 30000);
</script>"""

    # Remove old bare textarea BNCA block
    html = re.sub(
        r'<textarea[^>]*>\s*Analyze this project risk and return BNCA\.\s*</textarea>\s*<div id="out"[^>]*></div>',
        '',
        html, flags=re.DOTALL
    )

    # Inject before </body>
    if 'tsm-bnca-panel' not in html:
        html = html.replace('</body>', BNCA_UI + '\n</body>', 1)
        print(f'✅ Strategist BNCA dashboard injected')
    else:
        print(f'— Strategist already patched')

    if html != original:
        open(path, 'w', encoding='utf-8').write(html)

# ── Run ───────────────────────────────────────────────────────────────────────
print('=== TSM BNCA Bridge Injector ===\n')
for rel_path, node in NODES.items():
    inject_app(rel_path, node)

patch_strategist()

print('\n✅ Done. Now copy tsm-bnca-bridge.js to html/ root and deploy.')
