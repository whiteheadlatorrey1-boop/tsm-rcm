'use strict';

/**
 * server/schools/schools-analysis-router.js
 * ------------------------------------------------------------
 * Backs POST /api/schools/analysis, called by schools-engine.js's
 * runAnalysis(). Mount it the same way enterprise-router.js is
 * mounted -- e.g.:
 *
 *   const schoolsAnalysisRouter = require('./schools/schools-analysis-router');
 *   app.use('/api/schools', schoolsAnalysisRouter);
 *
 * IMPORTANT ASSUMPTION -- please check this against your actual
 * mortgage analysis route (e.g. /api/mortgage/analysis) before
 * treating this as final:
 * none of the uploads so far (enterprise-router.js, enterprise-
 * orchestrator.js, demo-fixtures.js, domain-map.js) contain any
 * call out to an LLM/AI provider -- there's no api-key handling,
 * no fetch to an AI endpoint, nothing. So this route does NOT call
 * an AI model. It generates a deterministic, rule-based narrative
 * from the same KPI/breach/monitoring/exception data the client
 * already sent, formatted to match what renderEngineOutput() in
 * schools-strategist.html / schools-executive-portal.html expects
 * (markdown-style **bold**, ▸ bullets, numbered steps, and pipe
 * tables all get parsed there).
 *
 * If your mortgage route DOES call a real AI model (Claude, OpenAI,
 * etc.) via some shared helper, this route should call that same
 * helper instead of the local summarize() below -- upload that
 * route/helper and I'll wire it in for real.
 * ============================================================ */

const express = require('express');
const router = express.Router();

function fmtMoney(n) {
  return '$' + Math.round(n || 0).toLocaleString();
}

function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Deterministic next-step text for a breached grant file, mirroring
 * schools-strategist.html's nextAction() logic (kept in sync
 * intentionally -- if that function changes, update this one too).
 */
function actionForBreach(b) {
  const stage = (b.record && b.record.stage) || '';
  if (stage === 'agency_review') return `escalate to review desk lead`;
  if (stage === 'active') return `confirm spend-down status with district before liquidation deadline`;
  if (stage === 'corrective_action') return `escalate to program officer`;
  return `confirm status and next step with file owner`;
}

function summarize(body) {
  const kpis = body.kpis || {};
  const breaches = Array.isArray(body.grant_breaches) ? body.grant_breaches : [];
  const monitoringItems = Array.isArray(body.monitoring_items) ? body.monitoring_items : [];
  const exceptions = Array.isArray(body.exceptions) ? body.exceptions : [];

  const openGrants = kpis.open_grant_files || 0;
  const overSla = kpis.grants_over_sla || 0;
  const closeoutReady = kpis.closeout_ready || 0;
  const activeAwardValue = kpis.active_award_value || 0;
  const openMonitoring = kpis.open_monitoring_items || 0;
  const openCompliance = kpis.open_compliance_exceptions || 0;

  const lines = [];

  lines.push('**PORTFOLIO SNAPSHOT**');
  lines.push(`▸ ${pluralize(openGrants, 'open grant file')}, ${pluralize(overSla, 'file')} currently past SLA.`);
  lines.push(`▸ ${fmtMoney(activeAwardValue)} in active award value across the open portfolio.`);
  lines.push(`▸ ${pluralize(closeoutReady, 'grant file')} staged and ready for closeout submission.`);
  lines.push(`▸ ${pluralize(openMonitoring, 'open monitoring item')}, ${pluralize(openCompliance, 'open compliance exception')}.`);

  if (breaches.length) {
    lines.push('');
    lines.push('**SLA BREACHES**');
    lines.push('| Grant ID | Stage | Hours Over |');
    lines.push('|---|---|---|');
    breaches.slice(0, 5).forEach(b => {
      lines.push(`| ${b.id} | ${b.stage} | ${b.hours_over} |`);
    });
  }

  const highSevExceptions = exceptions.filter(e => e.severity === 'HIGH');
  if (highSevExceptions.length) {
    lines.push('');
    lines.push('**HIGH-SEVERITY COMPLIANCE EXCEPTIONS**');
    highSevExceptions.forEach(e => {
      lines.push(`▸ ${e.exception_id} (${e.type}) on grant ${e.grant_id} -- open, high severity.`);
    });
  }

  const stalledMonitoring = monitoringItems.filter(m => m.stage === 'issued');
  if (stalledMonitoring.length) {
    lines.push('');
    lines.push('**MONITORING ITEMS AWAITING RESPONSE**');
    stalledMonitoring.forEach(m => {
      lines.push(`▸ ${m.monitoring_id}: ${m.description} (grant ${m.grant_id}) -- issued, not yet submitted.`);
    });
  }

  if (breaches.length || highSevExceptions.length) {
    lines.push('');
    lines.push('**RECOMMENDED ACTIONS**');
    let step = 1;
    breaches.slice(0, 3).forEach(b => {
      lines.push(`${step}. ${b.id} (${b.stage}, ${b.hours_over}h over SLA) -- ${actionForBreach(b)}.`);
      step++;
    });
    highSevExceptions.slice(0, 2).forEach(e => {
      lines.push(`${step}. ${e.exception_id} on grant ${e.grant_id} -- resolve or escalate before next audit cycle.`);
      step++;
    });
  } else {
    lines.push('');
    lines.push('**RECOMMENDED ACTIONS**');
    lines.push('▸ No SLA breaches or high-severity exceptions right now -- continue routine monitoring.');
  }

  return lines.join('\n');
}

router.post('/analysis', (req, res) => {
  try {
    const answer = summarize(req.body || {});
    res.json({ ok: true, answer });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;