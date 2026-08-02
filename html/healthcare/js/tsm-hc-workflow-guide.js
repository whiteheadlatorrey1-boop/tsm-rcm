// tsm-hc-workflow-guide.js
//
// Persistent, collapsible cheat-sheet widget that reminds end users where
// they are in the War Room -> Anomaly Advisor / BNCA -> HC Node ->
// Strategist -> Exec Portal flow, and what button to press next.
//
// This is a REFERENCE OVERLAY only. It reads localStorage/sessionStorage
// to guess the EU's current stage; it never writes to TSM_WAR_ROOM_BRIEF,
// tsm-doc-anomaly, or TSM_EXEC_RELAY, and never calls the AI. It is safe
// to drop into any hc-*.html page alongside the existing bridge scripts.
//
// USAGE: <script src="/html/healthcare/js/tsm-hc-workflow-guide.js"></script>
// Include on: hc-denial-war-room.html, every html/healthcare/hc-*/index.html
// node, hc-main-strategist.html, executive-portal.html.

(function () {
  'use strict';

  const STAGES = [
    {
      id: 'intake',
      label: 'War room intake',
      page: 'hc-denial-war-room.html',
      action: 'Paste the denial doc, click RUN FULL ANALYSIS',
      detail: 'Runs 5 chained engines: Document Intel -> Root Cause -> Financial Impact -> Recovery Plan -> Recovery Navigator.'
    },
    {
      id: 'dispatch',
      label: 'Anomaly Advisor + Engine 06',
      page: 'hc-denial-war-room.html',
      action: 'Both fire automatically when engines finish',
      detail: 'Anomaly Advisor lists field-level defects. Engine 06 scores your doc against every HC app and shows the top 3-5 matches.'
    },
    {
      id: 'choose-path',
      label: 'Choose a path',
      page: 'hc-denial-war-room.html',
      action: 'Open a recommended node, OR click ESCALATE TO HC MAIN STRATEGIST directly',
      detail: 'Both paths write a compatible brief. The node path also gives you a real .txt EXPORT of the checklist.'
    },
    {
      id: 'node-checklist',
      label: 'Node remediation checklist',
      page: 'hc-billing / hc-medical / hc-insurance / etc.',
      action: 'Check off every step in the banner',
      detail: 'Banner comes from tsm-doc-anomaly-bridge.js reading localStorage["tsm-doc-anomaly"].'
    },
    {
      id: 'node-checklist-complete',
      label: 'Checklist complete',
      page: 'hc-billing / hc-medical / hc-insurance / etc.',
      action: 'Go back to OPEN WAR ROOM and click ESCALATE TO HC MAIN STRATEGIST',
      detail: 'There is no direct escalate button on the node checklist itself yet - you have to return to the war room to send it onward.',
      warn: true
    },
    {
      id: 'strategist-inject',
      label: 'Strategist - inject context',
      page: 'hc-main-strategist.html',
      action: 'DO NOT SKIP: click "INJECT INTO STRATEGIST CONTEXT" before running analysis',
      detail: 'Without this click, the war room brief sits in the banner but never reaches the AI prompt.',
      warn: true
    },
    {
      id: 'strategist-run',
      label: 'Strategist - run analysis',
      page: 'hc-main-strategist.html',
      action: 'Click RUN HC STRATEGIST ANALYSIS, review confidence + reasoning',
      detail: 'Confidence/reasoning/actions are AI-generated. Dollar exposure deltas are computed separately by the deterministic BNCA exposure engine.'
    },
    {
      id: 'escalate-exec',
      label: 'Escalate to exec',
      page: 'hc-main-strategist.html',
      action: 'Click ESCALATE / RELAY TO EXEC',
      detail: 'Builds TSM_EXEC_RELAY from whatever analysis text actually exists this session.'
    },
    {
      id: 'exec-portal',
      label: 'Exec portal',
      page: 'executive-portal.html',
      action: 'Review signals, run the Denial Pack tab for the appeal letter',
      detail: 'Exports a real .txt report (whatever made it through the relay this session) and pushes a finalized signal to Sentinel/Collective BNCA.',
      warn: true
    },
    {
      id: 'complete',
      label: 'Report exported',
      page: 'executive-portal.html',
      action: 'Session complete',
      detail: 'Report downloaded and the finalized signal was pushed to /api/collective/signal for cross-vertical synthesis.'
    }
  ];

  const STAGE_IDS = STAGES.map(function (s) { return s.id; });

  function resolveCurrentStage() {
    // Prefer the precise signal written at each real transition point. Only
    // fall back to the old "guess from which relay keys exist" heuristic
    // when no precise signal has been recorded yet (e.g. this page load is
    // the very first one, or the page isn't instrumented).
    try {
      if (window.TSMWorkflowStage) {
        const rec = window.TSMWorkflowStage.read();
        if (rec && rec.stage && STAGE_IDS.indexOf(rec.stage) !== -1) return rec.stage;
      }
    } catch (e) {}

    const path = window.location.pathname;
    let hasBrief = false, hasAnomaly = false, hasExecRelay = false;
    try { hasBrief = !!(sessionStorage.getItem('TSM_WAR_ROOM_BRIEF') || localStorage.getItem('TSM_WAR_ROOM_BRIEF')); } catch (e) {}
    try { hasAnomaly = !!localStorage.getItem('tsm-doc-anomaly'); } catch (e) {}
    try { hasExecRelay = !!(sessionStorage.getItem('TSM_EXEC_RELAY') || localStorage.getItem('TSM_EXEC_RELAY')); } catch (e) {}

    if (path.includes('executive-portal')) return 'exec-portal';
    if (path.includes('hc-main-strategist')) return hasExecRelay ? 'escalate-exec' : (hasBrief ? 'strategist-inject' : 'strategist-run');
    if (path.includes('hc-denial-war-room')) return hasBrief || hasAnomaly ? 'choose-path' : 'intake';
    if (hasAnomaly) return 'node-checklist';
    return 'intake';
  }

  function render() {
    const currentId = resolveCurrentStage();
    const wrap = document.createElement('div');
    wrap.id = 'tsm-wfg-wrapper';
    wrap.style.cssText = `
      position:fixed; bottom:16px; left:16px; z-index:299;
      font-family:'JetBrains Mono',monospace; width:340px;
      max-height:70vh; display:flex; flex-direction:column;
    `;

    const stepsHtml = STAGES.map(function (s) {
      const active = s.id === currentId;
      const color = s.warn ? '#f59e0b' : '#1ee8b6';
      return `
        <div class="tsm-wfg-step" style="
          padding:8px 10px; margin-bottom:4px; border-radius:3px;
          background:${active ? 'rgba(30,232,182,.08)' : 'rgba(255,255,255,.02)'};
          border-left:2px solid ${active ? color : 'rgba(255,255,255,.08)'};
        ">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <span style="font-size:9.5px;font-weight:700;letter-spacing:.5px;color:${active ? color : '#9aa5b1'}">${s.label}</span>
            ${active ? '<span style="font-size:8px;color:' + color + ';letter-spacing:1px">YOU ARE HERE</span>' : ''}
          </div>
          <div style="font-size:9px;color:#c8d0da;margin-top:3px;line-height:1.5">${s.action}</div>
          ${active ? '<div style="font-size:8.5px;color:#6b7684;margin-top:4px;line-height:1.5">' + s.detail + '</div>' : ''}
        </div>`;
    }).join('');

    wrap.innerHTML = `
      <div id="tsm-wfg-panel" style="
        background:rgba(10,14,22,0.97); border:1px solid #1ee8b655;
        border-radius:6px; box-shadow:0 0 24px rgba(30,232,182,.1);
        overflow:hidden; display:flex; flex-direction:column; max-height:70vh;
      ">
        <div id="tsm-wfg-header" style="
          display:flex; justify-content:space-between; align-items:center;
          padding:9px 12px; background:rgba(30,232,182,.08);
          border-bottom:1px solid rgba(30,232,182,.2); cursor:pointer;
        ">
          <span style="color:#1ee8b6; font-size:10px; font-weight:700; letter-spacing:1.5px;">⬡ WORKFLOW GUIDE</span>
          <span id="tsm-wfg-chevron" style="color:#1ee8b6; font-size:11px;">▾</span>
        </div>
        <div id="tsm-wfg-body" style="padding:10px; overflow-y:auto;">
          ${stepsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const header = document.getElementById('tsm-wfg-header');
    const body = document.getElementById('tsm-wfg-body');
    const chevron = document.getElementById('tsm-wfg-chevron');
    let collapsed = false;
    try { collapsed = sessionStorage.getItem('tsm-wfg-collapsed') === '1'; } catch (e) {}
    if (collapsed) { body.style.display = 'none'; chevron.textContent = '▸'; }

    header.addEventListener('click', function () {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      chevron.textContent = isHidden ? '▾' : '▸';
      try { sessionStorage.setItem('tsm-wfg-collapsed', isHidden ? '0' : '1'); } catch (e) {}
    });

    // Jump straight to the active step on open
    const activeEl = body.querySelector('.tsm-wfg-step[style*="rgba(30,232,182,.08)"]');
    if (activeEl && !collapsed) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function init() {
    if (document.getElementById('tsm-wfg-wrapper')) return;
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();