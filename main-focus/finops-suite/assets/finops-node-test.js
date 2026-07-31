// finops-node-test.js — FinOps Node + Chart + API Test Suite
// Load: tsm-shell.fly.dev/finops-suite/financial-ui.html?run-finops-tests=1
(function(){
  if(!window.location.search.includes('run-finops-tests')) return;

  const results = [];
  let passed = 0, failed = 0;

  function assert(label, ok, detail) {
    results.push({ label, ok: !!ok, detail: detail||'' });
    if(ok) passed++; else failed++;
    console.log((ok?'✓':'✗')+' '+label+(detail?' — '+detail:''));
    return !!ok;
  }

  function renderPanel() {
    const old = document.getElementById('finops-test-panel');
    if(old) old.remove();
    const p = document.createElement('div');
    p.id = 'finops-test-panel';
    p.style.cssText = 'position:fixed;top:0;right:0;width:400px;height:100vh;background:#050e17;border-left:2px solid #3a8cf0;z-index:999999;overflow-y:auto;font-family:monospace;font-size:12px;color:#c8d4e0';
    const total = passed+failed, pct = total?Math.round(passed/total*100):0;
    const col = pct===100?'#00e676':pct>=70?'#ffb300':'#ff3d57';
    p.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid rgba(58,140,240,.15);background:#07131d;position:sticky;top:0">
        <div style="font-size:10px;color:#4a6a7a;letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px">FINOPS TEST SUITE</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:22px;font-weight:800;color:${col}">${pct}% <span style="font-size:12px;color:#4a6a7a">PASS RATE</span></div>
          <div><div style="color:#00e676">✓ ${passed}</div><div style="color:#ff3d57">✗ ${failed}</div></div>
        </div>
        <div style="height:4px;background:#1e2530;border-radius:2px;margin-top:8px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div>
        </div>
      </div>
      <div style="padding:10px 16px">
        ${results.map(r=>`<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:${r.ok?'#00e676':'#ff3d57'}">${r.ok?'✓':'✗'}</span><div><div style="color:${r.ok?'#c8d4e0':'#ff8a9a'}">${r.label}</div>${r.detail?`<div style="font-size:10px;color:#4a6a7a">${r.detail}</div>`:''}</div></div>`).join('')}
      </div>
      <div style="padding:12px 16px;border-top:1px solid rgba(58,140,240,.1);position:sticky;bottom:0;background:#050e17;display:flex;gap:8px">
        <button onclick="document.getElementById('finops-test-panel').remove()" style="flex:1;padding:7px;background:transparent;border:1px solid #1e2530;color:#4a6a7a;cursor:pointer;font-family:monospace;font-size:11px">✕ Close</button>
        <button onclick="window.__FINOPS_RUN_TESTS__()" style="flex:1;padding:7px;background:#3a8cf0;border:none;color:#fff;cursor:pointer;font-family:monospace;font-size:11px;font-weight:700">↺ Re-run</button>
      </div>`;
    document.body.appendChild(p);
  }

  async function runTests() {
    results.length = 0; passed = 0; failed = 0;
    console.group('[FINOPS-TESTS] Running...');

    // DOM checks
    assert('WIP banner present',      !!document.getElementById('tsm-wip-finops'));
    assert('Charts section present',  !!document.getElementById('finops-wip-intelligence'));
    assert('Chart B canvas',          !!document.getElementById('finops-chart-b'));
    assert('Chart C canvas',          !!document.getElementById('finops-chart-c'));
    assert('Chart D canvas',          !!document.getElementById('finops-chart-d'));
    assert('Chart E node health',     !!document.getElementById('finops-node-health'));
    assert('Chart F heatmap',         !!document.getElementById('finops-heatmap'));
    assert('KPI row present',         !!document.getElementById('finops-kpi-row'));
    assert('Narrative output',        !!document.getElementById('finops-narrative-output'));

    // Chart.js loaded
    assert('Chart.js loaded',         typeof Chart !== 'undefined');

    // Functions
    assert('runAccrualRecon() exists',    typeof window.runAccrualRecon === 'function');
    assert('generateFinopsNarrative() exists', typeof window.generateFinopsNarrative === 'function');

    // Node 01 wired to accounting
    const mod1 = document.querySelector('.mod-card');
    assert('Node 01 exists',          !!mod1);

    // Heatmap populated
    const hmCells = document.querySelectorAll('#finops-heatmap > div');
    assert('Heatmap has cells',        hmCells.length >= 4, `Found ${hmCells.length}`);

    // Node health populated
    const nhRows = document.querySelectorAll('#finops-node-health > div');
    assert('Node health rows',         nhRows.length >= 4, `Found ${nhRows.length}`);

    // API tests
    try {
      const r = await fetch('/api/wip/finops/accrual-recon', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      const d = await r.json();
      assert('Accrual-recon API 200',    r.ok, `status ${r.status}`);
      assert('Returns finops suite',     d.suite === 'finops-suite', d.suite);
      assert('Returns ACCRUAL action',   d.action && d.action.includes('ACCRUAL'), d.action);
      assert('Returns variance metric',  d.metrics && d.metrics.variance > 0, `variance: ${d.metrics?.variance}`);
    } catch(e) { assert('Accrual-recon API', false, e.message); }

    try {
      const r2 = await fetch('/api/hc/query', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sector:'FINANCE',node:'ACCRUAL-RECON',context:'Test finops narrative'})});
      const d2 = await r2.json();
      assert('HC query API (finops)',    r2.ok, `status ${r2.status}`);
      assert('Returns narrative text',   !!(d2.reply||d2.content||d2.message), 'reply field present');
    } catch(e) { assert('HC query API', false, e.message); }

    console.groupEnd();
    renderPanel();
  }

  window.__FINOPS_RUN_TESTS__ = runTests;

  // Floating button
  function addBtn() {
    const b = document.createElement('button');
    b.textContent = '🧪 FinOps Tests';
    b.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:999998;background:#3a8cf0;color:#fff;border:none;font-family:monospace;font-size:11px;font-weight:700;padding:8px 16px;border-radius:4px;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 4px 20px rgba(58,140,240,.3)';
    b.onclick = runTests;
    document.body.appendChild(b);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{setTimeout(addBtn,500);setTimeout(runTests,900);});
  } else {
    setTimeout(addBtn,500); setTimeout(runTests,900);
  }
})();