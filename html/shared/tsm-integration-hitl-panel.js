/**
 * TSM Integration Hub HITL Remediation Panel v1.0
 * Real, live-wired panel for the degraded-integration HITL gate:
 *   GET  /api/integration/catalog
 *   POST /api/integration/:id/remediate/approve   (requireApiKey)
 *   POST /api/integration/:id/remediate/reject    (requireApiKey)
 *
 * Only 'degraded' integrations are gated (approve = remediate back to
 * healthy, reject = escalate). 'healthy' and 'warning' items are shown
 * read-only since they don't need a go/no-go decision — matches the
 * server's own 409 guard on non-degraded items.
 *
 * Requires window.TSM_CLIENT_KEY, loaded separately via:
 *   <script src="/config/tsm-client-key.js"></script>
 * (publicly-servable convenience key, not a true secret — matches the
 * server's own comment on requireApiKey / TSM_API_KEY.)
 *
 * Usage:
 *   <script src="/config/tsm-client-key.js"></script>
 *   <div id="tsm-integration-hitl"></div>
 *   <script src="/html/shared/tsm-integration-hitl-panel.js"></script>
 *   <script>TSMIntegrationHitlPanel.mount('tsm-integration-hitl');</script>
 *
 * Optional: pass { pollMs: 15000 } to auto-refresh, otherwise it only
 * re-fetches after an approve/reject action.
 */
(function (global) {
  'use strict';

  const STATUS_COLOR = {
    healthy: 'var(--green, #22c55e)',
    warning: 'var(--amber, #f5a623)',
    degraded: 'var(--red, #ef4444)',
    escalated: 'var(--purple, #a855f7)'
  };

  function _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _styleBlock() {
    return `
      <style>
        .tsm-ihp-wrap { font-family: 'JetBrains Mono', monospace; }
        .tsm-ihp-empty, .tsm-ihp-error { color: #5a6f90; font-size: 9px; padding: 14px; }
        .tsm-ihp-error { color: #ff3d57; }
        .tsm-ihp-row {
          display: flex; align-items: center; gap: 12px;
          background: #0a0f22; border: 1px solid rgba(255,255,255,0.055);
          padding: 10px 12px; margin-bottom: 8px;
        }
        .tsm-ihp-status {
          flex: 0 0 auto; font-size: 8px; letter-spacing: 1px; font-weight: 700;
          border: 1px solid; border-radius: 3px; padding: 3px 7px; text-transform: uppercase;
        }
        .tsm-ihp-body { flex: 1; min-width: 0; }
        .tsm-ihp-system { font-size: 9.5px; color: #d8e2f2; }
        .tsm-ihp-meta { font-size: 8px; color: #8a9fc0; margin-top: 3px; }
        .tsm-ihp-actions { flex: 0 0 auto; display: flex; gap: 6px; }
        .tsm-ihp-btn {
          font-family: inherit; font-size: 7.5px; letter-spacing: 1px; text-transform: uppercase;
          padding: 5px 10px; cursor: pointer; border-radius: 3px;
        }
        .tsm-ihp-btn.approve { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.4); color: #22c55e; }
        .tsm-ihp-btn.reject { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.4); color: #ef4444; }
        .tsm-ihp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      </style>`;
  }

  function _rowHtml(item) {
    const color = STATUS_COLOR[item.status] || STATUS_COLOR.healthy;
    const isDegraded = item.status === 'degraded';
    return `
      <div class="tsm-ihp-row" data-integration-id="${_escapeHtml(item.id)}">
        <div class="tsm-ihp-status" style="color:${color};border-color:${color};">${_escapeHtml(item.status)}</div>
        <div class="tsm-ihp-body">
          <div class="tsm-ihp-system">${_escapeHtml(item.system)}</div>
          <div class="tsm-ihp-meta">errors: ${_escapeHtml(item.errorCount != null ? item.errorCount : 0)} &middot; last sync: ${item.lastSync ? _escapeHtml(new Date(item.lastSync).toLocaleString()) : 'never'} &middot; id: ${_escapeHtml(item.id)}</div>
        </div>
        ${isDegraded
          ? `<div class="tsm-ihp-actions">
               <button class="tsm-ihp-btn approve" data-decide="approve" data-id="${_escapeHtml(item.id)}">Remediate</button>
               <button class="tsm-ihp-btn reject" data-decide="reject" data-id="${_escapeHtml(item.id)}">Escalate</button>
             </div>`
          : ''}
      </div>`;
  }

  async function _fetchCatalog() {
    let res;
    try {
      res = await global.fetch('/api/integration/catalog');
    } catch (e) {
      console.error('[TSMIntegrationHitlPanel] network error', e);
      return { items: null, errorKind: 'network', detail: e.message };
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error('[TSMIntegrationHitlPanel] non-JSON response', e);
      return { items: null, errorKind: 'non-json', detail: `HTTP ${res.status}` };
    }
    if (!data || !data.ok || !Array.isArray(data.integrations)) {
      return { items: null, errorKind: 'api-error', detail: (data && data.error) || `HTTP ${res.status}` };
    }
    return { items: data.integrations, errorKind: null, detail: null };
  }

  async function _decide(container, id, decision, btn) {
    if (!global.TSM_CLIENT_KEY) {
      console.warn('[TSMIntegrationHitlPanel] window.TSM_CLIENT_KEY not set — load /config/tsm-client-key.js first.');
      return;
    }
    const row = btn.closest('.tsm-ihp-row');
    row.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      const res = await global.fetch(`/api/integration/${encodeURIComponent(id)}/remediate/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': global.TSM_CLIENT_KEY },
        body: JSON.stringify({ actor: 'Integration Hub HITL Panel' })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        console.warn(`[TSMIntegrationHitlPanel] ${decision} failed:`, data.error || res.status);
        row.querySelectorAll('button').forEach(b => b.disabled = false);
        return;
      }
      await _render(container);
    } catch (e) {
      console.error('[TSMIntegrationHitlPanel] decision failed', e);
      row.querySelectorAll('button').forEach(b => b.disabled = false);
    }
  }

  const ERROR_MESSAGES = {
    network: detail => `Could not reach the server at all (network error: ${_escapeHtml(detail)}). If this is a preview/sandbox pane, there's no backend behind it — this only works against the real running server.`,
    'non-json': detail => `The server responded, but not with JSON (${_escapeHtml(detail)}). Usually means the request hit a static host or catch-all route instead of the real /api/integration/catalog endpoint.`,
    'api-error': detail => `The API responded but returned an error: ${_escapeHtml(detail)}. This one IS the real server — check server logs.`
  };

  async function _render(container) {
    const { items, errorKind, detail } = await _fetchCatalog();
    if (errorKind) {
      const msg = (ERROR_MESSAGES[errorKind] || (() => 'Unknown error.'))(detail);
      container.innerHTML = `${_styleBlock()}<div class="tsm-ihp-error">${msg}</div>`;
      return;
    }
    if (!items.length) {
      container.innerHTML = `${_styleBlock()}<div class="tsm-ihp-empty">No integrations in the catalog.</div>`;
      return;
    }
    const degraded = items.filter(i => i.status === 'degraded');
    const rest = items.filter(i => i.status !== 'degraded');
    const rows = [...degraded, ...rest].map(_rowHtml).join('');
    container.innerHTML = `${_styleBlock()}<div class="tsm-ihp-wrap">${rows}</div>`;

    container.querySelectorAll('[data-decide]').forEach(btn => {
      btn.addEventListener('click', () => {
        _decide(container, btn.getAttribute('data-id'), btn.getAttribute('data-decide'), btn);
      });
    });
  }

  function mount(containerId, opts = {}) {
    const container = global.document.getElementById(containerId);
    if (!container) {
      console.warn(`[TSMIntegrationHitlPanel] Container "#${containerId}" not found — cannot mount.`);
      return null;
    }
    _render(container);
    let timer = null;
    if (opts.pollMs) {
      timer = global.setInterval(() => _render(container), opts.pollMs);
    }
    return () => { if (timer) global.clearInterval(timer); };
  }

  global.TSMIntegrationHitlPanel = { mount };

  console.info('[TSMIntegrationHitlPanel] Integration Hub HITL panel v1.0 initialized.');

})(window);