function renderVipTab() {
  const panel = document.getElementById('panel-vip-arrivals-body');
  if (!panel || !engine || !model) return;

  const gaps = engine.getVipReadiness();
  const gapIds = new Set(gaps.map(g => g.id));
  const all = [...(model.sample_data.vip_arrivals || [])].sort((a, b) => a.arrival_hours_away - b.arrival_hours_away);

  panel.innerHTML = all.length ? all.map(v => {
    const gap = gaps.find(g => g.id === v.vip_id);
    return `
    <div class="mission-item">
      <span class="mtag ${gap ? gap.severity : 'low'}">${gap ? 'GAP' : 'READY'}</span>
      <span class="mtitle">${v.tier} — ${v.guest}, Room ${v.room}</span>
      <span class="mmeta">${gap ? `${gap.gaps.join(', ')} — arriving in ${v.arrival_hours_away}h` : `All prep complete — arriving in ${v.arrival_hours_away}h`}</span>
    </div>
  `;
  }).join('') : '<div class="mission-item"><span class="mmeta">No VIP arrivals on the board.</span></div>';
}
