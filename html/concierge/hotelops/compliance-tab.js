function renderComplianceTab() {
  const panel = document.getElementById('panel-compliance-body');
  if (!panel || !engine) return;

  const risk = engine.getComplianceRisk();

  panel.innerHTML = risk.length ? risk.map(c => `
    <div class="mission-item">
      <span class="mtag ${c.severity.toLowerCase()}">${c.severity}</span>
      <span class="mtitle">${c.type}</span>
      <span class="mmeta">${c.detail} — due in ${c.due_in_days}d</span>
    </div>
  `).join('') : '<div class="mission-item"><span class="mmeta">No open compliance items.</span></div>';
}
