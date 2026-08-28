'use strict';

/**
 * TSM PM Executive Decision Engine v1
 *
 * Purpose:
 *   Convert existing PM Copilot evidence into deterministic,
 *   exposure-ranked executive decisions.
 *
 * Design:
 *   - Does NOT replace pm-engine.js.
 *   - Does NOT ask an LLM to determine priority.
 *   - Consumes existing KPI / exception / risk / exposure payloads.
 *   - Produces decisions, recommendedActions, executiveSummary,
 *     and an auditable decision trail.
 */

const VERSION = 'pm-decision-engine-v1';

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

function priorityFrom(severity, exposure, domain) {
  const s = severityRank(severity);
  const e = num(exposure);

  if (s >= 4) return 'CRITICAL';
  if (s >= 3) return 'HIGH';

  if (domain === 'vendor_compliance' && e >= 10000) return 'HIGH';
  if (e >= 10000) return 'HIGH';
  if (e >= 1000) return 'MEDIUM';

  return 'MEDIUM';
}

function ownerFor(domain) {
  return {
    vendor_compliance: 'Vendor Management',
    maintenance: 'Maintenance Operations',
    vacancy: 'Leasing / Property Management',
    lease: 'Leasing / Property Management',
    turnover: 'Property Management',
    iot: 'Maintenance Operations'
  }[domain] || 'Property Management';
}

function urgencyFor(priority, domain) {
  if (priority === 'CRITICAL') return 'Immediate';
  if (domain === 'maintenance') return priority === 'HIGH' ? 'Today' : 'Next business day';
  if (priority === 'HIGH') return 'Today';
  return 'This week';
}

function actionFor(domain, item) {
  const id = firstDefined(item.id, item.work_order_id, item.vendor_id, item.unit_id, item.sensor_id);

  switch (domain) {
    case 'vendor_compliance':
      return text(item.status || item.stage).toLowerCase() === 'expired'
        ? `Suspend new work assignment to ${id || 'the affected vendor'} and initiate compliance renewal/replacement review.`
        : `Complete compliance renewal for ${id || 'the affected vendor'} before the credential expires.`;

    case 'maintenance':
      return `Escalate ${id || 'the overdue work order'} and confirm vendor response, next milestone, and SLA recovery plan.`;

    case 'vacancy':
      return `Assign a leasing action plan for ${id || 'the vacant unit'} and review pricing, make-ready, and showing readiness.`;

    case 'lease':
      return `Initiate renewal outreach for ${id || 'the affected lease'} and record the renewal decision path.`;

    case 'turnover':
      return `Escalate ${id || 'the turnover'} and establish a dated completion plan with accountable owner.`;

    case 'iot':
      return `Dispatch inspection/remediation for ${id || 'the affected sensor alert'} and verify the condition clears after remediation.`;

    default:
      return `Review ${id || 'the finding'} and assign an accountable owner with a dated next action.`;
  }
}

function inferDomain(item) {
  const raw = [
    item.domain,
    item.category,
    item.type,
    item.source,
    item.id,
    item.claim,
    item.rationale,
    item.description
  ].join(' ').toLowerCase();

  if (/vendor|certificate|compliance|license|insurance/.test(raw)) return 'vendor_compliance';
  if (/work.?order|maintenance|sla|repair/.test(raw)) return 'maintenance';
  if (/vacan|unit/.test(raw)) return 'vacancy';
  if (/lease|renew/.test(raw)) return 'lease';
  if (/turnover|make.?ready/.test(raw)) return 'turnover';
  if (/iot|sensor|thermostat|leak|door/.test(raw)) return 'iot';

  return 'operations';
}

function extractItems(payload) {
  const sections = payload?.sections || payload || {};
  const items = [];

  const pushMany = (arr, domainHint) => {
    normalizeArray(arr).forEach(item => {
      if (!item || typeof item !== 'object') return;
      items.push({
        ...item,
        domain: domainHint || item.domain || inferDomain(item)
      });
    });
  };

  const exceptionReport = sections.exceptionReport || payload.exceptionReport;
  const riskReport = sections.riskReport || payload.riskReport;

  pushMany(exceptionReport?.exceptions);
  pushMany(riskReport?.risks);

  pushMany(sections.maintenance_delay_exposure_items || payload.maintenance_delay_exposure_items, 'maintenance');
  pushMany(sections.vendor_compliance_exposure_items || payload.vendor_compliance_exposure_items, 'vendor_compliance');
  pushMany(sections.vacancy_exposure_items || payload.vacancy_exposure_items, 'vacancy');
  pushMany(sections.iot_alerts || payload.iot_alerts, 'iot');

  const structured = sections.structuredData || payload.structuredData;
  pushMany(structured?.items);

  return items;
}

function makeDecision(item, index) {
  const domain = item.domain || inferDomain(item);

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

  const priority = priorityFrom(severity, exposure, domain);

  const id = firstDefined(
    item.id,
    item.work_order_id,
    item.vendor_id,
    item.unit_id,
    item.sensor_id,
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
    id: `PM-DEC-${String(index + 1).padStart(3, '0')}`,
    priority,
    priorityRank: priority === 'CRITICAL' ? 4 : priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1,
    domain,
    entityId: id,
    finding,
    exposure,
    action: actionFor(domain, item),
    owner: ownerFor(domain),
    urgency: urgencyFor(priority, domain),
    status: 'OPEN',
    evidence: {
      source: firstDefined(...normalizeArray(item.sources)),
      sourceId: id,
      severity,
      rationale: text(item.rationale || item.explain || '')
    },
    generatedBy: VERSION
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

function buildExecutiveSummary(decisions, exposure) {
  const critical = decisions.filter(d => d.priority === 'CRITICAL').length;
  const high = decisions.filter(d => d.priority === 'HIGH').length;

  const top = decisions[0];

  let headline = 'PM portfolio operating position requires management review.';

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

function buildDecisionPackage(payload) {
  const rawItems = extractItems(payload);

  let decisions = rawItems
    .map(makeDecision)
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
    source: d.evidence.source || VERSION,
    engine: VERSION
  }));

  return {
    engine: VERSION,
    generatedAt: new Date().toISOString(),

    decisionSummary: {
      total: decisions.length,
      critical: decisions.filter(d => d.priority === 'CRITICAL').length,
      high: decisions.filter(d => d.priority === 'HIGH').length,
      medium: decisions.filter(d => d.priority === 'MEDIUM').length,
      modeledExposure
    },

    executiveSummary: buildExecutiveSummary(decisions, modeledExposure),

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

module.exports = {
  VERSION,
  buildDecisionPackage
};
