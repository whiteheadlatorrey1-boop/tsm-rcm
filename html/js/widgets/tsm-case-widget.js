/**
 * TSM Case Widget v1.0
 * Renders TSMCaseManager.getAll() as a sortable, actionable table.
 * Mirrors html/js/widgets/tsm-exception-widget.js's exact pattern —
 * one file, mountable into any executive portal, no page-specific markup
 * required beyond an empty container div.
 *
 * Usage:
 *   <div id="tsm-case-queue"></div>
 *   <script>TSMCaseWidget.mount('tsm-case-queue', { sector: 'bpo' });</script>
 *
 * Depends on: tsm-case-manager.js (must load first)
 */
(function (global) {
  'use strict';

  const PRIORITY_COLOR = { P1: 'var(--red, #ff3d57)', P2: 'var(--amber, #ffb300)', P3: 'var(--green, #00e676)' };
  const STATUS_COLOR = {
    OPEN: '#5a6f90', IN_PROGRESS: '#00d4d4', AWAITING_APPROVAL: '#ffb300',
    APPROVED: '#00e676', CLOSED: '#5a6f90'
  };

  function _fmtMoney(n) {
    if (!n) return '—';
    return '$' + Number(n).toLocaleString('en-US');
  }

  function _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _rowHtml(c) {
    const color = PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.P3;
    const statusColor = STATUS_COLOR[c.status] || '#5a6f90';
    const closed = c.status === 'CLOSED';
    const exCount = Array.isArray(c.detectedExceptions) ? c.detectedExceptions.length : 0;
    const artCount = Array.isArray(c.generatedArtifacts) ? c.generatedArtifacts.length : 0;
    const canDecide = c.approvalStatus === 'PENDING';
    return `
      <div class="tsm-caseq-row${closed ? ' tsm-caseq-row--closed' : ''}" data-case-id="${_escapeHtml(c.caseId)}">
        <div class="tsm-caseq-badge" style="color:${color};border-color:${color};">${_escapeHtml(c.priority || 'P3')}</div>
        <div class="tsm-caseq-body">
          <div class="tsm-caseq-title">${_escapeHtml(c.title || c.caseId)}</div>
          ${c.description ? `<div class="tsm-caseq-detail">${_escapeHtml(c.description)}</div>` : ''}
          <div class="tsm-caseq-meta">
            <span class="tsm-caseq-status" style="color:${statusColor};border-color:${statusColor};">${_escapeHtml(c.status)}</span>
            ${exCount ? `<span class="tsm-caseq-tag">${exCount} exception${exCount === 1 ? '' : 's'}</span>` : ''}
            ${artCount ? `<span class="tsm-caseq-tag">${artCount} artifact${artCount === 1 ? '' : 's'}</span>` : ''}
          </div>
        </div>
        <div class="tsm-caseq-exposure">${_escapeHtml(_fmtMoney(c.exposure))}</div>
        <div class="tsm-caseq-actions">
          ${canDecide
            ? `<button class="tsm-caseq-btn tsm-caseq-btn--approve" data-approve="${_escapeHtml(c.caseId)}">Approve</button>
               <button class="tsm-caseq-btn tsm-caseq-btn--reject" data-reject="${_escapeHtml(c.caseId)}">Reject</button>`
            : `<span class="tsm-caseq-status-tag">${_escapeHtml(c.approvalStatus)}</span>`}
        </div>
      </div>`;
  }

  function _styleBlock() {
    return `
      <style>
        .tsm-caseq-wrap { font-family: 'JetBrains Mono', monospace; }
        .tsm-caseq-empty { color: #5a6f90; font-size: 9px; padding: 14px; }
        .tsm-caseq-row {
          display: flex; align-items: flex-start; gap: 12px;
          background: #0a0f22; border: 1px solid rgba(255,255,255,0.055);
          padding: 10px 12px; margin-bottom: 8px;
        }
        .tsm-caseq-row--closed { opacity: 0.45; }
        .tsm-caseq-badge {
          flex: 0 0 auto; font-size: 8px; letter-spacing: 1px; font-weight: 700;
          border: 1px solid; border-radius: 3px; padding: 3px 7px; text-transform: uppercase;
        }
        .tsm-caseq-body { flex: 1; min-width: 0; }
        .tsm-caseq-title { font-size: 9.5px; color: #d8e2f2; margin-bottom: 3px; }
        .tsm-caseq-detail { font-size: 8.5px; color: #8a9fc0; line-height: 1.5; margin-bottom: 4px; }
        .tsm-caseq-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .tsm-caseq-status {
          font-size: 7px; letter-spacing: 1px; text-transform: uppercase;
          border: 1px solid; border-radius: 3px; padding: 2px 6px;
        }
        .tsm-caseq-tag { font-size: 7.5px; color: #5a6f90; letter-spacing: 0.5px; }
        .tsm-caseq-exposure {
          flex: 0 0 auto; font-size: 10px; color: #d8e2f2; font-weight: 700;
          align-self: center; min-width: 70px; text-align: right;
        }
        .tsm-caseq-actions { flex: 0 0 auto; align-self: center; min-width: 130px; text-align: right; display: flex; gap: 6px; justify-content: flex-end; }
        .tsm-caseq-btn {
          background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.3);
          color: #00e5ff; font-family: inherit; font-size: 7.5px; letter-spacing: 1px;
          padding: 5px 10px; cursor: pointer; text-transform: uppercase;
        }
        .tsm-caseq-btn--reject { border-color: rgba(255,61,87,0.3); color: #ff3d57; background: rgba(255,61,87,0.08); }
        .tsm-caseq-status-tag { font-size: 7.5px; color: #5a6f90; letter-spacing: 1px; text-transform: uppercase; }
      </style>`;
  }

  function _render(container, sector) {
    const cases = global.TSMCaseManager ? global.TSMCaseManager.getAll(sector) : [];
    const rows = cases.length
      ? cases.map(_rowHtml).join('')
      : '<div class="tsm-caseq-empty">No open cases — queue is clear.</div>';
    container.innerHTML = `${_styleBlock()}<div class="tsm-caseq-wrap">${rows}</div>`;

    container.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-approve');
        if (global.TSMCaseManager) global.TSMCaseManager.recordApproval(id, 'APPROVED', 'Portal User', {});
      });
    });
    container.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-reject');
        if (global.TSMCaseManager) global.TSMCaseManager.recordApproval(id, 'REJECTED', 'Portal User', {});
      });
    });
  }

  function mount(containerId, opts = {}) {
    const container = global.document.getElementById(containerId);
    if (!container) {
      console.warn(`[TSMCaseWidget] Container "#${containerId}" not found — cannot mount.`);
      return null;
    }
    const sector = opts.sector || null;

    _render(container, sector);

    if (global.TSMCaseManager) {
      const unsubscribe = global.TSMCaseManager.subscribe(() => _render(container, sector));
      // Pull server state (server/tsm-ledger-service.js bpo_cases) once on
      // mount so this device/session sees cases created or synced
      // elsewhere -- syncToServer() only pushes local->server; this is the
      // pull side. Fire-and-forget: _render() already ran above with
      // whatever localStorage had, hydrateFromServer's own notify() (if it
      // finds anything newer) triggers the re-render via the subscription
      // just set up.
      global.TSMCaseManager.hydrateFromServer(sector).catch(() => {});
      return unsubscribe;
    }
    console.warn('[TSMCaseWidget] TSMCaseManager not found — rendering static empty state only.');
    return () => {};
  }

  global.TSMCaseWidget = { mount };

  console.info('[TSMCaseWidget] Case Widget v1.0 initialized.');

})(window);
