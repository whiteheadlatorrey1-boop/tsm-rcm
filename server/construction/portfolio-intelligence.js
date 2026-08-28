'use strict';

/**
 * TSM Construction Portfolio Intelligence v1
 *
 * Deterministic construction-portfolio intelligence layer -- same role
 * as server/pm/portfolio-intelligence.js and server/mortgage/
 * portfolio-intelligence.js, ported for Construction's entity
 * vocabulary (projects, permits, change orders, safety incidents)
 * instead of PM's (properties, units, vendors, work orders).
 *
 * Scope note: same caveat as the Mortgage version -- no real structured
 * entity feed (GC/project-management-system integration) exists in
 * this repo today. This accepts entities directly for whenever that
 * integration exists, AND normalizes whatever is already persisted in
 * /api/construction/node-reports as findings, so it has real data to
 * show today.
 *
 * No LLM required.
 */

const VERSION = 'construction-portfolio-intelligence-v1';

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function first(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function normalizeEntity(item = {}, type) {
  return {
    id: String(first(
      item.id,
      item.projectId,
      item.project_id,
      item.permitId,
      item.permit_id,
      item.workOrderId,
      item.work_order_id
    ) || `${type}-unknown`),

    type,

    projectId: first(item.projectId, item.project_id, item.project) || null,
    permitId: first(item.permitId, item.permit_id, item.permit) || null,

    status: first(item.status, item.stage, item.state) || 'UNKNOWN',

    exposure: num(first(
      item.exposure,
      item.costImpact,
      item.cost_impact,
      item.amount,
      item.cost
    )),

    severity: String(first(item.severity, item.priority) || 'normal').toLowerCase(),

    source: first(item.source, item.sources?.[0]) || VERSION
  };
}

// Turns a persisted node report (see tsmLedger.verticalListNodeReports)
// into the same normalized entity shape as everything else in this
// twin. Uses costImpact/permitIds -- Construction's actual node-report
// schema -- NOT exposure/loanIds (that's Mortgage's schema; see
// docs/MORTGAGE_CONSTRUCTION_MAPPING_SPEC.md and the earlier fix to
// construction-executive-portal.html that caught this same mismatch).
function nodeReportToEntity(report = {}) {
  const permitIds = arr(report.permitIds);
  return normalizeEntity({
    id: permitIds[0] || report.nodeId,
    permit_id: permitIds[0] || null,
    status: report.nodeLabel || report.nodeId,
    exposure: report.costImpact,
    severity: report.severity,
    source: report.nodeId
  }, 'finding');
}

function buildPortfolioTwin(payload = {}, nodeReports = []) {
  const sections = payload.sections || {};

  const costOverruns = arr(
    sections.costOverruns || payload.costOverruns || payload.cost_overrun_items
  ).map(x => normalizeEntity(x, 'cost_overrun'));

  const scheduleDelays = arr(
    sections.scheduleDelays || payload.scheduleDelays || payload.schedule_delay_items
  ).map(x => normalizeEntity(x, 'schedule_delay'));

  const permitCompliance = arr(
    sections.permitCompliance || payload.permitCompliance || payload.permit_compliance_items
  ).map(x => normalizeEntity(x, 'permit_compliance'));

  const safetyIncidents = arr(
    sections.safetyIncidents || payload.safetyIncidents || payload.safety_incident_items
  ).map(x => normalizeEntity(x, 'safety_incident'));

  const explicitFindings = arr(payload.findings)
    .concat(arr(sections.findings))
    .map(x => normalizeEntity(x, 'finding'));

  const nodeFindings = arr(nodeReports).map(nodeReportToEntity);

  const findings = explicitFindings.concat(nodeFindings);

  const all = [
    ...costOverruns,
    ...scheduleDelays,
    ...permitCompliance,
    ...safetyIncidents,
    ...findings
  ];

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),

    counts: {
      costOverruns: costOverruns.length,
      scheduleDelays: scheduleDelays.length,
      permitCompliance: permitCompliance.length,
      safetyIncidents: safetyIncidents.length,
      findings: findings.length
    },

    costOverruns,
    scheduleDelays,
    permitCompliance,
    safetyIncidents,
    findings,

    exposure: all.reduce((sum, entity) => sum + num(entity.exposure), 0)
  };
}

module.exports = {
  VERSION,
  buildPortfolioTwin
};
