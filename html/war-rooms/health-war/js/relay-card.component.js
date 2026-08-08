// ═══════════════════════════════════════════════════════════════════════════
// relay-card.component.js
// Drop-in relay banner renderer for HC chain pages.
// Reads TSMRelay (relay.engine.js) — must be loaded after it.
//
// Usage (in any HC page):
//   <script src="/html/healthcare/js/relay.engine.js"></script>
//   <script src="/html/healthcare/js/relay-card.component.js"></script>
//   <!-- Card auto-injects on DOMContentLoaded -->
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  if (window.__TSM_RELAY_CARD__) return;
  window.__TSM_RELAY_CARD__ = true;

  const COLOR = {
    info:    '#38bdf8',
    success: '#00ffc6',
    warn:    '#f59e0b',
    error:   '#ef4444',
  };

  // ── STYLE HELPERS ─────────────────────────────────────────────────────────
  function _card(accentColor, innerHTML) {
    const el = document.createElement('div');
    el.style.cssText = [
      'background:#020913',
      `border:1px solid ${accentColor}40`,
      'border-radius:8px',
      'padding:18px 20px',
      'margin:16px 0',
      'font-family:monospace',
      `border-left:3px solid ${accentColor}`,
      'animation:fadeIn 0.25s ease',
    ].join(';');
    el.innerHTML = innerHTML;
    return el;
  }

  function _pill(text, color) {
    return `<span style="background:${color}18;border:1px solid ${color}40;border-radius:999px;padding:4px 12px;font-size:10px;color:${color};margin-right:6px;white-space:nowrap;">${text}</span>`;
  }

  function _badge(label, color = COLOR.success) {
    return `<span style="background:${color}22;border:1px solid ${color}44;border-radius:4px;padding:4px 10px;font-size:11px;color:${color};font-weight:700;">${label}</span>`;
  }

  function _btn(text, onclick, color = COLOR.success) {
    return `<button onclick="${onclick}" style="background:${color}18;border:1px solid ${color}44;color:${color};font-family:monospace;font-size:10px;font-weight:700;padding:7px 14px;border-radius:3px;cursor:pointer;letter-spacing:0.5px;">${text}</button>`;
  }

  function _insert(el) {
    // Try to inject just below a recognisable page header, else top of body
    const target =
      document.querySelector('.page-header') ||
      document.querySelector('main') ||
      document.querySelector('.wrap') ||
      document.querySelector('.card') ||
      document.body;
    target.insertAdjacentElement(
      target === document.body ? 'afterbegin' : 'afterbegin',
      el
    );
  }

  // ── CARD RENDERERS ────────────────────────────────────────────────────────

  /**
   * Show incoming War Room Brief banner on hc-main-strategist.html
   */
  function renderWarRoomBriefCard() {
    if (!location.pathname.includes('hc-main-strategist')) return;
    if (document.getElementById('tsm-relay-card-warroom')) return;

    const data = window.TSMRelay?.reads.warRoomBrief() || null;
    if (!data) return;

    const age = Math.round((Date.now() - (data._ts || 0)) / 1000);
    const engines = Object.keys(data.engineOutputs || {});
    const snippet = Object.values(data.engineOutputs || {})[0]?.slice(0, 200) || 'Analysis complete.';

    const el = _card(COLOR.success, `
      <div style="font-size:9px;letter-spacing:3px;color:${COLOR.success}aa;margin-bottom:10px;">
        ◈ WAR ROOM RELAY · RECEIVED ${age}s AGO
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        ${_badge('✓ HC DENIAL WAR ROOM', COLOR.success)}
        ${_pill(engines.length + ' engines', COLOR.info)}
        ${data.docText ? _pill('doc attached', '#a78bfa') : ''}
      </div>
      <div style="background:#010507;border-left:3px solid ${COLOR.success}55;border-radius:4px;padding:12px;font-size:11px;color:#8ab0c0;line-height:1.6;margin-bottom:14px;max-height:110px;overflow-y:auto;">
        ${snippet}${snippet.length === 200 ? '…' : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${_btn('⚡ RELAY TO EXEC PORTAL →', "window.TSMRelay&&(window.location.href=window.TSMRelay.relayToExecPortal())", COLOR.success)}
        ${_btn('DISMISS', "document.getElementById('tsm-relay-card-warroom').remove()", '#555')}
      </div>
    `);
    el.id = 'tsm-relay-card-warroom';
    _insert(el);
  }

  /**
   * Show incoming Exec Relay banner on executive-portal.html
   */
  function renderExecRelayCard() {
    if (!location.pathname.includes('executive-portal')) return;
    if (document.getElementById('tsm-relay-card-exec')) return;

    const data = window.TSMRelay?.reads.execRelay() || null;
    if (!data) return;

    const brief = data.warRoomBrief || {};
    const engines = Object.keys(brief.engineOutputs || {});
    const age = Math.round((Date.now() - (data._ts || 0)) / 1000);

    const el = _card(COLOR.info, `
      <div style="font-size:9px;letter-spacing:3px;color:${COLOR.info}aa;margin-bottom:10px;">
        ◈ STRATEGIST RELAY · RECEIVED ${age}s AGO
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        ${_badge('✓ HC MAIN STRATEGIST', COLOR.info)}
        ${_pill(engines.length + ' engines', COLOR.success)}
      </div>
      <div style="background:#010507;border-left:3px solid ${COLOR.info}55;border-radius:4px;padding:12px;font-size:11px;color:#8ab0c0;line-height:1.6;margin-bottom:14px;max-height:100px;overflow-y:auto;">
        ${data.strategistFindings || Object.values(brief.engineOutputs || {})[0]?.slice(0, 200) || 'Strategist relay complete. Ready for executive review.'}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${_btn('⚡ RUN EXECUTIVE BRIEFING', "typeof runExecutiveBriefing==='function'&&runExecutiveBriefing()", COLOR.info)}
        ${_btn('DISMISS', "document.getElementById('tsm-relay-card-exec').remove()", '#555')}
      </div>
    `);
    el.id = 'tsm-relay-card-exec';
    _insert(el);
  }

  /**
   * Show App Dispatch banner on HC node pages (cheat sheet fill).
   * Provides howTo guidance and pre-fills the doc-text input if present.
   */
  function renderAppDispatchCard() {
    const dispatch = window.TSMRelay?.reads.appDispatch() || null;
    if (!dispatch) return;

    // Only render if this page matches the dispatched app
    const expectedUrl = dispatch.appUrl || '';
    if (expectedUrl && !location.pathname.includes(expectedUrl.replace(/^\/html/, '').split('?')[0])) return;
    if (document.getElementById('tsm-relay-card-dispatch')) return;

    // Auto-fill doc-text if present and not already filled
    const docInput = document.getElementById('doc-text') || document.getElementById('input-doc') || document.querySelector('textarea[name="doc"]');
    if (docInput && !docInput.value && dispatch.docText) {
      docInput.value = dispatch.docText;
    }

    const terms = (dispatch.matchedTerms || []).slice(0, 5);

    const el = _card(COLOR.warn, `
      <div style="font-size:9px;letter-spacing:3px;color:${COLOR.warn}aa;margin-bottom:10px;">
        ◈ WAR ROOM DISPATCH · ${dispatch.appName?.toUpperCase() || 'NODE'}
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        ${_badge('DISPATCHED FROM WAR ROOM', COLOR.warn)}
        ${terms.map(t => _pill(t, COLOR.warn)).join('')}
      </div>
      <div style="background:#010507;border-left:3px solid ${COLOR.warn}55;border-radius:4px;padding:12px;font-size:11px;color:#d4c096;line-height:1.7;margin-bottom:14px;">
        ${dispatch.howTo || 'Use this node to resolve the dispatched denial scenario.'}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${_btn('DISMISS', "document.getElementById('tsm-relay-card-dispatch').remove()", '#555')}
        ${_btn('CLEAR DISPATCH', "window.TSMRelay&&window.TSMRelay.clear(window.TSMRelay.KEYS.APP_DISPATCH);document.getElementById('tsm-relay-card-dispatch').remove()", COLOR.error)}
      </div>
    `);
    el.id = 'tsm-relay-card-dispatch';
    _insert(el);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    renderWarRoomBriefCard();
    renderExecRelayCard();
    renderAppDispatchCard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 600);   // retry after async page scripts populate relay data

  window.TSMRelayCard = { renderWarRoomBriefCard, renderExecRelayCard, renderAppDispatchCard };
  console.debug('[TSMRelayCard] loaded');
})();