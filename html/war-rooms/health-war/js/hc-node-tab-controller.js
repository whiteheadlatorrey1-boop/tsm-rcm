/**
 * hc-node-tab-controller.js — TSM Neural Core
 * Replaces: /healthcare/js/hc-node-tab-controller.js
 *
 * Populates tab content panels AND fires AI context on every tab switch.
 * Pulls from tsmAskHC (tsm-bridge.js must load first).
 */
(function () {
  if (window.__HC_FORCE_TAB_POPULATE__) return;
  window.__HC_FORCE_TAB_POPULATE__ = true;

  // ── Render the tab content panel ─────────────────────────────────────────
  function populate(tabName) {
    let box = document.getElementById('hc-force-tab-content');
    if (!box) {
      box = document.createElement('section');
      box.id = 'hc-force-tab-content';
      box.style.cssText = 'margin:14px 18px;padding:16px;background:#07131d;border:1px solid rgba(0,255,198,.22);border-radius:16px;color:#dff7ff';
      (document.querySelector('main,.content,.dashboard,.node-main') || document.body).appendChild(box);
    }

    const n = window.tsmDetectHCNode ? window.tsmDetectHCNode() : 'OPERATIONS';
    const tiles = ['Queue status', 'Owner lane', 'SLA risk', 'Strategist relay'];

    box.innerHTML = `
      <b style="color:#00ffc6">${n} · ${tabName || 'DASHBOARD'}</b>
      <div style="margin-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${tiles.map(x => `
          <div style="background:#0a1b28;border-radius:10px;padding:12px">
            ${x}<br><small>tab-specific readiness</small>
          </div>`).join('')}
      </div>
      <div id="hc-tab-ai-output" style="
        margin-top:14px;padding:12px;
        background:#02070d;border:1px solid rgba(0,255,198,.15);
        border-radius:10px;font-size:12px;line-height:1.7;
        white-space:pre-wrap;color:#d9f3ff;min-height:48px;
      ">TSM Neural Core — ready.</div>`;

    // Auto-trigger AI context for this tab
    if (window.tsmAskHC) {
      window.tsmAskHC(
        `I just switched to the ${tabName} tab on the ${n} node. ` +
        `Give me a 2-sentence status summary and the single most important action right now.`,
        { node: n, tab: tabName }
      ).then(reply => {
        const el = document.getElementById('hc-tab-ai-output');
        if (el) el.innerText = `> TSM NEURAL CORE\n\n${reply}`;
      });
    }
  }

  // ── Wire all tab-like elements ────────────────────────────────────────────
  function wire() {
    document.querySelectorAll("button,a,.tab,[role='tab']").forEach(el => {
      const txt = (el.innerText || '').trim();
      if (!txt || el.dataset.forceTab) return;
      el.dataset.forceTab = '1';
      el.addEventListener('click', () => setTimeout(() => populate(txt), 120), true);
    });
    populate('DASHBOARD');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }

  // Re-wire on dynamic tab injection
  new MutationObserver(wire).observe(document.body, { childList: true, subtree: true });

})();