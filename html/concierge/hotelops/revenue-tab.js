function fmtMoneyRev(v) { return v == null ? '&mdash;' : '$' + Number(v).toLocaleString(); }
function fmtPctRev(v) { return v == null ? '&mdash;' : v + '%'; }

function renderRevenueTab() {
  const panel = document.getElementById('panel-revenue-management-body');
  if (!panel || !engine) return;

  const k = engine.computeKpis();

  panel.innerHTML = `
    <div style="padding:12px;font-family:var(--mono);font-size:.6rem;line-height:1.9;">
      RevPAR: <span style="color:var(--yellow)">${fmtMoneyRev(k.revpar)}</span> &nbsp;
      ADR: <span style="color:var(--yellow)">${fmtMoneyRev(k.adr)}</span> &nbsp;
      Occupancy: <span style="color:var(--yellow)">${fmtPctRev(k.occupancy_pct)}</span><br>
      Weekday occupancy: ${fmtPctRev(k.weekday_occ_pct)} &nbsp; Weekend occupancy: ${fmtPctRev(k.weekend_occ_pct)}<br>
      GOP margin: <span style="color:${k.gop_margin_pct != null && k.gop_target_pct != null && k.gop_margin_pct < k.gop_target_pct ? 'var(--red)' : 'var(--green)'}">${fmtPctRev(k.gop_margin_pct)}</span> vs target ${fmtPctRev(k.gop_target_pct)}<br>
      NPS score: <span style="color:var(--yellow)">${k.nps_score ?? '&mdash;'}</span> vs industry avg ${k.nps_industry_avg ?? '&mdash;'}<br>
      Section 179 eligible: ${fmtMoneyRev(k.section179_eligible)}
    </div>
  `;
}
