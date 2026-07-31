(function () {

  window.TSM_BNCA = window.TSM_BNCA || {
    missions: [],
    lastRun: null,
    observers: []
  };

  function createBncaSignal(payload) {
    return {
      id: "BNCA-" + Date.now(),
      created_at: new Date().toISOString(),
      status: "queued",
      priority: payload.priority || "MEDIUM",
      source: payload.source || "BNCA_ENGINE",
      exposure: payload.exposure || 0,
      risk: payload.risk || 0,
      action: payload.action || "review",
      owner: payload.owner || "unassigned",
      context: payload.context || {},
      progression: ["queued"]
    };
  }

  function analyzeDOM() {
    const brief = document.querySelector("#tsm-executive-briefing-root");
    if (!brief) return;

    const text = brief.innerText || "";

    const exposureMatch = text.match(/\$([\d,.]+[MK]?)/i);
    const riskMatch = text.match(/Risk Score:\s*(\d+)/i);

    const exposure = exposureMatch ? exposureMatch[1] : "0";
    const risk = riskMatch ? parseInt(riskMatch[1]) : 0;

    let action = "monitor";
    let priority = "LOW";

    if (risk >= 80) {
      action = "emergency_escalation";
      priority = "CRITICAL";
    } else if (risk >= 60) {
      action = "accelerated_review";
      priority = "HIGH";
    } else {
      action = "standard_review";
      priority = "MEDIUM";
    }

    const mission = createBncaSignal({
      exposure,
      risk,
      action,
      priority,
      context: { sourceText: text.slice(0, 500) }
    });

    // Emit the documented platform event so other consumers (audit trail,
    // executive-briefing widgets, etc.) can react — this was previously
    // never fired anywhere despite being in tsm-event-bus.js's contract.
    if (window.TSMEventBus) {
      window.TSMEventBus.emit("BNCA_SIGNAL_RECEIVED", {
        vertical: "construction",
        signal: mission
      });
    }

    const exists = window.TSM_BNCA.missions.find(m =>
      m.exposure === exposure && m.risk === risk
    );

    if (!exists) {
      window.TSM_BNCA.missions.push(mission);
      console.log("[BNCA]", mission);
      dispatchMission(mission);
    }

    window.TSM_BNCA.lastRun = Date.now();
  }

  function dispatchMission(mission) {

    const queue = document.querySelector("#tsm-mission-queue");

    if (queue) {
      const item = document.createElement("div");
      item.style = "padding:8px;margin:4px;border-left:3px solid #00ff99;background:#111;color:white;";
      item.innerText =
        mission.priority + " | " + mission.action + " | Risk " + mission.risk + " | " + mission.exposure;

      queue.prepend(item);
    }

    window.dispatchEvent(new CustomEvent("TSM_BNCA_MISSION", {
      detail: mission
    }));
  }

  function boot() {

    analyzeDOM();

    const observer = new MutationObserver(analyzeDOM);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    setInterval(analyzeDOM, 2000);

    window.TSM_BNCA.observers.push(observer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
