/**
 * TSM Mission Orchestrator v2.0
 * AI-driven mission-building layer on top of tsm-mission-engine.js.
 *
 * tsm-mission-engine.js owns the canonical mission data contract
 * (create/update/get/addTask/...). This file EXTENDS that object with
 * buildAIMission() and launch() — it never replaces window.TSMMission.
 *
 * Required load order:
 *   tsm-event-bus.js -> tsm-state.js -> tsm-mission-engine.js -> tsm-mission-orchestrator.js
 *
 * All AI calls route through /api/enterprise/query (server-side GROQ_KEY,
 * generic across verticals). The `apiKey` param accepted by buildAIMission()
 * and launch() is kept only for call-site compatibility with existing
 * war-room pages (finops, construction, ...) and is intentionally NOT sent
 * to Groq directly from the browser — closing the same direct-Groq-call
 * class of issue already fixed on the testKey() proxy pass.
 */
(function (global) {
  'use strict';

  if (!global.TSMMission || typeof global.TSMMission.create !== 'function') {
    console.error('[TSMMissionOrchestrator] tsm-mission-engine.js must load first — aborting init.');
    return;
  }
  if (global.TSMMission.__orchestratorReady) {
    console.info('[TSMMissionOrchestrator] Already initialized — skipping duplicate load.');
    return;
  }

  const STEP_SYSTEM_PROMPT =
    'You are TSM Neural Core. Generate a step-by-step remediation mission for the given ' +
    'vertical and anomaly. Respond ONLY with valid JSON, no markdown, no commentary. ' +
    'Schema: {"missionTitle":"...","summary":"...","steps":[{"appName":"...","objective":"...","instructions":"..."}]}';

  async function callEnterpriseQuery(promptText) {
    const res = await fetch('/api/enterprise/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: promptText, system: STEP_SYSTEM_PROMPT, maxTokens: 900 })
    });
    if (!res.ok) throw new Error('enterprise/query failed: ' + res.status);
    const data = await res.json();
    const text = data.answer || data.output || data.reply || '';
    if (!text.trim()) throw new Error('empty AI response');
    return text;
  }

  function extractJson(text) {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in AI response');
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  function fallbackMission(vertical, anomalyText) {
    return {
      missionTitle: 'Manual Review Required',
      summary: 'AI mission generation is unavailable — proceed with the standard ' + vertical + ' escalation checklist.',
      steps: [
        { appName: 'Situation Room', objective: 'Log the anomaly', instructions: (anomalyText || '').slice(0, 200) },
        { appName: 'BNCA Chain', objective: 'Run full analysis', instructions: 'Escalate to the BNCA chain for executive review.' }
      ]
    };
  }

  // apiKey param intentionally unused — see file header.
  async function buildAIMission(vertical, anomalyText, apiKey) {
    try {
      const prompt = 'Vertical: ' + vertical + '\nAnomaly:\n' + (anomalyText || '').slice(0, 800);
      const raw = await callEnterpriseQuery(prompt);
      const parsed = extractJson(raw);
      return {
        missionTitle: parsed.missionTitle || 'Remediation Mission',
        summary: parsed.summary || '',
        steps: Array.isArray(parsed.steps) ? parsed.steps : []
      };
    } catch (e) {
      console.warn('[TSMMissionOrchestrator] buildAIMission fallback:', e.message);
      return fallbackMission(vertical, anomalyText);
    }
  }

  async function launch(opts) {
    const o = opts || {};
    const { vertical, anomaly, container, apiKey, onComplete } = o;
    if (!container) { console.error('[TSMMissionOrchestrator] launch() requires a container element.'); return null; }

    container.innerHTML = '<div style="color:rgba(0,212,170,.5);font-size:9px;letter-spacing:1px;">⬡ CONNECTING TO TSM NEURAL CORE...</div>';

    const missionData = await buildAIMission(vertical, anomaly, apiKey);

    // Register in the canonical mission engine so it's tracked like everything else.
    const mission = global.TSMMission.create({
      sector: vertical,
      source: 'mission-orchestrator',
      meta: { anomaly: anomaly || '', missionTitle: missionData.missionTitle }
    });
    missionData.steps.forEach(s => global.TSMMission.addTask(mission.id, { title: s.appName || s.objective || 'Step' }));
    global.TSMMission.update(mission.id, { status: 'ready' });

    container.innerHTML =
      '<div style="color:#00d4aa;font-size:10px;font-weight:700;margin-bottom:8px;">' + missionData.missionTitle + '</div>' +
      '<div style="color:#7a8898;font-size:9px;line-height:1.6;">' + missionData.summary + '</div>' +
      '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;">' +
      missionData.steps.map((s, i) =>
        '<span style="font-size:8px;padding:2px 8px;border:1px solid rgba(0,212,170,.2);color:rgba(0,212,170,.6);">' +
        (i + 1) + '. ' + (s.appName || '') + '</span>'
      ).join('') +
      '</div>';

    const result = Object.assign({ missionId: mission.id }, missionData);
    if (typeof onComplete === 'function') onComplete(result);
    return result;
  }

  Object.assign(global.TSMMission, {
    buildAIMission,
    launch,
    __orchestratorReady: true
  });

  console.info('[TSMMissionOrchestrator] v2.0 attached to TSMMission (buildAIMission, launch).');

})(window);