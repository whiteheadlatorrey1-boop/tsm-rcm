// tsm-bpo-workflow-guide.js
//
// Persistent, collapsible cheat-sheet widget for the BPO pipeline: War Room
// (intake, assess & score) -> Strategist (process & act) -> Executive
// Portal (QA, deliver, outcome & bill). Same visual language and mechanics
// as the healthcare tsm-hc-workflow-guide.js widget.
//
// REFERENCE OVERLAY ONLY. Reads TSMWorkflowStage.read() (falling back to a
// relay-key heuristic if no precise signal exists yet) and never writes to
// TSM_BPO_WAR_RELAY, TSM_BPO_STRAT_RELAY, or any AI/relay endpoint.
//
// USAGE: <script src="/html/war-rooms/bpo-war/js/tsm-workflow-stage.js"></script>
//        <script src="/html/war-rooms/bpo-war/js/tsm-bpo-workflow-guide.js"></script>
// Include on: bpo-war-room.html, bpo-strategist.html, bpo-executive-portal.html.

(function () {
  'use strict';

  const STAGES = [
    {
      id: 'intake',
      label: 'War room intake',
      page: 'bpo-war-room.html',
      action: 'Paste or upload the operational document, click RUN ANALYSIS',
      detail: 'Fires the extraction engine against /api/war-room/stream and streams a structured situation report.'
    },
    {
      id: 'dispatch',
      label: 'Assess & score',
      page: 'bpo-war-room.html',
      action: 'Happens automatically once extraction finishes',
      detail: 'storeWarRoomRelay() writes TSM_BPO_WAR_RELAY, creates the mission record, and enables ESCALATE TO STRATEGIST.'
    },
    {
      id: 'route-strategist',
      label: 'Route to strategist',
      page: 'bpo-war-room.html',
      action: 'Click ESCALATE TO STRATEGIST / DECIDE',
      detail: 'Navigates to bpo-strategist.html, which auto-loads the relay -- there is no separate "inject" click in this vertical.'
    },
    {
      id: 'strategist-run',
      label: 'Process & act (strategist)',
      page: 'bpo-strategist.html',
      action: 'Review the auto-selected recommended scenario, adjust if needed',
      detail: 'loadRelay() hydrates the impact model and scenarios straight from TSM_BPO_WAR_RELAY; autoSelectRecommended() picks a default.'
    },
    {
      id: 'escalate-exec',
      label: 'Escalate to executive',
      page: 'bpo-strategist.html',
      action: 'Click ESCALATE TO EXECUTIVE',
      detail: 'storeStratRelay() writes TSM_BPO_STRAT_RELAY + a Sentinel push, then navigates to the Executive Portal.'
    },
    {
      id: 'exec-portal',
      label: 'QA & deliver (exec portal)',
      page: 'bpo-executive-portal.html',
      action: 'Review the decision center, run APPROVE / ASSIGN / NOTIFY as applicable',
      detail: 'loadRelay() hydrates from TSM_BPO_STRAT_RELAY; the exec tracker shows completion percent per recommended action.'
    },
    {
      id: 'complete',
      label: 'Outcome & bill — exported',
      page: 'bpo-executive-portal.html',
      action: 'Session complete',
      detail: 'EXPORT downloaded a real .txt brief and pushed a finalized signal to /api/collective/signal for cross-vertical synthesis.'
    }
  ];

  const STAGE_IDS = STAGES.map(function (s) { return s.id; });

  function resolveCurrentStage() {
    try {
      if (window.TSMWorkflowStage) {
        const rec = window.TSMWorkflowStage.read();
        if (rec && rec.stage && STAGE_IDS.indexOf(rec.stage) !== -1) return rec.stage;
      }
    } catch (e) {}

    // Fallback heuristic for a page that hasn't run through the tracker yet.
    const path = window.location.pathname;
    let hasWarRelay = false, hasStratRelay = false;
    try { hasWarRelay = !!(sessionStorage.getItem('TSM_BPO_WAR_RELAY') || localStorage.getItem('TSM_BPO_WAR_RELAY')); } catch (e) {}
    try { hasStratRelay = !!(sessionStorage.getItem('TSM_BPO_STRAT_RELAY') || localStorage.getItem('TSM_BPO_STRAT_RELAY')); } catch (e) {}

    if (path.includes('bpo-executive-portal')) return 'exec-portal';
    if (path.includes('bpo-strategist')) return hasStratRelay ? 'escalate-exec' : 'strategist-run';
    if (path.includes('bpo-war-room')) return hasWarRelay ? 'route-strategist' : 'intake';
    return 'intake';
  }

  function render() {
    const currentId = resolveCurrentStage();
    const wrap = document.createElement('div');
    wrap.id = 'tsm-bwg-wrapper';
    wrap.style.cssText = `
      position:fixed; bottom:16px; left:16px; z-index:299;
      font-family:'JetBrains Mono',monospace; width:340px;
      max-height:44vh; display:flex; flex-direction:column;
    `;

    const stepsHtml = STAGES.map(function (s) {
      const active = s.id === currentId;
      const color = s.warn ? '#f59e0b' : '#f87171';
      return `
        <div class="tsm-bwg-step" style="
          padding:8px 10px; margin-bottom:4px; border-radius:3px;
          background:${active ? 'rgba(248,113,113,.08)' : 'rgba(255,255,255,.02)'};
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
      <div id="tsm-bwg-panel" style="
        background:rgba(10,14,22,0.97); border:1px solid #f8717155;
        border-radius:6px; box-shadow:0 0 24px rgba(248,113,113,.1);
        overflow:hidden; display:flex; flex-direction:column; max-height:44vh;
      ">
        <div id="tsm-bwg-header" style="
          display:flex; justify-content:space-between; align-items:center;
          padding:9px 12px; background:rgba(248,113,113,.08);
          border-bottom:1px solid rgba(248,113,113,.2); cursor:pointer;
        ">
          <span style="color:#f87171; font-size:10px; font-weight:700; letter-spacing:1.5px;">⬡ BPO WORKFLOW GUIDE</span>
          <span id="tsm-bwg-chevron" style="color:#f87171; font-size:11px;">▾</span>
        </div>
        <div id="tsm-bwg-body" style="padding:10px; overflow-y:auto;">
          ${stepsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const header = document.getElementById('tsm-bwg-header');
    const body = document.getElementById('tsm-bwg-body');
    const chevron = document.getElementById('tsm-bwg-chevron');
    // Default to collapsed. This is documented as a "reference overlay
    // only" cheat-sheet, but expanded it's a ~340x400+ fixed panel pinned
    // to the bottom-left corner -- on normal laptop-height viewports that
    // region overlaps the Decision Center's real action buttons (APPROVE
    // STRATEGY / ASSIGN OWNERS / NOTIFY STAKEHOLDERS / EXPORT BRIEF on
    // bpo-executive-portal.html), and since it's the topmost element there
    // it silently swallows those clicks -- confirmed via elementFromPoint()
    // and a real Puppeteer click that never reached dcAct()/exportBrief().
    // Collapsing by default (still one click away, still remembers an
    // explicit user choice via sessionStorage) keeps the header visible
    // without blocking real controls underneath.
    let collapsed = true;
    try {
      const stored = sessionStorage.getItem('tsm-bwg-collapsed');
      if (stored !== null) collapsed = stored === '1';
    } catch (e) {}
    if (collapsed) { body.style.display = 'none'; chevron.textContent = '▸'; }

    header.addEventListener('click', function () {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      chevron.textContent = isHidden ? '▾' : '▸';
      try { sessionStorage.setItem('tsm-bwg-collapsed', isHidden ? '0' : '1'); } catch (e) {}
    });

    const activeEl = body.querySelector('.tsm-bwg-step[style*="rgba(248,113,113,.08)"]');
    if (activeEl && !collapsed) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function init() {
    if (document.getElementById('tsm-bwg-wrapper')) return;
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
