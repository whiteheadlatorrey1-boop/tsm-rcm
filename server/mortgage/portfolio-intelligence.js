'use strict';

/**
 * TSM Mortgage Portfolio Intelligence v1
 *
 * Deterministic mortgage-pipeline intelligence layer -- same role as
 * server/pm/portfolio-intelligence.js, ported for Mortgage's entity
 * vocabulary (loan files, conditions, compliance exceptions,
 * delinquencies) instead of PM's (properties, units, vendors, work
 * orders).
 *
 * Scope note: unlike PM, Mortgage has no real structured entity feed
 * behind this yet (see docs/MORTGAGE_CONSTRUCTION_MAPPING_SPEC.md
 * section 2) -- no LOS/servicing-system integration exists in this repo
 * today. This module accepts entities directly (loanFiles/conditions/
 * complianceExceptions/delinquencies in payload.sections, same pattern
 * as PM) for whenever that integration exists, AND normalizes whatever
 * is already persisted in /api/mortgage/node-reports (via
 * tsmLedger.verticalListNodeReports('mortgage')) as findings, so this
 * has real data to show today rather than being an empty endpoint
 * waiting on integration work nobody has scoped yet.
 *
 * No LLM required.
 */

const VERSION = 'mortgage-portfolio-intelligence-v1';

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
      item.loanId,
      item.loan_id,
      item.conditionId,
      item.condition_id,
      item.borrowerId,
      item.borrower_id
    ) || `${type}-unknown`),

    type,

    loanId: first(item.loanId, item.loan_id, item.loan) || null,
    borrowerId: first(item.borrowerId, item.borrower_id, item.borrower) || null,

    status: first(item.status, item.stage, item.state) || 'UNKNOWN',

    exposure: num(first(
      item.exposure,
      item.financialExposure,
      item.financial_exposure,
      item.amount,
      item.cost
    )),

    severity: String(first(item.severity, item.priority) || 'normal').toLowerCase(),

    source: first(item.source, item.sources?.[0]) || VERSION
  };
}

// Turns a persisted node report (see tsmLedger.verticalListNodeReports)
// into the same normalized entity shape as everything else in this twin,
// so it can sit alongside loanFiles/conditions/etc. once those exist,
// rather than being a second, differently-shaped data source.
function nodeReportToEntity(report = {}) {
  const loanIds = arr(report.loanIds);
  return normalizeEntity({
    id: loanIds[0] || report.nodeId,
    loan_id: loanIds[0] || null,
    status: report.nodeLabel || report.nodeId,
    exposure: report.exposure,
    severity: report.severity,
    source: report.nodeId
  }, 'finding');
}

function buildPortfolioTwin(payload = {}, nodeReports = []) {
  const sections = payload.sections || {};

  const loanFiles = arr(
    sections.loanFiles || payload.loanFiles || payload.loan_files
  ).map(x => normalizeEntity(x, 'loan_file'));

  const conditions = arr(
    sections.conditions || payload.conditions
  ).map(x => normalizeEntity(x, 'condition'));

  const complianceExceptions = arr(
    sections.complianceExceptions || payload.complianceExceptions || payload.compliance_exception_items
  ).map(x => normalizeEntity(x, 'compliance_exception'));

  const delinquencies = arr(
    sections.delinquencies || payload.delinquencies || payload.delinquency_items
  ).map(x => normalizeEntity(x, 'delinquency'));

  const explicitFindings = arr(payload.findings)
    .concat(arr(sections.findings))
    .map(x => normalizeEntity(x, 'finding'));

  const nodeFindings = arr(nodeReports).map(nodeReportToEntity);

  const findings = explicitFindings.concat(nodeFindings);

  const all = [
    ...loanFiles,
    ...conditions,
    ...complianceExceptions,
    ...delinquencies,
    ...findings
  ];

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),

    counts: {
      loanFiles: loanFiles.length,
      conditions: conditions.length,
      complianceExceptions: complianceExceptions.length,
      delinquencies: delinquencies.length,
      findings: findings.length
    },

    loanFiles,
    conditions,
    complianceExceptions,
    delinquencies,
    findings,

    exposure: all.reduce((sum, entity) => sum + num(entity.exposure), 0)
  };
}

module.exports = {
  VERSION,
  buildPortfolioTwin
};
