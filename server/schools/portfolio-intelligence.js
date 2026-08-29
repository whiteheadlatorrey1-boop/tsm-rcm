'use strict';

/**
 * TSM Schools/Grants Portfolio Intelligence v1
 *
 * Deterministic grants-compliance intelligence layer -- same role as
 * server/mortgage/portfolio-intelligence.js, ported for Schools' entity
 * vocabulary (grant files, monitoring items, compliance exceptions)
 * instead of Mortgage's (loan files, conditions, delinquencies).
 *
 * Scope note: same as Mortgage/HC, there is no real structured SIS/grants-
 * system feed behind this yet. This module accepts entities directly
 * (grantFiles/monitoringItems/complianceExceptions in payload.sections,
 * same pattern as Mortgage/PM -- and the same field names the existing
 * /api/schools/analysis route already accepts: kpis/grant_breaches/
 * monitoring_items/exceptions), AND normalizes whatever is already
 * persisted in /api/schools/node-reports (via
 * tsmLedger.verticalListNodeReports('schools')) as findings.
 *
 * No LLM required.
 */

const VERSION = 'schools-portfolio-intelligence-v1';

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
      item.grantId,
      item.grant_id,
      item.itemId,
      item.item_id
    ) || `${type}-unknown`),

    type,

    grantId: first(item.grantId, item.grant_id, item.grant) || null,

    status: first(item.status, item.stage, item.state) || 'UNKNOWN',

    exposure: num(first(
      item.exposure,
      item.financialExposure,
      item.financial_exposure,
      item.amount,
      item.budgetVariance,
      item.budget_variance
    )),

    severity: String(first(item.severity, item.priority) || 'normal').toLowerCase(),

    source: first(item.source, item.sources?.[0]) || VERSION
  };
}

// Turns a persisted node report (see tsmLedger.verticalListNodeReports)
// into the same normalized entity shape as everything else in this twin.
function nodeReportToEntity(report = {}) {
  const grantIds = arr(report.grantIds);
  return normalizeEntity({
    id: grantIds[0] || report.nodeId,
    grant_id: grantIds[0] || null,
    status: report.nodeLabel || report.nodeId,
    exposure: report.exposure,
    severity: report.severity,
    source: report.nodeId
  }, 'finding');
}

function buildPortfolioTwin(payload = {}, nodeReports = []) {
  const sections = payload.sections || {};

  const grantFiles = arr(
    sections.grantFiles || payload.grantFiles || payload.grant_files
  ).map(x => normalizeEntity(x, 'grant_file'));

  const grantBreaches = arr(
    sections.grantBreaches || payload.grant_breaches || payload.grant_breach_items
  ).map(x => normalizeEntity(x, 'grant_breach'));

  const monitoringItems = arr(
    sections.monitoringItems || payload.monitoring_items || payload.monitoring_stall_items
  ).map(x => normalizeEntity(x, 'monitoring_item'));

  const complianceExceptions = arr(
    sections.complianceExceptions || payload.exceptions || payload.compliance_exception_items
  ).map(x => normalizeEntity(x, 'compliance_exception'));

  const explicitFindings = arr(payload.findings)
    .concat(arr(sections.findings))
    .map(x => normalizeEntity(x, 'finding'));

  const nodeFindings = arr(nodeReports).map(nodeReportToEntity);

  const findings = explicitFindings.concat(nodeFindings);

  const all = [
    ...grantFiles,
    ...grantBreaches,
    ...monitoringItems,
    ...complianceExceptions,
    ...findings
  ];

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),

    counts: {
      grantFiles: grantFiles.length,
      grantBreaches: grantBreaches.length,
      monitoringItems: monitoringItems.length,
      complianceExceptions: complianceExceptions.length,
      findings: findings.length
    },

    grantFiles,
    grantBreaches,
    monitoringItems,
    complianceExceptions,
    findings,

    exposure: all.reduce((sum, entity) => sum + num(entity.exposure), 0)
  };
}

module.exports = {
  VERSION,
  buildPortfolioTwin
};
