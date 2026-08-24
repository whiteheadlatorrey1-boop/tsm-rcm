'use strict';

const PAINPOINTS = {

  revenue_leakage: {
    id: 'revenue_leakage',
    title: 'Revenue Leakage',
    question: 'Where are we losing money?',
    outcomes: [
      'identify financial exposure',
      'prioritize recoverable value',
      'assign corrective action',
      'measure recovered value'
    ]
  },

  backlog: {
    id: 'backlog',
    title: 'Backlog',
    question: 'What work is stuck?',
    outcomes: [
      'identify aging work',
      'prioritize urgent items',
      'assign ownership',
      'measure backlog reduction'
    ]
  },

  compliance_risk: {
    id: 'compliance_risk',
    title: 'Compliance Risk',
    question: 'Where are we exposed?',
    outcomes: [
      'identify exceptions',
      'identify missing evidence',
      'assign remediation',
      'measure risk reduction'
    ]
  },

  sla_risk: {
    id: 'sla_risk',
    title: 'SLA Risk',
    question: 'Where are service commitments at risk?',
    outcomes: [
      'identify SLA exposure',
      'prioritize work',
      'assign ownership',
      'measure SLA attainment'
    ]
  },

  documentation: {
    id: 'documentation',
    title: 'Documentation Gaps',
    question: 'What information is missing?',
    outcomes: [
      'identify missing documents',
      'identify conflicting information',
      'request evidence',
      'measure completion'
    ]
  },

  operational_exceptions: {
    id: 'operational_exceptions',
    title: 'Operational Exceptions',
    question: 'What needs attention now?',
    outcomes: [
      'identify exceptions',
      'prioritize by impact',
      'assign action',
      'measure resolution'
    ]
  },

  decision_delays: {
    id: 'decision_delays',
    title: 'Decision Delays',
    question: 'What decisions are stuck?',
    outcomes: [
      'surface unresolved decisions',
      'provide evidence',
      'assign decision owner',
      'measure decision cycle time'
    ]
  },

  executive_visibility: {
    id: 'executive_visibility',
    title: 'Executive Visibility',
    question: 'What does leadership need to know?',
    outcomes: [
      'summarize risk',
      'summarize financial exposure',
      'summarize actions',
      'measure outcomes'
    ]
  }

};

function getPainPoint(id) {
  return PAINPOINTS[id] || null;
}

function listPainPoints() {
  return Object.values(PAINPOINTS);
}

module.exports = {
  PAINPOINTS,
  getPainPoint,
  listPainPoints
};
