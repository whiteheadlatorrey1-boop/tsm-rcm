/**
 * TSM Kernel Upgrade v2.0
 * Installs BNCA + Replay OS + Event Logging Patch
 * Safe drop-in for existing TSM war rooms
 */

(function () {

  console.log("[TSM-KERNEL] Installing BNCA + Replay OS...");

  // ================================
  // 1. EVENT BUS PATCH (SAFE WRAP)
  // ================================
  const bus = window.TSMEventBus;

  if (!bus) {
    console.error("[TSM-KERNEL] EventBus not found. Load core first.");
    return;
  }

  // prevent double patching
  if (bus.__KERNEL_PATCHED__) {
    console.warn("[TSM-KERNEL] Already patched. Skipping.");
    return;
  }

  const originalEmit = bus.emit.bind(bus);

  bus.emit = function (event, payload) {

    // forward to original handlers
    const result = originalEmit(event, payload);

    // log EVERYTHING (replay layer)
    try {
      window.TSMReplayEngine?.log({
        type: event,
        payload,
        ts: Date.now()
      });
    } catch (e) {
      console.warn("[TSM-REPLAY] log failed:", e);
    }

    return result;
  };

  bus.__KERNEL_PATCHED__ = true;

  // ================================
  // 2. BNCA ENGINE
  // ================================
  class TSMBNCAEngine {

    evaluate(mission) {

      const score = mission.severity || 0;
      const sector = mission.sector;
      const payload = JSON.stringify(mission.payload || {}).toLowerCase();

      // BLOCK RULE
      if (payload.includes("compliance violation")) {
        return {
          decision: "BLOCK",
          action: "HOLD",
          reason: "Compliance violation detected"
        };
      }

      // ESCALATION RULE
      if (score >= 85) {
        return {
          decision: "ESCALATE",
          action: "REQUIRE_HUMAN_APPROVAL",
          reason: "Critical severity threshold"
        };
      }

      // HEALTHCARE RULE
      if (sector === "healthcare" && score >= 70) {
        return {
          decision: "ESCALATE",
          action: "BNCA_REVIEW_REQUIRED",
          reason: "Healthcare high-risk threshold"
        };
      }

      return {
        decision: "PASS",
        action: "EXECUTE",
        reason: "All checks passed"
      };
    }
  }

  window.TSMBNCAEngine = new TSMBNCAEngine();

  // ================================
  // 3. REPLAY ENGINE
  // ================================
  class TSMReplayEngine {

    constructor() {
      this.key = "TSM_EVENT_LOG_V2";
      this._cache = this.load();
    }

    load() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || [];
      } catch {
        return [];
      }
    }

    save() {
      localStorage.setItem(this.key, JSON.stringify(this._cache));
    }

    log(event) {
      this._cache.push(event);
      this.save();
    }

    replay(store, bus) {

      console.log("[TSM-REPLAY] Rebuilding system from event log...");

      const events = this._cache;

      if (!store || !bus) {
        console.warn("[TSM-REPLAY] Missing store or bus");
        return;
      }

      // reset state
      store.state.missions = [];
      store.state.history = [];

      for (const e of events) {
        this.apply(e, store, bus);
      }

      store.save();

      console.log("[TSM-REPLAY] Replay complete:", events.length, "events");
    }

    apply(event, store, bus) {

      switch (event.type) {

        case "MISSION_CREATED":
          window.TSMEventBus.emit("SIGNAL", event.payload);
          break;

        case "MISSION_UPDATED":
          store.window.TSMEventBus.emit("MISSION_UPDATE", event.payload.id, event.payload);
          break;

        case "MISSION_COMPLETE":
          store.window.TSMEventBus.emit("MISSION_UPDATE", event.payload.id, {
            status: "COMPLETE"
          });
          break;
      }

      bus.emit("REPLAY_APPLIED", event);
    }
  }

  window.TSMReplayEngine = new TSMReplayEngine();

  // ================================
  // 4. SYSTEM BOOTSTRAP (RECOVERY)
  // ================================
  window.addEventListener("load", () => {

    console.log("[TSM] Kernel boot sequence starting...");

    const store = window.TSMMissionStore;
    const bus = window.TSMEventBus;

    if (!store || !bus) {
      console.warn("[TSM] Core systems not ready for replay");
      return;
    }

    // restore state from event log
    window.TSMReplayEngine.replay(store, bus);

    console.log("[TSM] System fully restored (BNCA + Replay active)");
  });

})();