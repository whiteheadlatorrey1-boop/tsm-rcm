/**
 * TSM BNCA Synthesis Panel · HC Hub
 * Drop-in for healthcare/index.html
 *
 * For each node card with data-vertical, injects:
 *   ⚡ BNCA AI SYNTHESIS panel (right column)
 *   GENERATE FULL NARRATIVE button → server-proxied AI → localStorage
 *   OPEN NODE ↗ button → window.open node URL
 *
 * Requires: tsm-mission-system.js loaded first
 * AI calls route through the server-side /api/chat proxy — no client-side
 * API key needed.
 */

(function() {
  'use strict';

  /* ── NODE CONFIG ───────────────────────────────── */
  const NODE_MAP = {
    billing:    { label: 'Billing',    url: '/healthcare/hc-billing/index.html',    icon: '💳' },
    medical:    { label: 'Medical',    url: '/healthcare/hc-medical/index.html',    icon: '🩺' },
    compliance: { label: 'Compliance', url: '/healthcare/hc-compliance/index.html', icon: '📋' },
    financial:  { label: 'Financial',  url: '/healthcare/hc-financial/index.html',  icon: '💰' },
    insurance:  { label: 'Insurance',  url: '/healthcare/hc-insurance/index.html',  icon: '🛡️' },
    pharmacy:   { label: 'Pharmacy',   url: '/healthcare/hc-pharmacy/index.html',   icon: '💊' },
    legal:      { label: 'Legal',      url: '/healthcare/hc-legal/index.html',      icon: '⚖️' },
    operations: { label: 'Operations', url: '/healthcare/hc-operations/index.html', icon: '⚙️' },
    grants:     { label: 'Grants',     url: '/healthcare/hc-grants/index.html',     icon: '🏆' },
  };

  /* ── STYLES ─────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    .tsm-bnca-panel {
      background: #0a0a0a;
      border: 1px solid #1a1a1a;
      border-left: 3px solid #00ff88;
      padding: 18px 20px;
      margin: 16px 0;
      font-family: 'Courier New', monospace;
    }
    .tsm-bnca-panel h4 {
      color: #00ff88;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0 0 12px;
    }
    .tsm-bnca-panel h4 span { color: #888; }
    .tsm-bnca-box {
      background: #050505;
      border: 1px solid #1a1a1a;
      padding: 12px;
      min-height: 80px;
      font-size: 12px;
      color: #ccc;
      line-height: 1.6;
      margin-bottom: 12px;
      white-space: pre-wrap;
    }
    .tsm-bnca-box.loading { color: #444; font-style: italic; }
    .tsm-bnca-box.error   { color: #ff4444; }
    .tsm-bnca-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .tsm-btn-generate {
      background: #00ff88;
      color: #000;
      border: none;
      padding: 8px 16px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 1px;
      cursor: pointer;
      flex: 1;
    }
    .tsm-btn-generate:hover { background: #00cc6a; }
    .tsm-btn-generate:disabled { background: #333; color: #666; cursor: default; }
    .tsm-btn-open {
      background: transparent;
      color: #00ff88;
      border: 1px solid #00ff88;
      padding: 8px 16px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      letter-spacing: 1px;
      cursor: pointer;
    }
    .tsm-btn-open:hover { background: #00ff8820; }
    .tsm-mission-tag {
      font-size: 10px;
      color: #00ff88;
      margin-top: 8px;
      letter-spacing: 1px;
    }
    .tsm-mission-tag.none { color: #444; }
  `;
  document.head.appendChild(style);

  /* ── INJECT PANELS ───────────────────────────────── */
  function injectPanels() {
    // Find node cards — look for data-vertical or known class patterns
    const cards = document.querySelectorAll('[data-vertical]');

    if (cards.length === 0) {
      // Fallback: find node link cards by href pattern
      buildStandalonePanels();
      return;
    }

    cards.forEach(card => {
      const vertical = card.dataset.vertical.toLowerCase();
      const cfg = NODE_MAP[vertical];
      if (!cfg) return;
      buildPanel(card, vertical, cfg);
    });
  }

  function buildStandalonePanels() {
    // Build panels in a container if node cards don't have data-vertical
    // Find the strategist section or insert after main content
    const target = document.querySelector('.strategist-section, #node-panels, main, .hc-main') || document.body;

    const wrapper = document.createElement('div');
    wrapper.id = 'tsm-bnca-panels';
    wrapper.style.cssText = 'padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;';

    Object.entries(NODE_MAP).forEach(([vertical, cfg]) => {
      const container = document.createElement('div');
      wrapper.appendChild(container);
      buildPanel(container, vertical, cfg);
    });

    target.appendChild(wrapper);
  }

  function buildPanel(container, vertical, cfg) {
    const existing = TSMMission.getQueueEntry(vertical);
    const hasNarrative = existing && existing.status;
    const pct = existing ? existing.completion_pct : 0;

    container.innerHTML += `
      <div class="tsm-bnca-panel" id="bnca-panel-${vertical}">
        <h4>⚡ BNCA AI SYNTHESIS <span>· ${cfg.icon} ${cfg.label.toUpperCase()}</span></h4>
        <div class="tsm-bnca-box" id="bnca-box-${vertical}">Awaiting narrative generation — click ⚡ GENERATE FULL NARRATIVE</div>
        <div class="tsm-bnca-actions">
          <button class="tsm-btn-generate" id="bnca-gen-${vertical}" onclick="TSMBnca.generate('${vertical}')">
            ⚡ GENERATE FULL NARRATIVE
          </button>
          <button class="tsm-btn-open" onclick="TSMBnca.openNode('${vertical}')">
            OPEN NODE ↗
          </button>
        </div>
        <div class="tsm-mission-tag ${hasNarrative ? '' : 'none'}" id="bnca-tag-${vertical}">
          ${hasNarrative ? `✓ MISSION ACTIVE · ${pct}% COMPLETE` : '— NO ACTIVE MISSION'}
        </div>
      </div>
    `;
  }

  /* ── PUBLIC API ──────────────────────────────────── */
  const TSMBnca = {

    generate: async function(vertical) {
      const cfg = NODE_MAP[vertical];
      if (!cfg) return;

      const btn = document.getElementById(`bnca-gen-${vertical}`);
      const box = document.getElementById(`bnca-box-${vertical}`);
      const tag = document.getElementById(`bnca-tag-${vertical}`);

      btn.disabled = true;
      btn.textContent = '⏳ GENERATING...';
      box.className = 'tsm-bnca-box loading';
      box.textContent = 'Synthesizing neural analysis...';

      const systemPrompt = `You are the TSM Neural Core performing a BNCA (Business Neural Command Analysis) for the ${cfg.label} department of a healthcare RCM operation.

Generate a structured mission narrative with EXACTLY 4 progression steps.
Return ONLY valid JSON — no preamble, no markdown, no explanation.

Schema:
{
  "narrative": "2-3 sentence executive summary of current ${cfg.label} status and priority actions",
  "steps": [
    "Step 1: [specific actionable task for ${cfg.label} — 1 sentence]",
    "Step 2: [specific actionable task — 1 sentence]",
    "Step 3: [specific actionable task — 1 sentence]",
    "Step 4: [specific actionable task — 1 sentence]"
  ]
}`;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: systemPrompt, conversationHistory: [] })
        });

        if (!res.ok) throw new Error(`AI backend ${res.status}`);
        const data = await res.json();
        let raw = data.answer || data.choices?.[0]?.message?.content || '';
        raw = raw.replace(/```json|```/g, '').trim();

        const parsed = JSON.parse(raw);
        const steps = parsed.steps || [];
        const narrative = parsed.narrative || '';

        if (!steps.length) throw new Error('No steps returned');

        // Write to localStorage via mission system
        TSMMission.setActiveMission(vertical, cfg.label, steps);

        box.className = 'tsm-bnca-box';
        box.textContent = narrative + '\n\n' + steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

        tag.className = 'tsm-mission-tag';
        tag.textContent = `✓ MISSION ACTIVE · 0% COMPLETE · ${steps.length} STEPS QUEUED`;

        btn.disabled = false;
        btn.textContent = '⚡ REGENERATE NARRATIVE';

      } catch (err) {
        box.className = 'tsm-bnca-box error';
        box.textContent = `NEURAL CORE ERROR: ${err.message}`;
        btn.disabled = false;
        btn.textContent = '⚡ GENERATE FULL NARRATIVE';
      }
    },

    openNode: function(vertical) {
      const cfg = NODE_MAP[vertical];
      if (!cfg) return;

      // Ensure mission exists in localStorage before opening
      const m = TSMMission.getMissionForVertical(vertical);
      if (!m) {
        const box = document.getElementById(`bnca-box-${vertical}`);
        if (box) {
          box.className = 'tsm-bnca-box error';
          box.textContent = 'Generate narrative first to activate mission before opening node.';
        }
        return;
      }

      window.open(cfg.url, '_blank');
    }
  };

  window.TSMBnca = TSMBnca;

  /* ── INIT ────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPanels);
  } else {
    injectPanels();
  }

})();