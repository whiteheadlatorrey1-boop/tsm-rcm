function renderAirbnbTab() {
  const panel = document.getElementById('panel-airbnb-str-operations-body');
  if (!panel || !engine) return;
  const risk = engine.getAirbnbRisks();
  const summaryHtml = `
    <div style="padding:12px;font-family:var(--mono);font-size:.6rem;line-height:1.8;">
      Listings tracked: <span style="color:var(--white)">${risk.total_listings}</span><br>
      Listings at risk: <span style="color:${risk.at_risk ? 'var(--red)' : 'var(--white)'}">${risk.at_risk}</span>
    </div>
  `;
  const itemsHtml = risk.items.length ? risk.items.map(it => `
    <div class="mission-item">
      <span class="mtag ${it.severity}">${it.severity.toUpperCase()}</span>
      <span class="mtitle">${it.unit_name} (${it.listing_id})</span>
      <span class="mmeta">${it.issue}</span>
    </div>
  `).join('') : '<div class="mission-item"><span class="mmeta">No STR issues detected.</span></div>';
  panel.innerHTML = `
    <div class="panel-hdr" style="padding:8px 12px 0;">STR RISK SUMMARY</div>
    ${summaryHtml}
    <div class="panel-hdr" style="padding:12px 12px 0;">FLAGGED LISTINGS</div>
    ${itemsHtml}
  `;
}
