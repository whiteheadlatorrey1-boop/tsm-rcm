'use strict';

/**
 * TSM Real Estate Domain Configuration
 *
 * Domain concepts are normalized into the canonical vertical
 * control-plane contract. No source-system mutation occurs here.
 */

const VERTICAL = 'real_estate';

const ENTITY_TYPES = [
  'property',
  'unit',
  'tenant',
  'lease',
  'vendor',
  'work_order'
];

const EVENT_TYPES = [
  'rent',
  'maintenance',
  'occupancy',
  'lease_expiration',
  'collection',
  'inspection',
  'work_order'
];

const FINDING_TYPES = [
  'lease_exception',
  'rent_exception',
  'maintenance_exception',
  'occupancy_exception',
  'collection_exception',
  'compliance_exception'
];

const ACTION_TYPES = [
  'review_lease',
  'contact_tenant',
  'create_work_order',
  'review_rent',
  'review_collection',
  'escalate_property'
];

module.exports = {
  VERTICAL,
  ENTITY_TYPES,
  EVENT_TYPES,
  FINDING_TYPES,
  ACTION_TYPES
};
