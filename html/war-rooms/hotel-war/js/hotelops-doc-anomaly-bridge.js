// ═══════════════════════════════════════════════════════════════════════════
// HOTELOPS DOC-SEARCH RELAY BRIDGE — hotelops-doc-anomaly-bridge.js
// Drop before </body> on hotelops-war-room.html.
//
// Consumes 'tsm_hotelops_docsearch_relay', the localStorage key written by
// tsm-doc-search-multi.html's universal "⚡ Send to War Room" flow
// (openWarRoomPicker → launchWarRoom → WAR_ROOM_ROUTES['hotelops-war-room'].relay).
// This is the same mechanism Construction/FinOps/Insurance/etc. consume —
// confirmed by reading construction-war-room.html's own "Doc Search relay —
// populate from redispatch" handler, which is the one that actually fires;
// its declared autoKey/sessionStorage fallback is dead code in that file, so
// this bridge only wires the key that's proven to work.
//
// HotelOps has no free-text "paste doc, fire AI engines" flow the way
// Construction does (its engine is a structured data model, not a text
// analyzer), so instead of populating a textarea, this renders an
// information banner at the top of #main with what was routed and why —
// then clears the key so it doesn't re-fire on next load.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const RELAY_KEY = 'tsm_hotelops_docsearch_relay';

  function renderBanner(relay) {
    const docText = relay.docText || relay.summary || '';
    const firstLines = docText.split('\n').filter(Boolean).slice(0, 6);

    const html = `
<div id="hotelops-relay-root" style="
  position:relative; margin:0 0 16px 0; border:1px solid rgba(0,212,170,.35); border-radius:8px;
  background:rgba(0,212,170,.08); box-shadow:0 0 14px rgba(0,212,170,.15); font-family:inherit; overflow:hidden;
">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,.3);">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:.6rem;font-weight:700;letter-spacing:.08em;color:#00d4aa;padding:2px 8px;border:1px solid rgba(0,212,170,.4);border-radius:4px;">DOC RELAY</span>
      <span style="font-size:.72rem;font-weight:600;color:#e7e7ea;">Routed from Document Search${relay.docType ? ' — ' + relay.docType : ''}</span>
    </div>
    <button onclick="document.getElementById('hotelops-relay-root').remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:.85rem;">✕</button>
  </div>
  <div style="padding:7px 14px;background:rgba(0,0,0,.15);border-bottom:1px solid rgba(255,255,255,.06);font-size:.62rem;color:#94a3b8;display:flex;flex-wrap:wrap;gap:4px 0;">
    ${relay.fileName ? `<span><span style="color:#64748b">FILE</span> ${relay.fileName}</span><span style="color:#334155;margin:0 8px">·</span>` : ''}
    ${relay.client ? `<span><span style="color:#64748b">PROPERTY</span> ${relay.client}</span><span style="color:#334155;margin:0 8px">·</span>` : ''}
    ${relay.ref ? `<span><span style="color:#64748b">REF</span> ${relay.ref}</span>` : ''}
  </div>
  <div style="padding:14px;">
    <div style="color:#94a3b8;font-size:.6rem;letter-spacing:.1em;margin-bottom:8px;">ROUTED CONTENT</div>
    ${firstLines.length
      ? `<pre style="white-space:pre-wrap;color:#cbd5e1;font-size:.72rem;line-height:1.6;margin:0;font-family:inherit;">${firstLines.join('\n')}</pre>`
      : `<p style="color:#475569;font-size:.7rem;margin:0;">No document text included — check the relevant tab for this record.</p>`}
  </div>
</div>`;

    const target = document.getElementById('main') || document.body;
    const wrapper = document.createElement('div');
    wrapper.id = 'hotelops-relay-wrapper';
    wrapper.innerHTML = html;
    target.insertBefore(wrapper, target.firstChild);
  }

  function init() {
    let relay;
    try {
      const raw = localStorage.getItem(RELAY_KEY);
      if (!raw) return;
      relay = JSON.parse(raw);
    } catch (e) { return; }
    if (!relay) return;

    // Consume once — same clear-after-read pattern as Construction's handler.
    localStorage.removeItem(RELAY_KEY);
    renderBanner(relay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
