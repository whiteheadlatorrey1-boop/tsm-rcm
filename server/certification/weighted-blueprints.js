'use strict';
// Weighted-domain blueprints built from official exam specifications.
// Source and caveats: docs/CERTIFICATION_BLUEPRINT_SOURCES.md
// readiness.* values are OUR platform thresholds, not the vendor's cut score.
const WEIGHTED_BLUEPRINTS = {
  'servicenow-csa-2026': {
    id: 'servicenow-csa-2026',
    name: 'ServiceNow Certified System Administrator (CSA) Mainline',
    vendor: 'ServiceNow',
    source: 'ServiceNow University KB0011554, Updated January 2026',
    exam: { questions: 60, minutes: 90, officialPassScore: null }, // cut score not publicly disclosed
    readiness: { readyTarget: 75, domainFloor: 60, minSamplesPerDomain: 10, minFullSims: 2 },
    domains: [
      { id: 'platform-nav', name: 'Platform Overview and Navigation', weight: 7,
        topics: ['ServiceNow Platform overview', 'Platform capabilities and services', 'The ServiceNow Instance', 'Next Experience Unified Navigation'] },
      { id: 'instance-config', name: 'Instance Configuration', weight: 10,
        topics: ['Installing applications and plugins', 'Personalizing/customizing the instance', 'Common user interfaces in the Platform'] },
      { id: 'collaboration', name: 'Configuring Applications for Collaboration', weight: 20,
        topics: ['Lists, Filters, and Tags', 'List and Form anatomy', 'Form Configuration', 'Form templates and saving options', 'Advanced Form Configuration', 'Task Management', 'Visual Task Boards', 'Visualizations, Dashboards, and Platform Analytics', 'Notifications'] },
      { id: 'self-service-automation', name: 'Self Service & Automation', weight: 20,
        topics: ['Knowledge Management', 'Service Catalog', 'Workflow Studio', 'Virtual Agent'] },
      { id: 'database-security', name: 'Database Management and Platform Security', weight: 30,
        topics: ['Data Schema', 'Application/Access Control', 'Importing Data', 'CMDB and CSDM', 'Security Center', 'Shared Responsibility Model'] },
      { id: 'migration-integration', name: 'Data Migration and Integration', weight: 13,
        topics: ['UI Policies', 'Business Rules', 'System update sets', 'Scripting in ServiceNow'] },
    ],
  },
};

function getWeightedBlueprint(id) {
  const b = WEIGHTED_BLUEPRINTS[id];
  if (!b) throw new Error('Unknown weighted blueprint: ' + id);
  return b;
}
function listWeightedBlueprints() { return Object.values(WEIGHTED_BLUEPRINTS); }

module.exports = { WEIGHTED_BLUEPRINTS, getWeightedBlueprint, listWeightedBlueprints };
