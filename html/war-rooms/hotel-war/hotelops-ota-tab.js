function fmtMoneyOta(v) { return v == null ? '&mdash;' : '$' + Number(v).toLocaleString(); }

function renderOtaTab() {
  const panel = document.getElementById('panel-ota-intelligence-body');
  if (!panel || !engine) return;

  const ota = engine.getOtaExposure();

  const summaryHtml = `
    <div style="padding:12px;font-family:var(--mono);font-size:.6rem;line-height:1.8;">
      Overcharge exposure this period: <span style="color:var(--red)">${fmtMoneyOta(ota.period_total)}</span><br>
      Annualized estimate: <span style="color:var(--red)">${fmtMoneyOta(ota.annualized_estimate)}</span>
    </div>
  `;

  const itemsHtml = ota.items.length ? ota.items.map(it => `
    <div class="mission-item">
      <span class="mtag high">${it.overcharge_pct}%</span>
      <span class="mtitle">${it.ota}: charged ${it.charged_pct}% vs ${it.contracted_pct}% contracted</span>
      <span class="mmeta">Overcharge: ${fmtMoneyOta(it.overcharge_amount)}</span>
    </div>
  `).join('') : '<div class="mission-item"><span class="mmeta">No OTA overcharges detected.</span></div>';

  panel.innerHTML = `
    <div class="panel-hdr" style="padding:8px 12px 0;">OVERCHARGE EXPOSURE</div>
    ${summaryHtml}
    <div class="panel-hdr" style="padding:12px 12px 0;">FLAGGED BOOKINGS</div>
    ${itemsHtml}
  `;
}
