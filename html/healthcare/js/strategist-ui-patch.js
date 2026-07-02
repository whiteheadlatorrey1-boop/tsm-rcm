/**
 * strategist-ui-patch.js
 * - Removes Groq API key input + model selector from Strategist UI
 * - Rewires Generate Report button to use dynamic key from /api/config
 * - Replaces all provider branding with "TSM Neural Core"
 *
 * Add as the LAST <script> in finops-main-strategist/index.html
 */
(function () {

  function patch() {

    // ── 1. REMOVE key input, model select, and their labels ───────────────
    // Targets the left config column inside the AI STRATEGIST panel
    const removeSelectors = [
      // Key input
      '#groqKey',
      '#neuralKey',
      // Model select
      '#modelSel',
      // The info box showing model description (70B params etc)
      // We find it by walking up from the select
    ];

    removeSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;

      // Remove the label above it (previous sibling div with font-size:10px)
      let prev = el.previousElementSibling;
      while (prev) {
        const style = prev.getAttribute('style') || '';
        const text  = prev.textContent || '';
        if (
          text.match(/groq api key|neural core access key|model/i) ||
          style.includes('letter-spacing') ||
          style.includes('text-transform')
        ) {
          const toRemove = prev;
          prev = prev.previousElementSibling;
          toRemove.remove();
        } else {
          break;
        }
      }

      // Remove the element itself
      el.remove();
    });

    // ── 2. Remove model info box (the dark box with "70B params" text) ─────
    document.querySelectorAll('div').forEach(el => {
      const t = el.textContent || '';
      if (
        (t.includes('70B params') || t.includes('128k ctx') || t.includes('tok/s')) &&
        !el.id && el.children.length <= 3
      ) {
        el.remove();
      }
    });

    // ── 3. Remove the left config column entirely if now empty ─────────────
    // The layout was grid: 220px 1fr — find the 220px col and remove if empty
    document.querySelectorAll('div').forEach(el => {
      const style = el.getAttribute('style') || '';
      if (style.includes('220px') && style.includes('grid-template-columns')) {
        // Convert the 2-col grid to single col (output only)
        el.style.gridTemplateColumns = '1fr';
        // Remove first child (the config col) if it has no meaningful content
        const firstChild = el.firstElementChild;
        if (firstChild) {
          const hasInput  = firstChild.querySelector('input, select');
          const hasButton = firstChild.querySelector('button');
          // If only buttons remain, move them above the output and remove the col
          if (!hasInput && hasButton) {
            const btns = [...firstChild.querySelectorAll('button')];
            btns.forEach(b => el.parentElement.insertBefore(b, el));
            firstChild.remove();
          } else if (!hasInput && !hasButton) {
            firstChild.remove();
          }
        }
      }
    });

    // ── 4. Rewire Generate Report button to use /api/config key ───────────
    // Remove old onclick and data-tsm-action, add fresh listener
    document.querySelectorAll('button').forEach(btn => {
      const label = btn.textContent?.trim();
      if (!label?.includes('GENERATE') && !label?.includes('Generate')) return;
      if (btn.__tsm_strat_wired) return;
      btn.__tsm_strat_wired = true;

      // Strip old wiring
      btn.removeAttribute('onclick');
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);

      clone.addEventListener('click', async () => {
        const out    = document.getElementById('stratOutput');
        const statEl = document.getElementById('stratStatus');
        const tokEl  = document.getElementById('stratTokens');
        const spdEl  = document.getElementById('stratSpeed');
        const timeEl = document.getElementById('stratTime');

        if (out) out.textContent = '> TSM NEURAL CORE\n\nGenerating report…';
        if (statEl) statEl.textContent = 'RUNNING';

        // Fetch key
        let key = null;
        try {
          const r = await fetch('/api/config', { credentials: 'same-origin' });
          const d = await r.json();
          key = d.neural_key || d.groq_key || d.api_key;
        } catch (e) {
          if (out) out.textContent = '> TSM NEURAL CORE\n\nConfiguration unavailable. Contact your administrator.';
          if (statEl) statEl.textContent = 'ERROR';
          return;
        }

        if (!key) {
          if (out) out.textContent = '> TSM NEURAL CORE\n\nNeural Core not configured on this server.';
          if (statEl) statEl.textContent = 'ERROR';
          return;
        }

        // Use model from window.TSM_MODEL or default
        const model = window.TSM_MODEL || 'openai/gpt-oss-120b';
        const prompt = window.STRAT_PROMPT || buildPrompt();

        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': 'Bearer ' + key
            },
            body: JSON.stringify({
              model,
              max_tokens:  1200,
              stream:      true,
              temperature: 0.4,
              messages: [{ role: 'user', content: prompt }]
            })
          });

          if (!res.ok) throw new Error(res.status);

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
                full  += delta;
                toks  += (delta.match(/\S+/g) || []).length;
                const speed = Math.round(toks / ((Date.now() - start) / 1000));
                if (out)    out.textContent = full;
                if (tokEl)  tokEl.textContent = toks;
                if (spdEl)  spdEl.textContent = speed + ' tok/s';
              } catch {}
            }
          }

          if (statEl) statEl.textContent = 'COMPLETE';
          if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
          if (typeof animateFeed === 'function') animateFeed();

        } catch (e) {
          if (out)    out.textContent = '> TSM NEURAL CORE\n\nAnalysis unavailable. Please try again.';
          if (statEl) statEl.textContent = 'ERROR';
        }
      });
    });

    // ── 5. Rebrand all visible text ────────────────────────────────────────
    const rebrand = str => str
      .replace(/AI STRATEGIST\s*·\s*POWERED BY GROQ/gi, 'AI STRATEGIST · TSM NEURAL CORE')
      .replace(/POWERED BY GROQ/gi,        'TSM NEURAL CORE')
      .replace(/Groq API Key/gi,            'Neural Core Access Key')
      .replace(/Groq inference/gi,          'TSM Neural Core')
      .replace(/ultra-low latency/gi,       'high-performance inference')
      .replace(/llama-3\.3-70b-versatile/g, 'TSM Neural Core · Standard')
      .replace(/llama-3\.1-8b-instant/g,    'TSM Neural Core · Fast')
      .replace(/mixtral-8x7b-32768/g,       'TSM Neural Core · Extended')
      .replace(/70B params[^<]*/g,          'Standard · 128k context');

    document.querySelectorAll('b, span, small, div, label').forEach(el => {
      if (el.children.length === 0 && el.textContent.trim()) {
        const updated = rebrand(el.textContent);
        if (updated !== el.textContent) el.textContent = updated;
      }
    });

    // Section header span (float right model label)
    const ml = document.getElementById('modelLabel');
    if (ml) ml.textContent = 'TSM Neural Core';

    console.log('[TSM] Strategist UI patched — key input removed, Neural Core wired.');
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patch);
  } else {
    patch();
  }

  function buildPrompt() {
    return `You are the TSM FinOps Strategist — a senior financial operations AI.

LIVE NODE DATA:
- AR: $18.4K at risk, Westside Holdings 97 days overdue, DSO 52 days (target 35)
- AP: 12 invoices pending, 3 vendors on credit hold, $3.8K early pay discounts available
- Zero Trust: 6 access gaps, 2 QB roles require revocation, score 67/100
- Tax: 3 missing W-9s, 2 vendors near $600 threshold, 1099 mapping in progress
- Compliance: 4 missing approvals, audit trail compiled, month-end close at 84%
- Financial Intel: $480K HRSA grant restricted, Form 990 at 84%

Generate:
EXECUTIVE SUMMARY: (2-3 sentences)
RISK MATRIX: P1 (today) / P2 (this week) / P3 (this month)
NODE STATUS BRIEF: (each node one line)
CONTROLLER PRIORITY ACTIONS: (5 numbered, dollar-specific)
BNCA: (1 paragraph — single most important action right now)

Write for a financial controller. Be specific with dollar amounts.
Never mention AI provider names or model names in your response.`;
  }

})();