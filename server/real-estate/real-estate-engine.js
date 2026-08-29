'use strict';

/**
 * TSM Real Estate Domain Engine
 *
 * Converts property-management facts into the canonical
 * TSM Vertical Control Plane contract.
 *
 * Design principles:
 *   - deterministic domain normalization
 *   - explicit evidence
 *   - domain-specific findings
 *   - no source-system mutation
 *   - governance remains owned by the canonical control plane
 */

const {
  VERTICAL,
  ENTITY_TYPES,
  EVENT_TYPES,
  FINDING_TYPES
} = require('./real-estate-domain-config');

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, finite(value)));
}

function normalizeEntity(entity = {}) {
  return {
    id:
      entity.id ||
      entity.propertyId ||
      entity.unitId ||
      entity.tenantId ||
      entity.leaseId ||
      `entity-${Date.now()}`,

    type: entity.type || 'property',

    ...entity
  };
}

function normalizeEvent(event = {}) {
  return {
    id: event.id || `event-${Date.now()}`,
    type: event.type || 'operational',
    value: finite(event.value),
    timestamp:
      event.timestamp ||
      new Date().toISOString(),
    ...event
  };
}

function normalizeFinding(finding = {}) {
  return {
    id: finding.id || `finding-${Date.now()}`,
    type:
      finding.type ||
      'real_estate_exception',

    severityScore: clamp(
      finding.severityScore
    ),

    evidence: Array.isArray(finding.evidence)
      ? finding.evidence
      : [],

    ...finding
  };
}

function normalizeExposure(exposure = {}) {
  return {
    id:
      exposure.id ||
      `exposure-${Date.now()}`,

    type:
      exposure.type ||
      'rent',

    amount:
      finite(exposure.amount),

    ...exposure
  };
}

function evidence(
  source,
  sourceId,
  confidence = 0.95
) {
  return {
    id:
      `evidence-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,

    source,
    sourceId,
    confidence
  };
}

function buildRelationships(entities = []) {
  const relationships = [];

  const properties = entities.filter(
    item => item.type === 'property'
  );

  const units = entities.filter(
    item => item.type === 'unit'
  );

  const leases = entities.filter(
    item => item.type === 'lease'
  );

  const tenants = entities.filter(
    item => item.type === 'tenant'
  );

  for (const unit of units) {
    if (unit.propertyId) {
      relationships.push({
        sourceId: unit.id,
        sourceType: 'unit',
        relationship: 'belongs_to',
        targetId: unit.propertyId,
        targetType: 'property'
      });
    }
  }

  for (const lease of leases) {
    if (lease.propertyId) {
      relationships.push({
        sourceId: lease.id,
        sourceType: 'lease',
        relationship: 'for_property',
        targetId: lease.propertyId,
        targetType: 'property'
      });
    }

    if (lease.unitId) {
      relationships.push({
        sourceId: lease.id,
        sourceType: 'lease',
        relationship: 'for_unit',
        targetId: lease.unitId,
        targetType: 'unit'
      });
    }

    if (lease.tenantId) {
      relationships.push({
        sourceId: lease.id,
        sourceType: 'lease',
        relationship: 'held_by',
        targetId: lease.tenantId,
        targetType: 'tenant'
      });
    }
  }

  for (const tenant of tenants) {
    if (tenant.propertyId) {
      relationships.push({
        sourceId: tenant.id,
        sourceType: 'tenant',
        relationship: 'occupies_property',
        targetId: tenant.propertyId,
        targetType: 'property'
      });
    }
  }

  return relationships;
}

function deriveOccupancyFindings(
  entities,
  findings
) {
  const units = entities.filter(
    item => item.type === 'unit'
  );

  const occupied = units.filter(
    unit =>
      String(unit.occupancy || '').toLowerCase() ===
      'occupied'
  );

  const vacant = units.filter(
    unit =>
      String(unit.occupancy || '').toLowerCase() ===
      'vacant'
  );

  if (vacant.length === 0 || units.length === 0) {
    return findings;
  }

  const vacancyRate =
    vacant.length / units.length;

  const severity =
    clamp(vacancyRate * 100);

  findings.push(
    normalizeFinding({
      id: 're-occupancy-exception',
      type: 'occupancy_exception',
      severityScore: severity,
      evidence: vacant.map(
        unit =>
          evidence(
            'property-management-system',
            unit.id,
            0.97
          )
      ),
      metadata: {
        totalUnits: units.length,
        occupiedUnits: occupied.length,
        vacantUnits: vacant.length,
        vacancyRate
      }
    })
  );

  return findings;
}

function deriveLeaseFindings(
  entities,
  findings
) {
  const leases = entities.filter(
    item => item.type === 'lease'
  );

  const now = Date.now();

  for (const lease of leases) {
    if (!lease.expirationDate) {
      continue;
    }

    const expiration =
      new Date(lease.expirationDate).getTime();

    if (!Number.isFinite(expiration)) {
      continue;
    }

    const daysRemaining =
      Math.round(
        (expiration - now) /
        (1000 * 60 * 60 * 24)
      );

    if (daysRemaining <= 90) {
      const severity =
        daysRemaining <= 30
          ? 90
          : daysRemaining <= 60
            ? 75
            : 60;

      findings.push(
        normalizeFinding({
          id:
            `lease-expiration-${lease.id}`,

          type:
            'lease_exception',

          severityScore:
            severity,

          evidence: [
            evidence(
              'property-management-system',
              lease.id,
              0.99
            )
          ],

          metadata: {
            leaseId: lease.id,
            expirationDate:
              lease.expirationDate,
            daysRemaining
          }
        })
      );
    }
  }

  return findings;
}

function deriveCollectionFindings(
  entities,
  exposures,
  findings
) {
  const leases = entities.filter(
    item => item.type === 'lease'
  );

  const delinquent =
    leases.filter(
      lease =>
        finite(lease.balanceDue) > 0
    );

  if (delinquent.length === 0) {
    return findings;
  }

  const totalDue =
    delinquent.reduce(
      (sum, lease) =>
        sum + finite(lease.balanceDue),
      0
    );

  exposures.push(
    normalizeExposure({
      id: 'collection-exposure',
      type: 'rent_arrears',
      amount: totalDue
    })
  );

  findings.push(
    normalizeFinding({
      id: 'collection-exception',
      type: 'collection_exception',
      severityScore:
        clamp(
          Math.min(
            100,
            delinquent.length * 15 +
            Math.min(
              50,
              totalDue / 1000
            )
          )
        ),
      evidence:
        delinquent.map(
          lease =>
            evidence(
              'property-management-system',
              lease.id,
              0.96
            )
        ),
      metadata: {
        delinquentLeaseCount:
          delinquent.length,
        totalDue
      }
    })
  );

  return findings;
}

function deriveMaintenanceFindings(
  events,
  findings
) {
  const maintenance =
    events.filter(
      event =>
        event.type === 'maintenance'
    );

  if (maintenance.length < 2) {
    return findings;
  }

  const costs =
    maintenance.map(
      event =>
        finite(event.value)
    );

  const first =
    costs[0];

  const last =
    costs[costs.length - 1];

  if (last <= first) {
    return findings;
  }

  const increase =
    first === 0
      ? 100
      : ((last - first) / first) * 100;

  if (increase >= 20) {
    findings.push(
      normalizeFinding({
        id:
          'maintenance-trend-exception',

        type:
          'maintenance_exception',

        severityScore:
          clamp(increase),

        evidence:
          maintenance.map(
            event =>
              evidence(
                'maintenance-management-system',
                event.id,
                0.94
              )
          ),

        metadata: {
          firstCost: first,
          latestCost: last,
          increasePercent: increase
        }
      })
    );
  }

  return findings;
}

function deriveRentExposure(
  entities,
  exposures
) {
  const leases =
    entities.filter(
      item =>
        item.type === 'lease'
    );

  const monthlyRent =
    leases.reduce(
      (sum, lease) =>
        sum +
        finite(
          lease.monthlyRent
        ),
      0
    );

  if (monthlyRent > 0) {
    exposures.push(
      normalizeExposure({
        id: 'monthly-rent-exposure',
        type: 'rent',
        amount: monthlyRent
      })
    );
  }

  return exposures;
}

function buildForecastSeries(
  events
) {
  return events
    .filter(
      event =>
        [
          'maintenance',
          'rent',
          'collection'
        ].includes(event.type)
    )
    .map(
      event =>
        finite(event.value)
    )
    .filter(
      value =>
        Number.isFinite(value)
    );
}

function buildEnvelope(input = {}) {
  const entities =
    (input.entities || [])
      .map(normalizeEntity);

  const events =
    (input.events || [])
      .map(normalizeEvent);

  const findings =
    (input.findings || [])
      .map(normalizeFinding);

  const exposures =
    (input.exposures || [])
      .map(normalizeExposure);

  deriveOccupancyFindings(
    entities,
    findings
  );

  deriveLeaseFindings(
    entities,
    findings
  );

  deriveCollectionFindings(
    entities,
    exposures,
    findings
  );

  deriveMaintenanceFindings(
    events,
    findings
  );

  deriveRentExposure(
    entities,
    exposures
  );

  const relationships =
    Array.isArray(input.relationships)
      ? [
          ...input.relationships,
          ...buildRelationships(entities)
        ]
      : buildRelationships(entities);

  const forecastSeries =
    Array.isArray(input.forecastSeries)
      ? input.forecastSeries
          .map(value => finite(value))
          .filter(Number.isFinite)
      : buildForecastSeries(events);

  return {
    vertical: VERTICAL,

    entities,

    events,

    findings,

    exposures,

    relationships,

    probability:
      finite(input.probability),

    forecastSeries,

    forecastPeriods:
      Math.max(
        1,
        Math.floor(
          finite(
            input.forecastPeriods,
            3
          )
        )
      ),

    actionType:
      input.actionType ||
      `${VERTICAL}:decision-action`,

    actionPayload:
      input.actionPayload || {},

    predictions:
      Array.isArray(input.predictions)
        ? input.predictions
        : [],

    actor:
      input.actor ||
      'real-estate-control-plane'
  };
}

function analyzePortfolio(input = {}) {
  return buildEnvelope(input);
}

module.exports = {
  VERTICAL,
  ENTITY_TYPES,
  EVENT_TYPES,
  FINDING_TYPES,
  finite,
  clamp,
  normalizeEntity,
  normalizeEvent,
  normalizeFinding,
  normalizeExposure,
  buildRelationships,
  deriveOccupancyFindings,
  deriveLeaseFindings,
  deriveCollectionFindings,
  deriveMaintenanceFindings,
  deriveRentExposure,
  buildForecastSeries,
  buildEnvelope,
  analyzePortfolio
};
