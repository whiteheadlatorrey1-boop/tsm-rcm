'use strict';

/**
 * TSM PM Executive Decision Engine v1
 *
 * Thin wrapper over the shared decision-engine core (server/shared/
 * decision-engine-core.js), configured with PM Copilot's own domain
 * vocabulary (server/pm/pm-domain-config.js).
 *
 * Refactored 2026-08-28 to extract the vertical-agnostic logic into the
 * shared core so Mortgage/Construction (and future verticals) can reuse it
 * without forking this file. Output shape and behavior are unchanged --
 * see server/pm/pm-domain-config.js for the exact domain rules, extracted
 * verbatim from the pre-refactor version of this file.
 */

const { createDecisionEngine } = require('../shared/decision-engine-core');
const pmDomainConfig = require('./pm-domain-config');

module.exports = createDecisionEngine({
  version: 'pm-decision-engine-v1',
  idPrefix: 'PM-DEC',
  ...pmDomainConfig
});
