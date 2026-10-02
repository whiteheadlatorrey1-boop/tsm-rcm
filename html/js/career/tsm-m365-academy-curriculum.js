'use strict';

/*
 * TSM Phase 10B — Microsoft 365 Academy Curriculum
 *
 * Curriculum is deterministic data.
 * It does not replace existing Career Training.
 */

var VERSION = '10B.0';

var MODULES = [
  {
    moduleId: 'M365-FOUND-001',
    trackId: 'm365_foundations',
    title: 'Microsoft 365 Foundations',
    product: 'Microsoft 365',
    level: 'foundational',
    competencies: [
      'technical_fundamentals',
      'tool_usage',
      'role_domain_knowledge'
    ],
    prerequisites: []
  },
  {
    moduleId: 'M365-OUTLOOK-001',
    trackId: 'm365_productivity',
    title: 'Outlook and Professional Email',
    product: 'Outlook',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'professional_communication',
      'documentation'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-TEAMS-001',
    trackId: 'm365_collaboration',
    title: 'Teams Collaboration',
    product: 'Microsoft Teams',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'team_collaboration',
      'professional_communication'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-WORD-001',
    trackId: 'm365_productivity',
    title: 'Word and Business Documentation',
    product: 'Word',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'technical_documentation',
      'case_documentation'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-EXCEL-001',
    trackId: 'm365_data',
    title: 'Excel for Workforce Operations',
    product: 'Excel',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'technical_fundamentals',
      'decision_making'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-PPT-001',
    trackId: 'm365_productivity',
    title: 'PowerPoint and Business Presentations',
    product: 'PowerPoint',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'professional_communication',
      'documentation'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-ONEDRIVE-001',
    trackId: 'm365_collaboration',
    title: 'OneDrive and File Management',
    product: 'OneDrive',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'documentation',
      'workflow_execution'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-SHAREPOINT-001',
    trackId: 'm365_collaboration',
    title: 'SharePoint Fundamentals',
    product: 'SharePoint',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'workflow_execution',
      'documentation'
    ],
    prerequisites: ['M365-ONEDRIVE-001']
  },
  {
    moduleId: 'M365-FORMS-001',
    trackId: 'm365_workflow',
    title: 'Forms and Information Collection',
    product: 'Microsoft Forms',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'workflow_execution',
      'documentation'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-PLANNER-001',
    trackId: 'm365_workflow',
    title: 'Planner and Task Coordination',
    product: 'Planner',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'workflow_execution',
      'team_collaboration'
    ],
    prerequisites: ['M365-TEAMS-001']
  },
  {
    moduleId: 'M365-POWER-AUTO-001',
    trackId: 'm365_workflow',
    title: 'Power Automate Fundamentals',
    product: 'Power Automate',
    level: 'foundational',
    competencies: [
      'tool_usage',
      'workflow_execution',
      'problem_solving'
    ],
    prerequisites: ['M365-FORMS-001']
  },
  {
    moduleId: 'M365-ENTRA-001',
    trackId: 'm365_administration',
    title: 'Microsoft Entra Fundamentals',
    product: 'Microsoft Entra',
    level: 'administration',
    competencies: [
      'technical_fundamentals',
      'system_troubleshooting',
      'role_compliance_knowledge'
    ],
    prerequisites: ['M365-FOUND-001']
  },
  {
    moduleId: 'M365-INTUNE-001',
    trackId: 'm365_administration',
    title: 'Microsoft Intune Fundamentals',
    product: 'Microsoft Intune',
    level: 'administration',
    competencies: [
      'technical_configuration',
      'system_troubleshooting',
      'policy_procedure_execution'
    ],
    prerequisites: ['M365-ENTRA-001']
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listModules() {
  return clone(MODULES);
}

function getModule(moduleId) {
  var id = String(moduleId || '').trim();

  for (var i = 0; i < MODULES.length; i += 1) {
    if (MODULES[i].moduleId === id) return clone(MODULES[i]);
  }

  return null;
}

function listTracks() {
  var seen = {};
  var result = [];

  MODULES.forEach(function (module) {
    if (!seen[module.trackId]) {
      seen[module.trackId] = true;
      result.push({
        trackId: module.trackId,
        modules: 0
      });
    }

    result.forEach(function (track) {
      if (track.trackId === module.trackId) {
        track.modules += 1;
      }
    });
  });

  return result;
}

function getTrack(trackId) {
  var id = String(trackId || '').trim();

  return MODULES
    .filter(function (module) {
      return module.trackId === id;
    })
    .map(clone);
}

module.exports = {
  VERSION: VERSION,
  listModules: listModules,
  getModule: getModule,
  listTracks: listTracks,
  getTrack: getTrack
};
