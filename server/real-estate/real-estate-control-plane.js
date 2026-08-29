'use strict';

/**
 * TSM Real Estate Control-Plane Adapter
 *
 * Domain layer between property-management facts and the
 * canonical TSM Vertical Control Plane.
 *
 * Responsibilities:
 *   - normalize Real Estate facts
 *   - select domain-specific action types
 *   - produce named predictive metrics
 *   - preserve canonical governance/writeback boundaries
 *
 * This adapter never performs source-system mutation.
 */

const {
  analyzePortfolio
} = require('./real-estate-engine');

const {
  runProductionControlPlane
} = require('../vertical-control-plane');

const VERTICAL = 'real_estate';

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value))
    ? Number(value)
    : fallback;
}

function buildPredictions(domain = {}) {
  const entities = Array.isArray(domain.entities)
    ? domain.entities
    : [];

  const events = Array.isArray(domain.events)
    ? domain.events
    : [];

  const leases = entities.filter(
    item => item.type === 'lease'
  );

  const units = entities.filter(
    item => item.type === 'unit'
  );

  const occupied = units.filter(
    item =>
      String(item.occupancy || '').toLowerCase() ===
      'occupied'
  ).length;

  const totalUnits = units.length;

  const vacancyRate =
    totalUnits > 0
      ? (totalUnits - occupied) / totalUnits
      : null;

  const maintenanceCosts = events
    .filter(event => event.type === 'maintenance')
    .map(event => finite(event.value))
    .filter(value => value > 0);

  const maintenanceBaseline =
    maintenanceCosts.length > 0
      ? maintenanceCosts.reduce(
          (sum, value) => sum + value,
          0
        ) / maintenanceCosts.length
      : 0;

  const totalArrears = leases.reduce(
    (sum, lease) =>
      sum + Math.max(0, finite(lease.balanceDue)),
    0
  );

  const totalRent = leases.reduce(
    (sum, lease) =>
      sum + Math.max(0, finite(lease.monthlyRent)),
    0
  );

  const predictions = [];

  if (maintenanceBaseline > 0) {
    predictions.push({
      metric: 'maintenance_cost',
      value: Math.round(maintenanceBaseline * 100) / 100,
      unit: 'USD',
      horizon: '30d',
      confidence: 0.82,
      method: 'deterministic-baseline',
      source: 'maintenance-trend'
    });
  }

  if (totalRent > 0) {
    predictions.push({
      metric: 'monthly_rent_exposure',
      value: Math.round(totalRent * 100) / 100,
      unit: 'USD',
      horizon: '30d',
      confidence: 0.95,
      method: 'contracted-rent-baseline',
      source: 'lease-records'
    });
  }

  if (totalArrears > 0) {
    predictions.push({
      metric: 'rent_arrears',
      value: Math.round(totalArrears * 100) / 100,
      unit: 'USD',
      horizon: '30d',
      confidence: 0.96,
      method: 'current-balance-baseline',
      source: 'lease-records'
    });
  }

  if (vacancyRate !== null) {
    predictions.push({
      metric: 'vacancy_rate',
      value: Math.round(vacancyRate * 10000) / 10000,
      unit: 'ratio',
      horizon: '30d',
      confidence: 0.90,
      method: 'occupancy-baseline',
      source: 'unit-records'
    });
  }

  return predictions;
}

function selectAction(domain = {}) {
  const findings = Array.isArray(domain.findings)
    ? domain.findings
    : [];

  const types = new Set(
    findings.map(item => item.type)
  );

  if (types.has('lease_exception')) {
    return 'real_estate:review_lease';
  }

  if (types.has('collection_exception')) {
    return 'real_estate:review_collection';
  }

  if (types.has('maintenance_exception')) {
    return 'real_estate:create_work_order';
  }

  if (types.has('occupancy_exception')) {
    return 'real_estate:review_rent';
  }

  return 'real_estate:decision-action';
}

function runRealEstateControlPlane(input = {}) {
  const domain = analyzePortfolio(input);

  const predictions = buildPredictions(domain);

  const actionType =
    input.actionType ||
    selectAction(domain);

  const result = runProductionControlPlane({
    ...domain,

    actionType,

    actionPayload:
      input.actionPayload || {},

    predictions,

    actor:
      input.actor ||
      'real-estate-control-plane'
  });

  // Preserve the canonical control-plane decisions[] collection
  // while exposing the primary decision through the PM-facing
  // singular decision contract.
  result.decision =
    Array.isArray(result.decisions) &&
    result.decisions.length > 0
      ? result.decisions[0]
      : null;

  // PM-facing singular action contract.
  // Preserve canonical actions[] collection while exposing
  // the selected Real Estate action as result.action.
  result.action =
    Array.isArray(result.actions) &&
    result.actions.length > 0
      ? result.actions[0]
      : null;

  return result;
}

module.exports = {
  VERTICAL,
  buildPredictions,
  selectAction,
  runRealEstateControlPlane
};
