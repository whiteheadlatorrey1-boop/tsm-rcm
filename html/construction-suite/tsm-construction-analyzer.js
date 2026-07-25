/**
 * TSM Construction Sector Analyzer v1.0
 * Sector plugin — bridges the existing 6-engine War Room to the Mission Engine.
 *
 * What this does:
 *  1. Intercepts the existing fireEngines() completion
 *  2. Creates a typed Mission via TSMMission.create()
 *  3. Parses all 6 engine outputs into structured findings/risks/actions
 *  4. Calls TSMMission.publishAnalysis() → auto-fires WARROOM_FINDINGS_READY + STRATEGIST_READY
 *  5. Writes mission id back to localStorage relay so existing Strategist page still works
 *
 * Drop-in — does NOT modify construction-war-room.html.
 * Load AFTER tsm-event-bus.js, tsm-state.js, tsm-mission-engine.js, and the war room inline scripts.
 *
 * Dependencies: tsm-event-bus.js · tsm-state.js · tsm-mission-engine.js
 */

(function (global) {
  'use strict';

  const SECTOR = 'construction';

  // ── Parser helpers ────────────────────────────────────────────────────────

  /**
   * Extract a keyed value from engine output text.
   * e.g. extract('RISK SCORE', text) → '72'
   */
  function extract(key, text) {
    if (!text) return null;
    const re = new RegExp(key + '[:\\s]+([^\\n]+)', 'i');
    const m = text.match(re);
    return m ? m[1].trim() : null;
  }

  function extractNum(key, text) {
    const val = extract(key, text);
    if (!val) return null;
    const n = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  }

  /** Parse dollar string like "$28,000–$42,000" → midpoint number */
  function parseDollar(str) {
    if (!str) return null;
    const nums = str.replace(/[^0-9.,\-–]/g, ' ')
      .trim().split(/[\-–]/)
      .map(s => parseFloat(s.replace(/,/g, '')))
      .filter(n => !isNaN(n));
    if (nums.length === 0) return null;
    if (nums.length === 1) return nums[0];
    return Math.round((nums[0] + nums[1]) / 2);
  }

  /** Determine priority from risk level text */
  function riskToPriority(text) {
    if (!text) return 'medium';
    const t = text.toLowerCase();
    if (t.includes('critical')) return 'critical';
    if (t.includes('high'))     return 'high';
    if (t.includes('low'))      return 'low';
    return 'medium';
  }

  // ── Engine output → Structured findings ──────────────────────────────────

  function parseEngine01(text) {
    if (!text) return [];
    const facts = [];
    const factBlock = text.match(/MATERIAL FACTS[:\s]*([\s\S]+?)(?=\n[A-Z]{3,}|$)/i);
    if (factBlock) {
      factBlock[1].split('\n')
        .filter(l => /^\d+\./.test(l.trim()))
        .forEach(l => {
          const clean = l.replace(/^\d+\.\s*/, '').trim();
          if (clean) facts.push({
            title:    clean,
            severity: riskToPriority(extract('RISK SCORE', text) > 70 ? 'high' : 'medium'),
            detail:   null,
          });
        });
    }
    return facts;
  }

  function parseEngine02(text) {
    if (!text) return [];
    return [
      extract('SCHEDULE IMPACT', text),
      extract('COST VARIANCE', text)   || extract('COST TO BUDGET VARIANCE', text),
      extract('LABOR RISK', text)       || extract('CREW AND LABOR RISK', text),
      extract('AP GAPS', text)          || extract('AP VERIFICATION GAPS', text),
    ].filter(Boolean).map(detail => ({
      title:    'FieldOps: ' + detail.split('—')[0].trim(),
      severity: riskToPriority(extract('FIELDOPS RISK', text) || extract('FIELDOPS RISK LEVEL', text)),
      detail,
    }));
  }

  function parseEngine03(text) {
    if (!text) return { findings: [], exposure: null };
    const exposureStr = extract('EXPOSURE', text) || extract('EXPOSURE RANGE', text);
    return {
      exposure: parseDollar(exposureStr),
      findings: [
        extract('GAAP', text)           || extract('GAAP TREATMENT', text),
        extract('CASH IMPACT', text)    || extract('CASH FLOW IMPACT', text),
        extract('RETAINAGE AT RISK', text),
        extract('COST OVERRUN', text),
      ].filter(Boolean).map(detail => ({
        title:    'Financial: ' + detail.split('—')[0].trim(),
        severity: riskToPriority(extract('FINANCIAL RISK', text) || extract('FINANCIAL RISK SCORE', text)),
        detail,
        exposure: parseDollar(detail),
      })),
    };
  }

  function parseEngine04(text) {
    if (!text) return [];
    return [
      extract('LEGAL RISK', text)       || extract('PRIMARY LEGAL RISK', text),
      extract('LIEN', text)             || extract('LIEN EXPOSURE', text),
      extract('BREACH', text)           || extract('CONTRACT BREACH RISK', text),
      extract('DEADLINE 1', text),
      extract('DEADLINE 2', text),
    ].filter(Boolean).map(detail => ({
      title:    'Legal: ' + detail.split('—')[0].trim(),
      severity: riskToPriority(extract('LEGAL RISK LEVEL', text)),
      detail,
    }));
  }

  function parseEngine05(text) {
    if (!text) return [];
    return [
      extract('OSHA', text),
      extract('DAVIS-BACON', text)      || extract('DAVIS-BACON / PREVAILING WAGE', text),
      extract('1099 RISK', text)        || extract('1099 / WORKER CLASSIFICATION', text),
      extract('PAYROLL', text)          || extract('PAYROLL COMPLIANCE', text),
      extract('PERMIT', text)           || extract('PERMIT STATUS', text),
    ].filter(Boolean).map(detail => ({
      title:    'Compliance: ' + detail.split('—')[0].trim(),
      severity: riskToPriority(extract('COMPLIANCE RISK', text) || extract('COMPLIANCE RISK LEVEL', text)),
      detail,
    }));
  }

  function parseEngine06(text) {
    if (!text) return { summary: null, actions: [], risks: [], confidence: null, riskScore: null };
    const riskScore  = extractNum('OVERALL RISK SCORE', text);
    const summary    = extract('EXECUTIVE SUMMARY', text);
    const bncaAction = (() => {
      const m = text.match(/BNCA[^:]*:[:\s]*([\s\S]+?)(?=ESCALATION TRIGGER|$)/i);
      return m ? m[1].trim() : null;
    })();
    const escalation = extract('ESCALATION TRIGGER', text);

    // Parse priority actions
    const actionsBlock = text.match(/PRIORITY ACTIONS[^:]*:([\s\S]+?)(?=APP ROUTING|BNCA|$)/i);
    const actions = [];
    if (actionsBlock) {
      actionsBlock[1].split('\n')
        .filter(l => /^\d+\./.test(l.trim()))
        .forEach(l => {
          const clean = l.replace(/^\d+\.\s*/, '').trim();
          if (!clean) return;
          const parts = clean.split('—').map(s => s.trim());
          actions.push({
            title:    parts[0] || clean,
            priority: 'high',
            owner:    parts[2] || null,
            deadline: parts[3] || null,
            exposure: parseDollar(parts[1]),
          });
        });
    }

    const risks = [];
    if (escalation) {
      risks.push({ title: 'Escalation trigger', likelihood: 'high', impact: escalation });
    }
    if (bncaAction) {
      risks.push({ title: 'BNCA 72hr action', likelihood: 'high', impact: bncaAction });
    }

    // Confidence = 100 - riskScore (inverse — high risk = lower confidence of clean resolution)
    const confidence = riskScore != null ? Math.max(0, Math.min(100, 100 - riskScore)) : 65;

    return { summary, actions, risks, confidence, riskScore };
  }

  // ── Core: package engine outputs into Mission ─────────────────────────────

  /**
   * Called after all 6 engines complete.
   * @param {string} docText      original document
   * @param {string} docType      e.g. 'Change Order'
   * @param {Object} engineOutputs { 1: '...', 2: '...', ... 6: '...' }
   * @returns {Object} mission (clone)
   */
  function packageMission(docText, docType, engineOutputs) {
    const e1 = engineOutputs[1] || '';
    const e2 = engineOutputs[2] || '';
    const e3 = engineOutputs[3] || '';
    const e4 = engineOutputs[4] || '';
    const e5 = engineOutputs[5] || '';
    const e6 = engineOutputs[6] || '';

    // Parse each engine
    const facts      = parseEngine01(e1);
    const fieldOps   = parseEngine02(e2);
    const fin        = parseEngine03(e3);
    const legal      = parseEngine04(e4);
    const compliance = parseEngine05(e5);
    const exec       = parseEngine06(e6);

    const allFindings = [
      ...facts,
      ...fieldOps,
      ...fin.findings,
      ...legal,
      ...compliance,
    ];

    // Determine priority from risk score
    const riskScore = exec.riskScore || extractNum('RISK SCORE', e1) || 60;
    const priority  = riskScore >= 80 ? 'critical'
                    : riskScore >= 60 ? 'high'
                    : riskScore >= 40 ? 'medium' : 'low';

    // Create mission
    const mission = global.TSMMission.create({
      sector:     SECTOR,
      owner:      extract('PARTIES', e1) || null,
      priority,
      exposure:   fin.exposure,
      confidence: exec.confidence,
      source:     docType,
      meta: {
        docType,
        docLength: docText ? docText.length : 0,
        riskScore,
        gaaapImpact: extract('GAAP IMPACT', e1),
        disputeStatus: extract('DISPUTE STATUS', e1),
        project: extract('PROJECT', e1),
        deadlines: [
          extract('CRITICAL DEADLINES', e1),
          extract('DEADLINE 1', e4),
          extract('DEADLINE 2', e4),
        ].filter(Boolean),
      },
    });

    // Add document evidence
    global.TSMMission.addEvidence(mission.id, {
      type:    'document',
      ref:     docType,
      summary: `${docType} — ${docText ? docText.length : 0} chars`,
    });

    // Set explainability
    global.TSMMission.setExplainability(mission.id, {
      confidence:        exec.confidence,
      recommendedAction: exec.actions[0] ? exec.actions[0].title : null,
      reasoning:         allFindings.map(f => f.title).slice(0, 8),
      governance: {
        approvalRequired: riskScore >= 70,
        policy: riskScore >= 70 ? 'High-risk: executive approval required' : null,
      },
    });

    // Publish full analysis → fires WARROOM_FINDINGS_READY + STRATEGIST_READY
    global.TSMMission.publishAnalysis(mission.id, {
      summary:    exec.summary,
      findings:   allFindings,
      risks:      exec.risks,
      actions:    exec.actions,
      confidence: exec.confidence,
    });

    // ── Legacy relay bridge ───────────────────────────────────────────────
    // Keep writing the old relay key so construction-strategist.html still works
    // until it's refactored to read from TSMState directly.
    try {
      const relayPayload = {
        // Legacy fields the strategist expects
        timestamp:       Date.now(),
        sector:          SECTOR,
        docType,
        summary:         exec.summary,
        riskScore,
        confidence:      exec.confidence,
        exposure:        fin.exposure,
        actions:         exec.actions,
        findings:        allFindings,

        // New field — strategist can read mission directly once refactored
        missionId:       mission.id,

        // Raw engine outputs preserved for strategist prompts
        engineOutputs: {
          e1: e1.slice(0, 800),
          e2: e2.slice(0, 600),
          e3: e3.slice(0, 600),
          e4: e4.slice(0, 600),
          e5: e5.slice(0, 600),
          e6: e6.slice(0, 1200),
        },
      };
      localStorage.setItem('TSM_RELAY_PAYLOAD', JSON.stringify(relayPayload));
      localStorage.setItem('TSM_MISSION_ID',    mission.id);
      console.info(`[TSM Construction] Mission packaged: ${mission.id} | risk:${riskScore} | findings:${allFindings.length}`);
    } catch (err) {
      console.error('[TSM Construction] Relay write failed:', err);
    }

    return mission;
  }

  // ── Auto-wire: hook into existing war room after engines complete ─────────
  // The war room calls fireEngines() which populates window.engOut and
  // increments enginesComplete. We watch for completion via TSMBus or
  // by monkey-patching the existing relay write.

  function wireToWarRoom() {
    // Strategy 1: listen for the existing relay write (most reliable)
    // The war room writes TSM_RELAY_PAYLOAD when all 6 engines are done.
    // We intercept via Storage event (cross-tab) OR by wrapping localStorage.setItem.

    const _origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      _origSetItem(key, value);

      // Intercept the legacy relay write from the war room
      if (key === 'TSM_RELAY_PAYLOAD') {
        try {
          const data = JSON.parse(value);
          // Only process if not already a mission-enriched payload (prevent loop)
          if (!data.missionId && global.TSMMission && global.TSMBus) {
            // Pull engine outputs from the current page scope if available
            const outputs = global.engOut || {};
            const docTxt  = global.docText || '';
            const docTp   = global.selectedDocType || data.docType || 'Document';

            // Only package if we have at least engine 1 output
            if (outputs[1] || data.e1) {
              const mission = packageMission(docTxt, docTp, outputs);

              // Signal completion on the bus for any other vertical/consumer
              // that wants to react (mirrors bpo-engine.js's BPO_ANALYSIS_COMPLETE).
              // missionId is included so Strategy 3's own listener below skips
              // re-processing this same payload (prevents an emit/on loop).
              if (global.TSMBus && mission) {
                global.TSMBus.emit('WARROOM_COMPLETE', {
                  sector:        SECTOR,
                  missionId:     mission.id,
                  docText:       docTxt,
                  docType:       docTp,
                  engineOutputs: outputs,
                });
              }
            }
          }
        } catch (err) {
          console.warn('[TSM Construction] Intercept parse error:', err);
        }
      }
    };

    // Strategy 2: expose direct call for future refactored war room
    global.TSMConstruction = {
      packageMission,
      parseEngine01,
      parseEngine02,
      parseEngine03,
      parseEngine04,
      parseEngine05,
      parseEngine06,
      SECTOR,
    };

    // Strategy 3: listen on TSMBus for any vertical triggering analysis
    // (event name is a plain string, matching this codebase's convention —
    // there is no TSMBus.EVENTS constants map anywhere in the platform)
    if (global.TSMBus) {
      global.TSMBus.on('WARROOM_COMPLETE', (payload) => {
        if (payload.sector === SECTOR && !payload.missionId) {
          packageMission(
            payload.docText  || '',
            payload.docType  || 'Document',
            payload.engineOutputs || {},
          );
        }
      });
    }

    console.info('[TSM Construction] Analyzer wired — monitoring war room completion.');
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  // Wire immediately if dependencies are ready, otherwise wait for DOMContentLoaded
  if (global.TSMMission && global.TSMBus) {
    wireToWarRoom();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      // Small delay to ensure inline war room scripts have run
      setTimeout(wireToWarRoom, 100);
    });
  }

})(window);