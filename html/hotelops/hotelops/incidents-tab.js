function renderIncidentsTab() {
  const panel = document.getElementById('panel-incident-center-body');
  if (!panel || !engine) return;

  const incidents = engine.getOpenIncidents();

  panel.innerHTML = incidents.length ? incidents.map(i => `
    <div class="mission-item">
      <span class="mtag ${i.severity}">${i.escalated ? 'ESCALATED' : i.severity.toUpperCase()}</span>
      <span class="mtitle">${i.type} — ${i.area}</span>
      <span class="mmeta">${i.status === 'in_progress' ? 'In progress' : 'Open'} — reported ${i.reported_hours_ago}h ago${
        i.escalated ? `, ${i.hours_over}h past response SLA` : ''
      }</span>
    </div>
  `).join('') : '<div class="mission-item"><span class="mmeta">No open incidents.</span></div>';
}
