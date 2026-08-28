'use strict';

const assert = require('assert');

const {
  buildPortfolioTwin
} = require('../server/pm/portfolio-intelligence');

const {
  calculateRisk
} = require('../server/pm/risk-engine');

const {
  forecast
} = require('../server/pm/forecast-engine');

const fixture = {
  financials: {
    total_exposure: 40445
  },

  properties: [
    { id: 'P-001', status: 'ACTIVE' }
  ],

  units: [
    {
      id: 'U-101',
      propertyId: 'P-001',
      status: 'OCCUPIED'
    }
  ],

  vendors: [
    {
      id: 'V-03',
      propertyId: 'P-001',
      status: 'expired'
    }
  ],

  work_orders: [
    {
      id: 'WO-2201',
      propertyId: 'P-001',
      vendorId: 'V-03',
      status: 'overdue'
    }
  ],

  findings: [
    {
      id: 'S-211',
      propertyId: 'P-001',
      severity: 'critical',
      finding: 'Urgent water leak sensor alert',
      exposure: 3000
    }
  ]
};

const twin = buildPortfolioTwin(fixture);
const risk = calculateRisk(twin, fixture);
const projected = forecast(fixture, twin, risk);

assert.strictEqual(twin.counts.properties, 1);
assert.strictEqual(twin.counts.units, 1);
assert.strictEqual(twin.counts.vendors, 1);
assert.strictEqual(twin.counts.workOrders, 1);
assert.strictEqual(twin.counts.findings, 1);

assert(risk.score > 0);
assert(['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'].includes(risk.level));

assert.strictEqual(projected.currentExposure, 40445);
assert(projected.modeledProjection.projectedExposure >= 40445);

console.log('PM Intelligence v2 test: PASS');

console.log(JSON.stringify({
  twin: twin.counts,
  risk: {
    score: risk.score,
    level: risk.level,
    signals: risk.signals.length
  },
  forecast: projected.modeledProjection
}, null, 2));
