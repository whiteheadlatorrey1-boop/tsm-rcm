function renderFrontDeskTab() {
  const panel = document.getElementById('panel-front-desk-body');
  if (!panel || !engine || !model) return;

  const queue = (model.sample_data.front_desk_queue || []).filter(t => t.status !== 'complete');
  const breaches = engine.getFrontDeskBreaches();
  const breachMap = new Map(breaches.map(b => [b.id, b]));
  const typeLabel = { check_in: 'CHECK-IN', check_out: 'CHECK-OUT', request: 'REQUEST' };

  const sorted = [...queue].sort((a, b) => (b.waited_minutes || 0) - (a.waited_minutes || 0));

  panel.innerHTML = sorted.length ? sorted.map(t => {
    const breach = breachMap.get(t.ticket_id);
    return `
    <div class="mission-item">
      <span class="mtag ${breach ? 'urgent' : 'low'}">${breach ? 'SLA BREACH' : typeLabel[t.type] || t.type}</span>
      <span class="mtitle">Room ${t.room}: ${t.guest} — ${typeLabel[t.type] || t.type}</span>
      <span class="mmeta">${breach ? `Waiting ${t.waited_minutes}m — ${breach.minutes_over}m over SLA` : `Waiting ${t.waited_minutes}m`}</span>
    </div>
  `;
  }).join('') : '<div class="mission-item"><span class="mmeta">No open front desk queue items.</span></div>';
}
