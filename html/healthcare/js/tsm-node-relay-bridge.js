// ═══════════════════════════════════════════════════════════════════════════
// TSM NODE → STRATEGIST RELAY BRIDGE — tsm-node-relay-bridge.js
// Drop on every HC node page (hc-billing, hc-operations, hc-medical,
// hc-pharmacy, hc-insurance, hc-financial, hc-legal, hc-vendors,
// hc-compliance, hc-taxprep, hc-grants), alongside tsm-doc-anomaly-bridge.js.
//
// WHY THIS EXISTS
// hc-strategist/index.html already has a fully-built, honest rendering
// pipeline — renderNodeState() / renderDashboardKpis() / renderSystemAlerts()
// / renderPriorityQueue() / renderSystemAnalytics() — driven by
// pollNodeState(), which GETs /api/hc/nodes every 15s. That server route
// reads HC_NODE_STATE_FILE and is real and working (see routes/hc.js).
// The gap: nothing has ever POSTed to /api/hc/nodes/:nodeKey from a live
// node page, so HC_NODE_STATE_FILE stays {} forever and every one of those
// render functions has nothing to show but its honest "awaiting node
// reports" fallback.
//
// Each node page separately has a real relayToStrategist(nodeLabel)
// function that scrapes its OWN live KPI tiles (.kpi/.kpi-val/.kpi-lbl/
// .kpi-sub), active alerts (.alert-row), and AI output (.ai-res/
// .guide-result) — real displayed numbers, not fabricated — but only
// writes a single sessionStorage/localStorage key (TSM_WAR_ROOM_BRIEF) that
// feeds hc-main-strategist, and its buttons open hc-main-strategist.html
// directly, bypassing hc-strategist entirely.
//
// This module doesn't touch relayToStrategist() or its buttons — they still
// work exactly as before, still feed hc-main-strategist. It independently
// scrapes the SAME real, already-displayed data with the SAME selectors and
// POSTs it to /api/hc/nodes/:nodeKey, so hc-strategist's existing rendering
// pipeline finally has real per-node data to show instead of running dry
// forever. Only `findings` (real, human-readable text) and `status` are set
// with confidence — numeric fields (denialRate, arOver30, etc.) are left out
// unless this page's own telemetry form has already posted them, so nothing
// here fabricates a number the render layer would display as if measured.
//
// Fires: 4s after page load (lets KPI tiles finish their own render first),
// every 45s thereafter, and immediately whenever the page's own relay/
// escalate button is clicked (capture-phase listener — doesn't interfere
// with the button's existing onclick).
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.__TSM_NODE_RELAY_BRIDGE__) return;
  window.__TSM_NODE_RELAY_BRIDGE__ = true;

  var NODE_LABELS = {
    billing: 'Billing', operations: 'Operations', medical: 'Medical',
    pharmacy: 'Pharmacy', insurance: 'Insurance', financial: 'Financial',
    legal: 'Legal', vendors: 'Vendors', compliance: 'Compliance',
    taxprep: 'Tax Prep', grants: 'Grants'
  };

  function resolveNodeId() {
    if (window.TSM_NODE_ID) return window.TSM_NODE_ID;
    var m = window.location.pathname.match(/hc-([^\/]+)\//);
    var id = m ? m[1] : null;
    return (id && NODE_LABELS[id]) ? id : null;
  }

  var nodeId = resolveNodeId();
  if (!nodeId) return; // not a recognized HC node page — nothing to relay

  // Same scrape logic each page's own relayToStrategist() already uses —
  // kept independent so this doesn't depend on that function's internals
  // (which differ slightly page to page) or on the button being clicked.
  function scrapeBrief() {
    var kpis = [];
    document.querySelectorAll('.kpi').forEach(function (k) {
      var val = k.querySelector('.kpi-val');
      var lbl = k.querySelector('.kpi-lbl');
      var sub = k.querySelector('.kpi-sub');
      if (val && lbl) {
        var v = val.textContent.trim();
        if (v && v !== '\u2014' && v !== '-') {
          kpis.push(lbl.textContent.trim() + ': ' + v + (sub ? ' \u2014 ' + sub.textContent.trim() : ''));
        }
      }
    });

    var alerts = [];
    document.querySelectorAll('.alert-row').forEach(function (row) {
      var pri = row.querySelector('.pri');
      var txt = row.querySelector('.alert-txt');
      var imp = row.querySelector('.alert-imp');
      if (txt) {
        var t = txt.textContent.trim();
        if (t && !/awaiting|no live findings/i.test(t)) {
          alerts.push('[' + (pri ? pri.textContent.trim() : '\u2014') + '] ' + t + (imp ? ' (' + imp.textContent.trim() + ')' : ''));
        }
      }
    });

    var aiFindings = [];
    document.querySelectorAll('.ai-res, .guide-result').forEach(function (el) {
      var text = (el.textContent || '').trim();
      if (!text) return;
      if (/^>?\s*(ai|intel workbench|enterprise bnca|leadership brief|report studio)\b.*ready\.?$/i.test(text)) return;
      if (/processing\.\.\.$/i.test(text)) return;
      aiFindings.push(text.slice(0, 600));
    });

    // Live anomaly checklist progress, if tsm-doc-anomaly-bridge.js has a
    // banner up on this node right now — real remediation-tracking state.
    var anomalyLine = '';
    if (window.TSM_ANB && window.TSM_ANB.nodeId === nodeId && window.TSM_ANB.payload) {
      var steps = window.TSM_ANB.payload.steps || [];
      var doneEls = document.querySelectorAll('#tsm-anb-steps .tsm-anb-step.done');
      var cs = window.TSM_ANB.payload.checkStatus || 'ACTIVE';
      anomalyLine = 'Live anomaly checklist: ' + doneEls.length + '/' + steps.length + ' steps cleared (' + cs + ')';
      if (window.TSM_ANB.payload.financialImpact) {
        anomalyLine += ' \u2014 $' + Number(window.TSM_ANB.payload.financialImpact).toLocaleString('en-US') + ' exposure';
      }
    }

    var parts = [];
    if (anomalyLine) parts.push(anomalyLine);
    if (kpis.length) parts.push('KPIs \u2014 ' + kpis.join(' \u00b7 '));
    if (alerts.length) parts.push('Active alerts \u2014 ' + alerts.slice(0, 5).join(' | '));
    if (aiFindings.length) parts.push(aiFindings[0]);

    return {
      findings: parts.join('\n\n'),
      bnca: aiFindings.length > 1 ? aiFindings[1] : (aiFindings[0] || ''),
      hasContent: parts.length > 0
    };
  }

  function pushBrief() {
    var brief = scrapeBrief();
    if (!brief.hasContent) return; // don't overwrite real state with an empty scrape

    fetch('/api/hc/nodes/' + nodeId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ONLINE',
        findings: brief.findings,
        bnca: brief.bnca || undefined,
        source: 'tsm-node-relay-bridge',
        pageUrl: location.href
      })
    }).catch(function () { /* strategist just stays on its last known state */ });
  }

  function wireRelayButtons() {
    document.querySelectorAll('button, a').forEach(function (el) {
      var handler = el.getAttribute('onclick') || '';
      if (!/relayToStrategist\s*\(/.test(handler)) return;
      if (el.dataset.tsmBridgeWired) return;
      el.dataset.tsmBridgeWired = 'true';
      el.addEventListener('click', function () { setTimeout(pushBrief, 50); }, true);
    });
  }

  function init() {
    setTimeout(pushBrief, 4000); // let this page's own KPI tiles render first
    wireRelayButtons();
    setInterval(pushBrief, 45000);
    setTimeout(wireRelayButtons, 800);
    setTimeout(wireRelayButtons, 2000);
  }

  window.addEventListener('tsm-anomaly-ready', function () { setTimeout(pushBrief, 300); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
