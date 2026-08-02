function renderMaintenanceTab() {
  const panel = document.getElementById('panel-maintenance-body');
  if (!panel || !engine || !model) return;

  const tickets = model.sample_data.maintenance_tickets || [];
  const breaches = engine.getMaintenanceBreaches();
  const breachIds = new Set(breaches.map(b => b.id));
  const sevOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

  const sorted = [...tickets].sort((a, b) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4));

  panel.innerHTML = sorted.map(t => `
    <div class="mission-item">
      <span class="mtag ${t.severity}">${t.severity.toUpperCase()}</span>
      <span class="mtitle">Room ${t.room}: ${t.title}</span>
      <span class="mmeta">${
        t.stage === 'resolved' ? 'Resolved'
        : breachIds.has(t.ticket_id) ? 'SLA BREACHED'
        : `Opened ${t.opened_hours_ago}h ago`
      }</span>
    </div>
  `).join('') || 'No maintenance tickets.';
}
