#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "============================================================"
echo " TSM PM — INTELLIGENCE V2 BUILD"
echo " Portfolio Digital Twin + Risk + Forecast"
echo "============================================================"

mkdir -p server/pm

cat > server/pm/portfolio-intelligence.js <<'JS'
'use strict';

/**
 * TSM PM Portfolio Intelligence v2
 *
 * Deterministic property-management intelligence layer.
 *
 * Responsibilities:
 *   - Normalize portfolio entities
 *   - Build property/unit/vendor/work-order relationships
 *   - Calculate operational risk signals
 *   - Preserve explainability
 *
 * No LLM required.
 */

const VERSION = 'pm-portfolio-intelligence-v2';

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
      item.unitId,
      item.unit_id,
      item.propertyId,
      item.property_id,
      item.vendorId,
      item.vendor_id,
      item.workOrderId,
      item.work_order_id
    ) || `${type}-unknown`),

    type,

    propertyId: first(
      item.propertyId,
      item.property_id,
      item.property
    ) || null,

    unitId: first(
      item.unitId,
      item.unit_id,
      item.unit
    ) || null,

    vendorId: first(
      item.vendorId,
      item.vendor_id,
      item.vendor
    ) || null,

    status: first(item.status, item.state) || 'UNKNOWN',

    exposure: num(first(
      item.exposure,
      item.financialExposure,
      item.financial_exposure,
      item.cost,
      item.amount
    )),

    severity: String(first(item.severity, item.priority) || 'normal').toLowerCase(),

    source: first(item.source, item.sources?.[0]) || VERSION
  };
}

function buildPortfolioTwin(payload = {}) {
  const sections = payload.sections || {};

  const properties = arr(
    sections.properties || payload.properties
  ).map(x => normalizeEntity(x, 'property'));

  const units = arr(
    sections.units || payload.units
  ).map(x => normalizeEntity(x, 'unit'));

  const vendors = arr(
    sections.vendors || payload.vendors
  ).map(x => normalizeEntity(x, 'vendor'));

  const workOrders = arr(
    sections.workOrders ||
    sections.work_orders ||
    payload.workOrders ||
    payload.work_orders
  ).map(x => normalizeEntity(x, 'work_order'));

  const findings = arr(payload.findings)
    .concat(arr(sections.findings))
    .map(x => normalizeEntity(x, 'finding'));

  const relationships = [];

  [...units, ...workOrders, ...findings].forEach(entity => {
    if (entity.propertyId) {
      relationships.push({
        from: entity.id,
        relation: 'BELONGS_TO',
        to: entity.propertyId
      });
    }

    if (entity.unitId) {
      relationships.push({
        from: entity.id,
        relation: 'ASSOCIATED_WITH_UNIT',
        to: entity.unitId
      });
    }

    if (entity.vendorId) {
      relationships.push({
        from: entity.id,
        relation: 'ASSIGNED_TO_VENDOR',
        to: entity.vendorId
      });
    }
  });

  const all = [
    ...properties,
    ...units,
    ...vendors,
    ...workOrders,
    ...findings
  ];

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),

    counts: {
      properties: properties.length,
      units: units.length,
      vendors: vendors.length,
      workOrders: workOrders.length,
      findings: findings.length,
      relationships: relationships.length
    },

    properties,
    units,
    vendors,
    workOrders,
    findings,
    relationships,

    exposure: all.reduce(
      (sum, entity) => sum + num(entity.exposure),
      0
    )
  };
}

module.exports = {
  VERSION,
  buildPortfolioTwin
};
JS

cat > server/pm/risk-engine.js <<'JS'
'use strict';

/**
 * TSM PM Risk Engine v2
 *
 * Deterministic 0–100 operational risk scoring.
 */

const VERSION = 'pm-risk-engine-v2';

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function calculateRisk(twin = {}, payload = {}) {
  const findings = Array.isArray(twin.findings) ? twin.findings : [];
  const workOrders = Array.isArray(twin.workOrders) ? twin.workOrders : [];
  const vendors = Array.isArray(twin.vendors) ? twin.vendors : [];

  let score = 0;
  const signals = [];

  const critical = findings.filter(
    x => x.severity === 'critical'
  );

  const high = findings.filter(
    x => x.severity === 'high'
  );

  if (critical.length) {
    score += Math.min(40, critical.length * 20);

    signals.push({
      type: 'CRITICAL_FINDINGS',
      count: critical.length,
      impact: 'HIGH',
      explanation: `${critical.length} critical operational finding(s) require immediate management attention.`
    });
  }

  if (high.length) {
    score += Math.min(25, high.length * 10);

    signals.push({
      type: 'HIGH_FINDINGS',
      count: high.length,
      impact: 'MEDIUM',
      explanation: `${high.length} high-priority finding(s) increase portfolio operating risk.`
    });
  }

  const overdue = workOrders.filter(x =>
    /overdue|breach|late|sla/i.test(String(x.status))
  );

  if (overdue.length) {
    score += Math.min(20, overdue.length * 5);

    signals.push({
      type: 'SLA_RISK',
      count: overdue.length,
      impact: 'MEDIUM',
      explanation: `${overdue.length} work order(s) indicate SLA or response risk.`
    });
  }

  const vendorRisk = vendors.filter(x =>
    /expired|non.?compliant|suspended|failed/i.test(String(x.status))
  );

  if (vendorRisk.length) {
    score += Math.min(15, vendorRisk.length * 5);

    signals.push({
      type: 'VENDOR_RISK',
      count: vendorRisk.length,
      impact: 'MEDIUM',
      explanation: `${vendorRisk.length} vendor record(s) indicate compliance or performance risk.`
    });
  }

  score = Math.min(100, score);

  const level =
    score >= 75 ? 'CRITICAL' :
    score >= 50 ? 'HIGH' :
    score >= 25 ? 'ELEVATED' :
    'LOW';

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    score,
    level,
    signals,
    methodology: 'DETERMINISTIC',
    humanReviewRequired: true
  };
}

module.exports = {
  VERSION,
  calculateRisk
};
JS

cat > server/pm/forecast-engine.js <<'JS'
'use strict';

/**
 * TSM PM Exposure Forecast Engine v2
 *
 * Conservative deterministic planning model.
 * Values are modeled, not accounting/book-of-record values.
 */

const VERSION = 'pm-forecast-engine-v2';

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function forecast(payload = {}, twin = {}, risk = {}) {
  const financials =
    payload.sections?.financials ||
    payload.financials ||
    {};

  const current = num(
    financials.total_exposure ??
    payload.total_exposure ??
    payload.totalExposure ??
    twin.exposure
  );

  const riskMultiplier =
    risk.score >= 75 ? 1.30 :
    risk.score >= 50 ? 1.20 :
    risk.score >= 25 ? 1.10 :
    1.05;

  const projected = Math.round(current * riskMultiplier);

  const avoidable = Math.max(
    0,
    projected - current
  );

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),

    currentExposure: current,

    modeledProjection: {
      horizon: 'planning horizon',
      projectedExposure: projected,
      incrementalExposure: avoidable
    },

    scenario: {
      condition: 'If currently identified risks remain unresolved',
      projectedIncrementalExposure: avoidable,
      riskMultiplier
    },

    disclaimer:
      'Forecast values are modeled planning figures and are not guaranteed financial outcomes.',

    methodology: 'DETERMINISTIC',
    humanApprovalRequired: true
  };
}

module.exports = {
  VERSION,
  forecast
};
JS

cat > scripts/test-pm-intelligence-v2.js <<'JS'
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
JS

echo
echo "=== NODE SYNTAX ==="
node --check server/pm/portfolio-intelligence.js
node --check server/pm/risk-engine.js
node --check server/pm/forecast-engine.js
node --check scripts/test-pm-intelligence-v2.js

echo
echo "=== UNIT TEST ==="
NODE_PATH="$ROOT/node_modules" node scripts/test-pm-intelligence-v2.js

echo
echo "============================================================"
echo " PM INTELLIGENCE V2 BUILD: PASS"
echo "============================================================"
