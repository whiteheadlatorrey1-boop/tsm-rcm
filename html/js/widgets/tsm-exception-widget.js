/**
 * TSM Exception Widget v1.0
 * Renders TSMExceptions.getAll() as a sortable, actionable table.
 * One file, mountable into any executive portal — no page-specific markup
 * required beyond an empty container div.
 *
 * Usage:
 *   <div id="tsm-exception-queue"></div>
 *   <script>TSMExceptionWidget.mount('tsm-exception-queue', { sector: 'healthcare' });</script>
 *
 * Depends on: tsm-exception-queue.js (must load first)
 */
(function (global) {
  'use strict';

  const PRIORITY_COLOR = { P1: 'var(--red, #ff3d57)', P2: 'var(--amber, #ffb300)', P3: 'var(--green, #00e676)' };

  function _fmtMoney(n) {
    if (!n) return '$0';
    return '$' + Number(n).toLocaleString('en-US');
  }

  function _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _rowHtml(ex) {
    const color = PRIORITY_COLOR[ex.priority] || PRIORITY_COLOR.P3;
    const resolved = ex.status === 'resolved';
    return `
      <div class="tsm-exq-row${resolved ? ' tsm-exq-row--resolved' : ''}" data-exception-id="${_escapeHtml(ex.exceptionId)}">
        <div class="tsm-exq-badge" style="color:${color};border-color:${color};">${_escapeHtml(ex.priority)}</div>
        <div class="tsm-exq-body">
          <div class="tsm-exq-title">${_escapeHtml(ex.title)}</div>
          ${ex.detail ? `<div class="tsm-exq-detail">${_escapeHtml(ex.detail)}</div>` : ''}
          ${ex.recommendedAction ? `<div class="tsm-exq-action">→ ${_escapeHtml(ex.recommendedAction)}</div>` : ''}
        </div>
        <div class="tsm-exq-exposure">${_escapeHtml(_fmtMoney(ex.exposure))}</div>
        <div class="tsm-exq-status">
          ${resolved
            ? '<span class="tsm-exq-resolved-tag">Resolved</span>'
            : `<button class="tsm-exq-resolve-btn" data-resolve="${_escapeHtml(ex.exceptionId)}">Resolve</button>`}
        </div>
      </div>`;
  }

  function _styleBlock() {
    return `
      <style>
        .tsm-exq-wrap { font-family: 'JetBrains Mono', monospace; }
        .tsm-exq-empty { color: #5a6f90; font-size: 9px; padding: 14px; }
        .tsm-exq-row {
          display: flex; align-items: flex-start; gap: 12px;
          background: #0a0f22; border: 1px solid rgba(255,255,255,0.055);
          padding: 10px 12px; margin-bottom: 8px;
        }
        .tsm-exq-row--resolved { opacity: 0.45; }
        .tsm-exq-badge {
          flex: 0 0 auto; font-size: 8px; letter-spacing: 1px; font-weight: 700;
          border: 1px solid; border-radius: 3px; padding: 3px 7px; text-transform: uppercase;
        }
        .tsm-exq-body { flex: 1; min-width: 0; }
        .tsm-exq-title { font-size: 9.5px; color: #d8e2f2; margin-bottom: 3px; }
        .tsm-exq-detail { font-size: 8.5px; color: #8a9fc0; line-height: 1.5; }
        .tsm-exq-action { font-size: 8px; color: #00e5ff; margin-top: 4px; }
        .tsm-exq-exposure {
          flex: 0 0 auto; font-size: 10px; color: #d8e2f2; font-weight: 700;
          align-self: center; min-width: 70px; text-align: right;
        }
        .tsm-exq-status { flex: 0 0 auto; align-self: center; min-width: 70px; text-align: right; }
        .tsm-exq-resolve-btn {
          background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.3);
          color: #00e5ff; font-family: inherit; font-size: 7.5px; letter-spacing: 1px;
          padding: 5px 10px; cursor: pointer; text-transform: uppercase;
        }
        .tsm-exq-resolved-tag { font-size: 7.5px; color: #5a6f90; letter-spacing: 1px; text-transform: uppercase; }
      </style>`;
  }

  function _render(container, sector) {
    const exceptions = global.TSMExceptions ? global.TSMExceptions.getAll(sector) : [];
    const rows = exceptions.length
      ? exceptions.map(_rowHtml).join('')
      : '<div class="tsm-exq-empty">No open exceptions — queue is clear.</div>';
    container.innerHTML = `${_styleBlock()}<div class="tsm-exq-wrap">${rows}</div>`;

    container.querySelectorAll('[data-resolve]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-resolve');
        if (global.TSMExceptions) global.TSMExceptions.resolve(id);
        // Re-render happens via the subscribe() callback below; no need to call here.
      });
    });
  }

  function mount(containerId, opts = {}) {
    const container = global.document.getElementById(containerId);
    if (!container) {
      console.warn(`[TSMExceptionWidget] Container "#${containerId}" not found — cannot mount.`);
      return null;
    }
    const sector = opts.sector || null;

    _render(container, sector);

    if (global.TSMExceptions) {
      return global.TSMExceptions.subscribe(() => _render(container, sector));
    }
    console.warn('[TSMExceptionWidget] TSMExceptions not found — rendering static empty state only.');
    return () => {};
  }

  global.TSMExceptionWidget = { mount };

  console.info('[TSMExceptionWidget] Exception Widget v1.0 initialized.');

})(window);
