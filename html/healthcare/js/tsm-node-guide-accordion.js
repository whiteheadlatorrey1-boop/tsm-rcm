// ═══════════════════════════════════════════════════════════════════════════
// TSM NODE GUIDE ACCORDION — tsm-node-guide-accordion.js
// Drop on every HC node page, after #hc-node-guide exists in the DOM
// (i.e. alongside tsm-doc-anomaly-bridge.js, before </body>).
//
// #hc-node-guide is a position:fixed, 300px-wide panel pinned to the right
// edge of every node page. At full height it sits on top of dashboard
// tiles/values underneath it (visible whenever the panel's step/checklist
// content runs long — e.g. once a live anomaly checklist lands). This
// module turns it into a collapsible accordion:
//   - Header stays visible as a slim vertical tab when collapsed.
//   - Body (everything except the header) hides on collapse so nothing
//     underneath is blocked.
//   - Starts collapsed by default on every page load (least-blocking
//     state); expand/collapse choice is remembered per node for the
//     rest of the browser session via sessionStorage, so switching tabs
//     within a node doesn't reset it.
//   - Auto-expands once when a live anomaly checklist lands on this node
//     (tsm-anomaly-ready), since that's the moment the panel content is
//     actually the next thing the operator needs — then goes back to
//     remembering manual toggles.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  function resolveNodeId() {
    if (window.TSM_NODE_ID) return window.TSM_NODE_ID;
    var m = window.location.pathname.match(/hc-([^\/]+)\//);
    return m ? m[1] : 'node';
  }

  function init() {
    var panel = document.getElementById('hc-node-guide');
    if (!panel) return;

    var nodeId = resolveNodeId();
    var storeKey = 'tsm-ngc-expanded-' + nodeId;

    var style = document.createElement('style');
    style.textContent = [
      '#hc-node-guide{transition:width .2s ease,padding .2s ease}',
      '#hc-node-guide.tsm-ngc-collapsed{width:30px;padding:10px 4px;overflow:hidden;cursor:pointer}',
      '#hc-node-guide.tsm-ngc-collapsed > *{display:none !important}',
      '#hc-node-guide.tsm-ngc-collapsed .tsm-ngc-hdr-wrap{display:flex !important}',
      '.tsm-ngc-hdr-wrap{display:flex;align-items:center;justify-content:space-between;gap:6px;cursor:pointer;user-select:none}',
      '#hc-node-guide.tsm-ngc-collapsed .tsm-ngc-hdr-wrap .guide-hdr{writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;margin:0 auto}',
      '.tsm-ngc-toggle{flex-shrink:0;font-size:10px;color:var(--g,#4ade80);border:1px solid rgba(255,255,255,.15);border-radius:3px;width:16px;height:16px;line-height:14px;text-align:center}',
      '#hc-node-guide.tsm-ngc-collapsed .tsm-ngc-toggle{margin-top:6px}'
    ].join('');
    document.head.appendChild(style);

    // Wrap the existing header text in a header row that also holds the
    // collapse/expand toggle, without touching any other markup or the
    // header's own textContent (nothing else in the codebase mutates it,
    // but we keep the original node intact just in case).
    var hdr = panel.querySelector('.guide-hdr');
    var wrap;
    if (hdr) {
      wrap = document.createElement('div');
      wrap.className = 'tsm-ngc-hdr-wrap';
      hdr.parentNode.insertBefore(wrap, hdr);
      wrap.appendChild(hdr);
    } else {
      wrap = document.createElement('div');
      wrap.className = 'tsm-ngc-hdr-wrap';
      panel.insertBefore(wrap, panel.firstChild);
    }

    var toggle = document.createElement('span');
    toggle.className = 'tsm-ngc-toggle';
    wrap.appendChild(toggle);

    function setExpanded(expanded) {
      panel.classList.toggle('tsm-ngc-collapsed', !expanded);
      toggle.textContent = expanded ? '\u25c2' : '\u25b8';
      try { sessionStorage.setItem(storeKey, expanded ? '1' : '0'); } catch (e) {}
    }

    wrap.addEventListener('click', function () {
      setExpanded(panel.classList.contains('tsm-ngc-collapsed'));
    });

    var saved = null;
    try { saved = sessionStorage.getItem(storeKey); } catch (e) {}
    // Default: collapsed, so the panel never blocks dashboard values on
    // first load. Only stays expanded if the operator expanded it earlier
    // this session.
    setExpanded(saved === '1');

    // Auto-expand once a live anomaly checklist lands on this node — that
    // content is the reason the panel exists in the first place.
    window.addEventListener('tsm-anomaly-ready', function (ev) {
      if (ev && ev.detail && ev.detail.nodeId && ev.detail.nodeId !== nodeId) return;
      setExpanded(true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
