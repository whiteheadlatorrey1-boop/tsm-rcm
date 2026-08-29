'use strict';

/**
 * TSM Healthcare (RCM) Executive Decision Engine v1
 *
 * Thin wrapper over the shared decision-engine core, configured with
 * Healthcare's own domain vocabulary. Mirrors server/mortgage/decision-engine.js
 * exactly -- see that file and server/shared/decision-engine-core.js for
 * the full design rationale.
 */

const { createDecisionEngine } = require('../shared/decision-engine-core');
const hcDomainConfig = require('./hc-domain-config');

module.exports = createDecisionEngine({
  version: 'hc-decision-engine-v1',
  idPrefix: 'HC-DEC',
  ...hcDomainConfig
});
