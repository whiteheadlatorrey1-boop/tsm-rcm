#!/usr/bin/env python3
"""
TSM Universal WIP — One-Shot Deploy Script
Run from /workspaces/tsm-shell:  python3 deploy-wip.py
"""
import re, shutil
from pathlib import Path

ROOT  = Path('/workspaces/tsm-shell')
HTML  = ROOT / 'html'

print('='*60)
print('TSM WIP ONE-SHOT DEPLOY')
print('='*60)

# ── 1. COPY WIP DASHBOARD TO SHARED LOCATION ─────────────────────
wip_src = Path('wip-dashboard.html')          # drop next to this script
wip_dst = HTML / 'wip-dashboard.html'         # served at /wip-dashboard.html

if wip_src.exists():
    shutil.copy2(wip_src, wip_dst)
    print(f'✔ wip-dashboard.html → {wip_dst}')
else:
    print(f'✗ wip-dashboard.html not found next to this script')

# ── 2. INJECT WIP NODE INTO EACH SUITE ───────────────────────────

WIP_NODE_CONSTRUCTION = '''
<!-- WIP INTELLIGENCE NODE (injected) -->
<div style="margin:1rem 0;border:1px solid rgba(255,179,0,.2);background:rgba(255,179,0,.04);border-radius:4px;padding:1rem;position:relative">
  <div style="font-family:var(--mono,monospace);font-size:.5rem;letter-spacing:.12em;color:#ffb300;margin-bottom:.3rem">WIP · INTELLIGENCE ENGINE</div>
  <div style="font-family:var(--head,'Barlow Condensed'),sans-serif;font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:.25rem">UNIVERSAL WIP DASHBOARD</div>
  <div style="font-size:.65rem;color:#6a9ab0;margin-bottom:.6rem">Profit fade detection · Cost-to-cost analysis · Earned revenue vs billed variance · CFO narratives</div>
  <div style="display:flex;gap:.4rem;flex-wrap:wrap">
    <span style="border:1px solid rgba(255,179,0,.3);color:#ffb300;padding:2px 6px;font-size:.5rem;font-family:monospace">PROFIT FADE</span>
    <span style="border:1px solid rgba(0,255,136,.3);color:#00ff88;padding:2px 6px;font-size:.5rem;font-family:monospace">WIP MATRIX</span>
    <span style="border:1px solid rgba(0,229,255,.3);color:#00e5ff;padding:2px 6px;font-size:.5rem;font-family:monospace">AUTO-NARRATIVE</span>
  </div>
  <a href="/wip-dashboard.html?sector=construction" style="position:absolute;right:12px;bottom:12px;background:#ffb300;color:#040810;border:0;padding:7px 14px;font-weight:900;font-size:.6rem;font-family:monospace;text-decoration:none;letter-spacing:.08em">OPEN WIP ↗</a>
</div>'''

WIP_NODE_FINOPS = '''
<!-- WIP INTELLIGENCE NODE (injected) -->
<section class="node-card" style="--c:var(--purple,#a855f7)">
  <div style="color:var(--purple,#a855f7);font-size:11px;font-weight:900">09 · Sovereign Mesh</div>
  <h2 style="color:var(--purple,#a855f7);margin:8px 0 2px;">UNIVERSAL WIP</h2>
  <div class="meta">CONSTRUCTION · HEALTHCARE · INSURANCE</div>
  <p>One engine. Any industry. Real-time WIP percent-complete analysis, reserve variance, and CFO-ready AI narratives.</p>
  <div class="label" style="color:var(--gold,#f5c842)">STATUS</div>
  <div style="display:flex;gap:5px;margin-top:5px;">
    <span style="border:1px solid var(--purple,#a855f7);color:var(--purple,#a855f7);padding:2px 5px;font-size:10px;">3 SECTORS</span>
    <span style="border:1px solid var(--green,#00ffc6);color:var(--green,#00ffc6);padding:2px 5px;font-size:10px;">AI LIVE</span>
  </div>
  <button class="open-btn" style="position:absolute;left:14px;bottom:14px;background:var(--purple,#a855f7);color:#fff;border:0;padding:8px 14px;font-weight:900;cursor:pointer;font-size:11px" onclick="window.location.href='/wip-dashboard.html?sector=insurance'">OPEN WIP ↗</button>
</section>'''

WIP_NODE_HC = '''
<!-- WIP INTELLIGENCE NODE (injected) -->
<div style="margin:1rem;border:1px solid rgba(0,255,136,.2);background:rgba(0,255,136,.03);border-radius:4px;padding:1rem;position:relative">
  <div style="font-family:monospace;font-size:.5rem;letter-spacing:.12em;color:#00ff88;margin-bottom:.3rem">SOVEREIGN MESH · RCM WIP</div>
  <div style="font-size:1rem;font-weight:800;color:#fff;margin-bottom:.25rem">UNIVERSAL WIP DASHBOARD</div>
  <div style="font-size:.65rem;color:#6a9ab0;margin-bottom:.6rem">UPCODE-DETECT-V2 · RCM lifecycle WIP · Denial prediction · CFO executive intelligence</div>
  <div style="display:flex;gap:.4rem;flex-wrap:wrap">
    <span style="border:1px solid rgba(0,255,136,.3);color:#00ff88;padding:2px 6px;font-size:.5rem;font-family:monospace">UPCODE-DETECT</span>
    <span style="border:1px solid rgba(255,179,0,.3);color:#ffb300;padding:2px 6px;font-size:.5rem;font-family:monospace">RCM WIP</span>
    <span style="border:1px solid rgba(0,229,255,.3);color:#00e5ff;padding:2px 6px;font-size:.5rem;font-family:monospace">DENIAL PREDICT</span>
  </div>
  <a href="/wip-dashboard.html?sector=healthcare" style="position:absolute;right:12px;bottom:12px;background:#00ff88;color:#040810;border:0;padding:7px 14px;font-weight:900;font-size:.6rem;font-family:monospace;text-decoration:none;letter-spacing:.08em">OPEN WIP ↗</a>
</div>'''

# ── Construction suite ────────────────────────────────────────────
cp = HTML / 'construction-suite/construction-pro.html'
if cp.exists():
    src = cp.read_text()
    if 'UNIVERSAL WIP DASHBOARD' not in src:
        # inject before </body>
        src = src.replace('</body>', WIP_NODE_CONSTRUCTION + '\n</body>', 1)
        cp.write_text(src)
        print('✔ WIP node injected into construction-pro.html')
    else:
        print('  WIP node already in construction-pro.html')

# Construction suite-index
ci = HTML / 'construction-suite/suite-index.html'
if ci.exists():
    src = ci.read_text()
    if 'UNIVERSAL WIP DASHBOARD' not in src:
        src = src.replace('</body>', WIP_NODE_CONSTRUCTION + '\n</body>', 1)
        ci.write_text(src)
        print('✔ WIP node injected into construction suite-index.html')

# ── FinOps suite ─────────────────────────────────────────────────
fu = HTML / 'finops-suite/financial-ui.html'
if fu.exists():
    src = fu.read_text()
    if 'Sovereign Mesh' not in src and '09 · Sovereign' not in src:
        anchor = '</main>'
        if anchor in src:
            src = src.replace(anchor, WIP_NODE_FINOPS + '\n' + anchor, 1)
        else:
            src += WIP_NODE_FINOPS
        fu.write_text(src)
        print('✔ WIP node (node 09) injected into financial-ui.html')
    else:
        print('  WIP node already in financial-ui.html')

# ── Healthcare suite ──────────────────────────────────────────────
hc_main = HTML / 'healthcare/index.html'
if hc_main.exists():
    src = hc_main.read_text()
    if 'UNIVERSAL WIP DASHBOARD' not in src:
        src = src.replace('</body>', WIP_NODE_HC + '\n</body>', 1)
        hc_main.write_text(src)
        print('✔ WIP node injected into healthcare/index.html')
    else:
        print('  WIP node already in healthcare/index.html')

# ── 3. FIX HC NODES — SWITCHTAB + REMOVE HC NODE GUIDE ───────────
SWITCHTAB_POLYFILL = '''<script id="tsm-sw-poly">
(function(){
  function _sw(t){document.querySelectorAll(".trm-tab,.nav-tab").forEach(e=>e.classList.remove("active"));document.querySelectorAll(".trm-panel,.tab-content").forEach(e=>e.classList.remove("active"));var el=document.getElementById(t);if(el)el.classList.add("active");}
  function _sh(id,el){document.querySelectorAll(".tab-content").forEach(c=>c.style.display="none");var p=document.getElementById(id);if(p)p.style.display="block";document.querySelectorAll(".nav-tab").forEach(n=>n.classList.remove("active"));if(el)el.classList.add("active");}
  if(typeof window.switchTab!=="function")window.switchTab=_sw;
  if(typeof window.showTab!=="function")window.showTab=_sh;
  if(typeof window.filterTab!=="function")window.filterTab=_sw;
})();
</script>'''

hc_dir = HTML / 'healthcare'
fixed = 0
for hf in sorted(hc_dir.rglob('*.html')):
    if '.bak' in hf.name or 'bak' in str(hf):
        continue
    try:
        src = hf.read_text(encoding='utf-8', errors='replace')
        changed = False

        # Remove HC Node Guide floating panel
        for pat in [
            r'<div[^>]*id=["\']hc-node-guide["\'][^>]*>[\s\S]{0,3000}?</div>\s*</div>',
            r'<div[^>]*class=["\'][^"\']*hc-node-guide[^"\']*["\'][^>]*>[\s\S]{0,3000}?</div>\s*</div>',
            r'<!-- HC NODE GUIDE -->[\s\S]{0,5000}?<!-- /HC NODE GUIDE -->',
        ]:
            new = re.sub(pat, '', src, flags=re.DOTALL|re.IGNORECASE)
            if new != src:
                src = new
                changed = True

        # Fix switchTab polyfill
        if ('switchTab' in src or 'showTab' in src) and 'tsm-sw-poly' not in src:
            src = src.replace('</head>', SWITCHTAB_POLYFILL + '\n</head>', 1)
            changed = True

        if changed:
            hf.write_text(src, encoding='utf-8')
            fixed += 1
    except Exception as e:
        print(f'  ⚠ {hf.name}: {e}')

print(f'✔ HC nodes patched: {fixed} files (guide removed + switchTab fixed)')

# ── 4. ADD /api/wip/narrative SERVER ROUTE ───────────────────────
server = ROOT / 'server.js'
if server.exists():
    ssrc = server.read_text()
    wip_route = '''
// ── Universal WIP Narrative endpoint ─────────────────────────────
app.post('/api/wip/narrative', express.json({limit:'1mb'}), async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({error:'No API key'});
  try {
    const {sector='construction', entity={}, schema={}} = req.body||{};
    const sectorPrompts = {
      construction: `Construction WIP Strategist. Job: ${JSON.stringify(entity)}. Schema: ${JSON.stringify(schema)}. Produce CFO narrative: WIP position, profit fade risk, 3 actions with dollar amounts, 30/60/90 outlook.`,
      healthcare: `Healthcare RCM WIP Strategist. Encounter: ${JSON.stringify(entity)}. UPCODE-DETECT-V2 active. Produce CFO narrative: RCM position, denial risk, 3 revenue recovery actions with amounts, payer strategy.`,
      insurance: `Insurance CIP/Reserve WIP Strategist. Claim: ${JSON.stringify(entity)}. Produce CFO narrative: reserve adequacy, fraud risk, 3 adjuster actions with dollar impact, E&O exposure.`,
    };
    const prompt = sectorPrompts[sector] || sectorPrompts.construction;
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.TSM_MODEL||'openai/gpt-oss-120b',max_tokens:400,messages:[{role:'system',content:'You are the TSM Sovereign Mesh WIP Strategist. Be specific with numbers. Use clear section labels.'},{role:'user',content:prompt}]})
    });
    const d = await r.json();
    res.json({ok:true, narrative: d.choices?.[0]?.message?.content||'AI unavailable'});
  } catch(e){ res.status(500).json({ok:false,error:e.message}); }
});
'''
    if '/api/wip/narrative' not in ssrc:
        ssrc = ssrc.replace('// 404', wip_route + '\n// 404', 1)
        server.write_text(ssrc)
        print('✔ /api/wip/narrative added to server.js')
    else:
        print('  /api/wip/narrative already present')

print('\n' + '='*60)
print('DONE — run: fly deploy')
print('='*60)
print('\nWIP Dashboard will be live at:')
print('  https://tsm-shell.fly.dev/wip-dashboard.html')
print('  https://tsm-shell.fly.dev/wip-dashboard.html?sector=healthcare')
print('  https://tsm-shell.fly.dev/wip-dashboard.html?sector=insurance')
