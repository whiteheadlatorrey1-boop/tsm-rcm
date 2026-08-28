'use strict';

/**
 * TSM Shared Decision Engine Core
 *
 * Purpose:
 *   Vertical-agnostic version of what shipped first as
 *   server/pm/decision-engine.js. Converts raw findings/exceptions/risks
 *   into deterministic, exposure-ranked decisions -- no LLM in the
 *   priority/ranking path.
 *
 * Design:
 *   - This file contains ONLY the logic that was already domain-agnostic
 *     in the original PM decision engine (exposure math, severity ranking,
 *     dedup, executive summary, audit trail).
 *   - Anything that used to hardcode PM vocabulary (domain inference,
 *     owner routing, urgency rules, action-sentence templates) is now
 *     supplied by the caller via `config`, so each vertical keeps its own
 *     domain config module instead of forking this whole file.
 *
 * Usage:
 *   const { createDecisionEngine } = require('../shared/decision-engine-core');
 *   const config = require('./mortgage-domain-config');
 *   module.exports = createDecisionEngine({
 *     version: 'mortgage-decision-engine-v1',
 *     idPrefix: 'MTG-DEC',
 *     ...config
 *   });
 */

function num(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[$,%\s,]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function text(value) {
  return value == null ? '' : String(value);
}

function money(value) {
  return Math.round(num(value) * 100) / 100;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function severityRank(severity) {
  return ({
    critical: 4,
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  })[text(severity).toLowerCase()] || 1;
}

function priorityFrom(severity, exposure, domain, config) {
  const s = severityRank(severity);
  const e = num(exposure);

  if (s >= 4) return 'CRITICAL';
  if (s >= 3) return 'HIGH';

  const highExposureDomains = config.highExposurePriorityDomains || [];
  if (highExposureDomains.includes(domain) && e >= 10000) return 'HIGH';
  if (e >= 10000) return 'HIGH';
  if (e >= 1000) return 'MEDIUM';

  return 'MEDIUM';
}

function extractItems(payload, config) {
  const sections = payload?.sections || payload || {};
  const items = [];

  const pushMany = (arr, domainHint) => {
    normalizeArray(arr).forEach(item => {
      if (!item || typeof item !== 'object') return;
      items.push({
        ...item,
        domain: domainHint || item.domain || config.inferDomain(item)
      });
    });
  };

  // Canonical relay compatibility: findings may arrive normalized at
  // payload.findings -- these are decision-engine inputs, not a separate
  // Sentinel/anomaly channel.
  pushMany(payload.findings, null);

  const exceptionReport = sections.exceptionReport || payload.exceptionReport;
  const riskReport = sections.riskReport || payload.riskReport;

  pushMany(exceptionReport?.exceptions);
  pushMany(riskReport?.risks);

  // Vertical-specific named exposure buckets, e.g. PM's
  // maintenance_delay_exposure_items, Mortgage's compliance_exception_items.
  const namedBuckets = config.namedExposureBuckets || {};
  for (const [key, domain] of Object.entries(namedBuckets)) {
    pushMany(sections[key] || payload[key], domain);
  }

  const structured = sections.structuredData || payload.structuredData;
  pushMany(structured?.items);

  return items;
}

function makeDecision(item, index, config) {
  const domain = item.domain || config.inferDomain(item);

  const exposure = money(firstDefined(
    item.exposure,
    item.exposureAmount,
    item.financialExposure,
    item.estimatedExposure,
    item.amount,
    item.cost
  ));

  const severity = text(firstDefined(
    item.severity,
    item.priority,
    item.risk
  ) || 'medium').toLowerCase();

  const priority = priorityFrom(severity, exposure, domain, config);

  const id = firstDefined(
    item.id,
    item.work_order_id,
    item.vendor_id,
    item.unit_id,
    item.sensor_id,
    item.loan_id,
    item.permit_id,
    item.case_id,
    `finding-${index + 1}`
  );

  const finding = text(firstDefined(
    item.claim,
    item.finding,
    item.description,
    item.rationale,
    item.label,
    item.title
  ) || 'Operational finding requiring management review.');

  return {
    id: `${config.idPrefix}-${String(index + 1).padStart(3, '0')}`,
    priority,
    priorityRank: priority === 'CRITICAL' ? 4 : priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1,
    domain,
    entityId: id,
    finding,
    exposure,
    action: config.actionFor(domain, item),
    owner: config.ownerFor(domain),
    urgency: config.urgencyFor(priority, domain),
    status: 'OPEN',
    evidence: {
      source: firstDefined(...normalizeArray(item.sources)),
      sourceId: id,
      severity,
      rationale: text(item.rationale || item.explain || '')
    },
    generatedBy: config.version
  };
}

function dedupeDecisions(decisions) {
  const seen = new Set();

  return decisions.filter(d => {
    const key = [
      d.domain,
      d.entityId,
      d.finding.toLowerCase().slice(0, 120)
    ].join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildExecutiveSummary(decisions, exposure, config) {
  const critical = decisions.filter(d => d.priority === 'CRITICAL').length;
  const high = decisions.filter(d => d.priority === 'HIGH').length;

  const top = decisions[0];

  let headline = config.defaultHeadline ||
    'Portfolio operating position requires management review.';

  if (top) {
    headline =
      `${decisions.length} management decisions identified; ` +
      `${money(exposure).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      })} of modeled exposure is represented in the current decision set.`;
  }

  return {
    headline,
    decisionCount: decisions.length,
    criticalCount: critical,
    highCount: high,
    modeledExposure: money(exposure),
    topPriority: top
      ? {
          decisionId: top.id,
          domain: top.domain,
          finding: top.finding,
          exposure: top.exposure,
          action: top.action,
          owner: top.owner,
          urgency: top.urgency
        }
      : null,
    confidence: 'DETERMINISTIC',
    disclaimer: 'Exposure values are modeled planning figures unless explicitly confirmed by a live financial source.'
  };
}

/**
 * Builds a fully configured decision engine for one vertical.
 *
 * config must provide:
 *   version               {string}   e.g. 'mortgage-decision-engine-v1'
 *   idPrefix              {string}   e.g. 'MTG-DEC' -> ids like MTG-DEC-001
 *   inferDomain(item)     {function} -> domain string
 *   ownerFor(domain)      {function} -> owner string
 *   urgencyFor(priority, domain) {function} -> urgency string
 *   actionFor(domain, item)      {function} -> action sentence string
 *
 * config may optionally provide:
 *   namedExposureBuckets  {object}   { payloadKey: domainName } for
 *                                    vertical-specific exposure arrays
 *                                    (PM's maintenance_delay_exposure_items,
 *                                    Mortgage's compliance_exception_items, etc.)
 *   highExposurePriorityDomains {array} domains that escalate to HIGH at a
 *                                    lower/same exposure threshold as the
 *                                    general rule (PM used this for
 *                                    vendor_compliance; harmless no-op if
 *                                    omitted)
 *   defaultHeadline       {string}   fallback executive summary headline
 *                                    when there are no decisions
 */
function createDecisionEngine(config) {
  if (!config || !config.version || !config.idPrefix) {
    throw new Error('createDecisionEngine requires { version, idPrefix, inferDomain, ownerFor, urgencyFor, actionFor }');
  }
  for (const fn of ['inferDomain', 'ownerFor', 'urgencyFor', 'actionFor']) {
    if (typeof config[fn] !== 'function') {
      throw new Error(`createDecisionEngine config.${fn} must be a function`);
    }
  }

  function buildDecisionPackage(payload) {
    const rawItems = extractItems(payload, config);

    let decisions = rawItems
      .map((item, index) => makeDecision(item, index, config))
      .filter(d => d.finding);

    decisions = dedupeDecisions(decisions);

    decisions.sort((a, b) => {
      if (b.priorityRank !== a.priorityRank) return b.priorityRank - a.priorityRank;
      return b.exposure - a.exposure;
    });

    decisions = decisions.map((d, i) => ({
      ...d,
      rank: i + 1
    }));

    const existingFinancials =
      payload?.sections?.financials ||
      payload?.financials ||
      {};

    const modeledExposure = money(firstDefined(
      existingFinancials.total_exposure,
      existingFinancials.totalExposure,
      payload?.total_exposure,
      payload?.totalExposure,
      decisions.reduce((sum, d) => sum + d.exposure, 0)
    ));

    const recommendedActions = decisions.map(d => ({
      decisionId: d.id,
      text: d.action,
      owner: d.owner,
      urgency: d.urgency,
      priority: d.priority,
      exposure: d.exposure,
      entityId: d.entityId
    }));

    const auditTrail = decisions.map(d => ({
      timestamp: new Date().toISOString(),
      event: 'DECISION_GENERATED',
      decisionId: d.id,
      entityId: d.entityId,
      domain: d.domain,
      priority: d.priority,
      exposure: d.exposure,
      source: d.evidence.source || config.version,
      engine: config.version
    }));

    return {
      engine: config.version,
      generatedAt: new Date().toISOString(),

      decisionSummary: {
        total: decisions.length,
        critical: decisions.filter(d => d.priority === 'CRITICAL').length,
        high: decisions.filter(d => d.priority === 'HIGH').length,
        medium: decisions.filter(d => d.priority === 'MEDIUM').length,
        modeledExposure
      },

      executiveSummary: buildExecutiveSummary(decisions, modeledExposure, config),

      decisions,

      recommendedActions,

      auditTrail,

      governance: {
        mode: 'DETERMINISTIC',
        llmRequired: false,
        humanApprovalRequired: true,
        writeBackToSourceSystems: false
      }
    };
  }

  return {
    VERSION: config.version,
    buildDecisionPackage
  };
}

module.exports = {
  createDecisionEngine,
  // exported for unit tests / reuse by domain-config modules if needed
  _internal: { num, text, money, normalizeArray, firstDefined, severityRank }
};
