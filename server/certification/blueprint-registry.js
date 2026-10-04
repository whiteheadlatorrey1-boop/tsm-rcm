'use strict';
// Credential blueprints. NEW CODE: edit ids/skills to match your real credentials.
// revenueLinked: only build adapters for credentials tied to revenue.
const BLUEPRINTS = {
  'servicenow-csa': {
    id: 'servicenow-csa',
    name: 'ServiceNow Certified System Administrator',
    vendor: 'ServiceNow',
    revenueLinked: true,
    minOverallScore: 70,
    skills: [
      { id: 'incident-mgmt', minScore: 70, minSamples: 5 },
      { id: 'work-notes', minScore: 70, minSamples: 5 },
      { id: 'access-control', minScore: 65, minSamples: 3 },
    ],
  },
  'itil-4-foundation': {
    id: 'itil-4-foundation',
    name: 'ITIL 4 Foundation',
    vendor: 'PeopleCert',
    revenueLinked: false,
    minOverallScore: 70,
    skills: [
      { id: 'service-mgmt', minScore: 70, minSamples: 5 },
      { id: 'change-enablement', minScore: 65, minSamples: 3 },
    ],
  },
};

function getBlueprint(id) {
  const b = BLUEPRINTS[id];
  if (!b) throw new Error('Unknown blueprint: ' + id);
  return b;
}
function listBlueprints() { return Object.values(BLUEPRINTS); }

module.exports = { BLUEPRINTS, getBlueprint, listBlueprints };
