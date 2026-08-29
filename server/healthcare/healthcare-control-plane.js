'use strict';

/**
 * TSM Healthcare / RCM Control Plane Adapter
 *
 * Purpose:
 *   Adapt Healthcare domain intelligence into the shared
 *   production control-plane contract used by PM.
 *
 * Architecture:
 *   Healthcare domain intelligence
 *        ↓
 *   Healthcare control-plane adapter
 *        ↓
 *   Shared vertical control plane
 *        ↓
 *   decisions / actions / risk / forecast / governance /
 *   persistence / audit / verification / telemetry / writeback
 *
 * Existing Healthcare routes remain intact.
 */

const {
  buildPortfolioTwin
} = require('./portfolio-intelligence');

const {
  runProductionControlPlane
} = require('../vertical-control-plane');

const VERTICAL = 'healthcare';

function normalizeHealthcareDomain(input = {}) {
  const source = input.domain || input.twin || input;

  return {
    vertical: VERTICAL,

    domain: VERTICAL,

    portfolio:
      source.portfolio ||
      source.portfolioData ||
      {},

    nodes:
      source.nodes ||
      source.nodeReports ||
      source.records ||
      [],

    findings:
      source.findings ||
      [],

    risks:
      source.risks ||
      [],

    forecasts:
      source.forecasts ||
      [],

    decisions:
      source.decisions ||
      [],

    actions:
      source.actions ||
      [],

    metadata:
      source.metadata ||
      {},

    ...source
  };
}

function buildPredictions(domain = {}) {
  const predictions = [];

  const findings = Array.isArray(domain.findings)
    ? domain.findings
    : [];

  for (const finding of findings) {
    const severity =
      String(
        finding.severity ||
        finding.priority ||
        finding.risk ||
        ''
      ).toLowerCase();

    if (
      severity.includes('critical') ||
      severity.includes('high')
    ) {
      predictions.push({
        type: 'healthcare-risk-escalation',
        confidence: 0.9,
        source: finding.id || finding.nodeId || 'healthcare-finding',
        rationale:
          finding.rationale ||
          finding.title ||
          finding.message ||
          'High-severity Healthcare finding requires escalation.'
      });
    }
  }

  const nodes = Array.isArray(domain.nodes)
    ? domain.nodes
    : [];

  for (const node of nodes) {
    const status =
      String(
        node.status ||
        node.state ||
        node.severity ||
        ''
      ).toLowerCase();

    if (
      status.includes('critical') ||
      status.includes('breach') ||
      status.includes('overdue')
    ) {
      predictions.push({
        type: 'healthcare-node-escalation',
        confidence: 0.88,
        source: node.id || node.nodeId || 'healthcare-node',
        rationale:
          node.rationale ||
          node.message ||
          'Healthcare node indicates elevated operational exposure.'
      });
    }
  }

  return predictions;
}

function selectAction(domain = {}) {
  const findings = Array.isArray(domain.findings)
    ? domain.findings
    : [];

  const risks = Array.isArray(domain.risks)
    ? domain.risks
    : [];

  const hasCritical =
    [...findings, ...risks].some(item => {
      const value = String(
        item.severity ||
        item.priority ||
        item.risk ||
        item.level ||
        ''
      ).toLowerCase();

      return value.includes('critical');
    });

  if (hasCritical) {
    return 'escalate-healthcare-risk';
  }

  if (findings.length > 0 || risks.length > 0) {
    return 'review-healthcare-exposure';
  }

  return 'monitor-healthcare-portfolio';
}

function runHealthcareControlPlane(input = {}) {
  const domain = normalizeHealthcareDomain(input);

  const predictions = buildPredictions(domain);

  const actionType =
    input.actionType ||
    selectAction(domain);

  const result = runProductionControlPlane({
    ...domain,

    vertical: VERTICAL,
    domain: VERTICAL,

    actionType,

    actionPayload:
      input.actionPayload || {},

    predictions,

    actor:
      input.actor ||
      'healthcare-control-plane'
  });

  // PM-facing singular decision contract.
  result.decision =
    Array.isArray(result.decisions) &&
    result.decisions.length > 0
      ? result.decisions[0]
      : null;

  // PM-facing singular action contract.
  result.action =
    Array.isArray(result.actions) &&
    result.actions.length > 0
      ? result.actions[0]
      : null;

  return result;
}

module.exports = {
  VERTICAL,
  normalizeHealthcareDomain,
  buildPredictions,
  selectAction,
  runHealthcareControlPlane
};
