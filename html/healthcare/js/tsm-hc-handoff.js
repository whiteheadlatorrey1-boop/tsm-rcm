// ═══════════════════════════════════════════════════════════════════════════
// TSM HC HANDOFF — tsm-hc-handoff.js
// Bridges hc-academy Anomaly Advisor checklist items -> the real HC node
// pages, carrying the finding text AND any already-generated Guidance tip
// over instead of losing it when the operator leaves the poc-html sandbox.
//
// SENDER SIDE (poc-html): TSMHCHandoff.redirectToNode(nodeKey, payload)
//   stashes { finding, guidance, sourceDocument } in sessionStorage keyed
//   to that node, then navigates to the node's real index.html.
//
// RECEIVER SIDE (every hc-* node page): on load, if ?handoff=1 is present
// and a matching sessionStorage entry exists for THIS node, it:
//   1. Fills the node's issue/finding field with the carried finding text
//      (field id varies per node -- intake-issue, pt-issue, pharm-issue,
//      ops-issue, tax-issue, vendor-issue -- so this matches generically
//      on any element whose id ends in "issue").
//   2. Clicks the node's own "SET MISSION" / "SET ... INTAKE" button
//      (function name varies per node too -- applyIntake, applyOpsMission,
//      applyMedicalIntake, etc. -- so this matches generically on any
//      onclick="applyXxx()" button rather than a per-node function map)
//      so the node renders its own real urgent-task/step UI exactly as if
//      the operator had typed it in themselves.
//   3. Renders the carried Guidance tip as a visible banner so it isn't
//      lost -- it does NOT get silently dropped once the redirect happens.
//   sessionStorage entry is consumed (deleted) on read so a stale handoff
//   can't leak into an unrelated later visit to the same node.
//
// HONESTY CONTRACT: never fabricates a finding or guidance tip that wasn't
// actually generated on the sender side. If there's nothing in
// sessionStorage matching this node, this file does nothing.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.__TSM_HC_HANDOFF__) return;
  window.__TSM_HC_HANDOFF__ = true;

  const STORAGE_PREFIX = 'tsm-hc-handoff:';

  // Mirrors resolveNodeId() in tsm-node-relay-bridge.js so both files agree.
  function resolveNodeId() {
    if (window.TSM_NODE_ID) return window.TSM_NODE_ID;
    const m = window.location.pathname.match(/hc-([^\/]+)\//);
    return m ? m[1].toLowerCase() : null;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── SENDER SIDE ────────────────────────────────────────────────────────
  function redirectToNode(nodeKey, payload) {
    payload = payload || {};
    try {
      sessionStorage.setItem(STORAGE_PREFIX + nodeKey, JSON.stringify({
        finding: payload.finding || '',
        guidance: payload.guidance || '',
        sourceDocument: payload.sourceDocument || '',
        ts: Date.now()
      }));
    } catch (e) {
      console.error('[tsm-hc-handoff] failed to stash handoff:', e);
    }
    window.location.href = '/healthcare/hc-' + nodeKey + '/index.html?handoff=1';
  }

  // ── RECEIVER SIDE ──────────────────────────────────────────────────────
  function consumeIncoming() {
    const nodeKey = resolveNodeId();
    if (!nodeKey) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('handoff') !== '1') return;

    let raw;
    try { raw = sessionStorage.getItem(STORAGE_PREFIX + nodeKey); }
    catch (e) { return; }
    if (!raw) return;

    // Consume immediately so a stale entry never re-applies on refresh.
    try { sessionStorage.removeItem(STORAGE_PREFIX + nodeKey); } catch (e) {}

    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || (!data.finding && !data.guidance)) return;

    // Expand the intake panel first, if this node has one (name varies:
    // toggleIntake on most nodes, toggleMedicalIntake on hc-medical).
    ['toggleIntake', 'toggleMedicalIntake'].forEach(fnName => {
      if (typeof window[fnName] === 'function') {
        try { window[fnName](true); } catch (e) {}
      }
    });

    // Fill whichever field is this node's issue/finding textarea.
    if (data.finding) {
      const issueEl = document.querySelector('[id$="issue"], [id$="Issue"]');
      if (issueEl) {
        issueEl.value = data.finding;
        issueEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Click this node's own "SET MISSION" button so it renders its real
    // urgent-task/step UI from the carried finding, whatever that node's
    // apply-function is actually named.
    const applyBtn = Array.from(document.querySelectorAll('button[onclick]'))
      .find(b => /^apply\w*\(\)$/.test((b.getAttribute('onclick') || '').trim()));
    if (applyBtn) {
      try { applyBtn.click(); } catch (e) { console.error('[tsm-hc-handoff] apply click failed:', e); }
    }

    if (data.guidance) renderGuidanceBanner(data);
  }

  function renderGuidanceBanner(data) {
    if (document.getElementById('tsm-handoff-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'tsm-handoff-banner';
    banner.style.cssText = 'background:#001a14;border:1px solid rgba(0,255,198,.35);border-radius:4px;padding:8px 10px;margin-bottom:10px;font-size:9px;line-height:1.6;color:#8ab0c0;font-family:"Courier New",monospace';
    banner.innerHTML =
      '<div style="color:#00ffc6;font-weight:700;letter-spacing:1px;margin-bottom:4px">◈ CARRIED OVER FROM ANOMALY ADVISOR'
      + (data.sourceDocument ? ' · ' + escapeHtml(data.sourceDocument) : '') + '</div>'
      + '<div>' + escapeHtml(data.guidance) + '</div>';

    const host = document.getElementById('hc-node-guide') || document.getElementById('intake-section');
    if (host && host.parentNode) {
      host.parentNode.insertBefore(banner, host);
    } else {
      const main = document.querySelector('main') || document.body;
      main.insertBefore(banner, main.firstChild);
    }
  }

  window.TSMHCHandoff = { redirectToNode };

  function init() { consumeIncoming(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
