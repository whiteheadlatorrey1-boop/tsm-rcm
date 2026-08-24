'use strict';

/**
 * TSM Report Registry
 *
 * Reports are organized around business questions.
 */

const REPORTS = {

  'healthcare.denial_recovery': {
    id: 'healthcare.denial_recovery',
    title: 'Denial Recovery Report',
    question: 'What denied revenue can we recover?',
    audience: ['Revenue Cycle', 'Denial Management', 'Executives'],
    value: 'Prioritizes recoverable revenue and next actions.'
  },

  'healthcare.revenue_leakage': {
    id: 'healthcare.revenue_leakage',
    title: 'Revenue Leakage Report',
    question: 'Where are we losing money?',
    audience: ['Revenue Cycle', 'Finance', 'Executives'],
    value: 'Shows financial exposure and leakage sources.'
  },

  'healthcare.appeal_priority': {
    id: 'healthcare.appeal_priority',
    title: 'Appeal Priority Queue',
    question: 'What should the team work first?',
    audience: ['Denial Management', 'Appeals'],
    value: 'Ranks work by financial exposure, urgency and opportunity.'
  },

  'healthcare.executive': {
    id: 'healthcare.executive',
    title: 'Executive Revenue-Cycle Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Condenses revenue-cycle risk, exposure and actions.'
  },

  'construction.project_risk': {
    id: 'construction.project_risk',
    title: 'Project Risk Report',
    question: 'What can hurt this project?',
    audience: ['Project Managers', 'Executives'],
    value: 'Surfaces cost, schedule and operational exposure.'
  },

  'construction.wip': {
    id: 'construction.wip',
    title: 'WIP & Billing Report',
    question: 'Where is project money stuck?',
    audience: ['Finance', 'Project Management'],
    value: 'Highlights WIP, billing and collection risk.'
  },

  'construction.permit': {
    id: 'construction.permit',
    title: 'Permit & Proposal Exception Report',
    question: 'What is blocking the project?',
    audience: ['Project Managers'],
    value: 'Identifies permit, proposal and documentation blockers.'
  },

  'construction.executive': {
    id: 'construction.executive',
    title: 'Executive Project Brief',
    question: 'What does leadership need to know about the project?',
    audience: ['Executives'],
    value: 'Summarizes project health, exposure and recommended action.'
  },

  'mortgage.pipeline_risk': {
    id: 'mortgage.pipeline_risk',
    title: 'Loan Pipeline Risk Report',
    question: 'Which loans are at risk?',
    audience: ['Loan Operations', 'Executives'],
    value: 'Prioritizes pipeline risk and bottlenecks.'
  },

  'mortgage.underwriting': {
    id: 'mortgage.underwriting',
    title: 'Underwriting Exception Report',
    question: 'Which underwriting conditions need attention?',
    audience: ['Underwriting', 'Operations'],
    value: 'Identifies missing, conflicting and high-risk information.'
  },

  'mortgage.closing': {
    id: 'mortgage.closing',
    title: 'Closing Readiness Report',
    question: 'Which loans are not ready to close?',
    audience: ['Closing', 'Operations'],
    value: 'Surfaces closing blockers before they create delays.'
  },

  'mortgage.executive': {
    id: 'mortgage.executive',
    title: 'Executive Mortgage Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes pipeline health, risk and bottlenecks.'
  },

  'real_estate.operations': {
    id: 'real_estate.operations',
    title: 'Property Operations Report',
    question: 'What is happening across the portfolio?',
    audience: ['Property Managers', 'Executives'],
    value: 'Provides operational visibility across properties.'
  },

  'real_estate.maintenance': {
    id: 'real_estate.maintenance',
    title: 'Maintenance Exception Report',
    question: 'What maintenance issues need attention?',
    audience: ['Property Managers', 'Maintenance'],
    value: 'Prioritizes maintenance issues by urgency and impact.'
  },

  'real_estate.vendor': {
    id: 'real_estate.vendor',
    title: 'Vendor Performance Report',
    question: 'Which vendors are creating operational risk?',
    audience: ['Property Managers', 'Executives'],
    value: 'Shows vendor performance and SLA risk.'
  },

  'real_estate.executive': {
    id: 'real_estate.executive',
    title: 'Portfolio Executive Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes portfolio health and operational exposure.'
  },

  'insurance.claims': {
    id: 'insurance.claims',
    title: 'Claims Risk Report',
    question: 'Which claims require attention?',
    audience: ['Claims', 'Executives'],
    value: 'Prioritizes claims risk and exposure.'
  },

  'insurance.compliance': {
    id: 'insurance.compliance',
    title: 'Compliance Exception Report',
    question: 'Where is compliance risk developing?',
    audience: ['Compliance', 'Executives'],
    value: 'Identifies compliance exceptions and remediation needs.'
  },

  'insurance.underwriting': {
    id: 'insurance.underwriting',
    title: 'Underwriting Risk Report',
    question: 'Which underwriting decisions require review?',
    audience: ['Underwriting'],
    value: 'Highlights risk and missing evidence.'
  },

  'insurance.executive': {
    id: 'insurance.executive',
    title: 'Executive Insurance Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes claims, compliance and underwriting risk.'
  },

  'finops.exceptions': {
    id: 'finops.exceptions',
    title: 'Financial Exception Report',
    question: 'What financial exceptions require attention?',
    audience: ['Finance', 'Accounting'],
    value: 'Prioritizes financial anomalies and exceptions.'
  },

  'finops.leakage': {
    id: 'finops.leakage',
    title: 'Spend & Leakage Report',
    question: 'Where are we losing money?',
    audience: ['Finance', 'Executives'],
    value: 'Identifies financial leakage and unnecessary spend.'
  },

  'finops.close': {
    id: 'finops.close',
    title: 'Close Readiness Report',
    question: 'Are we ready to close?',
    audience: ['Accounting', 'Finance'],
    value: 'Shows unresolved close-cycle exceptions.'
  },

  'finops.executive': {
    id: 'finops.executive',
    title: 'Executive Finance Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes financial risk and performance.'
  },

  'legal.matter_risk': {
    id: 'legal.matter_risk',
    title: 'Matter Risk Report',
    question: 'Which matters require attention?',
    audience: ['Legal', 'Executives'],
    value: 'Prioritizes matter risk and exposure.'
  },

  'legal.deadlines': {
    id: 'legal.deadlines',
    title: 'Deadline & Exception Report',
    question: 'What deadlines are at risk?',
    audience: ['Legal Operations'],
    value: 'Surfaces deadlines and unresolved exceptions.'
  },

  'legal.document': {
    id: 'legal.document',
    title: 'Document Intelligence Brief',
    question: 'What does the document set tell us?',
    audience: ['Legal'],
    value: 'Condenses document findings into actionable intelligence.'
  },

  'legal.executive': {
    id: 'legal.executive',
    title: 'Executive Legal Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes legal risk and recommended action.'
  },

  'bpo.sla': {
    id: 'bpo.sla',
    title: 'SLA Performance Report',
    question: 'Are we meeting our service commitments?',
    audience: ['BPO Operations', 'Clients'],
    value: 'Shows SLA performance and risk.'
  },

  'bpo.exceptions': {
    id: 'bpo.exceptions',
    title: 'Processing Exception Report',
    question: 'What processing problems need attention?',
    audience: ['Operations'],
    value: 'Prioritizes processing exceptions.'
  },

  'bpo.quality': {
    id: 'bpo.quality',
    title: 'Quality & Throughput Report',
    question: 'How efficiently and accurately are we processing work?',
    audience: ['Operations', 'Clients'],
    value: 'Measures throughput and quality.'
  },

  'bpo.executive': {
    id: 'bpo.executive',
    title: 'Client Executive Brief',
    question: 'What does the client need to know?',
    audience: ['Executives', 'Clients'],
    value: 'Communicates operational performance and issues.'
  },

  'itops.incident': {
    id: 'itops.incident',
    title: 'Incident Summary Report',
    question: 'What happened and how was it resolved?',
    audience: ['IT Operations'],
    value: 'Summarizes incidents and resolution activity.'
  },

  'itops.sla': {
    id: 'itops.sla',
    title: 'Ticket & SLA Report',
    question: 'Where is support performance at risk?',
    audience: ['IT Managers'],
    value: 'Shows ticket backlog and SLA exposure.'
  },

  'itops.root_cause': {
    id: 'itops.root_cause',
    title: 'Root-Cause Report',
    question: 'Why are incidents happening?',
    audience: ['IT Operations'],
    value: 'Identifies recurring root causes.'
  },

  'itops.executive': {
    id: 'itops.executive',
    title: 'Executive IT Operations Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes operational health and risk.'
  },

  'schools.compliance': {
    id: 'schools.compliance',
    title: 'Compliance Exception Report',
    question: 'Where is school compliance at risk?',
    audience: ['Administration', 'Compliance'],
    value: 'Prioritizes compliance exceptions.'
  },

  'schools.grants': {
    id: 'schools.grants',
    title: 'Grant & Documentation Risk Report',
    question: 'Which grant requirements need attention?',
    audience: ['Administration'],
    value: 'Identifies documentation gaps and grant risk.'
  },

  'schools.operations': {
    id: 'schools.operations',
    title: 'Operational Exception Report',
    question: 'What school operations need attention?',
    audience: ['Administration'],
    value: 'Prioritizes operational exceptions.'
  },

  'schools.executive': {
    id: 'schools.executive',
    title: 'Executive Schools Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes school operational and compliance risk.'
  },

  'hotel.operations': {
    id: 'hotel.operations',
    title: 'Hotel Operations Report',
    question: 'What is happening across the property?',
    audience: ['Hotel Operations', 'Executives'],
    value: 'Summarizes property operations.'
  },

  'hotel.maintenance': {
    id: 'hotel.maintenance',
    title: 'Maintenance Exception Report',
    question: 'What maintenance issues need attention?',
    audience: ['Engineering', 'Operations'],
    value: 'Prioritizes maintenance issues.'
  },

  'hotel.guest_service': {
    id: 'hotel.guest_service',
    title: 'Guest Service Report',
    question: 'What guest issues need attention?',
    audience: ['Guest Services', 'Management'],
    value: 'Tracks guest-service exceptions.'
  },

  'hotel.executive': {
    id: 'hotel.executive',
    title: 'Executive Hotel Brief',
    question: 'What does leadership need to know?',
    audience: ['Executives'],
    value: 'Summarizes property performance and operational risk.'
  }

};

function getReport(id) {
  return REPORTS[id] || null;
}

function getReports(ids) {
  return (ids || [])
    .map(getReport)
    .filter(Boolean);
}

function listReports() {
  return Object.values(REPORTS);
}

module.exports = {
  REPORTS,
  getReport,
  getReports,
  listReports
};
