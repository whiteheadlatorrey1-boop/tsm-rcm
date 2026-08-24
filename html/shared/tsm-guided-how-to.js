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
