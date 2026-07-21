/**
 * TSMIncomingDocPanel
 *
 * For war rooms that don't have a single-document processing pipeline
 * to plug an intake-routed document into (dashboards, master-data views,
 * simulations, etc.) — shows what was routed here instead of silently
 * dropping it. Real and functional, not a stand-in for actual analysis:
 * displays the classification fields intake already extracted, and lets
 * the operator acknowledge (clears the relay key) once reviewed.
 *
 * Usage: include this script, then call
 *   TSMIncomingDocPanel.init('tsm_<vertical>_docsearch_relay');
 * with the exact relay key this page is registered under in
 * tsm-doc-search-multi.html's WAR_ROOM_ROUTES table.
 */
(function (global) {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function row(label, value) {
    if (!value) return '';
    return '<div style="margin-bottom:5px;"><span style="color:#64748b;">' + esc(label) + ':</span> ' + esc(value) + '</div>';
  }

  function init(relayKey) {
    if (!relayKey) { console.warn('[TSMIncomingDocPanel] init() called without a relay key'); return; }
    try {
      var raw = localStorage.getItem(relayKey);
      if (!raw) return;
      var relay = JSON.parse(raw);
      if (!relay || (!relay.fileName && !relay.docText)) return;

      var panel = document.createElement('div');
      panel.id = 'tsm-incoming-doc-panel';
      panel.style.cssText =
        'position:fixed;top:50px;right:16px;z-index:99999;width:300px;' +
        'background:#0d1420;border:1px solid #2dd4bf;border-radius:6px;padding:14px;' +
        'font-family:"Courier New",monospace;font-size:11px;color:#e2e8f0;' +
        'box-shadow:0 4px 24px rgba(0,0,0,.5);line-height:1.5;';

      panel.innerHTML =
        '<div style="font-size:9px;letter-spacing:1px;color:#2dd4bf;margin-bottom:10px;font-weight:700;">' +
        '\uD83D\uDCE5 INCOMING DOCUMENT \u2014 ROUTED FROM INTAKE</div>' +
        row('File', relay.fileName || '(untitled)') +
        row('Type', relay.docType) +
        row('Vendor', relay.vendor) +
        row('Client', relay.client) +
        row('Ref', relay.ref) +
        (relay.timestamp ? '<div style="margin-bottom:10px;color:#475569;font-size:9px;">' + new Date(relay.timestamp).toLocaleString() + '</div>' : '') +
        '<div style="font-size:9px;color:#94a3b8;margin-bottom:10px;border-top:1px solid #1e293b;padding-top:8px;">' +
        'This page doesn\u2019t yet have automated processing for routed documents. Review manually, then acknowledge.</div>' +
        '<button id="tsm-incoming-doc-ack" style="width:100%;padding:7px;background:#2dd4bf;color:#000;' +
        'border:none;border-radius:4px;font-family:inherit;font-size:9px;font-weight:700;letter-spacing:1px;cursor:pointer;">' +
        'ACKNOWLEDGE</button>';

      document.body.appendChild(panel);
      document.getElementById('tsm-incoming-doc-ack').addEventListener('click', function () {
        try { localStorage.removeItem(relayKey); } catch (e) {}
        panel.remove();
      });
    } catch (e) {
      console.warn('[TSMIncomingDocPanel]', e);
    }
  }

  global.TSMIncomingDocPanel = { init: init };
})(window);
