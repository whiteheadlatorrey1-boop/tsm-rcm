// ======================================
// TSM AUTONOMY ENFORCER (VERTICAL SCOPED)
// ======================================

(function () {

  const VERTICALS = [
    "healthcare",
    "legal-pro",
    "tsm-insurance",
    "construction-suite",
    "reo-pro",
    "finops-suite",
    "bpo"
  ];

  function get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  function checkVertical(vertical) {

    const stratKey = `TSM_STRAT_CONFIRMED_${vertical}`;
    const execKey  = `TSM_EXEC_CONFIRMED_${vertical}`;

    const strat = get(stratKey);
    const exec  = get(execKey);

    return {
      vertical,
      strat: !!strat,
      exec: !!exec,
      healthy: !!(strat && exec)
    };
  }

  function audit() {

    const report = VERTICALS.map(checkVertical);

    const pass = report.filter(r => r.healthy).length;

    console.log("=======================================");
    console.log("TSM AUTONOMY ENFORCER (SCOPED)");
    console.log("=======================================");

    report.forEach(r => {
      console.log(
        r.vertical.padEnd(25),
        r.healthy ? "PASS" : "FAIL"
      );
    });

    console.log("=======================================");
    console.log(`HEALTH SCORE: ${pass}/${VERTICALS.length}`);
    console.log("=======================================");

    return report;
  }

  function autoHeal() {
    if (!window.tsmMission) {
      window.tsmMission = {
        id: "AUTO-" + Date.now().toString(36),
        vertical: "UNKNOWN",
        createdAt: Date.now()
      };
    }
  }

  window.TSM_ENFORCER = {
    audit,
    autoHeal
  };

  setTimeout(() => {
    autoHeal();
    audit();
  }, 1200);

})();


// ===============================
// 🚨 HARDEN MODE RULE
// ===============================
TSM_ENFORCER.rules = TSM_ENFORCER.rules || [];

TSM_ENFORCER.rules.push({
  id: "NO_DIRECT_RELAY_WRITE",
  pattern: /(localStorage\.setItem\(\"tsm_war_relay_|sessionStorage\.setItem\(\"TSM_WAR_RELAY_)/,
  severity: "CRITICAL",
  message: "Direct relay mutation detected. Must use TSM_KERNEL.setRelay()"
});
