function renderHousekeepingTab() {
  const panel = document.getElementById('panel-housekeeping-body');
  if (!panel || !engine || !model) return;

  const tasks = model.sample_data.housekeeping_tasks || [];
  const breaches = engine.getHousekeepingBreaches();
  const breachMap = new Map(breaches.map(b => [b.id, b]));
  const typeLabel = { turnover: 'TURNOVER', deep_clean: 'DEEP CLEAN', inspection: 'INSPECTION', linen: 'LINEN' };

  const sorted = [...tasks].sort((a, b) => (b.started_hours_ago || 0) - (a.started_hours_ago || 0));

  panel.innerHTML = sorted.length ? sorted.map(t => {
    const breach = breachMap.get(t.task_id);
    const statusMeta = t.stage === 'complete' ? 'Complete'
      : breach ? `SLA BREACHED — ${breach.hours_over}h over`
      : `${typeLabel[t.type] || t.type} started ${t.started_hours_ago}h ago`;
    return `
    <div class="mission-item">
      <span class="mtag ${t.stage === 'complete' ? 'low' : breach ? 'urgent' : 'medium'}">${t.stage === 'complete' ? 'DONE' : typeLabel[t.type] || t.type}</span>
      <span class="mtitle">Room ${t.room} — ${t.assigned_to}</span>
      <span class="mmeta">${statusMeta}</span>
    </div>
  `;
  }).join('') : '<div class="mission-item"><span class="mmeta">No housekeeping tasks on the board.</span></div>';
}
