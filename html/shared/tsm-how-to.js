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
