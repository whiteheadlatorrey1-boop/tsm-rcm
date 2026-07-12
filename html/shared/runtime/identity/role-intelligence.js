/**
 * role-intelligence.js
 *
 * Maps a role to a presentation profile: what kind of content that role
 * should be shown by default, and in what density/format. Vertical
 * executive portals and war rooms consult this to decide which panels to
 * surface, not to decide what data the user is authorized to see -- that
 * remains Security/Governance's job.
 */

const ROLE_PROFILES = {
  executive: {
    label: 'Executive',
    view: 'risk-summary',
    density: 'low',
    prioritize: ['riskScore', 'financialImpact', 'trendDirection', 'recommendation'],
    hide: ['rawEvidence', 'queryLogs'],
  },
  analyst: {
    label: 'Analyst',
    view: 'evidence',
    density: 'high',
    prioritize: ['dataRefs', 'ruleTrace', 'confidence', 'outliers'],
    hide: [],
  },
  operator: {
    label: 'Operator',
    view: 'tasks',
    density: 'medium',
    prioritize: ['queue', 'slaCountdown', 'nextAction'],
    hide: ['strategicNarrative'],
  },
  auditor: {
    label: 'Auditor',
    view: 'history',
    density: 'high',
    prioritize: ['auditTrail', 'approvals', 'outcomes', 'timestamps'],
    hide: ['recommendation'],
  },
  admin: {
    label: 'Administrator',
    view: 'system',
    density: 'high',
    prioritize: ['systemHealth', 'userManagement', 'configuration'],
    hide: [],
  },
};

const DEFAULT_PROFILE = ROLE_PROFILES.operator;

function getProfileForRole(role) {
  return ROLE_PROFILES[role] || Object.assign({}, DEFAULT_PROFILE, { label: role || 'Unknown' });
}

function listRoles() {
  return Object.keys(ROLE_PROFILES);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ROLE_PROFILES: ROLE_PROFILES, getProfileForRole: getProfileForRole, listRoles: listRoles };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.roleIntelligence = { ROLE_PROFILES: ROLE_PROFILES, getProfileForRole: getProfileForRole, listRoles: listRoles };
}
