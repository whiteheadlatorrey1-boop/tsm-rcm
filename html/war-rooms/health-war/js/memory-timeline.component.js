// ═══════════════════════════════════════════════════════════════════════════
// memory-timeline.component.js
// Renders an operational continuity timeline widget.
// Reads TSMMemory (memory.engine.js) — must be loaded after it.
//
// Usage:
//   <div id="tsm-timeline-mount"></div>
//   <script src="/html/healthcare/js/memory.engine.js"></script>
//   <script src="/html/healthcare/js/memory-timeline.component.js"></script>
//
//   Or render programmatically:
//   TSMTimeline.render('#tsm-timeline-mount');
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  if (window.__TSM_TIMELINE__) return;
  window.__TSM_TIMELINE__ = true;

  const SEVERITY_COLOR = {
    info:    '#38bdf8',
    success: '#00ffc6',
    warn:    '#f59e0b',
    error:   '#ef4444',
  };

  const TYPE_ICON = {
    war_room_engine_run:  '⚙',
    war_room_relay:       '⚡',
    app_dispatch:         '→',
    node_relay:           '◈',
    strategist_relay:     '⬆',
    exec_portal_open:     '★',
    exec_feedback:        '↩',
    mission_complete:     '✓',
    anomaly_detected:     '⚠',
    user_note:            '✎',
  };

  /**
   * Render the timeline into a selector or element.
   * @param {string|HTMLElement} target
   * @param {Object} opts  – { limit, showClear, title }
   */
  function render(target, opts = {}) {
    const {
      limit = 20,
      showClear = true,
      title = 'OPERATIONAL TIMELINE',
    } = opts;

    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    const events = window.TSMMemory?.getEvents({ limit }) || [];

    const rows = events.length
      ? events.map(e => {
          const color = SEVERITY_COLOR[e.severity] || SEVERITY_COLOR.info;
          const icon  = TYPE_ICON[e.type] || '·';
          const time  = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #0a1020;">
              <span style="color:${color};font-size:12px;min-width:14px;margin-top:1px;">${icon}</span>
              <span style="color:#4a5568;font-size:10px;white-space:nowrap;min-width:44px;">${time}</span>
              <span style="color:#8ab0c0;font-size:11px;line-height:1.5;">${e.label}</span>
            </div>`;
        }).join('')
      : `<div style="color:#3a4a5a;font-size:11px;padding:12px 0;text-align:center;">No events recorded yet.</div>`;

    const clearBtn = showClear
      ? `<button onclick="window.TSMMemory&&window.TSMMemory.clearAll();window.TSMTimeline&&window.TSMTimeline.refresh();" style="background:transparent;border:1px solid #1a2a3a;color:#3a5068;font-family:monospace;font-size:9px;padding:4px 10px;border-radius:3px;cursor:pointer;letter-spacing:0.5px;">CLEAR</button>`
      : '';

    el.innerHTML = `
      <div style="background:#020913;border:1px solid #0d2133;border-radius:8px;padding:14px 16px;font-family:monospace;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:9px;letter-spacing:3px;color:#1e4060;">${title}</span>
          <div style="display:flex;gap:6px;align-items:center;">
            <span style="font-size:9px;color:#1e4060;">${events.length} events</span>
            ${clearBtn}
          </div>
        </div>
        <div style="max-height:260px;overflow-y:auto;">${rows}</div>
      </div>`;
  }

  /**
   * Auto-mount if a #tsm-timeline-mount element exists.
   */
  function autoMount() {
    const mount = document.getElementById('tsm-timeline-mount');
    if (mount) render(mount);
  }

  /**
   * Refresh all mounted timelines.
   */
  function refresh() {
    const mount = document.getElementById('tsm-timeline-mount');
    if (mount) render(mount);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  else autoMount();

  window.TSMTimeline = { render, refresh };
  console.debug('[TSMTimeline] loaded');
})();