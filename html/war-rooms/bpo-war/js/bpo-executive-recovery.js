// ============================================================
// TSM BPO EXECUTIVE RECOVERY PACKAGE
// Collects the complete Strategist decision chain:
// situation -> extraction -> scenarios -> strategy -> SLA ->
// client impact -> escalations -> mission -> evidence ->
// recommendation -> quality -> executive recovery plan.
// ============================================================

(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/[&<>\"']/g, function (c) {
        return ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[c];
      });
  }

  function money(value) {
    if (value == null) return null;

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const s = String(value).replace(/[$,\s]/g, '');
    const n = Number(s.replace(/[^\d.-]/g, ''));

    return Number.isFinite(n) ? n : null;
  }

  function collectScenario() {
    try {
      if (typeof SCENARIO_DEFAULTS === 'undefined') return null;

      const scenario =
        SCENARIO_DEFAULTS.find(function (s) {
          return s.id === selectedScenario;
        }) ||
        SCENARIO_DEFAULTS.find(function (s) {
          return s.recommended;
        });

      return scenario || null;
    } catch (_) {
      return null;
    }
  }

  function collectMission() {
    try {
      if (!window.tsmMission) return null;

      return {
        id: window.tsmMission.id || null,
        stage: window.tsmMission.stage || null,
        status: window.tsmMission.status || null,
        audit: Array.isArray(window.tsmMission.audit)
          ? window.tsmMission.audit
          : []
      };
    } catch (_) {
      return null;
    }
  }

  function collectStrategy() {
    return {
      brief: typeof stratBrief !== 'undefined' ? stratBrief : '',
      recommendation:
        typeof generatedRec !== 'undefined'
          ? generatedRec
          : null,
      scenario:
        typeof selectedScenario !== 'undefined'
          ? selectedScenario
          : null,
      selectedScenarioData: collectScenario(),
      quality:
        typeof lastQualityScore !== 'undefined'
          ? lastQualityScore
          : null,
      agentFindings:
        typeof lastTaggedItems !== 'undefined'
          ? lastTaggedItems
          : []
    };
  }

  function collectSituation() {
    return typeof warData !== 'undefined' && warData
      ? warData
      : null;
  }

  function collectTabData(serverData) {
    const strategy = collectStrategy();
    const situation = collectSituation();
    const rec = strategy.recommendation || {};

    return {
      STRATEGY_BRIEF: {
        executiveSummary: strategy.brief || null,
        recommendedActions: rec.recommendedActions || [],
        confidence: rec.confidence ?? null
      },

      SLA_REPORT: {
        events: serverData.slaEvents || [],
        avgOpenAgeHours: serverData.rollup?.avgOpenAgeHours ?? null
      },

      CLIENT_IMPACT: {
        scenario: strategy.selectedScenarioData,
        extraction: situation?.extraction || null,
        exposure: situation?.extraction?.revenueAtRisk || null
      },

      ESCALATIONS: {
        triggers: rec.escalationTriggers || [],
        riskLevel: situation?.riskLevel || null,
        risk: situation?.extraction?.severity || null
      },

      MISSION_TIMELINE: collectMission(),

      BNCA_ANALYSIS: serverData.bncaReports || [],

      NOTES: serverData.notes || [],

      WORK_ITEM: serverData.workItem || null
    };
  }

  function buildExecutiveText(pkg) {
    const situation = pkg.situation || {};
    const strategy = pkg.strategy || {};
    const rec = strategy.recommendation || {};
    const scenario = strategy.selectedScenarioData || {};
    const exposure =
      situation?.extraction?.revenueAtRisk ||
      pkg.recovery?.revenueExposure ||
      'Not quantified';

    const actions = rec.recommendedActions || [];
    const triggers = rec.escalationTriggers || [];

    const lines = [];

    lines.push('TSM SHELL · BPO EXECUTIVE RECOVERY PACKAGE');
    lines.push('============================================================');
    lines.push('Generated: ' + new Date().toLocaleString());
    lines.push('Case: ' + (pkg.caseId || '—'));
    lines.push('Client: ' + (pkg.clientId || '—'));
    lines.push('Sector: ' + (situation.selectedSector || 'BPO'));
    lines.push('');

    lines.push('EXECUTIVE SUMMARY');
    lines.push('------------------------------------------------------------');
    lines.push(
      strategy.brief ||
      'Executive summary not available. Review the underlying decision evidence.'
    );
    lines.push('');

    lines.push('REVENUE EXPOSURE');
    lines.push('------------------------------------------------------------');
    lines.push('Revenue at risk: ' + exposure);

    if (scenario.outcomes) {
      lines.push(
        'Scenario: ' +
        (scenario.name || strategy.scenario || 'Selected scenario')
      );
      lines.push(
        'Scenario-reported revenue loss: ' +
        (scenario.outcomes.revLoss || 'Not stated')
      );
      lines.push(
        'Scenario-reported recovery: ' +
        (scenario.outcomes.recovery || 'Not stated')
      );
      lines.push(
        'Client risk: ' +
        (scenario.outcomes.clientRisk || 'Not stated')
      );
      lines.push(
        'SLA outcome: ' +
        (scenario.outcomes.sla || 'Not stated')
      );
    }

    lines.push('');

    lines.push('RECOVERY ACTION PLAN');
    lines.push('------------------------------------------------------------');

    actions.forEach(function (action, i) {
      lines.push(
        String(i + 1).padStart(2, '0') +
        '. ' +
        (action.text || 'Action not specified') +
        ' — OWNER: ' +
        (action.owner || 'Unassigned')
      );
    });

    if (!actions.length) {
      lines.push('No recovery actions recorded.');
    }

    lines.push('');

    lines.push('ESCALATION TRIGGERS');
    lines.push('------------------------------------------------------------');

    triggers.forEach(function (trigger) {
      lines.push('⚡ ' + trigger);
    });

    if (!triggers.length) {
      lines.push('No escalation triggers recorded.');
    }

    lines.push('');

    lines.push('EVIDENCE CHAIN');
    lines.push('------------------------------------------------------------');
    lines.push(
      'BNCA reports: ' +
      ((pkg.bncaReports || []).length)
    );
    lines.push(
      'SLA events: ' +
      ((pkg.slaEvents || []).length)
    );
    lines.push(
      'Operational notes: ' +
      ((pkg.notes || []).length)
    );
    lines.push(
      'Mission events: ' +
      ((pkg.tabs?.MISSION_TIMELINE?.audit || []).length)
    );

    lines.push('');

    lines.push('QUALITY / CONFIDENCE');
    lines.push('------------------------------------------------------------');

    if (strategy.quality) {
      lines.push(
        'Overall: ' +
        (strategy.quality.overall ?? '—') +
        '%'
      );
      lines.push(
        'Accuracy: ' +
        (strategy.quality.accuracy ?? '—') +
        '%'
      );
      lines.push(
        'Completeness: ' +
        (strategy.quality.completeness ?? '—') +
        '%'
      );
      lines.push(
        'Compliance: ' +
        (strategy.quality.compliance ?? '—') +
        '%'
      );
    }

    lines.push(
      'AI confidence: ' +
      (rec.confidenceDefaulted
        ? 'Not scored'
        : ((rec.confidence ?? '—') + '%'))
    );

    lines.push('');

    lines.push('EXECUTIVE DECISION');
    lines.push('------------------------------------------------------------');
    lines.push(
      'The Executive Portal should use this package to approve, reject, '
      + 'modify, or escalate the recommended recovery actions.'
    );

    return lines.join('\n');
  }

  async function fetchJSON(url, options) {
    const response = await fetch(url, Object.assign({
      credentials: 'same-origin'
    }, options || {}));

    const data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(
        data.error ||
        ('Request failed: HTTP ' + response.status)
      );
    }

    return data;
  }

  async function buildExecutiveRecoveryPackage() {
    if (typeof warData === 'undefined' || !warData?.caseId) {
      alert('No BPO caseId is loaded. Relay a case into the Strategist first.');
      return null;
    }

    const caseId = warData.caseId;

    const button = document.getElementById('bpoExecutiveRecoveryBtn');

    if (button) {
      button.disabled = true;
      button.textContent = '⟳ BUILDING RECOVERY PACKAGE...';
    }

    try {
      const results = await Promise.all([
        fetchJSON(
          '/api/bpo/work-items/' +
          encodeURIComponent(caseId)
        ),

        fetchJSON(
          '/api/bpo/work-items/' +
          encodeURIComponent(caseId) +
          '/bnca-reports'
        ),

        fetchJSON(
          '/api/bpo/work-items/' +
          encodeURIComponent(caseId) +
          '/notes'
        ),

        fetchJSON(
          '/api/bpo/work-items/' +
          encodeURIComponent(caseId) +
          '/sla-events'
        )
      ]);

      const serverData = {
        workItem: results[0].workItem || null,
        bncaReports: results[1].bncaReports || [],
        notes: results[2].notes || [],
        slaEvents: results[3].slaEvents || [],
        rollup: {}
      };

      const tabs = collectTabData(serverData);

      const pkg = {
        packageType: 'BPO_EXECUTIVE_RECOVERY',
        packageVersion: '1.0',
        generatedAt: new Date().toISOString(),

        caseId: caseId,

        clientId:
          serverData.workItem?.clientId ||
          warData.clientId ||
          null,

        situation: collectSituation(),

        strategy: collectStrategy(),

        tabs: tabs,

        workItem: serverData.workItem,

        bncaReports: serverData.bncaReports,

        notes: serverData.notes,

        slaEvents: serverData.slaEvents,

        recovery: {
          revenueExposure:
            warData?.extraction?.revenueAtRisk || null,

          recommendedActions:
            generatedRec?.recommendedActions || [],

          escalationTriggers:
            generatedRec?.escalationTriggers || [],

          confidence:
            generatedRec?.confidenceDefaulted
              ? null
              : (generatedRec?.confidence ?? null)
        }
      };

      pkg.executiveText = buildExecutiveText(pkg);

      const saved = await fetchJSON(
        '/api/bpo/work-items/' +
        encodeURIComponent(caseId) +
        '/executive-recovery',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pkg)
        }
      );

      const finalPackage =
        saved.executiveRecoveryPackage || pkg;

      window.TSM_BPO_EXECUTIVE_RECOVERY = finalPackage;

      if (button) {
        button.disabled = false;
        button.textContent = '✓ RECOVERY PACKAGE READY';
      }

      renderExecutiveRecoveryPanel(finalPackage);

      if (window.TSMMemory) {
        TSMMemory.timeline(
          'Executive Recovery Package built for ' + caseId
        );
      }

      return finalPackage;

    } catch (error) {
      console.error(
        '[TSM BPO Executive Recovery]',
        error
      );

      if (button) {
        button.disabled = false;
        button.textContent = '⚠ BUILD RECOVERY PACKAGE';
      }

      alert(
        'Executive Recovery Package failed: ' +
        error.message
      );

      return null;
    }
  }

  function downloadExecutiveRecoveryPackage() {
    const pkg =
      window.TSM_BPO_EXECUTIVE_RECOVERY;

    if (!pkg) {
      alert('Build the Executive Recovery Package first.');
      return;
    }

    const blob = new Blob(
      [JSON.stringify(pkg, null, 2)],
      { type: 'application/json' }
    );

    const a = document.createElement('a');

    a.href = URL.createObjectURL(blob);

    a.download =
      'tsm-bpo-executive-recovery-' +
      (pkg.caseId || Date.now()) +
      '.json';

    a.click();

    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
  }

  function downloadExecutiveText() {
    const pkg =
      window.TSM_BPO_EXECUTIVE_RECOVERY;

    if (!pkg?.executiveText) {
      alert('Build the Executive Recovery Package first.');
      return;
    }

    const blob = new Blob(
      [pkg.executiveText],
      { type: 'text/plain;charset=utf-8' }
    );

    const a = document.createElement('a');

    a.href = URL.createObjectURL(blob);

    a.download =
      'tsm-bpo-executive-recovery-' +
      (pkg.caseId || Date.now()) +
      '.txt';

    a.click();

    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
  }

  function renderExecutiveRecoveryPanel(pkg) {
    let panel =
      document.getElementById('bpoExecutiveRecoveryPanel');

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'bpoExecutiveRecoveryPanel';

      panel.style.cssText =
        'position:fixed;right:18px;bottom:70px;z-index:9998;' +
        'width:min(560px,calc(100vw - 36px));max-height:70vh;' +
        'overflow:auto;background:#071019;' +
        'border:1px solid rgba(0,212,212,.5);' +
        'box-shadow:0 0 30px rgba(0,0,0,.65);' +
        'padding:18px;color:#dce7ef;' +
        'font-family:JetBrains Mono,monospace;';

      document.body.appendChild(panel);
    }

    const strategy = pkg.strategy || {};
    const rec = strategy.recommendation || {};
    const scenario = strategy.selectedScenarioData || {};

    panel.innerHTML =
      '<div style="color:#00d4d4;font-weight:700;letter-spacing:1px;margin-bottom:10px">' +
      '◈ EXECUTIVE RECOVERY PACKAGE' +
      '</div>' +

      '<div style="font-size:11px;color:#94a3b8;margin-bottom:12px">' +
      'CASE: ' + esc(pkg.caseId || '—') +
      ' · CONFIDENCE: ' +
      esc(rec.confidence ?? '—') +
      '%' +
      '</div>' +

      '<div style="border-top:1px solid #1e293b;padding-top:10px;margin-top:10px">' +
      '<div style="color:#f5a623;font-weight:700">REVENUE EXPOSURE</div>' +
      '<div style="font-size:20px;margin-top:4px">' +
      esc(pkg.recovery?.revenueExposure || 'Not quantified') +
      '</div>' +
      '</div>' +

      '<div style="border-top:1px solid #1e293b;padding-top:10px;margin-top:12px">' +
      '<div style="color:#22c55e;font-weight:700">RECOVERY STRATEGY</div>' +
      '<div style="margin-top:6px;line-height:1.5">' +
      esc(scenario.name || 'Selected strategy') +
      '</div>' +
      '</div>' +

      '<div style="border-top:1px solid #1e293b;padding-top:10px;margin-top:12px">' +
      '<div style="color:#a855f7;font-weight:700">DATA ESCALATED</div>' +
      '<div style="margin-top:6px;line-height:1.6">' +
      'BNCA reports: ' + (pkg.bncaReports || []).length +
      '<br>SLA events: ' + (pkg.slaEvents || []).length +
      '<br>Notes: ' + (pkg.notes || []).length +
      '<br>Mission events: ' +
      ((pkg.tabs?.MISSION_TIMELINE?.audit || []).length) +
      '</div>' +
      '</div>' +

      '<div style="border-top:1px solid #1e293b;padding-top:10px;margin-top:12px">' +
      '<div style="color:#f5a623;font-weight:700">RECOMMENDED ACTIONS</div>' +
      '<div style="margin-top:6px;line-height:1.6">' +
      (rec.recommendedActions || []).map(function (a, i) {
        return (
          (i + 1) + '. ' +
          esc(a.text) +
          ' → ' +
          esc(a.owner)
        );
      }).join('<br>') +
      '</div>' +
      '</div>' +

      '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">' +
      '<button onclick="window.TSMBPOExecutiveRecovery.downloadJSON()" ' +
      'style="padding:7px 12px;background:transparent;border:1px solid #334155;color:#00d4d4;cursor:pointer">' +
      'EXPORT JSON</button>' +

      '<button onclick="window.TSMBPOExecutiveRecovery.downloadText()" ' +
      'style="padding:7px 12px;background:transparent;border:1px solid #334155;color:#f5a623;cursor:pointer">' +
      'EXPORT EXECUTIVE REPORT</button>' +

      '<button onclick="document.getElementById(\'bpoExecutiveRecoveryPanel\').remove()" ' +
      'style="padding:7px 12px;background:transparent;border:1px solid #334155;color:#94a3b8;cursor:pointer">' +
      'CLOSE</button>' +
      '</div>';
  }

  window.TSMBPOExecutiveRecovery = {
    build: buildExecutiveRecoveryPackage,
    downloadJSON: downloadExecutiveRecoveryPackage,
    downloadText: downloadExecutiveText
  };

  window.buildExecutiveRecoveryPackage =
    buildExecutiveRecoveryPackage;

})();
