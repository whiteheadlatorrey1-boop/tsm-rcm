// hc-node-test.js — HC Node Tab + AI Test Suite
// Load at: tsm-shell.fly.dev/healthcare/index.html?run-node-tests=1
(function(){
  if(!window.location.search.includes('run-node-tests')) return;

  const NODES = ['billing','compliance','medical','pharmacy','operations','insurance','financial','legal','vendors','grants','taxprep'];
  const results = [];
  let passed = 0, failed = 0;

  function assert(label, condition, detail) {
    const ok = !!condition;
    results.push({ label, ok, detail: detail || '' });
    if(ok) passed++; else failed++;
    console.log((ok ? '✓' : '✗') + ' ' + label + (detail ? ' — ' + detail : ''));
    return ok;
  }

  function renderPanel() {
    const existing = document.getElementById('hc-test-panel');
    if(existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'hc-test-panel';
    panel.style.cssText = `
      position:fixed;top:0;right:0;width:420px;height:100vh;
      background:#050e17;border-left:2px solid #00ffc6;
      z-index:999999;overflow-y:auto;font-family:monospace;font-size:12px;
      color:#c8d4e0;box-shadow:-4px 0 30px rgba(0,255,198,.1);
    `;

    const total = passed + failed;
    const pct   = total ? Math.round(passed/total*100) : 0;
    const color  = pct === 100 ? '#00e676' : pct >= 70 ? '#ffb300' : '#ff3d57';

    panel.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid rgba(0,255,198,.15);background:#07131d;position:sticky;top:0">
        <div style="font-size:10px;color:#4a6a7a;letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px">HC NODE TEST SUITE</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:22px;font-weight:800;color:${color}">${pct}% <span style="font-size:12px;color:#4a6a7a">PASS RATE</span></div>
          <div style="text-align:right">
            <div style="color:#00e676;font-size:12px">✓ ${passed} passed</div>
            <div style="color:#ff3d57;font-size:12px">✗ ${failed} failed</div>
          </div>
        </div>
        <div style="height:4px;background:#1e2530;border-radius:2px;margin-top:8px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width .4s"></div>
        </div>
      </div>
      <div style="padding:10px 16px">
        ${results.map(r => `
          <div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
            <span style="color:${r.ok?'#00e676':'#ff3d57'};flex-shrink:0">${r.ok?'✓':'✗'}</span>
            <div>
              <div style="color:${r.ok?'#c8d4e0':'#ff8a9a'}">${r.label}</div>
              ${r.detail?`<div style="font-size:10px;color:#4a6a7a;margin-top:1px">${r.detail}</div>`:''}
            </div>
          </div>`).join('')}
      </div>
      <div style="padding:12px 16px;border-top:1px solid rgba(0,255,198,.1);position:sticky;bottom:0;background:#050e17;display:flex;gap:8px">
        <button onclick="document.getElementById('hc-test-panel').remove()" style="flex:1;padding:7px;background:transparent;border:1px solid #1e2530;color:#4a6a7a;cursor:pointer;font-family:monospace;font-size:11px">✕ Close</button>
        <button onclick="window.__HC_RUN_TESTS__()" style="flex:1;padding:7px;background:#00ffc6;border:none;color:#000;cursor:pointer;font-family:monospace;font-size:11px;font-weight:700">↺ Re-run</button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  async function runTests() {
    results.length = 0;
    passed = 0;
    failed = 0;
    console.group('[HC-NODE-TESTS] Running...');

    // ── 1. SCRIPT PRESENCE ─────────────────────────────────────────────────
    assert('hc-universal-tab-ai.js loaded',
      window.__HC_UNIVERSAL_TAB_AI__,
      'window.__HC_UNIVERSAL_TAB_AI__ flag');

    assert('hc-node-enhance.js loaded',
      window.__HC_DEEP_INTEL_WORKBENCH__,
      'window.__HC_DEEP_INTEL_WORKBENCH__ flag');

    assert('generateNodeNarrative() exists',
      typeof window.generateNodeNarrative === 'function');

    // ── 2. DOM STRUCTURE ───────────────────────────────────────────────────
    const nodeGrid = document.getElementById('nodeGrid');
    assert('nodeGrid exists', !!nodeGrid);

    const nodeCards = document.querySelectorAll('.node-card[data-node]');
    assert('Node cards rendered',
      nodeCards.length >= 8,
      `Found ${nodeCards.length} cards (expected ≥8)`);

    assert('All nodes have data-node attr',
      [...nodeCards].every(c => c.dataset.node),
      [...nodeCards].map(c=>c.dataset.node).join(', '));

    // ── 3. TAB SWITCHING ───────────────────────────────────────────────────
    const contentPanel = document.getElementById('hc-node-tab-content');
    assert('Tab content panel exists', !!contentPanel,
      'id="hc-node-tab-content" should be injected by tab-ai script');

    // Click each node card and verify content switches
    let switchOk = 0;
    for(const key of ['billing','compliance','medical','pharmacy']) {
      const card = document.querySelector(`.node-card[data-node="${key}"]`);
      if(!card) continue;
      card.click();
      await new Promise(r => setTimeout(r, 250));
      const panel = document.getElementById('hc-node-tab-content');
      const hasContent = panel && panel.innerHTML.includes(key.toUpperCase());
      if(hasContent) switchOk++;
      assert(`Tab switches to ${key}`,
        hasContent,
        hasContent ? `${key.toUpperCase()} content rendered` : 'content panel empty after click');
    }

    // ── 4. CONTENT QUALITY ─────────────────────────────────────────────────
    // Click billing — highest priority for demo
    const billingCard = document.querySelector('.node-card[data-node="billing"]');
    if(billingCard) {
      billingCard.click();
      await new Promise(r => setTimeout(r, 300));
    }
    const panel = document.getElementById('hc-node-tab-content');

    assert('Content has KPI row',
      panel && panel.querySelector('[style*="grid-template-columns"]'),
      'KPI grid should render on node click');

    assert('Content has queue items',
      panel && panel.innerHTML.includes('Queue Items'),
      'Active Queue Items section present');

    assert('Content has AI synthesis block',
      panel && panel.innerHTML.includes('BNCA AI Synthesis'),
      'AI synthesis section present');

    assert('Content has GENERATE button',
      panel && panel.innerHTML.includes('GENERATE FULL NARRATIVE'),
      'Generate narrative button present');

    assert('Content has OPEN NODE button',
      panel && panel.innerHTML.includes('OPEN NODE'),
      'Open node link present');

    assert('Content has owner label',
      panel && panel.innerHTML.includes('Owner'),
      'Owner lane displayed');

    assert('Content has risk level',
      panel && panel.innerHTML.includes('Risk Level'),
      'Risk level displayed');

    // ── 5. AI API TEST ─────────────────────────────────────────────────────
    assert('GENERATE button is clickable',
      panel && !!panel.querySelector('button'),
      'At least one button in content panel');

    // Live API test
    try {
      const resp = await fetch('/api/wip/healthcare/recon', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: '{}'
      });
      const data = await resp.json();
      assert('Healthcare WIP API responds',
        resp.ok && data.suite === 'healthcare',
        `action: ${data.action || 'none'}`);
      assert('API returns BNCA action',
        data.action === 'CLAIM_BATCH_SUBMIT',
        data.action);
      assert('API returns unbilled count',
        data.metrics && data.metrics.unbilled_services > 0,
        `unbilled_services: ${data.metrics?.unbilled_services}`);
    } catch(e) {
      assert('Healthcare WIP API responds', false, e.message);
    }

    // HC query API test
    try {
      const resp2 = await fetch('/api/hc/query', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({sector:'HEALTHCARE', node:'BILLING', context:'Test narrative generation'})
      });
      const d2 = await resp2.json();
      assert('HC query API responds',
        resp2.ok,
        `status: ${resp2.status}`);
      assert('HC query returns narrative text',
        d2.reply || d2.content || d2.message,
        'reply/content/message field present');
    } catch(e) {
      assert('HC query API responds', false, e.message);
    }

    // ── 6. NODE COMPLETENESS ───────────────────────────────────────────────
    const expectedNodes = ['billing','compliance','medical','pharmacy','operations','insurance','financial','legal'];
    expectedNodes.forEach(n => {
      const card = document.querySelector(`.node-card[data-node="${n}"]`);
      assert(`Node card exists: ${n}`, !!card, card ? 'found' : 'MISSING');
    });

    // ── 7. SIDEBAR WIRING ──────────────────────────────────────────────────
    const playItems = document.querySelectorAll('.play');
    assert('Sidebar playlist items exist',
      playItems.length > 0,
      `Found ${playItems.length} playlist items`);

    // ── DONE ────────────────────────────────────────────────────────────────
    console.groupEnd();
    renderPanel();
  }

  window.__HC_RUN_TESTS__ = runTests;

  // Add floating test button
  function addTestButton() {
    const btn = document.createElement('button');
    btn.id = 'hc-run-tests-btn';
    btn.textContent = '🧪 Run Node Tests';
    btn.style.cssText = `
      position:fixed;bottom:16px;right:16px;z-index:999998;
      background:#00ffc6;color:#000;border:none;
      font-family:monospace;font-size:11px;font-weight:700;
      padding:8px 16px;border-radius:4px;cursor:pointer;
      letter-spacing:.08em;text-transform:uppercase;
      box-shadow:0 4px 20px rgba(0,255,198,.3);
    `;
    btn.onclick = runTests;
    document.body.appendChild(btn);
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setTimeout(addTestButton, 500); setTimeout(runTests, 800); });
  } else {
    setTimeout(addTestButton, 500);
    setTimeout(runTests, 800);
  }
})();
