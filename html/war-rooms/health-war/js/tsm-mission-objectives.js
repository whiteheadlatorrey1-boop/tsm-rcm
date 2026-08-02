/**
 * TSM Mission Objectives Panel · Node Pages
 * Drop-in for hc-billing, hc-insurance, etc.
 *
 * Reads tsm_active_mission from localStorage.
 * Renders: MISSION OBJECTIVES · [VERTICAL] panel
 *   - Step 1 unlocked, Steps 2-4 grayed
 *   - COMPLETE STEP → green check → unlock next
 *   - ✓ MISSION COMPLETE banner on step 4
 *   - Writes completion_pct + status back to tsm_mission_queue
 *
 * Usage: <script src="/js/tsm-mission-objectives.js"></script>
 * Auto-detects vertical from <body data-vertical="billing"> or URL path.
 */

(function () {
  'use strict';

  /* ── VERTICAL DETECTION ─────────────────────────── */
  function detectVertical() {
    // 1. body attribute
    const bv = document.body && document.body.dataset.vertical;
    if (bv) return bv.toLowerCase();

    // 2. URL path segment  /hc-billing/ → billing
    const m = location.pathname.match(/hc-([a-z]+)/);
    if (m) return m[1].toLowerCase();

    // 3. <meta name="tsm-vertical">
    const meta = document.querySelector('meta[name="tsm-vertical"]');
    if (meta) return meta.content.toLowerCase();

    return null;
  }

  /* ── STYLES ─────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #tsm-mission-objectives {
      background: #080808;
      border: 1px solid #1a1a1a;
      border-left: 3px solid #00ff88;
      padding: 20px;
      margin: 20px 0;
      font-family: 'Courier New', monospace;
      position: relative;
    }
    #tsm-mission-objectives h3 {
      color: #00ff88;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #tsm-mission-objectives h3 .tsm-pct {
      color: #888;
      font-size: 10px;
    }
    .tsm-step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #111;
      transition: opacity 0.3s;
    }
    .tsm-step:last-of-type { border-bottom: none; }
    .tsm-step.locked { opacity: 0.3; pointer-events: none; }
    .tsm-step.completed { opacity: 0.6; }
    .tsm-step-num {
      width: 26px;
      height: 26px;
      border: 1px solid #333;
      color: #888;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s;
    }
    .tsm-step.active   .tsm-step-num { border-color: #00ff88; color: #00ff88; }
    .tsm-step.completed .tsm-step-num { border-color: #00ff88; background: #00ff88; color: #000; }
    .tsm-step-body { flex: 1; }
    .tsm-step-text {
      font-size: 12px;
      color: #ccc;
      line-height: 1.5;
      margin-bottom: 6px;
    }
    .tsm-step.locked .tsm-step-text { color: #444; }
    .tsm-step-hint {
      font-size: 10px;
      color: #00ff88;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .tsm-step.locked .tsm-step-hint { display: none; }
    .tsm-step-complete-btn {
      background: transparent;
      border: 1px solid #00ff88;
      color: #00ff88;
      padding: 5px 14px;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tsm-step-complete-btn:hover { background: #00ff8820; }
    .tsm-step.completed .tsm-step-complete-btn { display: none; }

    /* Progress bar */
    .tsm-progress-bar {
      height: 2px;
      background: #111;
      margin-bottom: 16px;
      position: relative;
    }
    .tsm-progress-fill {
      height: 100%;
      background: #00ff88;
      transition: width 0.5s ease;
    }

    /* Complete banner */
    #tsm-mission-complete {
      display: none;
      background: #00ff8815;
      border: 1px solid #00ff88;
      padding: 16px;
      text-align: center;
      margin-top: 16px;
    }
    #tsm-mission-complete.visible { display: block; }
    #tsm-mission-complete p {
      color: #00ff88;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
    }
    #tsm-mission-complete span {
      display: block;
      font-size: 10px;
      color: #888;
      margin-top: 4px;
      letter-spacing: 1px;
    }

    /* No mission state */
    #tsm-mission-no-mission {
      color: #444;
      font-size: 11px;
      letter-spacing: 1px;
      padding: 10px 0;
      font-family: 'Courier New', monospace;
    }
  `;
  document.head.appendChild(style);

  /* ── RENDER ─────────────────────────────────────── */
  function render() {
    const vertical = detectVertical();
    if (!vertical) return;

    const mission = TSMMission.getMissionForVertical(vertical);
    const queueEntry = TSMMission.getQueueEntry(vertical);

    // Find or create mount point
    let mount = document.getElementById('tsm-mission-objectives');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'tsm-mission-objectives';

      // Insert: prefer right-panel, else after first h1/h2, else body
      const rightPanel = document.querySelector('.right-panel, .mission-panel, aside, .node-sidebar');
      const heading    = document.querySelector('h1, h2');

      if (rightPanel) rightPanel.prepend(mount);
      else if (heading && heading.parentNode) heading.parentNode.insertBefore(mount, heading.nextSibling);
      else document.body.appendChild(mount);
    }

    if (!mission) {
      mount.innerHTML = `
        <h3>◆ MISSION OBJECTIVES <span class="tsm-pct">· ${vertical.toUpperCase()}</span></h3>
        <div id="tsm-mission-no-mission">— NO ACTIVE MISSION · Return to hub and generate a BNCA narrative to activate mission</div>
      `;
      return;
    }

    const steps     = mission.progression_steps || [];
    const curIndex  = queueEntry ? queueEntry.step_index : 0;
    const pct       = queueEntry ? queueEntry.completion_pct : 0;
    const isDone    = queueEntry ? queueEntry.status === 'complete' : false;

    mount.innerHTML = `
      <h3>◆ MISSION OBJECTIVES <span class="tsm-pct">· ${mission.label.toUpperCase()} · <span id="tsm-pct-label">${pct}%</span></span></h3>
      <div class="tsm-progress-bar"><div class="tsm-progress-fill" id="tsm-prog" style="width:${pct}%"></div></div>
      <div id="tsm-steps-container"></div>
      <div id="tsm-mission-complete" class="${isDone ? 'visible' : ''}">
        <p>✓ MISSION COMPLETE · ${mission.label.toUpperCase()}</p>
        <span>All objectives satisfied — relay to Strategist for executive synthesis</span>
      </div>
    `;

    const container = document.getElementById('tsm-steps-container');

    steps.forEach((stepText, i) => {
      const completed = i < curIndex;
      const active    = i === curIndex && !isDone;
      const locked    = i > curIndex && !isDone;

      const hint = TSMMission.extractHint(stepText);

      const div = document.createElement('div');
      div.className = `tsm-step ${completed ? 'completed' : active ? 'active' : 'locked'}`;
      div.id = `tsm-step-${i}`;
      div.innerHTML = `
        <div class="tsm-step-num">${completed ? '✓' : i + 1}</div>
        <div class="tsm-step-body">
          <div class="tsm-step-text">${stepText}</div>
          ${active ? `<div class="tsm-step-hint">▶ Next Action: ${hint}</div>` : ''}
          ${active ? `<button class="tsm-step-complete-btn" onclick="TSMMissionObj.completeStep(${i})">COMPLETE STEP</button>` : ''}
        </div>
      `;
      container.appendChild(div);
    });
  }

  /* ── PUBLIC API ──────────────────────────────────── */
  const TSMMissionObj = {
    completeStep: function(index) {
      const vertical = detectVertical();
      if (!vertical) return;

      const result = TSMMission.advanceStep(vertical, index);
      if (!result) return;

      // Animate current step → completed
      const stepEl = document.getElementById(`tsm-step-${index}`);
      if (stepEl) {
        stepEl.className = 'tsm-step completed';
        const btn = stepEl.querySelector('.tsm-step-complete-btn');
        const hintEl = stepEl.querySelector('.tsm-step-hint');
        if (btn) btn.remove();
        if (hintEl) hintEl.remove();
        const num = stepEl.querySelector('.tsm-step-num');
        if (num) num.textContent = '✓';
      }

      // Update progress
      const prog = document.getElementById('tsm-prog');
      const pctLabel = document.getElementById('tsm-pct-label');
      if (prog) prog.style.width = result.pct + '%';
      if (pctLabel) pctLabel.textContent = result.pct + '%';

      if (result.done) {
        const banner = document.getElementById('tsm-mission-complete');
        if (banner) banner.classList.add('visible');
        return;
      }

      // Unlock next step
      const nextEl = document.getElementById(`tsm-step-${result.newIndex}`);
      if (nextEl) {
        const mission = TSMMission.getMissionForVertical(vertical);
        const steps   = mission ? mission.progression_steps : [];
        const nextText = steps[result.newIndex] || '';
        const hint = TSMMission.extractHint(nextText);

        nextEl.className = 'tsm-step active';
        const body = nextEl.querySelector('.tsm-step-body');
        if (body) {
          body.innerHTML = `
            <div class="tsm-step-text">${nextText}</div>
            <div class="tsm-step-hint">▶ Next Action: ${hint}</div>
            <button class="tsm-step-complete-btn" onclick="TSMMissionObj.completeStep(${result.newIndex})">COMPLETE STEP</button>
          `;
        }
        const num = nextEl.querySelector('.tsm-step-num');
        if (num) { num.textContent = result.newIndex + 1; }
      }
    }
  };

  window.TSMMissionObj = TSMMissionObj;

  /* ── INIT ────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

})();