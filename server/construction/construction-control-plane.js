'use strict';

/**
 * TSM Construction Control-Plane Adapter
 *
 * Domain adapter between Construction intelligence and the
 * canonical TSM Vertical Control Plane.
 *
 * Existing Construction intelligence remains the domain source.
 * The shared control plane supplies:
 *
 *   deterministic
 *   risk
 *   forecast
 *   decisions
 *   actions
 *   approval
 *   lifecycle
 *   verification
 *   persistence
 *   audit
 *   telemetry
 *   explainability
 *   relationships
 *   writeback boundary
 *
 * No source-system mutation occurs here.
 */

const {
  buildPortfolioTwin
} = require('./portfolio-intelligence');

const {
  runProductionControlPlane
} = require('../vertical-control-plane');

const VERTICAL = 'construction';

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value))
    ? Number(value)
    : fallback;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function buildFindings(domain = {}) {
  const findings = [];

  const buckets = [
    ['costOverruns', 'cost_overrun'],
    ['scheduleDelays', 'schedule_delay'],
    ['permitCompliance', 'permit_compliance'],
    ['safetyIncidents', 'safety_incident'],
    ['findings', 'finding']
  ];

  for (const [key, type] of buckets) {
    for (const item of arr(domain[key])) {
      findings.push({
        id: item.id || `${type}-unknown`,
        type,
        severity: item.severity || 'normal',
        priority: item.severity || 'normal',
        status: item.status || 'OPEN',
        exposure: finite(item.exposure),
        source: item.source || 'construction-portfolio-intelligence',
        evidence: [
          {
            source: item.source || 'construction-portfolio-intelligence',
            entityId: item.id || null,
            type
          }
        ],
        metadata: {
          projectId: item.projectId || null,
          permitId: item.permitId || null
        }
      });
    }
  }

  return findings;
}

function buildExposures(domain = {}) {
  const exposures = [];

  for (const item of arr(domain.costOverruns)) {
    const amount = finite(item.exposure);

    if (amount > 0) {
      exposures.push({
        type: 'cost_overrun',
        amount,
        source: item.source || 'construction-portfolio-intelligence',
        entityId: item.id || null
      });
    }
  }

  for (const item of arr(domain.scheduleDelays)) {
    const amount = finite(item.exposure);

    if (amount > 0) {
      exposures.push({
        type: 'schedule_delay',
        amount,
        source: item.source || 'construction-portfolio-intelligence',
        entityId: item.id || null
      });
    }
  }

  for (const item of arr(domain.permitCompliance)) {
    const amount = finite(item.exposure);

    if (amount > 0) {
      exposures.push({
        type: 'permit_compliance',
        amount,
        source: item.source || 'construction-portfolio-intelligence',
        entityId: item.id || null
      });
    }
  }

  for (const item of arr(domain.safetyIncidents)) {
    const amount = finite(item.exposure);

    if (amount > 0) {
      exposures.push({
        type: 'safety_incident',
        amount,
        source: item.source || 'construction-portfolio-intelligence',
        entityId: item.id || null
      });
    }
  }

  return exposures;
}

function buildPredictions(domain = {}) {
  const cost = arr(domain.costOverruns)
    .map(item => finite(item.exposure))
    .filter(value => value > 0);

  const schedule = arr(domain.scheduleDelays)
    .map(item => finite(item.exposure))
    .filter(value => value > 0);

  const permits = arr(domain.permitCompliance);
  const safety = arr(domain.safetyIncidents);

  const predictions = [];

  if (cost.length) {
    const total = cost.reduce((a, b) => a + b, 0);

    predictions.push({
      metric: 'cost_overrun_exposure',
      value: Math.round(total * 100) / 100,
      unit: 'USD',
      horizon: '30d',
      confidence: 0.91,
      method: 'deterministic-exposure-baseline',
      source: 'construction-portfolio-intelligence'
    });
  }

  if (schedule.length) {
    const total = schedule.reduce((a, b) => a + b, 0);

    predictions.push({
      metric: 'schedule_delay_exposure',
      value: Math.round(total * 100) / 100,
      unit: 'USD',
      horizon: '30d',
      confidence: 0.84,
      method: 'deterministic-exposure-baseline',
      source: 'construction-portfolio-intelligence'
    });
  }

  if (permits.length) {
    predictions.push({
      metric: 'permit_compliance_findings',
      value: permits.length,
      unit: 'count',
      horizon: '30d',
      confidence: 0.94,
      method: 'current-findings-baseline',
      source: 'construction-portfolio-intelligence'
    });
  }

  if (safety.length) {
    predictions.push({
      metric: 'safety_incident_findings',
      value: safety.length,
      unit: 'count',
      horizon: '30d',
      confidence: 0.94,
      method: 'current-findings-baseline',
      source: 'construction-portfolio-intelligence'
    });
  }

  return predictions;
}

function selectAction(domain = {}) {
  if (arr(domain.safetyIncidents).length) {
    return 'construction:escalate_safety';
  }

  if (arr(domain.permitCompliance).length) {
    return 'construction:review_permit';
  }

  if (arr(domain.costOverruns).length) {
    return 'construction:review_cost_overrun';
  }

  if (arr(domain.scheduleDelays).length) {
    return 'construction:review_schedule';
  }

  return 'construction:decision-action';
}

function buildRelationships(domain = {}) {
  const relationships = [];

  const groups = [
    ['costOverruns', 'cost_overrun'],
    ['scheduleDelays', 'schedule_delay'],
    ['permitCompliance', 'permit_compliance'],
    ['safetyIncidents', 'safety_incident']
  ];

  for (const [key, type] of groups) {
    for (const item of arr(domain[key])) {
      relationships.push({
        source: item.projectId || item.id || `${type}-unknown`,
        target: item.id || `${type}-unknown`,
        type: `project_has_${type}`
      });
    }
  }

  return relationships;
}

function runConstructionControlPlane(input = {}) {
  const twin = buildPortfolioTwin(
    input,
    input.nodeReports || []
  );

  const findings = buildFindings(twin);
  const exposures = buildExposures(twin);
  const predictions = buildPredictions(twin);
  const actionType =
    input.actionType ||
    selectAction(twin);

  const result = runProductionControlPlane({
    vertical: VERTICAL,

    ...twin,

    findings,
    exposures,

    relationships:
      buildRelationships(twin),

    actionType,

    actionPayload:
      input.actionPayload || {},

    predictions,

    actor:
      input.actor ||
      'construction-control-plane'
  });

  result.decision =
    Array.isArray(result.decisions) &&
    result.decisions.length
      ? result.decisions[0]
      : null;

  result.action =
    Array.isArray(result.actions) &&
    result.actions.length
      ? result.actions[0]
      : null;

  return result;
}

module.exports = {
  VERTICAL,
  buildFindings,
  buildExposures,
  buildPredictions,
  selectAction,
  buildRelationships,
  runConstructionControlPlane
};
