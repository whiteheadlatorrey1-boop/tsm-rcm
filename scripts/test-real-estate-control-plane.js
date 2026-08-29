'use strict';

/**
 * Real Estate Canonical Control Plane Runtime Test
 *
 * Verifies:
 *
 *   Real Estate facts
 *       -> domain normalization
 *       -> domain findings/exposures
 *       -> predictions
 *       -> canonical control plane
 *       -> risk
 *       -> forecast
 *       -> decision
 *       -> governance
 *       -> action
 *       -> persistence
 *
 * No HTTP server or LLM dependency is required.
 */

const assert = require('assert');

const {
  runRealEstateControlPlane,
  buildPredictions,
  selectAction
} = require('../server/real-estate/real-estate-control-plane');

const {
  clear,
  snapshot
} = require('../server/vertical-control-plane');

clear();

const today = new Date();

function daysFromNow(days) {
  return new Date(
    today.getTime() +
    days * 24 * 60 * 60 * 1000
  ).toISOString();
}

const input = {
  entities: [
    {
      id: 'property-101',
      type: 'property',
      name: 'TSM Demo Apartments'
    },

    {
      id: 'unit-101A',
      type: 'unit',
      propertyId: 'property-101',
      occupancy: 'occupied'
    },

    {
      id: 'unit-101B',
      type: 'unit',
      propertyId: 'property-101',
      occupancy: 'VACANT'
    },

    {
      id: 'unit-101C',
      type: 'unit',
      propertyId: 'property-101',
      occupancy: 'Occupied'
    },

    {
      id: 'lease-101',
      type: 'lease',
      propertyId: 'property-101',
      unitId: 'unit-101A',
      tenantId: 'tenant-101',
      monthlyRent: 1800,
      balanceDue: 2400,
      expirationDate: daysFromNow(21)
    },

    {
      id: 'tenant-101',
      type: 'tenant',
      propertyId: 'property-101'
    }
  ],

  events: [
    {
      id: 'maint-001',
      type: 'maintenance',
      value: 500
    },

    {
      id: 'maint-002',
      type: 'maintenance',
      value: 700
    }
  ],

  forecastPeriods: 3,
  actor: 'real-estate-runtime-test'
};

console.log('=== REAL ESTATE CONTROL PLANE TEST ===');

const predictions = buildPredictions({
  entities: input.entities,
  events: input.events
});

assert(
  predictions.some(
    p => p.metric === 'vacancy_rate'
  ),
  'vacancy_rate prediction missing'
);

const vacancyPrediction = predictions.find(
  p => p.metric === 'vacancy_rate'
);

assert.strictEqual(
  vacancyPrediction.value,
  0.3333,
  'vacancy rate should be rounded to 4 decimals'
);

assert(
  predictions.some(
    p => p.metric === 'monthly_rent_exposure' &&
      p.value === 1800
  ),
  'monthly rent prediction missing'
);

assert(
  predictions.some(
    p => p.metric === 'rent_arrears' &&
      p.value === 2400
  ),
  'rent arrears prediction missing'
);

assert.strictEqual(
  selectAction({
    findings: [
      { type: 'lease_exception' }
    ]
  }),
  'real_estate:review_lease'
);

const result = runRealEstateControlPlane(input);

assert.strictEqual(
  result.vertical,
  'real_estate',
  'canonical vertical mismatch'
);

assert(
  result.entities.some(
    entity => entity.id === 'unit-101B'
  ),
  'normalized entities missing'
);

assert(
  result.findings.some(
    finding => finding.type === 'occupancy_exception'
  ),
  'occupancy finding missing'
);

assert(
  result.findings.some(
    finding => finding.type === 'lease_exception'
  ),
  'lease finding missing'
);

assert(
  result.findings.some(
    finding => finding.type === 'collection_exception'
  ),
  'collection finding missing'
);

assert(
  result.findings.some(
    finding => finding.type === 'maintenance_exception'
  ),
  'maintenance finding missing'
);

assert(
  result.exposures.some(
    exposure =>
      exposure.type === 'rent_arrears' &&
      exposure.amount === 2400
  ),
  'rent arrears exposure missing'
);

assert(
  result.exposures.some(
    exposure =>
      exposure.type === 'rent' &&
      exposure.amount === 1800
  ),
  'monthly rent exposure missing'
);

assert(
  result.relationships.length >= 4,
  'expected Real Estate relationships were not generated'
);

assert(
  result.risk &&
  Number.isFinite(result.risk.score),
  'risk score missing'
);

assert(
  result.forecast &&
  Array.isArray(result.forecast.projected),
  'forecast projection missing'
);

assert(
  result.decision &&
  result.decision.recommendation,
  'canonical decision missing'
);

assert.strictEqual(
  result.decision.status,
  'proposed',
  'decision must remain proposed before approval'
);

assert.strictEqual(
  result.governance.approved,
  false,
  'decision must not be automatically approved'
);

assert(
  result.action &&
  result.action.type === 'real_estate:review_lease',
  'domain-specific action was not selected'
);

assert.strictEqual(
  result.action.status,
  'proposed',
  'action must remain proposed'
);

assert(
  result.persistence &&
  result.persistence.persisted === true,
  'persistence contract not reported'
);

const persisted = snapshot();

assert(
  persisted.envelopes >= 1,
  'envelope was not persisted'
);

assert(
  persisted.decisions >= 1,
  'decision was not persisted'
);

assert(
  persisted.actions >= 1,
  'action was not persisted'
);

console.log('PASS: Real Estate domain normalization');
console.log('PASS: Occupancy finding');
console.log('PASS: Lease finding');
console.log('PASS: Collection exposure/finding');
console.log('PASS: Maintenance finding');
console.log('PASS: Relationships');
console.log('PASS: Predictions');
console.log('PASS: Risk');
console.log('PASS: Forecast');
console.log('PASS: Canonical decision');
console.log('PASS: Governance remains unapproved');
console.log('PASS: Domain action selection');
console.log('PASS: Persistence contract');
console.log('');
console.log('REAL ESTATE CONTROL PLANE: PASS');
