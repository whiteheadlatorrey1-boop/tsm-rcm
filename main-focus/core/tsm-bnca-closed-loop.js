(function () {

  // =====================================================
  // STATE STORE (PERSISTENT IN-MEMORY EXECUTION LEDGER)
  // =====================================================
  window.TSM_CLOSED_LOOP = window.TSM_CLOSED_LOOP || {
    missions: [],
    events: [],
    state: {}
  };

  // =====================================================
  // CREATE MISSION
  // =====================================================
  function window.TSMEventBus.emit("SIGNAL", data) {
    return {
      id: "BNCA-" + Date.now(),
      created_at: new Date().toISOString(),
      status: "queued", // queued → running → blocked → complete
      priority: data.priority || "MEDIUM",
      exposure: data.exposure || 0,
      risk: data.risk || 0,
      action: data.action || "review",
      owner: data.owner || "unassigned",
      progress: 0,
      last_update: Date.now()
    };
  }

  // =====================================================
  // ANALYZE BRIEFING DOM
  // =====================================================
  function analyze() {
    const root = document.getElementById("tsm-executive-briefing-root");
    if (!root) return;

    const text = root.innerText || "";

    const riskMatch = text.match(/Risk Score:\s*(\d+)/i);
    const exposureMatch = text.match(/\$([\d,.]+)/i);

    const risk = riskMatch ? parseInt(riskMatch[1]) : 0;
    const exposure = exposureMatch ? exposureMatch[1] : "0";

    let priority = "LOW";
    let action = "monitor";

    if (risk >= 80) {
      priority = "CRITICAL";
      action = "emergency_escalation";
    } else if (risk >= 60) {
      priority = "HIGH";
      action = "accelerated_review";
    } else {
      priority = "MEDIUM";
      action = "standard_review";
    }

    const mission = window.TSMEventBus.emit("SIGNAL", { risk, exposure, priority, action });

    const exists = window.TSM_CLOSED_LOOP.missions.find(m =>
      m.risk === risk && m.exposure === exposure
    );

    if (!exists) {
      window.TSM_CLOSED_LOOP.missions.push(mission);
      dispatch("MISSION_CREATED", mission);
    }
  }

  // =====================================================
  // EXECUTION STATE ENGINE
  // =====================================================
  function executeMission(mission) {

    mission.status = "running";
    mission.last_update = Date.now();

    dispatch("MISSION_STARTED", mission);

    // simulate execution lifecycle
    setTimeout(() => {
      mission.progress = 50;
      dispatch("MISSION_PROGRESS", mission);
    }, 1000);

    setTimeout(() => {
      mission.status = "complete";
      mission.progress = 100;
      dispatch("MISSION_COMPLETE", mission);
    }, 2500);
  }

  // =====================================================
  // CLOSED LOOP FEEDBACK HANDLER
  // =====================================================
  function feedbackLoop() {

    window.TSM_CLOSED_LOOP.missions.forEach(m => {

      if (m.status === "queued") {
        executeMission(m);
      }

      // RE-EVALUATION LOOP (CLOSED LOOP CORE)
      if (m.status === "complete") {

        const drift = Math.random();

        if (drift > 0.7) {
          m.status = "reopen";
          dispatch("MISSION_REOPENED", m);
          executeMission(m);
        }
      }
    });
  }

  // =====================================================
  // EVENT SYSTEM (STRATEGIST / WAR ROOM BRIDGE)
  // =====================================================
  function dispatch(type, payload) {

    const event = {
      type,
      payload,
      timestamp: Date.now()
    };

    window.TSM_CLOSED_LOOP.events.push(event);

    window.dispatchEvent(new CustomEvent("TSM_CLOSED_LOOP_EVENT", {
      detail: event
    }));

    console.log("[CLOSED LOOP]", type, payload);
  }

  // =====================================================
  // BOOT STRAP (FULL AUTONOMY LOOP)
  // =====================================================
  function boot() {

    analyze();

    const observer = new MutationObserver(analyze);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    setInterval(analyze, 2000);
    setInterval(feedbackLoop, 1500);

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
