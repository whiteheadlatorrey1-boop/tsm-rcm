/**
 * TSM Construction Exec Portal Bridge v1.0
 * Makes the Executive Portal render-only — pulls all data from TSMMission/TSMState.
 * Zero compute in the exec portal. Data flows in, portal only renders.
 *
 * Load at the END of construction-exec-portal.html, after all existing scripts.
 *
 * What this does:
 *  1. Reads mission from TSMState on load
 *  2. Populates all KPI cards, action items, financial exposure, confidence
 *  3. Wires Approve/Reject buttons to TSMMission lifecycle + bus events
 *  4. Keeps existing localStorage relay reads as fallback
 *
 * Dependencies: tsm-event-bus.js · tsm-state.js · tsm-mission-engine.js
 */

(function (global) {
  'use strict';

  // ── Data source: mission → exec view model ────────────────────────────────

  function buildViewModel() {
    // Primary: TSMState mission
    const mission  = global.TSMState?.get('mission');
    const strat    = global.TSMState?.get('strategist');

    // Fallback: existing localStorage relay
    const relayRaw = (() => {
      try {
        return JSON.parse(
          sessionStorage.getItem('TSM_CONSTRUCTION_STRATEGIST_RELAY') ||
          localStorage.getItem('tsm_construction_strategist_output') || '{}'
        );
      } catch (_) { return {}; }
    })();

    const warRaw = (() => {
      try {
        return JSON.parse(localStorage.getItem('TSM_RELAY_PAYLOAD') || '{}');
      } catch (_) { return {}; }
    })();

    const vm = {
      missionId:   mission?.id        || null,
      sector:      'construction',
      docType:     mission?.source    || relayRaw.docType    || 'Document',
      priority:    mission?.priority  || 'medium',
      confidence:  mission?.confidence ?? relayRaw.confidence ?? null,
      exposure:    mission?.exposure  || _parseDollar(relayRaw.snapshot?.exposure) || null,
      riskScore:   mission?.meta?.riskScore || relayRaw.snapshot?.risk || null,
      project:     mission?.meta?.project   || null,
      parties:     mission?.owner           || null,
      deadlines:   mission?.meta?.deadlines || [],

      // Findings → KPI source
      findings:    mission?.findings   || [],
      risks:       mission?.risks      || [],

      // Actions from strategist (preferred) or mission
      actions:     strat?.actions?.length  ? strat.actions
                 : mission?.actions?.length ? mission.actions
                 : _parseActionsFromRelay(relayRaw.summary || ''),

      // Executive summary
      summary:     strat?.executiveSummary
                || _parseSummaryFromRelay(relayRaw.summary || ''),

      // Evidence
      evidence:    mission?.evidence   || [],

      // Explainability
      xp:          mission?.explainability || null,

      // Timestamps
      createdAt:   mission?.createdAt  || relayRaw.timestamp || null,
      readyAt:     strat?.readyAt      || null,
    };

    return vm;
  }

  // ── Render functions ──────────────────────────────────────────────────────

  function render(vm) {
    if (!vm.missionId && !vm.summary) {
      _renderNoData();
      return;
    }
    _renderHeader(vm);
    _renderKPIs(vm);
    _renderSummary(vm);
    _renderActions(vm);
    _renderFinancial(vm);
    _renderEvidence(vm);
    _renderXP(vm);
    _renderApprovalButtons(vm);
    _markChainReady();
    console.info('[Exec Bridge] Rendered mission:', vm.missionId);
  }

  function _renderHeader(vm) {
    _setText('execDocType',  vm.docType);
    _setText('execSector',   'CONSTRUCTION');
    _setText('execPriority', (vm.priority || '').toUpperCase());
    _setText('execMissionId', vm.missionId ? vm.missionId.slice(0, 16) : '—');
    _setText('execProject',  vm.project || '—');
    _setText('execParties',  vm.parties || '—');

    // Priority badge color
    const badge = document.getElementById('execPriority') || document.querySelector('.priority-badge, .exec-priority, [data-field="priority"]');
    if (badge) {
      const colors = { critical: '#ff3b3b', high: '#ff9500', medium: '#ffd700', low: '#00ff50' };
      badge.style.color = colors[vm.priority] || '#c8d8c8';
    }
  }

  function _renderKPIs(vm) {
    // Confidence
    const conf = vm.confidence;
    if (conf != null) {
      _setText('kpiConfidence', conf + '%');
      _setText('execConfidence', conf + '%');
      const bar = document.getElementById('confBar') || document.getElementById('kpiConfBar');
      if (bar) bar.style.width = conf + '%';
    }

    // Exposure
    if (vm.exposure) {
      const expFmt = '$' + Number(vm.exposure).toLocaleString();
      _setText('kpiExposure', expFmt);
      _setText('smExp', expFmt);
      _setText('execExposure', expFmt);
    }

    // Risk score
    if (vm.riskScore) {
      _setText('riskScore', vm.riskScore);
      _setText('kpiRisk', vm.riskScore);
    }

    // Findings count
    _setText('kpiFindings', vm.findings.length || '—');

    // Actions count
    _setText('kpiActions', vm.actions.length || '—');

    // Priority
    _setText('kpiPriority', (vm.priority || '—').toUpperCase());

    // KPI progress bars (fill based on risk)
    const risk = Number(vm.riskScore) || 0;
    document.querySelectorAll('.kpi-bar-inner').forEach((bar, i) => {
      const widths = [risk, conf || 0, Math.min(100, vm.findings.length * 10), vm.actions.length * 20, 75];
      bar.style.width = (widths[i] || 50) + '%';
    });
  }

  function _renderSummary(vm) {
    if (!vm.summary) return;
    const els = [
      document.getElementById('bncaSummary'),
      document.getElementById('execSummary'),
      document.getElementById('strategistBrief'),
      document.querySelector('.exec-brief, .bnca-output, [data-field="summary"]'),
    ].filter(Boolean);
    els.forEach(el => { el.textContent = vm.summary; });
  }

  function _renderActions(vm) {
    if (!vm.actions.length) return;

    // Look for an actions container
    const container = document.getElementById('execActions')
      || document.getElementById('actionsList')
      || document.querySelector('.actions-list, .priority-actions, [data-field="actions"]');

    if (!container) return;

    container.innerHTML = vm.actions.map((a, i) => `
      <div class="exec-action-row" style="
        padding:10px 14px;border-bottom:1px solid rgba(0,255,80,.08);
        display:flex;align-items:flex-start;gap:12px;
      ">
        <span style="color:#ffd700;font-size:10px;min-width:16px;font-weight:700;">${i + 1}.</span>
        <div style="flex:1">
          <div style="font-size:11px;color:#c8d8c8;margin-bottom:4px;">${a.title || a.text || ''}</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${a.exposure ? `<span style="font-size:9px;color:#ff9500;">$${Number(a.exposure).toLocaleString()}</span>` : ''}
            ${a.owner    ? `<span style="font-size:9px;color:#00e5ff;">${a.owner}</span>` : ''}
            ${a.deadline ? `<span style="font-size:9px;color:#c084fc;">${a.deadline}</span>` : ''}
          </div>
        </div>
        <span style="font-size:8px;padding:2px 7px;border:1px solid;${
          a.priority === 'critical' ? 'color:#ff3b3b;border-color:#ff3b3b' :
          a.priority === 'high'     ? 'color:#ff9500;border-color:#ff9500' :
                                      'color:#5a7a5a;border-color:rgba(0,255,80,.15)'
        }">${(a.priority || 'HIGH').toUpperCase()}</span>
      </div>
    `).join('');
  }

  function _renderFinancial(vm) {
    if (!vm.exposure) return;
    _setText('financialExposure',    '$' + Number(vm.exposure).toLocaleString());
    _setText('execFinancialExposure','$' + Number(vm.exposure).toLocaleString());

    // Deadlines
    if (vm.deadlines.length) {
      const dlEl = document.getElementById('execDeadlines') || document.querySelector('[data-field="deadlines"]');
      if (dlEl) {
        dlEl.innerHTML = vm.deadlines
          .filter(Boolean)
          .map(d => `<div style="font-size:10px;color:#ff9500;padding:4px 0;border-bottom:1px solid rgba(255,149,0,.1);">${d}</div>`)
          .join('');
      }
    }
  }

  function _renderEvidence(vm) {
    if (!vm.evidence.length) return;
    const container = document.getElementById('execEvidence') || document.querySelector('[data-field="evidence"]');
    if (!container) return;
    container.innerHTML = vm.evidence.map(e => `
      <div style="font-size:9px;color:#5a7a5a;padding:3px 0;">
        <span style="color:#00e5ff;">[${(e.type || 'DOC').toUpperCase()}]</span>
        ${e.ref || ''} ${e.summary ? '— ' + e.summary : ''}
      </div>
    `).join('');
  }

  function _renderXP(vm) {
    if (!vm.xp) return;
    const xp = vm.xp;

    // Confidence
    const confNum = document.getElementById('conXPConfNum') || document.getElementById('xpConfNum');
    const confBar = document.getElementById('conXPConfBar') || document.getElementById('xpConfBar');
    if (confNum) confNum.textContent = (xp.confidence || vm.confidence || '—') + '%';
    if (confBar) setTimeout(() => { confBar.style.width = (xp.confidence || vm.confidence || 0) + '%'; }, 200);

    // Reasoning
    const reasoning = document.getElementById('conXPReasoning') || document.getElementById('xpReasoning');
    if (reasoning && xp.reasoning?.length) {
      reasoning.innerHTML = xp.reasoning.map(r =>
        `<div style="font-size:9px;color:#c8d8c8;padding:2px 0;border-bottom:1px solid rgba(0,255,80,.06);">${r}</div>`
      ).join('');
    }

    // Recommended action
    if (xp.recommendedAction) {
      _setText('xpRecommendedAction', xp.recommendedAction);
      _setText('conXPRecommended', xp.recommendedAction);
    }

    // Governance
    if (xp.governance?.approvalRequired) {
      const govEl = document.getElementById('xpGovernance') || document.getElementById('conXPGov');
      if (govEl) {
        govEl.textContent = xp.governance.policy || 'Executive approval required';
        govEl.style.color = '#ff9500';
      }
    }
  }

  function _renderApprovalButtons(vm) {
    if (!vm.missionId) return;

    // Find or create approval button row
    let btnRow = document.getElementById('execApprovalRow');
    if (!btnRow) {
      btnRow = document.createElement('div');
      btnRow.id = 'execApprovalRow';
      btnRow.style.cssText = `
        position:fixed;bottom:32px;right:24px;display:flex;gap:8px;z-index:200;
      `;
      document.body.appendChild(btnRow);
    }

    btnRow.innerHTML = `
      <button id="execApproveBtn" style="
        background:#00ff50;border:1px solid #00ff50;color:#000;
        font-family:'Courier New',monospace;font-size:9px;font-weight:700;
        letter-spacing:1.5px;padding:8px 18px;cursor:pointer;
      ">✓ APPROVE → EXECUTE</button>
      <button id="execRejectBtn" style="
        background:transparent;border:1px solid #ff3b3b;color:#ff3b3b;
        font-family:'Courier New',monospace;font-size:9px;
        letter-spacing:1.5px;padding:8px 18px;cursor:pointer;
      ">✕ REJECT</button>
    `;

    document.getElementById('execApproveBtn').onclick = () => _handleApprove(vm);
    document.getElementById('execRejectBtn').onclick  = () => _handleReject(vm);
  }

  function _handleApprove(vm) {
    if (!global.TSMMission || !vm.missionId) return;

    global.TSMMission.update(vm.missionId, { status: 'executing' });
    global.TSMMission.addTimeline(vm.missionId, {
      event: 'executive_approved',
      actor: 'executive',
    });

    // Update state slice
    if (global.TSMState) {
      global.TSMState.update('executive', {
        sector:     'construction',
        approved:   true,
        reviewedAt: Date.now(),
      });
    }

    if (global.TSMBus) {
      global.TSMBus.emit('EXECUTIVE_APPROVED', {
        missionId: vm.missionId,
        sector: 'construction',
      });
    }

    // Legacy: mark confirmed for chain status bar
    localStorage.setItem('TSM_EXEC_CONFIRMED', JSON.stringify({ ts: Date.now(), missionId: vm.missionId }));

    const btn = document.getElementById('execApproveBtn');
    if (btn) {
      btn.textContent = '✓ APPROVED';
      btn.style.background = '#00cc40';
      btn.disabled = true;
    }

    console.info('[Exec Bridge] Mission approved:', vm.missionId);
  }

  function _handleReject(vm) {
    const reason = prompt('Rejection reason (optional):') || 'Rejected by executive';
    if (!global.TSMMission || !vm.missionId) return;

    global.TSMMission.update(vm.missionId, { status: 'created' }); // send back
    global.TSMMission.addTimeline(vm.missionId, {
      event: 'executive_rejected',
      actor: 'executive',
      data:  { reason },
    });

    if (global.TSMState) {
      global.TSMState.update('executive', {
        sector:         'construction',
        approved:       false,
        rejectedReason: reason,
        reviewedAt:     Date.now(),
      });
    }

    if (global.TSMBus) {
      global.TSMBus.emit('EXECUTIVE_REJECTED', {
        missionId: vm.missionId,
        sector: 'construction',
        reason,
      });
    }

    const btn = document.getElementById('execRejectBtn');
    if (btn) { btn.textContent = '✕ REJECTED'; btn.disabled = true; }
  }

  function _renderNoData() {
    const msgs = [
      document.getElementById('execSummary'),
      document.getElementById('bncaSummary'),
      document.querySelector('.exec-brief'),
    ].filter(Boolean);
    msgs.forEach(el => {
      if (!el.textContent || el.textContent.length < 10) {
        el.textContent = 'No mission data. Run the War Room and Strategist first.';
        el.style.color = '#5a7a5a';
      }
    });
  }

  function _markChainReady() {
    // Update TSM chain status bar if present
    const chainStatus = document.getElementById('tsm-chain-status');
    if (chainStatus) chainStatus.textContent = 'Executive Portal loaded — mission data ready';

    // Mark strategist confirmed in chain (it arrived here, so strategist ran)
    localStorage.setItem('TSM_STRAT_CONFIRMED', JSON.stringify({ ts: Date.now() }));
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  function _setText(id, text) {
    const el = document.getElementById(id) || document.querySelector(`[data-field="${id}"]`);
    if (el && text != null) el.textContent = String(text);
  }

  function _parseDollar(str) {
    if (!str) return null;
    const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  }

  function _parseActionsFromRelay(text) {
    if (!text) return [];
    const block = text.match(/CONTROLLER PRIORITY ACTIONS[^:]*:([\s\S]+?)(?=APP ROUTING|BNCA|$)/i);
    if (!block) return [];
    return block[1].split('\n')
      .filter(l => /^\d+\./.test(l.trim()))
      .map(l => {
        const clean = l.replace(/^\d+\.\s*/, '').trim();
        const parts = clean.split('—').map(s => s.trim());
        return { title: parts[0], priority: 'high', owner: parts[2] || null, deadline: parts[3] || null };
      });
  }

  function _parseSummaryFromRelay(text) {
    if (!text) return null;
    const m = text.match(/BNCA[^:]*:\s*([\s\S]+?)(?=ESCALATION|$)/i);
    return m ? m[1].trim().slice(0, 600) : text.slice(0, 600);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    const vm = buildViewModel();
    render(vm);

    // Listen for late-arriving mission data (e.g. if strategist fires while portal is open)
    if (global.TSMBus) {
      global.TSMBus.on('STRATEGIST_PLAN_READY', function (payload) {
        if (payload.sector !== 'construction') return;
        setTimeout(() => render(buildViewModel()), 100);
      });

      global.TSMBus.on('MISSION_UPDATED', function (payload) {
        if (payload.mission?.sector !== 'construction') return;
        // Silently re-render KPIs only on mission updates
        const vm2 = buildViewModel();
        _renderKPIs(vm2);
        _renderXP(vm2);
      });
    }

    console.info('[Exec Bridge] v1.0 initialized. Mission:', vm.missionId || 'none');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }

})(window);