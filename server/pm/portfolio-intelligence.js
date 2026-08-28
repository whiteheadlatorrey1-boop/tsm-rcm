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
