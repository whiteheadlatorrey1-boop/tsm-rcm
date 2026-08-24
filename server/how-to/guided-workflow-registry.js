'use strict';

/**
 * TSM Guided How-To Registry
 *
 * The registry describes the user's actual operating journey:
 *
 * PROBLEM
 *   ↓
 * START
 *   ↓
 * INPUT
 *   ↓
 * ANALYZE
 *   ↓
 * REVIEW
 *   ↓
 * DECIDE
 *   ↓
 * EXECUTE
 *   ↓
 * REPORT
 *   ↓
 * MEASURE
 *
 * Each step should point toward an actual application control.
 */

const GUIDED_WORKFLOWS = {
  schools: {
    id: 'schools-command',
    vertical: 'schools',
    title: 'Schools Command — Guided Operating Workflow',

    problem: {
      title: 'Find the school problem that needs attention',
      description:
        'Use the command surface to identify compliance, documentation, grant, vendor, and operational exceptions before they become larger business problems.',
      painPoints: [
        'grant compliance risk',
        'missing documentation',
        'administrative backlog',
        'vendor risk',
        'operational exceptions'
      ]
    },

    steps: [
      {
        id: 'start',
        number: 1,
        phase: 'START',
        title: 'Start with the situation that matters',
        instruction:
          'Choose the operational scenario, mission, or school issue you want TSM to evaluate.',
        actionLabels: [
          'Start',
          'Create Mission',
          'New Mission',
          'Scenario'
        ],
        expectedOutcome:
          'A specific school operational problem becomes an actionable mission.'
      },

      {
        id: 'input',
        number: 2,
        phase: 'INPUT',
        title: 'Load the evidence',
        instruction:
          'Provide the documents, records, exceptions, or mission information needed to evaluate the situation.',
        actionLabels: [
          'Upload',
          'Load',
          'Import',
          'Add Document',
          'Add Evidence'
        ],
        expectedOutcome:
          'The mission has enough evidence for analysis.'
      },

      {
        id: 'analyze',
        number: 3,
        phase: 'ANALYZE',
        title: 'Run the intelligence analysis',
        instruction:
          'Run the available analysis or intelligence action. TSM should identify exceptions, severity, exposure, root causes, and recommended next actions.',
        actionLabels: [
          'Analyze',
          'Run Analysis',
          'Analyze Mission',
          'Run Intelligence',
          'Process'
        ],
        expectedOutcome:
          'The system converts raw information into prioritized findings.'
      },

      {
        id: 'review',
        number: 4,
        phase: 'REVIEW',
        title: 'Review what TSM found',
        instruction:
          'Review the findings, anomalies, severity, financial exposure, evidence, and supporting details.',
        actionLabels: [
          'Review',
          'View Findings',
          'Findings',
          'Exceptions',
          'Details'
        ],
        expectedOutcome:
          'The operator understands what is wrong, why it matters, and how serious it is.'
      },

      {
        id: 'decide',
        number: 5,
        phase: 'DECIDE',
        title: 'Decide what requires action',
        instruction:
          'Prioritize the findings that require intervention, escalation, approval, or additional documentation.',
        actionLabels: [
          'Prioritize',
          'Decision',
          'Escalate',
          'Approve',
          'Assign'
        ],
        expectedOutcome:
          'The highest-value or highest-risk issues become explicit decisions.'
      },

      {
        id: 'execute',
        number: 6,
        phase: 'EXECUTE',
        title: 'Execute the corrective action',
        instruction:
          'Use the available workflow controls to assign ownership, update the mission, document the response, or move the issue toward resolution.',
        actionLabels: [
          'Execute',
          'Assign',
          'Update',
          'Resolve',
          'Complete'
        ],
        expectedOutcome:
          'A decision becomes an accountable operational action.'
      },

      {
        id: 'report',
        number: 7,
        phase: 'REPORT',
        title: 'Generate the report that matters',
        instruction:
          'Create an executive-ready record of the issue, findings, decisions, actions, exposure, and current status.',
        actionLabels: [
          'Report',
          'Generate Report',
          'Export',
          'Executive Report',
          'Brief'
        ],
        recommendedReports: [
          'Compliance Exception Report',
          'Grant/Documentation Risk Report',
          'Operational Exception Report',
          'Executive Schools Brief'
        ],
        expectedOutcome:
          'Leadership receives a concise, decision-ready view instead of raw operational data.'
      },

      {
        id: 'measure',
        number: 8,
        phase: 'MEASURE',
        title: 'Measure the business impact',
        instruction:
          'Track whether exposure, exceptions, backlog, compliance risk, and unresolved work are improving.',
        actionLabels: [
          'Measure',
          'Metrics',
          'Dashboard',
          'KPIs',
          'Performance'
        ],
        expectedOutcome:
          'The organization can demonstrate whether the workflow actually reduced business pain.'
      },

      {
        id: 'repeat',
        number: 9,
        phase: 'REPEAT',
        title: 'Turn the workflow into an operating rhythm',
        instruction:
          'Repeat the workflow for new missions and unresolved exceptions so the command center becomes part of the normal operating process.',
        actionLabels: [
          'Refresh',
          'Next Mission',
          'New Mission',
          'Run Again'
        ],
        expectedOutcome:
          'TSM becomes a repeatable operating system rather than a one-time analysis tool.'
      }
    ]
  }
};

function getGuidedWorkflow(vertical) {
  return GUIDED_WORKFLOWS[vertical] || null;
}

module.exports = {
  GUIDED_WORKFLOWS,
  getGuidedWorkflow
};
