'use strict';

/**
 * TSM Construction Executive Decision Engine v1
 *
 * Thin wrapper over the shared decision-engine core, configured with
 * Construction's own domain vocabulary. Mirrors server/pm/decision-engine.js
 * exactly -- see that file and server/shared/decision-engine-core.js for
 * the full design rationale.
 */

const { createDecisionEngine } = require('../shared/decision-engine-core');
const constructionDomainConfig = require('./construction-domain-config');

module.exports = createDecisionEngine({
  version: 'construction-decision-engine-v1',
  idPrefix: 'CON-DEC',
  ...constructionDomainConfig
});
