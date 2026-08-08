function fmtMoneyIot(v){ return v==null ? '&mdash;' : '$' + Number(v).toLocaleString(); }

function renderIotTab() {
  const panel = document.getElementById('panel-iot-body');
  if (!panel || !engine) return;

  const alerts = engine.getIotAlerts();
  const energy = engine.getEnergySummary();
  const predictive = engine.getPredictiveRisk();

  const alertsHtml = alerts.length ? alerts.map(a => `
    <div class="mission-item">
      <span class="mtag ${a.severity.toLowerCase()}">${a.severity}</span>
      <span class="mtitle">Room ${a.room || '—'}: ${a.type.replace('_',' ')}</span>
      <span class="mmeta">${a.status.toUpperCase()}${a.reading ? ' — ' + a.reading : ''}</span>
    </div>
  `).join('') : '<div class="mission-item"><span class="mmeta">All sensors reporting normal.</span></div>';

  const energyHtml = energy ? `
    <div style="padding:12px;font-family:var(--mono);font-size:.6rem;line-height:1.8;">
      HVAC cost (${energy.period.replace('_',' ')}): <span style="color:var(--yellow)">${fmtMoneyIot(energy.hvac_cost)}</span><br>
      Lighting cost: <span style="color:var(--yellow)">${fmtMoneyIot(energy.lighting_cost)}</span><br>
      Total: <span style="color:var(--yellow)">${fmtMoneyIot(energy.total_cost)}</span>
      (<span style="color:${energy.trend_pct_vs_prior_period > 0 ? 'var(--red)' : 'var(--green)'}">${energy.trend_pct_vs_prior_period > 0 ? '+' : ''}${energy.trend_pct_vs_prior_period}%</span> vs prior period)<br>
      Cost per occupied room: ${fmtMoneyIot(energy.cost_per_occupied_room)}
    </div>
  ` : '<div style="padding:12px;color:var(--muted);">No energy data.</div>';

  const predictiveHtml = predictive.map(p => `
    <div class="mission-item">
      <span class="mtag ${p.risk}">${p.risk.toUpperCase()}</span>
      <span class="mtitle">${p.equipment} — ${p.room_or_zone}</span>
      <span class="mmeta">Health: ${p.health_score}/100 — ${p.detail}</span>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="panel-hdr" style="padding:8px 12px 0;">SENSOR ALERTS</div>
    ${alertsHtml}
    <div class="panel-hdr" style="padding:12px 12px 0;">ENERGY USAGE</div>
    ${energyHtml}
    <div class="panel-hdr" style="padding:12px 12px 0;">PREDICTIVE MAINTENANCE RISK</div>
    ${predictiveHtml}
  `;
}
