function renderReservationsTab() {
  const panel = document.getElementById('panel-reservations-body');
  if (!panel || !engine) return;

  const risks = engine.getReservationRisks();
  const typeLabel = { payment_failed: 'PAYMENT FAILED', unconfirmed_near_arrival: 'UNCONFIRMED', waitlist_risk: 'WAITLIST' };

  panel.innerHTML = risks.length ? risks.map(r => `
    <div class="mission-item">
      <span class="mtag ${r.severity}">${r.severity.toUpperCase()}</span>
      <span class="mtitle">${typeLabel[r.type] || r.type} — ${r.guest}</span>
      <span class="mmeta">${r.detail}</span>
    </div>
  `).join('') : '<div class="mission-item"><span class="mmeta">No reservation risks — all bookings confirmed and paid.</span></div>';
}
