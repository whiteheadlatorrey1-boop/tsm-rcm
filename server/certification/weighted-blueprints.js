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
  'nmls-safe-mlo-2026': {
    id: 'nmls-safe-mlo-2026',
    name: 'SAFE MLO National Test with Uniform State Content',
    vendor: 'NMLS / CSBS',
    source: 'NMLS MLO Testing Handbook 1.1-1.2 and SAFE MLO National Test Content Outline, looked up 2026-10-04',
    exam: { questions: 120, minutes: 190, officialPassScore: 75 }, // 115 scored + 5 unscored; 75% per NMLS handbook
    readiness: { readyTarget: 80, domainFloor: 65, minSamplesPerDomain: 10, minFullSims: 2 }, // OUR thresholds (target = NMLS 75 pass + 5 margin)
    domains: [
      { id: 'federal-laws', name: 'Federal Mortgage Related Laws', weight: 24,
        topics: ['RESPA (Regulation X)', 'ECOA (Regulation B)', 'TILA (Regulation Z)', 'TRID', 'Other federal laws and guidelines', 'Regulatory authority (CFPB, HUD)'] },
      { id: 'state-content', name: 'Uniform State Content', weight: 11,
        topics: ['SAFE Act and CSBS/AARMR Model State Law', 'State regulators and NMLS', 'License law and regulation', 'Compliance: prohibited acts and required conduct'] },
      { id: 'general-knowledge', name: 'General Mortgage Knowledge', weight: 20,
        topics: ['Qualified and non-qualified mortgage programs', 'Mortgage loan products', 'Terms used in the mortgage industry'] },
      { id: 'origination-activities', name: 'Mortgage Loan Origination Activities', weight: 27,
        topics: ['Loan inquiry and application process', 'Qualification: processing and underwriting', 'Closing', 'Financial calculations'] },
      { id: 'ethics', name: 'Ethics', weight: 18,
        topics: ['Ethical issues (prohibited acts, fairness in lending, fraud detection, advertising, predatory lending)', 'Ethical behavior in loan origination activities'] },
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
