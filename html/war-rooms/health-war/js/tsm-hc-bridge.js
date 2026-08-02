/**
 * tsm-hc-bridge.js
 * TSM Neural Core — AI bridge for all HC + FinOps nodes
 * Drop in: /healthcare/js/tsm-bridge.js (replaces existing)
 *
 * Key is fetched dynamically from /api/config — never stored in browser or code.
 * All LLM provider references are internal only, never surfaced to users.
 */
(function () {
  window.__TSM_HC_BRIDGE_FORCE__ = true;

  // ── Cached key (session only, never persisted) ────────────────────────────
  let _keyCache = null;

  async function getKey() {
    if (_keyCache) return _keyCache;
    try {
      const r = await fetch('/api/config', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('config ' + r.status);
      const d = await r.json();
      const k = d.neural_key || d.groq_key || d.api_key;
      if (!k) throw new Error('no key in config');
      _keyCache = k;
      return k;
    } catch (e) {
      console.warn('[TSM Neural Core] Key fetch failed:', e.message);
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

  // ── System prompt ─────────────────────────────────────────────────────────
  function buildSystem(n, tb) {
    return `You are TSM Neural Core, the AI engine for the ${n} Command node.
Current tab: ${tb} | Node: ${n}
You are a healthcare/financial operations AI. Be concise and actionable.
- Explain tab: summarise what it tracks and what actions to take now.
- Highest risk: identify the most critical metric or alert and recommend action.
- BNCA: output TOP ISSUE, BEST NEXT ACTIONS (numbered), ESCALATION FLAG if needed.
- Strategist relay: structured briefing — situation, key metrics, risks, escalations.
Keep responses under 200 words unless a detailed analysis is requested.
Never mention the underlying AI provider or model name in your responses.`;
  }

  // ── Output elements helper ────────────────────────────────────────────────
  function getOutputs() {
    return document.querySelectorAll(
      '.bnca-output, #hc-node-synthesis, #stratOutput, .guide-res,' +
      '[id*="dash-res"], [id*="bnca-res"], [id*="strat-output"]'
    );
  }

  function setOutputs(text) {
    getOutputs().forEach(el => { el.innerText = text; });
  }

  // ── Core AI call ──────────────────────────────────────────────────────────
  async function askHC(prompt, extra = {}) {
    const n  = extra.node || node();
    const tb = extra.tab  || tab();
    const ts = new Date().toLocaleTimeString();

    setOutputs(`> TSM NEURAL CORE [${ts}]\n\nProcessing…`);

    const key = await getKey();
    if (!key) {
      const msg = '> TSM NEURAL CORE\n\nConfiguration required. Contact your system administrator.';
      setOutputs(msg);
      return msg;
    }

    const model = extra.model
      || (typeof window !== 'undefined' && document.getElementById('modelSel')?.value)
      || 'openai/gpt-oss-120b';

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          stream: true,
          temperature: 0.4,
          messages: [
            { role: 'system', content: buildSystem(n, tb) },
            { role: 'user',   content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = `> TSM NEURAL CORE\n\nAnalysis unavailable (${res.status}). Please try again.`;
        setOutputs(msg);
        return msg;
      }

      // Stream response
      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let full = '', toks = 0, start = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim();
          if (d === '[DONE]') continue;
          try {
            const j     = JSON.parse(d);
            const delta = j.choices?.[0]?.delta?.content || '';
            full += delta;
            toks += (delta.match(/\S+/g) || []).length;
            const elapsed = (Date.now() - start) / 1000;
            const speed   = Math.round(toks / elapsed);
            getOutputs().forEach(el => {
              el.innerText = `> TSM NEURAL CORE [${ts}]\n\n${full}`;
            });
            // Update speed/token displays if on strategist page
            const tokEl   = document.getElementById('stratTokens');
            const spdEl   = document.getElementById('stratSpeed');
            const statEl  = document.getElementById('stratStatus');
            if (tokEl)  tokEl.textContent  = toks;
            if (spdEl)  spdEl.textContent  = speed + ' tok/s';
            if (statEl) statEl.textContent = 'RUNNING';
          } catch {}
        }
      }

      // Final status update
      const timeEl = document.getElementById('stratTime');
      const statEl = document.getElementById('stratStatus');
      if (timeEl)  timeEl.textContent  = new Date().toLocaleTimeString();
      if (statEl)  statEl.textContent  = 'COMPLETE';

      return full;

    } catch (err) {
      const msg = `> TSM NEURAL CORE\n\nConnection error. Please try again.`;
      setOutputs(msg);
      return msg;
    }
  }

  // ── Button wiring ─────────────────────────────────────────────────────────
  const ACTIONS = {
    'Explain Current Tab':     () => askHC(`Explain what the ${tab()} tab does and what actions I should take now.`),
    'Find Highest Risk':       () => askHC('Identify the single highest risk item on this page and recommend immediate action.'),
    'Presentation Talk Track': () => askHC(`Give me a 60-second presentation talk track for the ${tab()} tab on the ${node()} node.`),
    'Run Node BNCA':           () => askHC(`Run a full BNCA for the ${node()} node. Output TOP ISSUE, BEST NEXT ACTIONS, and ESCALATION FLAG.`),
    'Relay to Strategist':     () => askHC(`Prepare a structured strategist briefing for the ${node()} node. Include: situation summary, key metrics, risks, and recommended escalations.`),
    'Submit Step Response':    () => askHC(`Analyse the current step response for the ${node()} node and confirm if objectives are met or identify gaps.`),
    'generateReport':          () => {
      const prompt = document.querySelector('#stratPrompt')?.value || window.STRAT_PROMPT || buildStratPrompt();
      askHC(prompt, { node: 'STRATEGIST' });
    },
    'clearOutput': () => {
      setOutputs('Cleared.');
      const statEl = document.getElementById('stratStatus');
      if (statEl) statEl.textContent = 'IDLE';
    }
  };

  function buildStratPrompt() {
    return `You are the TSM FinOps Strategist — a senior financial operations AI.
Generate an executive report with: EXECUTIVE SUMMARY, RISK MATRIX (P1/P2/P3), NODE STATUS BRIEF, CONTROLLER PRIORITY ACTIONS (5 numbered), and BNCA.
Write for a financial controller. Be specific. Never mention AI provider names.`;
  }

  function wireButtons() {
    // Named action buttons
    document.querySelectorAll('button, .guide-submit-btn, [class*="btn"], [data-tsm-action]').forEach(btn => {
      if (btn.__tsm_wired) return;
      const label  = btn.innerText?.trim();
      const action = btn.dataset?.tsmAction;

      // data-tsm-action wiring
      if (action && ACTIONS[action]) {
        btn.__tsm_wired = true;
        btn.addEventListener('click', e => { e.stopPropagation(); ACTIONS[action](); });
        return;
      }

      // Text label wiring
      if (label && ACTIONS[label]) {
        btn.__tsm_wired = true;
        btn.addEventListener('click', () => ACTIONS[label]());
        return;
      }

      // Generic runQ
      if (action === 'runQ') {
        btn.__tsm_wired = true;
        btn.addEventListener('click', () => {
          const sel     = btn.dataset.tsmArgs?.split(',')?.[0]?.replace(/'/g, '').trim();
          const inputEl = sel ? document.querySelector(sel) : null;
          const prompt  = inputEl?.value || inputEl?.innerText || 'Run analysis';
          askHC(prompt);
        });
        return;
      }

      // ASK buttons
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

  // Wire on ready + re-wire on DOM changes (tab switches)
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