(function(){
  window.TSM_BPO_ROI = {
    sectors: {
      construction: { leakage: 900000, fee: 4900, recovery: 0.18, speed: "7–14 days", hook: "Recover underbilling, retainage, AIA draw leakage, and subcontractor exposure." },
      healthcare: { leakage: 1771000, fee: 4900, recovery: 0.12, speed: "5–10 days", hook: "Recover claims, prior auth denials, coding gaps, and AR aging exposure." },
      finops: { leakage: 500000, fee: 3900, recovery: 0.20, speed: "3–7 days", hook: "Resolve accrual mismatch, invoice variance, AP/AR drift, and close blockers." },
      insurance: { leakage: 1700000, fee: 5900, recovery: 0.10, speed: "10–21 days", hook: "Reduce premium audit gaps, reserve anomalies, policy recon drift, and claims leakage." },
      legal: { leakage: 22500, fee: 2900, recovery: 0.25, speed: "48 hrs–7 days", hook: "Recover unbilled matter work, deadline risk, discovery gaps, and billing delays." },
      realty: { leakage: 18000, fee: 2900, recovery: 0.30, speed: "24–72 hrs", hook: "Reduce disclosure backlog, commission recon issues, MLS/Broker QC gaps, and file delays." }
    },
    calc(sector){
      const s=this.sectors[sector] || this.sectors.finops;
      const est=Math.round(s.leakage*s.recovery);
      const annualFee=s.fee*12;
      const roi=Math.round((est*12)/annualFee);
      return { ...s, monthlyRecovery: est, annualFee, roi };
    }
  };
})();
