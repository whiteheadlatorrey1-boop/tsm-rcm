function renderStaffOpsTab() {
  const panel = document.getElementById('panel-staff-operations-body');
  if (!panel || !engine || !model) return;

  const gaps = engine.getStaffingGaps();
  const gapMap = new Map(gaps.map(g => [g.id, g]));
  const all = [...(model.sample_data.staff_shifts || [])].sort((a, b) => a.department.localeCompare(b.department));

  panel.innerHTML = all.length ? all.map(s => {
    const gap = gapMap.get(s.shift_id);
    return `
    <div class="mission-item">
      <span class="mtag ${gap ? gap.severity : 'low'}">${gap ? 'SHORT' : 'FULL'}</span>
      <span class="mtitle">${s.department} — ${s.shift} shift</span>
      <span class="mmeta">${s.scheduled_headcount}/${s.required_headcount} scheduled${gap ? ` — ${gap.gap} short (${gap.gap_pct}%)` : ''}</span>
    </div>
  `;
  }).join('') : '<div class="mission-item"><span class="mmeta">No staffing data for this period.</span></div>';
}
