// ═══════════════════════════════════════════════════════════════════════════
// TSM NODE → STRATEGIST RELAY BRIDGE — tsm-node-relay-bridge.js
// Drop on every HC node page (already referenced by all 11: billing,
// insurance, financial, operations, compliance, pharmacy, legal, medical,
// vendors, grants, taxprep — this file just didn't exist yet).
//
// PURPOSE: push whatever REAL, operator-entered or doc-analysis-derived
// signal exists on this node page to the one working HC Strategist ingestion
// endpoint — POST /api/hc/nodes/:nodeKey (routes/hc.js). That route already
// merges into HC_NODE_STATE_FILE and is what pollNodeState()-style reads /
// the rollup + brief endpoints draw from.
//
// HONESTY CONTRACT (do not violate this when extending the file):
//   - Never invent a KPI number (denialRate, queueDepth, etc.) that isn't
//     actually present on the page. If we don't have it, we omit the field
//     entirely — the server already treats missing fields as 'N/A', which
//     is the truthful state.
//   - Only relays on a REAL trigger: an operator submitted the intake form
//     (applyIntake), a document-analysis anomaly banner rendered with real
//     findings, or an anomaly was marked fully resolved. No relay fires on
//     bare page load / demo-default clientData sitting untouched.
//   - clientData shape is NOT uniform across nodes (billing/insurance use
//     `amount`, legal uses `exposure`, several nodes have no clientData at
//     all) — this file reads it generically and never assumes a field
//     exists.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (window.__TSM_NODE_RELAY_BRIDGE__) return;
  window.__TSM_NODE_RELAY_BRIDGE__ = true;

  // ── 1. WHICH NODE AM I? ─────────────────────────────────────────────────
  // Mirrors tsm-doc-anomaly-bridge.js's resolveNodeId so the two files agree
  // on nodeId, and matches HC_NODE_KEYS in routes/hc.js exactly.
  function resolveNodeId() {
    if (window.TSM_NODE_ID) return window.TSM_NODE_ID;
    const m = window.location.pathname.match(/hc-([^\/]+)\//);
    return m ? m[1].toLowerCase() : null;
  }

  const nodeId = resolveNodeId();
  if (!nodeId) return; // not on a node page — nothing to relay

  // ── 2. GENERIC clientData READER ────────────────────────────────────────
  // Reads whatever fields exist without assuming a shape. Returns null if
  // no clientData global exists on this page at all (several nodes don't
  // have the intake pattern).
  function readClientData() {
    try {
      if (typeof window.clientData === 'undefined' || !window.clientData) return null;
      return window.clientData;
    } catch (e) { return null; }
  }

  // Pulls a real dollar figure out of whichever field the node happens to
  // use (amount / exposure / risk), if any. Returns undefined — not 0 — when
  // nothing parseable is present, so we never write a false zero.
  function extractDollarValue(cd) {
    if (!cd) return undefined;
    const raw = cd.amount || cd.exposure || cd.risk;
    if (!raw) return undefined;
    const num = Number(String(raw).replace(/[^0-9.]/g, ''));
    return (isFinite(num) && num > 0) ? num : undefined;
  }

  // ── 3. BUILD PAYLOAD FOR A GIVEN TRIGGER ────────────────────────────────
  function buildPayload(trigger, extra) {
    extra = extra || {};
    const parts = [];
    const cd = readClientData();

    if (cd) {
      try { parts.push('Active case (' + trigger + '): ' + JSON.stringify(cd).slice(0, 400)); }
      catch (e) { /* non-serializable clientData — skip rather than guess */ }
    }

    const anomaly = extra.anomaly || null;
    if (anomaly) {
      const narr = (anomaly.narrative || '').replace(/<[^>]*>/g, '').slice(0, 300);
      parts.push('Doc anomaly [' + (anomaly.checkStatus || 'ACTIVE') + ']' + (narr ? ': ' + narr : ''));
    }

    if (extra.note) parts.push(extra.note);

    const payload = {
      status: 'ONLINE',
      findings: parts.length ? parts.join(' · ') : (trigger + ' — relay fired, no case-level detail captured'),
      source: 'tsm-node-relay-bridge',
      relayTrigger: trigger,
      relayedAt: new Date().toISOString()
    };

    let dollarValue = extractDollarValue(cd);
    if (anomaly && anomaly.financialImpact) {
      dollarValue = (dollarValue || 0) + Number(anomaly.financialImpact);
    }
    // pendingClaimsValue is a field the server already understands (routes/hc.js);
    // only set it when we actually derived a real number.
    if (dollarValue !== undefined) payload.pendingClaimsValue = dollarValue;

    return payload;
  }

  // ── 4. PUSH ──────────────────────────────────────────────────────────────
  let lastSignature = null;
  let lastState = null; // cache of GET /api/hc/nodes/:this node, for read-back

  function push(trigger, extra) {
    const payload = buildPayload(trigger, extra);
    const sig = payload.findings + '|' + (payload.pendingClaimsValue || '');
    if (sig === lastSignature) return Promise.resolve(null); // no real change, skip noise
    lastSignature = sig;

    return fetch('/api/hc/nodes/' + encodeURIComponent(nodeId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(d => {
        if (d && d.node) lastState = d.node;
        window.dispatchEvent(new CustomEvent('tsm-node-relayed', { detail: { nodeId, trigger, node: d && d.node } }));
        return d;
      })
      .catch(e => {
        console.error('[tsm-node-relay-bridge] push failed for ' + nodeId + ':', e);
        lastSignature = null; // allow retry on next real trigger
        return null;
      });
  }

  // ── 5. READ-BACK ─────────────────────────────────────────────────────────
  // Lets appeal/E&M/delegation features (built next) read this node's live
  // persisted state instead of re-deriving it.
  function getState() {
    return fetch('/api/hc/nodes')
      .then(r => r.json())
      .then(d => {
        lastState = (d && d.state && d.state[nodeId]) || null;
        return lastState;
      })
      .catch(e => {
        console.error('[tsm-node-relay-bridge] getState failed:', e);
        return lastState; // fall back to last-known cache rather than throw
      });
  }

  window.TSMNodeRelay = {
    nodeId,
    push,          // TSMNodeRelay.push('custom-trigger', { note: '...' })
    getState,      // TSMNodeRelay.getState().then(state => ...)
    getLastState: () => lastState
  };

  // ── 6. REAL TRIGGERS ─────────────────────────────────────────────────────
  function wireIntake() {
    if (typeof window.applyIntake !== 'function' || window.applyIntake.__relayWrapped) return;
    const original = window.applyIntake;
    const wrapped = function () {
      original.apply(this, arguments);
      push('intake-submitted');
    };
    wrapped.__relayWrapped = true;
    window.applyIntake = wrapped;
  }

  function wireAnomalyAdvisor() {
    window.addEventListener('tsm-anomaly-ready', function (e) {
      const payload = e && e.detail && e.detail.payload;
      if (payload) push('anomaly-detected', { anomaly: payload });

      // Watch for full remediation completion (TSM_ANB is created synchronously
      // inside renderBanner, which runs before this listener fires since
      // tsm-doc-anomaly-bridge.js registers its DOMContentLoaded handler first).
      if (window.TSM_ANB && typeof window.TSM_ANB.stepToggle === 'function' && !window.TSM_ANB.__relayWrapped) {
        const originalToggle = window.TSM_ANB.stepToggle;
        window.TSM_ANB.stepToggle = function (checkbox, idx) {
          originalToggle.call(window.TSM_ANB, checkbox, idx);
          const doneEl = document.getElementById('tsm-anb-complete');
          if (doneEl && doneEl.style.display === 'block') {
            push('anomaly-resolved', { anomaly: payload, note: 'All remediation steps self-reported complete' });
          }
        };
        window.TSM_ANB.__relayWrapped = true;
      }
    });
  }

  function init() {
    wireIntake();
    wireAnomalyAdvisor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
