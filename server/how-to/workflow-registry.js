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
