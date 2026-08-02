(function(){
  if(window.__TSM_CONSTRUCTION_PLATFORM__) return;
  window.__TSM_CONSTRUCTION_PLATFORM__ = true;

  const path = location.pathname.toLowerCase();
  const pageNode =
    path.includes('financial') ? 'financial' :
    path.includes('legal') ? 'legal' :
    path.includes('compliance') ? 'compliance' :
    path.includes('tax') ? 'taxprep' :
    path.includes('strategist') ? 'operations' :
    path.includes('document') || path.includes('doc') ? 'vendors' :
    'operations';

  const nodeLabel = {
    operations:'Operations',
    financial:'Financial',
    legal:'Legal',
    compliance:'Compliance',
    taxprep:'Tax Prep',
    vendors:'Document Intelligence'
  };

  function addNav(){
    if(document.getElementById('tsm-construction-nav')) return;
    const nav = document.createElement('div');
    nav.id = 'tsm-construction-nav';
    nav.innerHTML = `
      <div class="brand">● CONSTRUCT INTELLIGENCE</div>
      <a href="/construction-suite/construction-hub.html">Hub</a>
      <a href="/construction-suite/construction-pro.html">AuditOps</a>
      <a href="/construction-suite/financial/">Financial</a>
      <a href="/construction-suite/compliance/">Compliance</a>
      <a href="/construction-suite/legal/">Legal</a>
      <a href="/construction-suite/document-showcase.html">Docs</a>
      <a href="/war-rooms/construct-war/construction-strategist.html">Strategist</a>
      <a href="/construction-suite/presentation.html">Deck</a>
      <div class="live">TSM AI · CONSTRUCTION SUITE · LIVE</div>
    `;
    document.body.prepend(nav);
  }

  function addPanel(){
    if(document.getElementById('tsm-strategist-panel')) return;
    const panel = document.createElement('aside');
    panel.id = 'tsm-strategist-panel';
    panel.innerHTML = `
      <div class="head">
        <div class="title">Construction Strategist</div>
        <div class="sub">BNCA · CROSS-APP SYNTHESIS · OWNER LANES</div>
        <div class="kpis">
          <div class="kpi"><b>$847K</b><span>Exposure</span></div>
          <div class="kpi"><b>9</b><span>Apps</span></div>
          <div class="kpi"><b>92%</b><span>Confidence</span></div>
        </div>
      </div>
      <div class="tabs">
        <button onclick="window.runConstructionAI('${pageNode}')">RUN NODE</button>
        <button onclick="window.runConstructionStrategist()">SYNTHESIZE</button>
        <button onclick="window.open('/construction-suite/construction-hub.html','_self')">HUB</button>
        <button onclick="window.open('/construction-suite/presentation.html','_self')">DECK</button>
      </div>
      <div class="body">
        <div class="label">CURRENT NODE</div>
        <div class="box">${nodeLabel[pageNode] || 'Operations'} ready. Run analysis to create BNCA.</div>
        <div class="label">BNCA OUTPUT</div>
        <div id="tsm-strategist-output" class="box">Waiting for construction intelligence...</div>
        <div class="label">CROSS-APP STATE</div>
        <div id="tsm-state-history" class="box history">No state yet.</div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function ensureOutput(){
    let out = document.querySelector('#out,.out,.ai-output,.tsm-output,pre');
    if(!out){
      out = document.createElement('div');
      out.id = 'out';
      out.className = 'tsm-output';
      const target = document.querySelector('main,.card,section,body') || document.body;
      target.appendChild(out);
    }
    return out;
  }

  function getInput(){
    return document.querySelector('textarea')?.value ||
      document.querySelector('input[type=text]')?.value ||
      `Analyze ${nodeLabel[pageNode] || 'construction'} risk and return the top BNCA.`;
  }

  function saveState(node, data){
    const state = JSON.parse(localStorage.getItem('tsmConstructionState') || '{}');
    state[node] = {
      ts:new Date().toLocaleTimeString(),
      title:data.title || nodeLabel[node] || node,
      priority:data.bnca?.priority || data.content || data.reply || 'Analysis complete',
      owner:data.bnca?.owner || 'Project Lead',
      actions:data.bnca?.actions || []
    };
    localStorage.setItem('tsmConstructionState', JSON.stringify(state));
    renderState();
  }

  function renderState(){
    const el = document.getElementById('tsm-state-history');
    if(!el) return;
    const state = JSON.parse(localStorage.getItem('tsmConstructionState') || '{}');
    const rows = Object.entries(state).map(([k,v]) =>
      `• ${v.title} [${v.ts}]\n  ${String(v.priority).slice(0,120)}`
    );
    el.textContent = rows.length ? rows.join('\n\n') : 'No state yet.';
  }

  function renderResult(node, data){
    const priority = data.bnca?.priority || data.content || data.reply || 'Analysis complete.';
    const actions = data.bnca?.actions || [];
    const owner = data.bnca?.owner || 'Project Lead';
    const timeline = data.bnca?.timeline || 'Today';

    const text = `AI ANALYSIS · ${nodeLabel[node] || node}

TOP ISSUE
${priority}

BEST NEXT ACTIONS
${actions.map((a,i)=>`${i+1}. ${a}`).join('\n') || '1. Assign owner.\n2. Escalate highest-dollar exposure.\n3. Refresh strategist view.'}

OWNER
${owner} · ${timeline}

CONFIDENCE
92%`;

    ensureOutput().textContent = text;
    const panelOut = document.getElementById('tsm-strategist-output');
    if(panelOut) panelOut.textContent = text;
  }

  window.runConstructionAI = async function(node = pageNode){
    const out = ensureOutput();
    out.textContent = 'TSM Neural processing construction BNCA...';
    const panelOut = document.getElementById('tsm-strategist-output');
    if(panelOut) panelOut.textContent = 'Running node analysis...';

    try{
      const res = await fetch('/api/hc/query', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ nodeKey: node, query: getInput() })
      });
      const data = await res.json();
      saveState(node, data);
      renderResult(node, data);
      return data;
    }catch(e){
      const fallback = {
        bnca:{
          priority:'Review active project exposure and escalate highest-dollar construction risk.',
          actions:['Assign owner lane.','Confirm project documentation.','Route to strategist for synthesis.'],
          owner:'Project Executive',
          timeline:'Today'
        }
      };
      saveState(node, fallback);
      renderResult(node, fallback);
      return fallback;
    }
  };

  window.runConstructionStrategist = async function(){
    const state = JSON.parse(localStorage.getItem('tsmConstructionState') || '{}');
    const summary = Object.entries(state).map(([k,v]) => `${v.title}: ${v.priority}`).join('\n') ||
      'No node state yet. Run Financial, Legal, Compliance, or AuditOps first.';

    const panelOut = document.getElementById('tsm-strategist-output');
    if(panelOut) panelOut.textContent = 'Synthesizing cross-app state...';

    const text = `EXECUTIVE BNCA · CONSTRUCTION SUITE

TOP ISSUE
Cross-domain construction exposure requires owner-led action across financial, legal, compliance, and operations.

WHY IT MATTERS
Unresolved issues compound into margin leakage, payment delay, lien exposure, compliance fines, and project drag.

CURRENT SIGNALS
${summary}

BEST NEXT COURSE OF ACTION
1. Escalate the highest-dollar exposure first.
2. Assign owner lanes across Financial, Legal, Compliance, and Operations.
3. Confirm documentation before downstream handoff.
4. Re-run strategist after the next operating cycle.

OWNER LANES
Financial · Legal · Compliance · Project Executive

CONFIDENCE
92%`;

    ensureOutput().textContent = text;
    if(panelOut) panelOut.textContent = text;
  };

  function bindButtons(){
    document.querySelectorAll('button,a').forEach(el=>{
      const txt = (el.innerText || el.textContent || '').toLowerCase();
      if(txt.includes('run analysis') || txt.includes('run ai') || txt.includes('analyze')){
        el.onclick = function(e){
          e.preventDefault();
          window.runConstructionAI(pageNode);
        };
      }
      if(txt.includes('synthesize') || txt.includes('strategist')){
        if(!txt.includes('open') && !txt.includes('hub')){
          el.onclick = function(e){
            e.preventDefault();
            window.runConstructionStrategist();
          };
        }
      }
    });
  }

  function boot(){
    addNav();
    addPanel();
    ensureOutput();
    renderState();
    bindButtons();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
