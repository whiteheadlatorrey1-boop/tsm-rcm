#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

SERVER="${ROOT}/server/how-to"
SHARED="${ROOT}/html/shared"
TESTS="${ROOT}/tests/how-to"
DOCS="${ROOT}/docs/how-to-audit"

mkdir -p "$SERVER" "$SHARED" "$TESTS" "$DOCS"

echo "============================================================"
echo " TSM HOW-TO WORKFLOW ENGINE BUILDER"
echo "============================================================"

# ------------------------------------------------------------
# 1. WORKFLOW REGISTRY
# ------------------------------------------------------------

cat > "$SERVER/workflow-registry.js" <<'JS'
'use strict';

/**
 * TSM How-To Workflow Registry
 *
 * Universal operating model:
 *
 * PROBLEM
 * START
 * INPUT
 * ANALYZE
 * REVIEW
 * DECIDE
 * EXECUTE
 * REPORT
 * MEASURE
 */

const WORKFLOWS = {

  healthcare: {
    denial_recovery: {
      id: 'healthcare.denial_recovery',
      title: 'Denial Recovery',
      problem: 'Reduce denial-related revenue leakage.',
      start: [
        'Open the Denial Recovery War Room.',
        'Select a denial or load denial records.'
      ],
      input: [
        'Claim information',
        'Denial reason',
        'Supporting documentation',
        'Payer information'
      ],
      analyze: [
        'Run denial analysis.',
        'Identify root cause.',
        'Calculate financial exposure.',
        'Identify appeal or correction opportunities.'
      ],
      review: [
        'Sort by dollar exposure.',
        'Review filing deadlines.',
        'Review documentation gaps.',
        'Review denial trends.'
      ],
      decide: [
        'Appeal',
        'Correct',
        'Escalate',
        'Write off'
      ],
      execute: [
        'Generate appeal plan.',
        'Create follow-up task.',
        'Assign ownership.'
      ],
      reports: [
        'healthcare.denial_recovery',
        'healthcare.revenue_leakage',
        'healthcare.appeal_priority',
        'healthcare.executive'
      ],
      measures: [
        'dollars at risk',
        'dollars recovered',
        'appeal success rate',
        'denial aging',
        'backlog reduction'
      ]
    },

    revenue_cycle: {
      id: 'healthcare.revenue_cycle',
      title: 'Revenue Cycle Exception Management',
      problem: 'Identify and resolve revenue-cycle leakage and operational exceptions.',
      start: ['Open the Revenue Cycle workspace.'],
      input: [
        'Claims',
        'Billing records',
        'Denials',
        'Payment information'
      ],
      analyze: [
        'Identify exceptions.',
        'Calculate exposure.',
        'Group root causes.'
      ],
      review: [
        'Prioritize by financial impact.',
        'Review aging.',
        'Review ownership.'
      ],
      decide: [
        'Resolve',
        'Escalate',
        'Appeal',
        'Investigate'
      ],
      execute: [
        'Assign corrective action.',
        'Generate resolution documentation.'
      ],
      reports: [
        'healthcare.revenue_leakage',
        'healthcare.denial_recovery',
        'healthcare.executive'
      ],
      measures: [
        'recovered revenue',
        'open exposure',
        'aging reduction',
        'resolution rate'
      ]
    }
  },

  construction: {
    project_risk: {
      id: 'construction.project_risk',
      title: 'Project Risk Management',
      problem: 'Identify project cost, schedule and operational exposure before it becomes executive risk.',
      start: [
        'Open Construction Command.',
        'Select the project.'
      ],
      input: [
        'Contracts',
        'Change orders',
        'Permits',
        'Invoices',
        'Project documents'
      ],
      analyze: [
        'Run project intelligence.',
        'Identify exceptions.',
        'Calculate financial exposure.',
        'Identify schedule risk.'
      ],
      review: [
        'Review highest-exposure findings.',
        'Review unresolved exceptions.',
        'Review schedule impact.'
      ],
      decide: [
        'Correct',
        'Approve',
        'Escalate',
        'Assign'
      ],
      execute: [
        'Create corrective action.',
        'Assign responsible party.',
        'Generate project communication.'
      ],
      reports: [
        'construction.project_risk',
        'construction.wip',
        'construction.permit',
        'construction.executive'
      ],
      measures: [
        'exposure avoided',
        'WIP recovered',
        'schedule days protected',
        'exceptions resolved'
      ]
    }
  },

  mortgage: {
    loan_pipeline: {
      id: 'mortgage.loan_pipeline',
      title: 'Loan Pipeline Risk',
      problem: 'Reduce loan fallout, bottlenecks and closing delays.',
      start: [
        'Open Mortgage Command.',
        'Select a loan or pipeline.'
      ],
      input: [
        'Loan documents',
        'Borrower information',
        'Underwriting conditions',
        'Closing requirements'
      ],
      analyze: [
        'Analyze document completeness.',
        'Identify exceptions.',
        'Identify underwriting risk.',
        'Calculate pipeline exposure.'
      ],
      review: [
        'Review highest-risk loans.',
        'Review missing documentation.',
        'Review closing blockers.'
      ],
      decide: [
        'Clear',
        'Condition',
        'Escalate',
        'Request documentation'
      ],
      execute: [
        'Create resolution task.',
        'Assign owner.',
        'Generate borrower or internal follow-up.'
      ],
      reports: [
        'mortgage.pipeline_risk',
        'mortgage.underwriting',
        'mortgage.closing',
        'mortgage.executive'
      ],
      measures: [
        'loans cleared',
        'days saved',
        'closing delays reduced',
        'fallout reduced'
      ]
    }
  },

  real_estate: {
    property_operations: {
      id: 'real_estate.property_operations',
      title: 'Property Operations',
      problem: 'Reduce property operational leakage and unresolved maintenance/vendor issues.',
      start: [
        'Open Property or Real Estate Command.',
        'Select the property or portfolio.'
      ],
      input: [
        'Property records',
        'Maintenance tickets',
        'Vendor records',
        'Financial records'
      ],
      analyze: [
        'Identify operational exceptions.',
        'Identify maintenance risk.',
        'Analyze vendor performance.',
        'Identify financial leakage.'
      ],
      review: [
        'Prioritize high-impact issues.',
        'Review aging.',
        'Review vendor performance.'
      ],
      decide: [
        'Resolve',
        'Assign',
        'Escalate',
        'Replace vendor'
      ],
      execute: [
        'Create work item.',
        'Assign responsible party.',
        'Generate communication.'
      ],
      reports: [
        'real_estate.operations',
        'real_estate.maintenance',
        'real_estate.vendor',
        'real_estate.executive'
      ],
      measures: [
        'maintenance aging',
        'vendor SLA',
        'turnover time',
        'operational leakage'
      ]
    }
  },

  insurance: {
    claims_risk: {
      id: 'insurance.claims_risk',
      title: 'Claims Risk Management',
      problem: 'Reduce claims leakage, compliance exposure and processing backlog.',
      start: [
        'Open Insurance Command.',
        'Select a claim or claim population.'
      ],
      input: [
        'Claim documents',
        'Policy information',
        'Adjuster notes',
        'Supporting evidence'
      ],
      analyze: [
        'Analyze claim evidence.',
        'Identify exceptions.',
        'Identify compliance concerns.',
        'Estimate exposure.'
      ],
      review: [
        'Prioritize high-risk claims.',
        'Review missing evidence.',
        'Review deadlines.'
      ],
      decide: [
        'Approve',
        'Investigate',
        'Escalate',
        'Request documentation'
      ],
      execute: [
        'Create claim action.',
        'Assign owner.',
        'Generate decision documentation.'
      ],
      reports: [
        'insurance.claims',
        'insurance.compliance',
        'insurance.underwriting',
        'insurance.executive'
      ],
      measures: [
        'claims resolved',
        'exposure reduced',
        'processing time',
        'compliance exceptions'
      ]
    }
  },

  finops: {
    financial_exceptions: {
      id: 'finops.financial_exceptions',
      title: 'Financial Exception Management',
      problem: 'Identify financial leakage, invoice exceptions and close-cycle risk.',
      start: [
        'Open FinOps Command.',
        'Select the accounting or finance workflow.'
      ],
      input: [
        'Invoices',
        'Transactions',
        'Budgets',
        'General ledger records'
      ],
      analyze: [
        'Identify anomalies.',
        'Identify leakage.',
        'Identify reconciliation exceptions.',
        'Assess close readiness.'
      ],
      review: [
        'Sort by financial exposure.',
        'Review unresolved exceptions.',
        'Review aging.'
      ],
      decide: [
        'Approve',
        'Correct',
        'Escalate',
        'Investigate'
      ],
      execute: [
        'Create corrective action.',
        'Assign owner.',
        'Generate finance documentation.'
      ],
      reports: [
        'finops.exceptions',
        'finops.leakage',
        'finops.close',
        'finops.executive'
      ],
      measures: [
        'leakage identified',
        'leakage recovered',
        'exceptions resolved',
        'close-cycle reduction'
      ]
    }
  },

  legal: {
    matter_risk: {
      id: 'legal.matter_risk',
      title: 'Matter Risk Management',
      problem: 'Reduce matter backlog, deadline risk and document review burden.',
      start: [
        'Open Legal Command.',
        'Select a matter.'
      ],
      input: [
        'Matter documents',
        'Contracts',
        'Correspondence',
        'Deadlines'
      ],
      analyze: [
        'Analyze documents.',
        'Identify risk.',
        'Identify deadlines.',
        'Identify missing information.'
      ],
      review: [
        'Prioritize high-risk matters.',
        'Review upcoming deadlines.',
        'Review unresolved exceptions.'
      ],
      decide: [
        'Approve',
        'Escalate',
        'Request information',
        'Assign'
      ],
      execute: [
        'Create matter action.',
        'Assign owner.',
        'Generate legal brief.'
      ],
      reports: [
        'legal.matter_risk',
        'legal.deadlines',
        'legal.document',
        'legal.executive'
      ],
      measures: [
        'matters resolved',
        'deadline risk reduced',
        'review time saved',
        'backlog reduction'
      ]
    }
  },

  bpo: {
    operations: {
      id: 'bpo.operations',
      title: 'BPO Operations',
      problem: 'Reduce processing backlog, SLA misses and client reporting burden.',
      start: [
        'Open the BPO Command workspace.',
        'Select the client workflow.'
      ],
      input: [
        'Client documents',
        'Work queue',
        'SLA records',
        'Processing records'
      ],
      analyze: [
        'Identify exceptions.',
        'Analyze throughput.',
        'Identify SLA risk.',
        'Identify quality variance.'
      ],
      review: [
        'Prioritize SLA risk.',
        'Review backlog.',
        'Review quality exceptions.'
      ],
      decide: [
        'Process',
        'Escalate',
        'Reassign',
        'Correct'
      ],
      execute: [
        'Assign work.',
        'Create corrective action.',
        'Generate client deliverable.'
      ],
      reports: [
        'bpo.sla',
        'bpo.exceptions',
        'bpo.quality',
        'bpo.executive'
      ],
      measures: [
        'throughput',
        'SLA attainment',
        'backlog',
        'quality rate'
      ]
    }
  },

  itops: {
    incident_management: {
      id: 'itops.incident_management',
      title: 'IT Operations Incident Management',
      problem: 'Reduce ticket backlog, SLA risk and incident resolution time.',
      start: [
        'Open L1 or IT Operations Command.',
        'Select a ticket or incident.'
      ],
      input: [
        'Ticket information',
        'User symptoms',
        'System information',
        'Troubleshooting history'
      ],
      analyze: [
        'Classify the incident.',
        'Identify probable root cause.',
        'Recommend troubleshooting steps.',
        'Assess SLA risk.'
      ],
      review: [
        'Review recommended actions.',
        'Review SLA status.',
        'Review escalation criteria.'
      ],
      decide: [
        'Resolve',
        'Escalate',
        'Assign',
        'Request information'
      ],
      execute: [
        'Perform troubleshooting.',
        'Document resolution.',
        'Escalate when required.'
      ],
      reports: [
        'itops.incident',
        'itops.sla',
        'itops.root_cause',
        'itops.executive'
      ],
      measures: [
        'MTTR',
        'first-contact resolution',
        'SLA attainment',
        'backlog'
      ]
    }
  },

  schools: {
    compliance: {
      id: 'schools.compliance',
      title: 'Schools Compliance & Operations',
      problem: 'Reduce grant compliance risk, documentation gaps and operational exceptions.',
      start: [
        'Open Schools Command.',
        'Select the school, grant or operational workflow.'
      ],
      input: [
        'Grant documentation',
        'Compliance records',
        'Vendor records',
        'Operational documents'
      ],
      analyze: [
        'Identify compliance exceptions.',
        'Identify documentation gaps.',
        'Calculate exposure.',
        'Identify operational risk.'
      ],
      review: [
        'Prioritize high-severity exceptions.',
        'Review missing documentation.',
        'Review deadlines.'
      ],
      decide: [
        'Correct',
        'Escalate',
        'Assign',
        'Request documentation'
      ],
      execute: [
        'Create remediation task.',
        'Assign owner.',
        'Generate compliance documentation.'
      ],
      reports: [
        'schools.compliance',
        'schools.grants',
        'schools.operations',
        'schools.executive'
      ],
      measures: [
        'exceptions resolved',
        'documentation completion',
        'grant risk reduced',
        'backlog reduction'
      ]
    }
  },

  hotel: {
    operations: {
      id: 'hotel.operations',
      title: 'Hotel Operations',
      problem: 'Reduce maintenance response time, guest-service issues and operational leakage.',
      start: [
        'Open Hotel Operations Command.',
        'Select the property.'
      ],
      input: [
        'Maintenance tickets',
        'Guest-service requests',
        'Vendor records',
        'Occupancy and revenue data'
      ],
      analyze: [
        'Identify operational exceptions.',
        'Assess maintenance risk.',
        'Identify guest-service issues.',
        'Assess revenue leakage.'
      ],
      review: [
        'Prioritize guest-impacting issues.',
        'Review aging.',
        'Review vendor performance.'
      ],
      decide: [
        'Resolve',
        'Assign',
        'Escalate',
        'Coordinate vendor'
      ],
      execute: [
        'Create work order.',
        'Assign owner.',
        'Generate guest or management communication.'
      ],
      reports: [
        'hotel.operations',
        'hotel.maintenance',
        'hotel.guest_service',
        'hotel.executive'
      ],
      measures: [
        'maintenance response time',
        'guest issue resolution',
        'vendor SLA',
        'revenue leakage'
      ]
    }
  }

};

function getWorkflow(vertical, workflow) {
  const verticalSet = WORKFLOWS[vertical];
  if (!verticalSet) return null;

  return verticalSet[workflow] || null;
}

function getWorkflows(vertical) {
  return WORKFLOWS[vertical] || {};
}

function listWorkflows() {
  return Object.entries(WORKFLOWS).flatMap(([vertical, workflows]) =>
    Object.entries(workflows).map(([key, workflow]) => ({
      vertical,
      key,
      ...workflow
    }))
  );
}

module.exports = {
  WORKFLOWS,
  getWorkflow,
  getWorkflows,
  listWorkflows
};
JS

# ------------------------------------------------------------
# 2. REPORT REGISTRY
# ------------------------------------------------------------

cat > "$SERVER/report-registry.js" <<'JS'
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
JS

# ------------------------------------------------------------
# 3. PAIN-POINT REGISTRY
# ------------------------------------------------------------

cat > "$SERVER/painpoint-registry.js" <<'JS'
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
JS

# ------------------------------------------------------------
# 4. SERVER HOW-TO ENGINE
# ------------------------------------------------------------

cat > "$SERVER/how-to-engine.js" <<'JS'
'use strict';

const {
  getWorkflow,
  getWorkflows,
  listWorkflows
} = require('./workflow-registry');

const {
  getReports,
  getReport,
  listReports
} = require('./report-registry');

const {
  getPainPoint,
  listPainPoints
} = require('./painpoint-registry');

const STEPS = [
  'problem',
  'start',
  'input',
  'analyze',
  'review',
  'decide',
  'execute',
  'report',
  'measure'
];

function buildHowTo({
  vertical,
  workflow,
  painPoint
}) {
  const definition = getWorkflow(vertical, workflow);

  if (!definition) {
    return null;
  }

  return {
    id: definition.id,
    vertical,
    workflow,
    title: definition.title,
    problem: definition.problem,
    start: definition.start || [],
    input: definition.input || [],
    analyze: definition.analyze || [],
    review: definition.review || [],
    decide: definition.decide || [],
    execute: definition.execute || [],
    reports: getReports(definition.reports),
    measures: definition.measures || [],
    painPoint: painPoint ? getPainPoint(painPoint) : null,
    steps: STEPS
  };
}

module.exports = {
  STEPS,
  buildHowTo,
  getWorkflow,
  getWorkflows,
  getReports,
  getReport,
  getPainPoint,
  listWorkflows,
  listReports,
  listPainPoints
};
JS

# ------------------------------------------------------------
# 5. SHARED BROWSER COMPONENT
# ------------------------------------------------------------

cat > "$SHARED/tsm-how-to.js" <<'JS'
(function (window, document) {
  'use strict';

  if (window.TSMHowTo) return;

  const STEPS = [
    ['problem', 'Problem', 'What are you trying to fix?'],
    ['start', 'Start', 'Open the right workspace or workflow.'],
    ['input', 'Input', 'Load the evidence and information TSM needs.'],
    ['analyze', 'Analyze', 'Run the intelligence workflow.'],
    ['review', 'Review', 'Review findings, exceptions and exposure.'],
    ['decide', 'Decide', 'Choose the appropriate business decision.'],
    ['execute', 'Execute', 'Turn the decision into an operational action.'],
    ['report', 'Report', 'Generate the report that matters to your audience.'],
    ['measure', 'Measure', 'Track the outcome and business value.']
  ];

  function escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function list(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<div class="tsm-how-to-empty">No additional guidance configured.</div>';
    }

    return '<ul>' +
      items.map(item => '<li>' + escape(item) + '</li>').join('') +
      '</ul>';
  }

  function reportCard(report) {
    return `
      <button
        type="button"
        class="tsm-how-to-report"
        data-report-id="${escape(report.id)}"
        title="${escape(report.question)}"
      >
        <strong>${escape(report.title)}</strong>
        <span>${escape(report.question)}</span>
        <small>${escape(report.value)}</small>
      </button>
    `;
  }

  function render(definition, target) {
    if (!definition || !target) return;

    target.innerHTML = `
      <section class="tsm-how-to" aria-label="How to use this workflow">

        <div class="tsm-how-to-header">
          <div>
            <span class="tsm-how-to-eyebrow">TSM HOW-TO</span>
            <h2>${escape(definition.title)}</h2>
            <p>${escape(definition.problem)}</p>
          </div>

          <button
            type="button"
            class="tsm-how-to-toggle"
            aria-expanded="true"
          >
            Hide Guide
          </button>
        </div>

        <div class="tsm-how-to-body">

          <div class="tsm-how-to-steps">
            ${STEPS.map((step, index) => `
              <article class="tsm-how-to-step" data-step="${step[0]}">
                <div class="tsm-how-to-step-number">${index + 1}</div>
                <div>
                  <h3>${escape(step[1])}</h3>
                  <p>${escape(step[2])}</p>
                  <div class="tsm-how-to-content"></div>
                </div>
              </article>
            `).join('')}
          </div>

          <div class="tsm-how-to-business-question">
            <strong>What are you trying to accomplish?</strong>

            <div class="tsm-how-to-reports">
              ${(definition.reports || []).map(reportCard).join('')}
            </div>
          </div>

        </div>
      </section>
    `;

    const content = {
      problem: definition.problem,
      start: definition.start,
      input: definition.input,
      analyze: definition.analyze,
      review: definition.review,
      decide: definition.decide,
      execute: definition.execute,
      report: [],
      measure: definition.measures
    };

    Object.keys(content).forEach(step => {
      const node = target.querySelector(
        `.tsm-how-to-step[data-step="${step}"] .tsm-how-to-content`
      );

      if (!node) return;

      if (step === 'problem') {
        node.innerHTML = '<p>' + escape(content[step]) + '</p>';
      } else {
        node.innerHTML = list(content[step]);
      }
    });

    const toggle = target.querySelector('.tsm-how-to-toggle');
    const body = target.querySelector('.tsm-how-to-body');

    toggle.addEventListener('click', () => {
      const hidden = body.hasAttribute('hidden');

      if (hidden) {
        body.removeAttribute('hidden');
        toggle.textContent = 'Hide Guide';
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        body.setAttribute('hidden', '');
        toggle.textContent = 'Show Guide';
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    target.querySelectorAll('.tsm-how-to-report').forEach(button => {
      button.addEventListener('click', () => {
        const reportId = button.dataset.reportId;

        window.dispatchEvent(new CustomEvent('tsm:how-to-report', {
          detail: {
            reportId,
            workflow: definition.id
          }
        }));

        if (typeof window.TSMReportRouter === 'function') {
          window.TSMReportRouter(reportId);
        }
      });
    });
  }

  function inject(definition, selector) {
    const target = document.querySelector(selector || '#tsm-how-to');

    if (!target) return false;

    render(definition, target);
    return true;
  }

  window.TSMHowTo = {
    STEPS,
    render,
    inject
  };

})(window, document);
JS

# ------------------------------------------------------------
# 6. SHARED STYLES
# ------------------------------------------------------------

cat > "$SHARED/tsm-how-to.css" <<'CSS'
.tsm-how-to {
  margin: 24px 0;
  border: 1px solid rgba(127,127,127,.25);
  border-radius: 16px;
  background: rgba(127,127,127,.06);
  overflow: hidden;
  font-family: inherit;
}

.tsm-how-to-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
  border-bottom: 1px solid rgba(127,127,127,.2);
}

.tsm-how-to-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  opacity: .7;
}

.tsm-how-to-header h2 {
  margin: 5px 0;
}

.tsm-how-to-header p {
  margin: 0;
  opacity: .8;
}

.tsm-how-to-toggle {
  align-self: flex-start;
  cursor: pointer;
}

.tsm-how-to-body {
  padding: 22px;
}

.tsm-how-to-body[hidden] {
  display: none;
}

.tsm-how-to-steps {
  display: grid;
  gap: 12px;
}

.tsm-how-to-step {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 12px;
  padding: 15px;
  border-radius: 12px;
  background: rgba(127,127,127,.05);
}

.tsm-how-to-step-number {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-weight: 800;
  background: rgba(127,127,127,.16);
}

.tsm-how-to-step h3 {
  margin: 0 0 4px;
}

.tsm-how-to-step p {
  margin: 0 0 8px;
}

.tsm-how-to-step ul {
  margin: 6px 0 0;
  padding-left: 20px;
}

.tsm-how-to-business-question {
  margin-top: 20px;
  padding: 18px;
  border-radius: 14px;
  background: rgba(127,127,127,.1);
}

.tsm-how-to-reports {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.tsm-how-to-report {
  text-align: left;
  cursor: pointer;
  padding: 14px;
  border: 1px solid rgba(127,127,127,.25);
  border-radius: 12px;
  background: transparent;
}

.tsm-how-to-report strong,
.tsm-how-to-report span,
.tsm-how-to-report small {
  display: block;
}

.tsm-how-to-report span {
  margin-top: 4px;
  font-weight: 600;
}

.tsm-how-to-report small {
  margin-top: 7px;
  opacity: .7;
}
CSS

# ------------------------------------------------------------
# 7. ENGINE TEST
# ------------------------------------------------------------

cat > "$TESTS/how-to-engine.test.js" <<'JS'
'use strict';

const assert = require('assert');

const {
  buildHowTo,
  listWorkflows,
  listReports,
  listPainPoints,
  STEPS
} = require('../../server/how-to/how-to-engine');

const workflow = buildHowTo({
  vertical: 'healthcare',
  workflow: 'denial_recovery',
  painPoint: 'revenue_leakage'
});

assert(workflow, 'Healthcare denial recovery workflow should exist');

assert.deepStrictEqual(
  workflow.steps,
  [
    'problem',
    'start',
    'input',
    'analyze',
    'review',
    'decide',
    'execute',
    'report',
    'measure'
  ]
);

assert(workflow.problem);
assert(workflow.start.length);
assert(workflow.input.length);
assert(workflow.analyze.length);
assert(workflow.review.length);
assert(workflow.decide.length);
assert(workflow.execute.length);
assert(workflow.reports.length);
assert(workflow.measures.length);

assert(
  workflow.reports.some(
    report => report.id === 'healthcare.denial_recovery'
  ),
  'Denial Recovery Report should be registered'
);

assert(
  workflow.painPoint &&
  workflow.painPoint.id === 'revenue_leakage'
);

assert(
  listWorkflows().length >= 10,
  'Expected seeded workflows'
);

assert(
  listReports().length >= 20,
  'Expected seeded reports'
);

assert(
  listPainPoints().length >= 5,
  'Expected seeded pain points'
);

console.log('TSM HOW-TO ENGINE TESTS PASSED');
console.log(`Workflows: ${listWorkflows().length}`);
console.log(`Reports: ${listReports().length}`);
console.log(`Pain points: ${listPainPoints().length}`);
console.log(`Steps: ${STEPS.length}`);
JS

# ------------------------------------------------------------
# 8. IMPLEMENTATION DOCUMENT
# ------------------------------------------------------------

cat > "$DOCS/HOW-TO-IMPLEMENTATION.md" <<'MD'
# TSM How-To Workflow Engine

## Purpose

The TSM How-To layer converts application functionality into a guided business workflow.

The standard is:

**PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE → EXECUTE → REPORT → MEASURE**

## Architecture

### Workflow Registry

`server/how-to/workflow-registry.js`

Defines what a user should do inside each vertical workflow.

### Report Registry

`server/how-to/report-registry.js`

Defines reports around business questions rather than generic exports.

### Pain-Point Registry

`server/how-to/painpoint-registry.js`

Defines the business problem the user is attempting to solve.

### How-To Engine

`server/how-to/how-to-engine.js`

Combines workflow, reports and pain points into a contextual guide.

### Browser Component

`html/shared/tsm-how-to.js`

Renders the guide inside application pages.

### Styles

`html/shared/tsm-how-to.css`

Provides the reusable presentation layer.

## Initial Vertical Workflows

- Healthcare — Denial Recovery
- Healthcare — Revenue Cycle
- Construction — Project Risk
- Mortgage — Loan Pipeline
- Real Estate — Property Operations
- Insurance — Claims Risk
- FinOps — Financial Exceptions
- Legal — Matter Risk
- BPO — Operations
- ITOps — Incident Management
- Schools — Compliance
- Hotel — Operations

## User Experience

The guide should answer:

1. What problem am I solving?
2. Where do I start?
3. What do I provide?
4. What does TSM analyze?
5. What should I review?
6. What decision should I make?
7. What action should I execute?
8. What report should I generate?
9. How do I measure the result?

## Report Philosophy

Reports are presented as answers to business questions:

- Where are we losing money?
- What needs attention now?
- What should the team work first?
- What is blocking the workflow?
- What does leadership need to know?

## Future Integration

The How-To layer should eventually emit workflow telemetry:

`workflow_started`

`input_loaded`

`analysis_run`

`finding_reviewed`

`decision_made`

`action_executed`

`report_generated`

`outcome_recorded`

This allows TSM to demonstrate operational value rather than simply documenting application features.
MD

# ------------------------------------------------------------
# 9. MAKE SCRIPT EXECUTABLE
# ------------------------------------------------------------

chmod +x "$ROOT/scripts/build-how-to-engine.sh"

echo
echo "============================================================"
echo " BUILD COMPLETE"
echo "============================================================"
echo
echo "Created:"
echo "  $SERVER/workflow-registry.js"
echo "  $SERVER/report-registry.js"
echo "  $SERVER/painpoint-registry.js"
echo "  $SERVER/how-to-engine.js"
echo "  $SHARED/tsm-how-to.js"
echo "  $SHARED/tsm-how-to.css"
echo "  $TESTS/how-to-engine.test.js"
echo "  $DOCS/HOW-TO-IMPLEMENTATION.md"
echo
