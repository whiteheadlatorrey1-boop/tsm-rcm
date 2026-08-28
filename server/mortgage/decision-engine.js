'use strict';

/**
 * TSM Mortgage Executive Decision Engine v1
 *
 * Thin wrapper over the shared decision-engine core, configured with
 * Mortgage's own domain vocabulary. Mirrors server/pm/decision-engine.js
 * exactly -- see that file and server/shared/decision-engine-core.js for
 * the full design rationale.
 */

const { createDecisionEngine } = require('../shared/decision-engine-core');
const mortgageDomainConfig = require('./mortgage-domain-config');

module.exports = createDecisionEngine({
  version: 'mortgage-decision-engine-v1',
  idPrefix: 'MTG-DEC',
  ...mortgageDomainConfig
});
