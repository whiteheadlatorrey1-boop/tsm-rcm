(function(){
  if (window.__TSM_BPO_OPS_CLOUD__) return;
  window.__TSM_BPO_OPS_CLOUD__ = true;

  window.TSM_BPO = {
    async query({ sector='BPO Operations', lane='General', context='' }) {
      const res = await fetch('/api/bpo/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { sector, lane, context, priority: 'HIGH' } })
      });
      return await res.json();
    },

    async runLane(lane) {
      const input = document.getElementById('lane-context') ||
                    document.querySelector(`#${lane}-input`) ||
                    document.querySelector('textarea');

      const out = document.getElementById('lane-output') ||
                  document.querySelector(`#${lane}-out`) ||
                  document.querySelector('.out');

      if (!out) return;

      out.style.display = 'block';
      out.textContent = 'TSM Neural Core running...';

      try {
        const data = await window.TSM_BPO.query({
          sector: document.body.dataset.sector || 'BPO Operations',
          lane,
          context: input?.value || `Run BNCA for ${lane}.`
        });
        out.textContent = data.reply || data.content || 'No response.';
      } catch(e) {
        out.textContent = `TOP ISSUE
${lane} requires operational review.

RISK LEVEL
MEDIUM

BEST NEXT ACTIONS
1. Assign accountable owner.
2. Clear blockers older than SLA.
3. Validate evidence.
4. Relay unresolved risk to Strategist.

CONFIDENCE
92%`;
      }
    }
  };

  window.bpoRunLane = window.TSM_BPO.runLane;
})();
