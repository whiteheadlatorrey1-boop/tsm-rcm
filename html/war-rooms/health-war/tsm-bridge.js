/**
 * tsm-bridge.js  — TSM Neural Core
 * Replaces: /healthcare/js/tsm-bridge.js
 *
 * Key fetched dynamically from /api/config (Railway env: NEURAL_KEY)
 * No provider names, model names, or key material ever reach the browser.
 */
(function () {
  if (window.__TSM_HC_BRIDGE_FORCE__) return;
  window.__TSM_HC_BRIDGE_FORCE__ = true;

  // ── Session-only key cache (never persisted) ──────────────────────────────
  let _key   = null;
  let _model = null;

  async function getKey() {
    if (_key) return _key;
    try {
      const r = await fetch('/api/config', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('config ' + r.status);
      const d = await r.json();
      _key   = d.neural_key || d.groq_key || d.api_key;
      _model = d.model || 'openai/gpt-oss-120b';
      if (!_key) throw new Error('no key');
      return _key;
    } catch (e) {
      console.warn('[TSM Neural Core] Config unavailable:', e.message);
      return null;
    }
  }

  // ── Node & tab detection ──────────────────────────────────────────────────
  function node() {
    const p = location.pathname.toLowerCase();
    const t = (document.body.innerText || '').toLowerCase();
    if (p.includes('billing')    || t.includes('billing command'))    return 'BILLING';
    if (p.includes('medical')    || t.includes('medical command'))    return 'MEDICAL';
    if (p.includes('compliance') || t.includes('compliance command')) return 'COMPLIANCE';
    if (p.includes('financial')  || t.includes('financial command'))  return 'FINANCIAL';
    if (p.includes('insurance'))  return 'INSURANCE';
    if (p.includes('pharmacy'))   return 'PHARMACY';
    if (p.includes('vendor'))     return 'VENDORS';
    if (p.includes('legal'))      return 'LEGAL';
    if (p.includes('grant'))      return 'GRANTS';
    if (p.includes('tax'))        return 'TAXPREP';
    if (p.includes('strategist')) return 'STRATEGIST';
    return 'OPERATIONS';
  }

  function tab() {
    const el = document.querySelector('.active,[aria-selected="true"]');
    return (el?.innerText || 'Current View').trim().replace(/\s+/g, ' ');
  }

  // ── Output targets ────────────────────────────────────────────────────────
  function getOutputs() {
    return [
      ...document.querySelectorAll(
        '.bnca-output,#hc-node-synthesis,#stratOutput,.guide-res,' +
        '[id*="dash-res"],[id*="bnca-res"],[id*="strat-output"]'
      )
    ];
  }

  function setOutputs(text) {
    getOutputs().forEach(el => { el.innerText = text; });
  }

  // ── System prompt ─────────────────────────────────────────────────────────
  function buildSystem(n, tb) {
    return `You are TSM Neural Core, the AI engine for the ${n} Command node. Current tab: ${tb}.
Be concise and actionable. For BNCA output: TOP ISSUE, BEST NEXT ACTIONS (numbered), ESCALATION FLAG.
For Strategist relay: situation summary, key metrics, risks, escalations.
Never mention AI provider names, model names, or technical infrastructure in responses.`;
  }

  // ── Core AI call ──────────────────────────────────────────────────────────
  async function askHC(prompt, extra = {}) {
    const n  = extra.node  || node();
    const tb = extra.tab   || tab();
    const ts = new Date().toLocaleTimeString();

    setOutputs(`> TSM NEURAL CORE [${ts}]\n\nProcessing…`);

    const key = await getKey();
    if (!key) {
      const msg = '> TSM NEURAL CORE\n\nNeural Core offline. Contact your administrator.';
      setOutputs(msg);
      return msg;
    }

    const model = extra.model || _model || 'openai/gpt-oss-120b';

    try {
      const res = await fetch('/api/v1/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens:  1024,
          stream:      true,
          temperature: 0.4,
          messages: [
            { role: 'system', content: buildSystem(n, tb) },
            { role: 'user',   content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const msg = '> TSM NEURAL CORE\n\nAnalysis unavailable. Please try again.';
        setOutputs(msg);
        return msg;
      }

      // Stream tokens
      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim();
          if (d === '[DONE]') continue;
          try {
            const delta = JSON.parse(d)?.choices?.[0]?.delta?.content || '';
            full += delta;
            getOutputs().forEach(el => {
              el.innerText = `> TSM NEURAL CORE [${ts}]\n\n${full}`;
            });
          } catch {}
        }
      }

      return full;

    } catch (err) {
      const msg = '> TSM NEURAL CORE\n\nConnection error. Please try again.';
      setOutputs(msg);
      return msg;
    }
  }

  // ── Button wiring ─────────────────────────────────────────────────────────
  const NAMED = {
    'Explain Current Tab':     () => askHC(`Explain what the ${tab()} tab does and what actions I should take now.`),
    'Find Highest Risk':       () => askHC('Identify the single highest risk item on this page and recommend immediate action.'),
    'Presentation Talk Track': () => askHC(`Give me a 60-second presentation talk track for the ${tab()} tab on the ${node()} node.`),
    'Run Node BNCA':           () => askHC(`Run a full BNCA for the ${node()} node. Output TOP ISSUE, BEST NEXT ACTIONS, and ESCALATION FLAG.`),
    'Relay to Strategist':     () => askHC(`Prepare a structured strategist briefing for the ${node()} node. Include: situation summary, key metrics, risks, and recommended escalations.`),
    'Submit Step Response':    () => askHC(`Analyse the current step response for the ${node()} node and confirm if objectives are met or identify gaps.`),
  };

  function wireButtons() {
    document.querySelectorAll('button,.guide-submit-btn,[data-tsm-action]').forEach(btn => {
      if (btn.__tsm_wired) return;
      const label  = btn.innerText?.trim();
      const action = btn.dataset?.tsmAction;

      if (action === 'runQ') {
        btn.__tsm_wired = true;
        btn.addEventListener('click', () => {
          const sel    = btn.dataset.tsmArgs?.split(',')?.[0]?.replace(/'/g,'').trim();
          const input  = sel ? document.querySelector(sel) : null;
          const prompt = input?.value || input?.innerText || 'Run analysis';
          askHC(prompt);
        });
        });
        return;
      }

      if (label && NAMED[label]) {
        btn.__tsm_wired = true;
        btn.addEventListener('click', () => NAMED[label]());
        return;
      }

      if (label?.toUpperCase() === 'ASK') {
        btn.__tsm_wired = true;
        btn.addEventListener('click', () => {
          const input  = btn.closest('div,section')?.querySelector('input,textarea,[contenteditable]');
          const prompt = input?.value || input?.innerText || 'Run analysis on this node.';
          askHC(prompt);
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }
  new MutationObserver(wireButtons).observe(document.body, { childList: true, subtree: true });

  // ── Public API ────────────────────────────────────────────────────────────
  window.TSMBridge       = { detectNode: node, activeTab: tab, askHC };
  window.tsmAskHC        = askHC;
  window.tsmDetectHCNode = node;

})();