'use strict';

/**
 * TSM Schools/Grants Executive Decision Engine v1
 *
 * Thin wrapper over the shared decision-engine core, configured with
 * Schools' own domain vocabulary. Mirrors server/mortgage/decision-engine.js
 * exactly -- see that file and server/shared/decision-engine-core.js for
 * the full design rationale.
 */

const { createDecisionEngine } = require('../shared/decision-engine-core');
const schoolsDomainConfig = require('./schools-domain-config');

module.exports = createDecisionEngine({
  version: 'schools-decision-engine-v1',
  idPrefix: 'SCH-DEC',
  ...schoolsDomainConfig
});
