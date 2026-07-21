/**
 * TSM Capability Sweep — capture + render helper
 * --------------------------------------------------------------------------
 * The backend endpoint POST /api/enterprise/capability-sweep already writes
 * real, caseId+vertical-tagged records into up to 10 SAP-phase capability
 * stores (O2C, CRM, CPQ, Catalog, Approval, Governance, WIP) and pulls
 * read-only context (no fabricated writes) from the 3 phases with no generic
 * create path (MDM, Integration Hub, Digital Twin). See
 * routes/enterprise-capability-bridge.js for the full design.
 *
 * Problem this fixes: every current call site fires that endpoint and
 * discards the response (fetch(...).catch(...) with no .then()), so the
 * real decisionPackage — and its caseId — is thrown away and never shown
 * to anyone. This module:
 *
 *   1. fire(payload)   — POSTs to the endpoint, captures the real response,
 *                        writes it to localStorage under
 *                        TSM_<VERTICAL>_CAPABILITY_SWEEP, and dispatches
 *                        'TSM_CAPABILITY_SWEEP_READY' so an open strategist
 *                        tab can re-render immediately.
 *   2. render(el, pkg) — renders exactly what came back. No phase is ever
 *                        shown with an invented value: phases present in
 *                        pkg.errors are shown as unavailable with the real
 *                        error text; contextOnly phases are labeled as
 *                        read-only context, not a case record; phases with
 *                        no aiAnalysis and no error are labeled pending.
 *
 * ZERO RISK PATTERN — replace an existing fire-and-forget call:
 *
 *   fetch('/api/enterprise/capability-sweep', {...}).catch(err => ...);
 *
 * with:
 *
 *   TSMCapabilitySweep.fire({...same body...});
 *
 * and add a container + render call to the matching strategist page:
 *
 *   <div id="tsm-capsweep-report"></div>
 *   <script>
 *     TSMCapabilitySweep.renderFromStorage('legal', document.getElementById('tsm-capsweep-report'));
 *     window.addEventListener('TSM_CAPABILITY_SWEEP_READY', function(e){
 *       if (e.detail && e.detail.vertical === 'legal') {
 *         TSMCapabilitySweep.renderFromStorage('legal', document.getElementById('tsm-capsweep-report'));
 *       }
 *     });
 *   </script>
 * ========================================================================== */

(function (global) {
  'use strict';

  var PHASE_META = {
    o2c:        { label: 'O2C — Order-to-Cash',        writable: true  },
    crm:        { label: 'CRM',                        writable: true  },
    cpq:        { label: 'CPQ — Configure/Price/Quote', writable: true  },
    catalog:    { label: 'Catalog',                     writable: true  },
    approval:   { label: 'Approval',                    writable: true  },
    governance: { label: 'Governance',                  writable: true  },
    wip:        { label: 'WIP',                         writable: true  },
    mdm:        { label: 'MDM',                          writable: false },
    integration:{ label: 'Integration Hub',              writable: false },
    digitalTwin:{ label: 'Digital Twin',                 writable: false }
  };
  var PHASE_ORDER = ['o2c','crm','cpq','catalog','approval','governance','wip','mdm','integration','digitalTwin'];

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function storageKey(vertical) {
    return 'TSM_' + String(vertical || '').toUpperCase() + '_CAPABILITY_SWEEP';
  }

  /**
   * fire(payload) — payload: { vertical, title, summary, exposure, entities, caseId? }
   * Returns the fetch promise so callers can still .then/.catch if they want,
   * but capture + storage + event dispatch happen regardless.
   */
  function fire(payload) {
    if (!payload || !payload.vertical) {
      console.warn('[TSMCapabilitySweep] fire() requires payload.vertical');
      return Promise.resolve(null);
    }
    var vertical = payload.vertical;
    return fetch('/api/enterprise/capability-sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (decisionPackage) {
        try {
          localStorage.setItem(storageKey(vertical), JSON.stringify({
            capturedAt: new Date().toISOString(),
            decisionPackage: decisionPackage
          }));
        } catch (e) { console.warn('[TSMCapabilitySweep] storage write failed:', e); }
        try {
          global.dispatchEvent(new CustomEvent('TSM_CAPABILITY_SWEEP_READY', { detail: { vertical: vertical, decisionPackage: decisionPackage } }));
        } catch (e) { /* CustomEvent unsupported — no-op */ }
        return decisionPackage;
      })
      .catch(function (err) {
        console.warn('[TSMCapabilitySweep] fire failed for ' + vertical + ':', err.message);
        return null;
      });
  }

  function readStored(vertical) {
    try {
      var raw = localStorage.getItem(storageKey(vertical));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function phaseHasError(pkg, phaseKey) {
    if (!pkg.errors || !pkg.errors.length) return null;
    var hit = pkg.errors.filter(function (e) { return e.indexOf(phaseKey + '.') === 0 || e.indexOf(phaseKey + ':') === 0; });
    return hit.length ? hit.join('; ') : null;
  }

  function recordSummaryLine(phaseKey, record) {
    if (!record) return null;
    switch (phaseKey) {
      case 'o2c':        return (record.orderRef || record.id) + ' \u2014 ' + (record.customer || '\u2014') + ' \u00b7 ' + (record.status || '\u2014');
      case 'crm':        return record.accountName + ' \u00b7 ' + (record.relationshipType || '\u2014') + ' \u00b7 risk: ' + (record.riskFlag || '\u2014');
      case 'cpq':        return (record.quoteRef || record.id) + ' \u2014 ' + (record.description || '\u2014') + ' \u00b7 ' + (record.status || '\u2014');
      case 'catalog':    return (record.sku || record.id) + ' \u2014 ' + (record.name || '\u2014') + ' \u00b7 flag: ' + (record.flag || '\u2014');
      case 'approval':   return record.title + ' \u00b7 ' + (record.status || '\u2014');
      case 'governance':return (record.title || record.id) + ' \u00b7 severity: ' + (record.severity || '\u2014');
      case 'wip':        return (record.action || record.id) + ' \u00b7 ' + (record.status || '\u2014');
      default:           return record.id || null;
    }
  }

  /**
   * render(el, pkg) — pkg is the raw decisionPackage from the endpoint
   * (or the {capturedAt, decisionPackage} wrapper — both accepted).
   */
  function render(el, pkgOrWrapper) {
    if (!el) return;
    if (!pkgOrWrapper) {
      el.innerHTML = '<div style="font-family:monospace;font-size:.7rem;color:#5a7a99;padding:16px;">No capability sweep run yet for this case.</div>';
      return;
    }
    var wrapper = pkgOrWrapper.decisionPackage ? pkgOrWrapper : { decisionPackage: pkgOrWrapper, capturedAt: pkgOrWrapper.generatedAt };
    var pkg = wrapper.decisionPackage;
    if (!pkg || !pkg.phases) {
      el.innerHTML = '<div style="font-family:monospace;font-size:.7rem;color:#5a7a99;padding:16px;">Capability sweep response was empty or malformed.</div>';
      return;
    }

    var rows = PHASE_ORDER.map(function (key) {
      var meta = PHASE_META[key];
      var phase = pkg.phases[key];
      var errMsg = phaseHasError(pkg, key);
      var statusLabel, statusColor, body;

      if (!phase) {
        statusLabel = 'NOT TOUCHED'; statusColor = '#5a7a99';
        body = '<span style="color:#5a7a99;">This phase was not part of the sweep response.</span>';
      } else if (errMsg && !phase.record && !phase.currentHealth && !phase.currentSnapshot) {
        statusLabel = 'UNAVAILABLE'; statusColor = '#ef4444';
        body = '<span style="color:#ef4444;">' + escapeHtml(errMsg) + '</span>';
      } else if (phase.contextOnly) {
        statusLabel = 'CONTEXT ONLY'; statusColor = '#f5a623';
        var ctxBits = [];
        if (phase.currentHealth) ctxBits.push('current health: ' + escapeHtml(JSON.stringify(phase.currentHealth).slice(0, 160)));
        if (phase.currentSnapshot) ctxBits.push('current snapshot: ' + escapeHtml(JSON.stringify(phase.currentSnapshot).slice(0, 160)));
        if (phase.aiAnalysis) ctxBits.push(escapeHtml(String(phase.aiAnalysis).slice(0, 400)));
        body = '<div style="color:#94a3b8;">Read-only context \u2014 no case record was created for this phase.</div>' +
          (ctxBits.length ? '<div style="margin-top:6px;font-size:.68rem;color:#7a9db5;">' + ctxBits.join('<br>') + '</div>' : '');
      } else {
        statusLabel = 'RECORD CREATED'; statusColor = '#10b981';
        var summaryLine = recordSummaryLine(key, phase.record);
        var aiBlock = phase.aiAnalysis
          ? '<div style="margin-top:6px;font-size:.7rem;color:#c8e8f8;white-space:pre-wrap;">' + escapeHtml(String(phase.aiAnalysis).slice(0, 500)) + '</div>'
          : (meta.writable && ('aiAnalysis' in phase)
              ? '<div style="margin-top:6px;font-size:.65rem;color:#5a7a99;">AI analysis unavailable for this phase (no error reported, no synthesis returned).</div>'
              : '');
        body = (summaryLine ? '<div style="color:#e0eaf5;">' + escapeHtml(summaryLine) + '</div>' : '<div style="color:#5a7a99;">No record summary available.</div>') + aiBlock;
      }

      return '<div style="border:1px solid #1a3050;border-radius:6px;padding:10px 14px;margin-bottom:8px;background:#0a1520;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
        '<span style="font-family:monospace;font-size:.7rem;letter-spacing:.06em;color:#f2e8d0;">' + escapeHtml(meta.label) + '</span>' +
        '<span style="font-family:monospace;font-size:.6rem;font-weight:700;letter-spacing:.08em;color:' + statusColor + ';">' + statusLabel + '</span>' +
        '</div>' + body + '</div>';
    }).join('');

    var touched = pkg.phasesTouched != null ? pkg.phasesTouched : Object.keys(pkg.phases).length;
    var errCount = pkg.errors ? pkg.errors.length : 0;
    var header = '<div style="font-family:monospace;font-size:.62rem;color:#7a9db5;margin-bottom:10px;">' +
      'CASE ' + escapeHtml(pkg.caseId || '\u2014') + ' \u00b7 ' + escapeHtml(pkg.vertical || '') + ' \u00b7 ' +
      touched + '/10 phases touched' + (errCount ? ' \u00b7 ' + errCount + ' phase error(s)' : '') +
      (wrapper.capturedAt ? ' \u00b7 captured ' + new Date(wrapper.capturedAt).toLocaleString() : '') +
      '</div>';

    el.innerHTML = header + rows;
  }

  function renderFromStorage(vertical, el) {
    render(el, readStored(vertical));
  }

  // -- SENTINEL ENRICHMENT (new) --------------------------------------------

  function sentinelStorageKey(vertical) {
    return 'TSM_' + String(vertical || '').toUpperCase() + '_STRATEGIST_RELAY';
  }

  /**
   * enrichSentinelAnomaly(anomaly, sweepPkg) -- returns a NEW object, never
   * mutates the input. Never touches severity/exposure/confidence/rootCause/
   * recommendedAction/id/title -- those feed real risk arithmetic elsewhere.
   * Sweep-derived context goes under a separate 'sweep' namespace so it can
   * never collide with or be mistaken for a risk field.
   */
  function enrichSentinelAnomaly(anomaly, sweepPkg) {
    if (!anomaly || !sweepPkg) return anomaly;
    var out = {};
    for (var k in anomaly) { if (Object.prototype.hasOwnProperty.call(anomaly, k)) out[k] = anomaly[k]; }
    var touched = sweepPkg.phasesTouched != null
      ? sweepPkg.phasesTouched
      : (sweepPkg.phases ? Object.keys(sweepPkg.phases).length : null);
    out.sweep = {
      caseId: sweepPkg.caseId || null,
      phasesTouched: touched,
      phaseNames: sweepPkg.phases ? Object.keys(sweepPkg.phases) : [],
      errorCount: sweepPkg.errors ? sweepPkg.errors.length : 0,
      capturedAt: new Date().toISOString()
    };
    return out;
  }

  /**
   * autoEnrichSentinel(vertical) -- reads the vertical's existing Sentinel
   * relay entry (TSM_<VERTICAL>_STRATEGIST_RELAY) and its capability sweep
   * entry (TSM_<VERTICAL>_CAPABILITY_SWEEP). If BOTH exist, enriches every
   * anomaly in relay.anomalies with sweep context and writes back to the
   * SAME relay key. Never creates the relay key if it's missing -- this
   * augments an existing push, it does not stand one up.
   *
   * Returns the updated relay object, or null on any no-op/failure path.
   */
  function autoEnrichSentinel(vertical) {
    if (!vertical) return null;
    var relayKey = sentinelStorageKey(vertical);
    var relay;
    try {
      var relayRaw = localStorage.getItem(relayKey);
      relay = relayRaw ? JSON.parse(relayRaw) : null;
    } catch (e) {
      console.warn('[TSMCapabilitySweep] Sentinel relay read failed for ' + vertical + ':', e);
      return null;
    }
    if (!relay || !Array.isArray(relay.anomalies) || !relay.anomalies.length) return null;

    var sweepWrapper = readStored(vertical);
    var sweepPkg = sweepWrapper && sweepWrapper.decisionPackage;
    if (!sweepPkg) return null;

    relay.anomalies = relay.anomalies.map(function (a) { return enrichSentinelAnomaly(a, sweepPkg); });

    try {
      localStorage.setItem(relayKey, JSON.stringify(relay));
    } catch (e) {
      console.warn('[TSMCapabilitySweep] Sentinel relay write failed for ' + vertical + ':', e);
      return null;
    }
    return relay;
  }

  global.TSMCapabilitySweep = {
    fire: fire,
    render: render,
    renderFromStorage: renderFromStorage,
    readStored: readStored,
    enrichSentinelAnomaly: enrichSentinelAnomaly,
    autoEnrichSentinel: autoEnrichSentinel
  };
})(window);
