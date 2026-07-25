#!/usr/bin/env python3
"""
Injects the 4-node streaming pipeline from document-showcase into construction-pro.html
Run from /workspaces/tsm-shell:  python3 patch-pro-pipeline.py
"""
import shutil
from pathlib import Path

TARGET = Path('/workspaces/tsm-shell/html/construction-suite/construction-pro.html')
BAK    = TARGET.with_suffix('.html.bak.pipeline')

# ── CSS to inject before </style> ────────────────────────────────────────────
PIPELINE_CSS = """
/* ── 4-NODE PIPELINE (injected) ── */
.pro-key-row{display:flex;align-items:center;gap:.5rem;padding:.35rem .5rem;border-bottom:1px solid var(--border2);background:rgba(0,0,0,.2)}
.pro-key-row label{font-size:.5rem;letter-spacing:.12em;color:var(--muted);white-space:nowrap}
.pro-key-input{flex:1;background:transparent;border:none;border-bottom:1px solid var(--border2);color:var(--cyan);font-family:var(--mono);font-size:.6rem;padding:.15rem .25rem;outline:none}
.pro-key-input:focus{border-color:var(--cyan)}
.pro-key-btn{font-family:var(--mono);font-size:.5rem;letter-spacing:.08rem;padding:.2rem .5rem;background:transparent;border:1px solid var(--cyan2);color:var(--cyan);cursor:pointer;text-transform:uppercase}
.pro-pipe-row{display:flex;align-items:center;gap:0;padding:.4rem .5rem;border-bottom:1px solid var(--border2);overflow-x:auto}
.pro-pn{flex-shrink:0;padding:.4rem .8rem;border:1px solid;min-width:100px;transition:all .4s;font-family:var(--mono)}
.pro-pn.idle{border-color:var(--border);background:var(--s2);color:var(--muted)}
.pro-pn.active{border-color:var(--cyan);background:rgba(0,232,200,.08);animation:nodePulse .9s infinite}
.pro-pn.done{border-color:var(--green);background:rgba(0,255,136,.06);color:var(--green)}
.pro-pn-num{font-size:.45rem;color:var(--muted);letter-spacing:.1em}
.pro-pn-title{font-size:.55rem;font-weight:700;letter-spacing:.06em;margin-top:.15rem}
.pro-pn-sub{font-size:.45rem;color:var(--muted);margin-top:.1rem}
.pro-pn-state{font-size:.45rem;margin-top:.25rem;letter-spacing:.08em}
.pro-pn.active .pro-pn-state{color:var(--cyan)}
.pro-pn.done .pro-pn-state{color:var(--green)}
.pro-arrow{flex-shrink:0;padding:0 .3rem;color:var(--border2);font-size:.7rem;transition:color .4s}
.pro-arrow.done{color:var(--green)}
.pro-tabs{display:flex;gap:0;border-bottom:1px solid var(--border2)}
.pro-tab{font-family:var(--mono);font-size:.5rem;letter-spacing:.08em;padding:.3rem .7rem;cursor:pointer;border-bottom:2px solid transparent;color:var(--muted);background:transparent;border-top:none;border-left:none;border-right:none;text-transform:uppercase;transition:all .2s}
.pro-tab.active{color:var(--cyan);border-bottom-color:var(--cyan)}
.pro-panels{flex:1;overflow:hidden;position:relative}
.pro-panel{display:none;height:100%;overflow-y:auto;padding:.5rem .6rem;font-size:.6rem;font-family:var(--mono);line-height:1.6;white-space:pre-wrap;color:var(--text)}
.pro-panel.active{display:block}
.pro-panel-placeholder{color:var(--muted);font-style:italic}
@keyframes nodePulse{0%,100%{box-shadow:0 0 0 0 rgba(0,232,200,.3)}50%{box-shadow:0 0 0 4px rgba(0,232,200,.1)}}
"""

# ── HTML to replace the intelligence feed section ─────────────────────────────
NEW_FEED_HTML = """        <!-- INTELLIGENCE FEED (4-NODE PIPELINE) -->
        <div class="pro-key-row">
          <label>NEURAL CORE KEY</label>
          <input class="pro-key-input" id="proGroqKey" type="password" placeholder="gsk_ ...  (enter key to enable pipeline)">
          <button class="pro-key-btn" onclick="proTestKey()">TEST</button>
        </div>
        <div class="feed-bar">
          <span class="feed-label">INTELLIGENCE FEED</span>
          <div style="display:flex;align-items:center;gap:.5rem">
            <button onclick="saveCurrentToReport()" style="font-family:var(--mono);font-size:.5rem;letter-spacing:.08rem;padding:.25rem .6rem;background:transparent;border:1px solid var(--cyan2);color:var(--cyan);cursor:pointer;text-transform:uppercase">SAVE →</button>
            <button onclick="copyFeedOutput()" style="font-family:var(--mono);font-size:.5rem;letter-spacing:.08rem;padding:.25rem .6rem;background:transparent;border:1px solid var(--border2);color:var(--muted);cursor:pointer;text-transform:uppercase">COPY</button>
            <span class="feed-status" id="feedStatus">ENTER KEY TO BEGIN</span>
          </div>
        </div>
        <!-- pipe nodes -->
        <div class="pro-pipe-row">
          <div class="pro-pn idle" id="pro-pn-1"><div class="pro-pn-num">APP 01</div><div class="pro-pn-title">BNCA NODES</div><div class="pro-pn-sub">INTEL · TRIAGE · FLAGS</div><div class="pro-pn-state" id="pro-pns-1">Standby</div></div>
          <div class="pro-arrow" id="pro-pa-1">→</div>
          <div class="pro-pn idle" id="pro-pn-2"><div class="pro-pn-num">APP 02</div><div class="pro-pn-title">HC STRATEGIST</div><div class="pro-pn-sub">RFI · ALERTS · COSTS</div><div class="pro-pn-state" id="pro-pns-2">Standby</div></div>
          <div class="pro-arrow" id="pro-pa-2">→</div>
          <div class="pro-pn idle" id="pro-pn-3"><div class="pro-pn-num">APP 03</div><div class="pro-pn-title">MAIN STRATEGIST</div><div class="pro-pn-sub">LETTERS · MITIGATION</div><div class="pro-pn-state" id="pro-pns-3">Standby</div></div>
          <div class="pro-arrow" id="pro-pa-3">→</div>
          <div class="pro-pn idle" id="pro-pn-4"><div class="pro-pn-num">APP 04</div><div class="pro-pn-title">EXECUTIVE PORTAL</div><div class="pro-pn-sub">CFO · REVENUE · ROADMAP</div><div class="pro-pn-state" id="pro-pns-4">Standby</div></div>
        </div>
        <!-- output tabs -->
        <div class="pro-tabs">
          <button class="pro-tab active" onclick="proSwitchTab(1,this)">01 BNCA</button>
          <button class="pro-tab" onclick="proSwitchTab(2,this)">02 STRATEGIST</button>
          <button class="pro-tab" onclick="proSwitchTab(3,this)">03 MAIN STRAT</button>
          <button class="pro-tab" onclick="proSwitchTab(4,this)">04 EXECUTIVE</button>
        </div>
        <div class="pro-panels feed-output" style="padding:0">
          <div class="pro-panel active" id="pro-op-1"><span class="pro-panel-placeholder">Select a module above to run the 4-node pipeline.</span></div>
          <div class="pro-panel" id="pro-op-2"><span class="pro-panel-placeholder">Waiting for App 01…</span></div>
          <div class="pro-panel" id="pro-op-3"><span class="pro-panel-placeholder">Waiting for App 02…</span></div>
          <div class="pro-panel" id="pro-op-4"><span class="pro-panel-placeholder">Waiting for App 03…</span></div>
        </div>"""

# ── JS engine to inject before </body> ───────────────────────────────────────
PIPELINE_JS = """
<script id="tsm-pro-pipeline-engine">
// ── PRO PIPELINE ENGINE ──────────────────────────────────────────
const PRO_APPS = [
  {
    id:1, name:'BNCA Command Nodes',
    system:`You are a construction BNCA Command Node — first in a 4-app neural bridge. Analyze the construction scenario and output:
1. SITUATION TYPE — classify the issue
2. CRITICAL FLAGS — list every risk, anomaly, or missing item with specifics
3. FINANCIAL EXPOSURE — total dollar exposure
4. COMPLIANCE RISKS — regulatory, contractual, or safety issues
5. IMMEDIATE ACTIONS — what must happen in 48 hours
Be specific. Use numbers and names. Format with section headers.`,
    prompt: ctx => `Construction module: ${ctx.module}\\nPlaybook: ${ctx.playbook}\\nSector: ${ctx.sector}\\n\\nRun BNCA Command Node triage. Identify all flags, risks, and required actions.`
  },
  {
    id:2, name:'HC Strategist',
    system:`You are the HC Strategist — App 02. Produce operational strategy:
1. RFI / CHANGE ORDER IMPACTS
2. COST ALERTS — breakdown with line items
3. VENDOR / SUBCONTRACTOR ALERTS
4. SCHEDULE PRIORITIES
5. MITIGATION OPTIONS — 3 ranked options with cost/time comparison
Be tactical. Reference dollar amounts and dates.`,
    prompt: ctx => `Module: ${ctx.module}\\nPlaybook: ${ctx.playbook}\\n\\nProduce operational strategy: RFI impacts, cost alerts, vendor issues, schedule priorities, mitigation options.`
  },
  {
    id:3, name:'Main Strategist',
    system:`You are the Main Strategist — App 03. Produce:
1. FORMAL NOTICE DRAFT — professional letter to relevant party
2. MITIGATION PLAN — step-by-step with owners, deadlines, cost codes
3. SCHEDULE IMPACT ANALYSIS — critical path and float effects
4. LEGAL / CONTRACTUAL CONSIDERATIONS
5. FIELD ACTION ITEMS — specific site supervisor instructions
Use professional construction language.`,
    prompt: ctx => `Module: ${ctx.module}\\nPlaybook: ${ctx.playbook}\\n\\nProduce formal correspondence, mitigation plan, schedule impact, legal considerations, field action items.`
  },
  {
    id:4, name:'Executive Portal',
    system:`You are the Executive Portal — App 04. Produce owner/CFO-level brief:
1. EXECUTIVE SUMMARY — 3 sentences: situation, financial impact, decision required
2. FINANCIAL DASHBOARD — total exposure, cash impact, schedule cost, mitigation cost
3. OWNER DECISIONS REQUIRED — specific yes/no decisions with deadlines
4. REVENUE / CASH FLOW IMPACT — billings, draws, retainage effects
5. FORWARD ROADMAP — 30/60/90 day outlook with financial milestones
Write for owners. Numbers front and center.`,
    prompt: ctx => `Module: ${ctx.module}\\nPlaybook: ${ctx.playbook}\\n\\nProduce executive brief, financial dashboard, owner decisions, cash flow impact, 30/60/90 roadmap.`
  }
];

let proCurrentCtx = { module:'General Construction', playbook:'Operations', sector:'CONSTRUCTION' };

function proSwitchTab(n, el) {
  document.querySelectorAll('.pro-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pro-panel').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  const panel = document.getElementById('pro-op-' + n);
  if (panel) panel.classList.add('active');
}

function proSetNode(i, state) {
  const pn  = document.getElementById('pro-pn-' + i);
  const pns = document.getElementById('pro-pns-' + i);
  if (!pn) return;
  pn.className = 'pro-pn ' + state;
  const labels = { idle:'Standby', active:'Processing…', done:'Complete' };
  if (pns) pns.textContent = labels[state] || state;
  if (state === 'done' && i < 4) {
    const pa = document.getElementById('pro-pa-' + i);
    if (pa) pa.className = 'pro-arrow done';
  }
}

function proResetAll() {
  for (let i = 1; i <= 4; i++) {
    proSetNode(i, 'idle');
    const op = document.getElementById('pro-op-' + i);
    if (op) op.innerHTML = '<span class="pro-panel-placeholder">' + (i === 1 ? 'Running…' : 'Waiting for App 0' + (i-1) + '…') + '</span>';
    const pa = document.getElementById('pro-pa-' + (i-1));
    if (pa) pa.className = 'pro-arrow';
  }
}

async function proStreamApp(app, key) {
  const panel = document.getElementById('pro-op-' + app.id);
  proSetNode(app.id, 'active');
  // switch to this tab
  document.querySelectorAll('.pro-tab')[app.id - 1]?.click();
  panel.textContent = '';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + key },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 900,
        temperature: 0.35,
        stream: true,
        messages: [
          { role:'system', content: app.system },
          { role:'user',   content: app.prompt(proCurrentCtx) }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error:{ message: res.statusText } }));
      panel.textContent = '[Groq Error ' + res.status + '] ' + (err.error?.message || res.statusText);
      proSetNode(app.id, 'idle');
      return false;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\\n')) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim();
        if (d === '[DONE]') break;
        try {
          const delta = JSON.parse(d).choices?.[0]?.delta?.content || '';
          full += delta;
          panel.textContent = full + '▌';
          panel.scrollTop = panel.scrollHeight;
        } catch {}
      }
    }
    panel.textContent = full;
    proSetNode(app.id, 'done');
    return true;
  } catch (e) {
    panel.textContent = 'Connection error: ' + e.message;
    proSetNode(app.id, 'idle');
    return false;
  }
}

async function proFireAll(ctx) {
  const key = document.getElementById('proGroqKey')?.value.trim();
  if (!key || !key.startsWith('gsk_')) {
    const st = document.getElementById('feedStatus');
    if (st) { st.textContent = 'ENTER VALID KEY FIRST'; st.style.color = 'var(--red)'; }
    return;
  }
  if (ctx) proCurrentCtx = ctx;
  proResetAll();
  const st = document.getElementById('feedStatus');
  if (st) { st.textContent = 'PIPELINE RUNNING…'; st.style.color = 'var(--cyan)'; }

  for (const app of PRO_APPS) {
    const ok = await proStreamApp(app, key);
    if (!ok) {
      if (st) { st.textContent = 'ERROR ON APP 0' + app.id; st.style.color = 'var(--red)'; }
      return;
    }
  }
  if (st) { st.textContent = 'ALL 4 APPS COMPLETE'; st.style.color = 'var(--green)'; }
  // feed final output back to legacy feedOutput so SAVE/COPY still work
  const legacy = document.getElementById('feedOutput');
  const exec   = document.getElementById('pro-op-4');
  if (legacy && exec) legacy.textContent = exec.textContent;
}

async function proTestKey() {
  const key = document.getElementById('proGroqKey')?.value.trim();
  const btn = document.querySelector('.pro-key-btn');
  if (!key) return;
  btn.textContent = 'Testing…';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'openai/gpt-oss-120b',max_tokens:5,messages:[{role:'user',content:'ping'}]})
    });
    if (res.ok) {
      btn.textContent = '✓ LIVE';
      btn.style.color = 'var(--green)';
      // also push to server live
      fetch('/admin/set-key',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':'TSM_ADMIN_2026'},body:JSON.stringify({key})}).catch(()=>{});
      const st = document.getElementById('feedStatus');
      if (st) { st.textContent = 'SELECT MODULE TO BEGIN'; st.style.color = ''; }
    } else {
      btn.textContent = '✗ INVALID'; btn.style.color = 'var(--red)';
    }
  } catch(e) {
    btn.textContent = '✗ FAILED'; btn.style.color = 'var(--red)';
  }
  setTimeout(() => { btn.textContent = 'TEST'; btn.style.color = ''; }, 4000);
}

// ── Intercept module card clicks to trigger pipeline ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.module-card, .mod-card, [onclick*="runAnalysis"], [onclick*="selectModule"]').forEach(card => {
    const orig = card.getAttribute('onclick') || '';
    card.addEventListener('click', () => {
      const module  = card.querySelector('.module-title, .mod-title, .mc-title, h3, strong')?.textContent?.trim() || card.textContent.trim().slice(0, 40);
      const sector  = (card.closest('[data-sector]')?.dataset.sector) || document.getElementById('activeSector')?.textContent || 'CONSTRUCTION';
      const playbook = document.querySelector('.playbook-item.active, .pb-item.active')?.textContent?.trim() || 'General';
      proFireAll({ module, playbook, sector });
    });
  });
});
</script>
"""

# ── OLD feed HTML to replace ──────────────────────────────────────────────────
OLD_FEED = """        <!-- INTELLIGENCE FEED -->
        <div class="feed-bar">
          <span class="feed-label">INTELLIGENCE FEED</span>
          <div style="display:flex;align-items:center;gap:.5rem">
            <button onclick="saveCurrentToReport()" style="font-family:var(--mono);font-size:.5rem;letter-spacing:.08rem;padding:.25rem .6rem;background:transparent;border:1px solid var(--cyan2);color:var(--cyan);cursor:pointer;text-transform:uppercase" title="Save current output to report builder">SAVE →</button>
            <button onclick="copyFeedOutput()" style="font-family:var(--mono);font-size:.5rem;letter-spacing:.08rem;padding:.25rem .6rem;background:transparent;border:1px solid var(--border2);color:var(--muted);cursor:pointer;text-transform:uppercase" title="Copy to clipboard">COPY</button>
            <span class="feed-status" id="feedStatus">SELECT A MODULE TO BEGIN</span>
          </div>
        </div>
        <div class="feed-output" id="feedOutput">
          <span class="feed-placeholder">Select a module or playbook above to run analysis. Output will appear here.</span>
        </div>"""

def main():
    src = TARGET.read_text(encoding='utf-8')

    # Backup
    if not BAK.exists():
        shutil.copy2(TARGET, BAK)
        print(f'✔ Backed up to {BAK.name}')

    changed = False

    # 1. Inject CSS
    if 'pro-key-row' not in src:
        src = src.replace('</style>', PIPELINE_CSS + '\n</style>', 1)
        print('✔ Pipeline CSS injected')
        changed = True
    else:
        print('  Pipeline CSS already present')

    # 2. Replace feed HTML
    if OLD_FEED in src:
        src = src.replace(OLD_FEED, NEW_FEED_HTML, 1)
        print('✔ Feed HTML replaced with 4-node pipeline')
        changed = True
    elif 'pro-key-row' in src:
        print('  Feed HTML already replaced')
    else:
        print('✗ Could not find old feed HTML — check indentation')

    # 3. Inject JS engine before </body>
    if 'tsm-pro-pipeline-engine' not in src:
        src = src.replace('</body>', PIPELINE_JS + '\n</body>', 1)
        print('✔ Pipeline JS engine injected')
        changed = True
    else:
        print('  Pipeline JS already present')

    if changed:
        TARGET.write_text(src, encoding='utf-8')
        print('\n✔ construction-pro.html patched. Hard refresh to see changes.')
    else:
        print('\n  No changes needed.')

if __name__ == '__main__':
    main()
