#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

HOWTO_DIR="$ROOT/server/how-to"
SHARED_DIR="$ROOT/html/shared"
TEST_DIR="$ROOT/tests/how-to"
DOC_DIR="$ROOT/docs/how-to-audit"

SCHOOLS="$ROOT/html/war-rooms/schools-command/schools-command.html"

mkdir -p "$HOWTO_DIR" "$SHARED_DIR" "$TEST_DIR" "$DOC_DIR"

echo "============================================================"
echo " TSM GUIDED HOW-TO ENGINE"
echo "============================================================"

if [[ ! -f "$SCHOOLS" ]]; then
  echo "ERROR: Schools Command not found:"
  echo "  $SCHOOLS"
  exit 1
fi

cat > "$HOWTO_DIR/guided-workflow-registry.js" <<'JS'
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
JS

cat > "$SHARED_DIR/tsm-guided-how-to.js" <<'JS'
(function () {
  'use strict';

  const registry = {
    schools: {
      title: 'How To Run Schools Command',
      subtitle:
        'Follow the operating path from school problem → evidence → decision → action → executive report.',
      steps: [
        ['START', 'Start with a mission or operational problem.'],
        ['INPUT', 'Load the documents, records, or evidence.'],
        ['ANALYZE', 'Run intelligence analysis.'],
        ['REVIEW', 'Review findings, severity, and exposure.'],
        ['DECIDE', 'Prioritize what requires action.'],
        ['EXECUTE', 'Assign and execute corrective work.'],
        ['REPORT', 'Generate the report leadership needs.'],
        ['MEASURE', 'Track whether the problem is improving.'],
        ['REPEAT', 'Run the workflow again as new work arrives.']
      ]
    }
  };

  function getWorkflow(vertical) {
    return registry[vertical] || null;
  }

  function findControl(labels) {
    const wanted = labels.map(x => x.toLowerCase());

    const elements = Array.from(
      document.querySelectorAll(
        'button, a, input[type="button"], input[type="submit"], [role="button"]'
      )
    );

    return elements.find(el => {
      const text = (
        el.innerText ||
        el.value ||
        el.getAttribute('aria-label') ||
        el.title ||
        ''
      ).trim().toLowerCase();

      return wanted.some(label => text.includes(label));
    });
  }

  function inject(vertical) {
    const workflow = getWorkflow(vertical);
    if (!workflow || document.getElementById('tsm-guided-how-to')) return;

    const panel = document.createElement('aside');
    panel.id = 'tsm-guided-how-to';

    panel.innerHTML = `
      <div class="tsm-gh-header">
        <div>
          <div class="tsm-gh-eyebrow">TSM GUIDED WORKFLOW</div>
          <h2>${workflow.title}</h2>
          <p>${workflow.subtitle}</p>
        </div>
        <button type="button" id="tsm-gh-close" aria-label="Close How To">×</button>
      </div>

      <div class="tsm-gh-steps">
        ${workflow.steps.map((step, index) => `
          <button
            type="button"
            class="tsm-gh-step"
            data-step="${index}"
          >
            <span class="tsm-gh-number">${index + 1}</span>
            <span>
              <strong>${step[0]}</strong>
              <small>${step[1]}</small>
            </span>
          </button>
        `).join('')}
      </div>

      <div id="tsm-gh-help" class="tsm-gh-help">
        <strong>Start here</strong>
        <p>Select a step to see what to do and where to do it.</p>
      </div>
    `;

    document.body.appendChild(panel);

    document
      .getElementById('tsm-gh-close')
      .addEventListener('click', () => panel.remove());

    panel.querySelectorAll('.tsm-gh-step').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.step);
        const step = workflow.steps[index];

        panel.querySelectorAll('.tsm-gh-step')
          .forEach(x => x.classList.remove('active'));

        button.classList.add('active');

        const controls = {
          START: ['start', 'create mission', 'new mission', 'scenario'],
          INPUT: ['upload', 'load', 'import', 'add document'],
          ANALYZE: ['analyze', 'run analysis', 'process'],
          REVIEW: ['review', 'findings', 'exceptions', 'details'],
          DECIDE: ['prioritize', 'decision', 'escalate', 'approve', 'assign'],
          EXECUTE: ['execute', 'assign', 'update', 'resolve', 'complete'],
          REPORT: ['report', 'generate report', 'export', 'brief'],
          MEASURE: ['measure', 'metrics', 'dashboard', 'kpi'],
          REPEAT: ['refresh', 'next mission', 'new mission', 'run again']
        };

        const target = findControl(controls[step[0]] || []);

        const help = document.getElementById('tsm-gh-help');

        help.innerHTML = `
          <div class="tsm-gh-phase">${step[0]}</div>
          <strong>${step[1]}</strong>
          <p>
            ${target
              ? 'TSM found the related control. Click “Go To Control” to locate it.'
              : 'No matching control was detected automatically on this page yet.'}
          </p>
          ${
            target
              ? '<button type="button" id="tsm-gh-go">Go To Control</button>'
              : ''
          }
        `;

        if (target) {
          document
            .getElementById('tsm-gh-go')
            .addEventListener('click', () => {
              target.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });

              target.focus?.();

              target.style.outline = '3px solid #38bdf8';

              setTimeout(() => {
                target.style.outline = '';
              }, 2500);
            });
        }
      });
    });
  }

  window.TSMGuidedHowTo = {
    inject,
    getWorkflow
  };
})();
JS

cat > "$SHARED_DIR/tsm-guided-how-to.css" <<'CSS'
#tsm-guided-how-to {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: min(420px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  z-index: 2147483647;
  background: rgba(10, 15, 25, .97);
  color: #fff;
  border: 1px solid rgba(148,163,184,.3);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,.45);
  font-family: Inter, system-ui, sans-serif;
}

.tsm-gh-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid rgba(148,163,184,.18);
}

.tsm-gh-eyebrow,
.tsm-gh-phase {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  opacity: .65;
}

.tsm-gh-header h2 {
  margin: 5px 0;
  font-size: 20px;
}

.tsm-gh-header p,
.tsm-gh-help p {
  margin: 6px 0 0;
  opacity: .72;
  line-height: 1.45;
}

#tsm-gh-close {
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.tsm-gh-steps {
  padding: 10px;
}

.tsm-gh-step {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  border: 0;
  background: transparent;
  color: #fff;
  padding: 11px;
  border-radius: 12px;
  cursor: pointer;
}

.tsm-gh-step:hover,
.tsm-gh-step.active {
  background: rgba(56,189,248,.12);
}

.tsm-gh-number {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(148,163,184,.16);
  font-weight: 800;
}

.tsm-gh-step strong,
.tsm-gh-step small {
  display: block;
}

.tsm-gh-step small {
  opacity: .62;
  margin-top: 2px;
}

.tsm-gh-help {
  margin: 10px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
}

#tsm-gh-go {
  margin-top: 12px;
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 800;
}
CSS

cat > "$TEST_DIR/guided-how-to.test.js" <<'JS'
'use strict';

const assert = require('assert');

const {
  getGuidedWorkflow
} = require('../../server/how-to/guided-workflow-registry');

const workflow = getGuidedWorkflow('schools');

assert(workflow, 'Schools guided workflow must exist');
assert.strictEqual(workflow.vertical, 'schools');

assert.strictEqual(
  workflow.steps.length,
  9,
  'Schools workflow must have 9 operating steps'
);

const phases = workflow.steps.map(step => step.phase);

assert.deepStrictEqual(phases, [
  'START',
  'INPUT',
  'ANALYZE',
  'REVIEW',
  'DECIDE',
  'EXECUTE',
  'REPORT',
  'MEASURE',
  'REPEAT'
]);

assert(
  workflow.steps
    .find(step => step.phase === 'REPORT')
    .recommendedReports
    .includes('Executive Schools Brief')
);

console.log('TSM GUIDED HOW-TO TEST PASSED');
console.log('Schools steps:', workflow.steps.length);
console.log(
  'Recommended reports:',
  workflow.steps.find(x => x.phase === 'REPORT').recommendedReports.length
);
JS

node "$TEST_DIR/guided-how-to.test.js"

echo
echo "============================================================"
echo " SCHOOLS COMMAND INTEGRATION CHECK"
echo "============================================================"

if grep -q "tsm-guided-how-to.js" "$SCHOOLS"; then
  echo "✓ Guided How-To JS already referenced."
else
  cat >> "$SCHOOLS" <<'HTML'

<!-- TSM Guided How-To -->
<link rel="stylesheet" href="../../shared/tsm-guided-how-to.css">
<script src="../../shared/tsm-guided-how-to.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  if (window.TSMGuidedHowTo) {
    window.TSMGuidedHowTo.inject('schools');
  }
});
</script>
HTML

  echo "✓ Injected Guided How-To into Schools Command."
fi

echo
echo "============================================================"
echo " GUIDED HOW-TO BUILD COMPLETE"
echo "============================================================"
echo
echo "Created:"
echo "  $HOWTO_DIR/guided-workflow-registry.js"
echo "  $SHARED_DIR/tsm-guided-how-to.js"
echo "  $SHARED_DIR/tsm-guided-how-to.css"
echo "  $TEST_DIR/guided-how-to.test.js"
echo
echo "Schools target:"
echo "  $SCHOOLS"
echo
echo "Next:"
echo "  npx playwright test tests/e2e/schools-mission-sentinel.spec.js --reporter=list"
echo
