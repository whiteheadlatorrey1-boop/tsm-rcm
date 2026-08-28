(function () {
  'use strict';

  const API = '/api/pm/executive-decisions';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(v) {
    const n = Number(v || 0);
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }

  function findRelayPayload() {
    // Executive decisions consume ONLY the canonical PM relay.
    //
    // TSM_PM_RELAY is the rich PM War Room payload.
    //
    // The Sentinel anomaly channel is intentionally not consumed here.

    try {
      if (
        window.TSM &&
        window.TSM.relay &&
        typeof window.TSM.relay.read === 'function'
      ) {
        const payload = window.TSM.relay.read('PM');

        if (payload && typeof payload === 'object') {
          return payload;
        }
      }
    } catch (_) {}

    // Explicit fallback: canonical PM relay only.
    try {
      const raw =
        sessionStorage.getItem('TSM_PM_RELAY') ||
        localStorage.getItem('TSM_PM_RELAY');

      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function run(payload) {
    if (!payload || typeof payload !== 'object') return;

    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Decision engine HTTP ' + response.status);

      const result = await response.json();
      render(result);
    } catch (err) {
      console.warn('[PM Decision Engine]', err);
    }
  }

  function render(result) {
    const old = document.getElementById('pmDecisionEnginePanel');
    if (old) old.remove();

    const summary = result.executiveSummary || {};
    const decisions = result.decisions || [];

    const panel = document.createElement('section');
    panel.id = 'pmDecisionEnginePanel';

    panel.style.cssText =
      'margin:24px 0;padding:22px;border:1px solid rgba(255,255,255,.12);' +
      'border-radius:16px;background:rgba(10,14,20,.92);color:#fff;' +
      'font-family:inherit;box-shadow:0 12px 40px rgba(0,0,0,.25);';

    const rows = decisions.slice(0, 8).map(d => `
      <div style="padding:14px 0;border-top:1px solid rgba(255,255,255,.08)">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <strong>#${esc(d.rank)} ${esc(d.priority)}</strong>
          <span>${esc(d.domain.replace(/_/g, ' '))}</span>
          <span style="margin-left:auto;font-weight:700">${money(d.exposure)}</span>
        </div>
        <div style="margin-top:7px;font-weight:600">${esc(d.finding)}</div>
        <div style="margin-top:6px;opacity:.78">
          Action: ${esc(d.action)}
        </div>
        <div style="margin-top:5px;font-size:.88em;opacity:.65">
          Owner: ${esc(d.owner)} · Urgency: ${esc(d.urgency)} · Evidence: ${esc(d.entityId)}
        </div>
      </div>
    `).join('');

    panel.innerHTML = `
      <div style="font-size:12px;letter-spacing:.12em;opacity:.65">
        TSM PM DECISION ENGINE · ${esc(result.engine || 'v1')}
      </div>

      <h2 style="margin:7px 0 5px">Executive Decision Queue</h2>

      <p style="margin:0 0 16px;opacity:.8">
        ${esc(summary.headline || 'Management decisions generated from current PM evidence.')}
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>MODELED EXPOSURE</small><br>
          <strong>${money(summary.modeledExposure)}</strong>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>DECISIONS</small><br>
          <strong>${esc(summary.decisionCount || decisions.length)}</strong>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>CRITICAL</small><br>
          <strong>${esc(summary.criticalCount || 0)}</strong>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>HIGH</small><br>
          <strong>${esc(summary.highCount || 0)}</strong>
        </div>
      </div>

      ${rows || '<div style="opacity:.65">No actionable decisions were generated from the current payload.</div>'}

      <div style="margin-top:14px;font-size:.78em;opacity:.55">
        Deterministic priority engine · Human approval required · No source-system write-back
      </div>
    `;

    const anchor =
      document.querySelector('main') ||
      document.querySelector('#app') ||
      document.body.firstElementChild;

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(panel, anchor);
    } else {
      document.body.prepend(panel);
    }
  }

  function boot() {
    const payload = findRelayPayload();
    if (payload) run(payload);

    window.addEventListener('storage', function (event) {
      // Executive decision engine reacts ONLY to the canonical PM relay.
      if (event.key !== 'TSM_PM_RELAY') return;

      try {
        if (event.newValue) {
          run(JSON.parse(event.newValue));
        }
      } catch (_) {}
    });

    window.addEventListener('TSM_RELAY_EVENT', function (event) {
      // TSM_RELAY_EVENT is a shared cross-vertical event bus.
      // The PM Executive Decision Engine may consume it ONLY when
      // the relay explicitly identifies itself as the PM domain.
      const detail = event && event.detail;
      if (!detail || detail.domain !== 'PM') return;

      const payload = detail.payload;
      if (payload && typeof payload === 'object') {
        run(payload);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
