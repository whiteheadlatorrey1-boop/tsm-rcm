/**
 * TSM Kernel Upgrade v2.1
 * Installs BNCA + Replay OS + Event Logging Patch
 * Safe drop-in for existing TSM war rooms
 *
 * FIXES (2026-07-13):
 *   - replay() no longer feeds its own logging back into the array it is
 *     iterating over. Previously, bus.emit() was patched to log every
 *     event (including the "REPLAY_APPLIED" event emitted at the end of
 *     apply()) into TSMReplayEngine's cache. Since replay() iterated over
 *     that same cache array by reference, every replayed event queued a
 *     new event behind it — an unbounded, self-feeding loop that grew the
 *     array indefinitely and crashed the renderer after ~15-20s of
 *     runaway JSON.stringify/localStorage writes. Fixed with a
 *     `replaying` guard that makes log() a no-op while a replay is in
 *     progress, plus iterating over a frozen snapshot as a second line
 *     of defense.
 *   - apply()'s MISSION_UPDATED/MISSION_COMPLETE cases referenced
 *     `store.window.TSMEventBus`, which does not exist on TSMMissionStore
 *     (it has no `.window` property) — this would have thrown on any
 *     real mission-update replay. Now uses `bus` directly, already in
 *     scope.
 *   - MISSION_UPDATE emit calls previously passed 3 arguments into
 *     emit(event, payload), which only accepts 2 — the id was silently
 *     dropped. Now passed as a single payload object.
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

    // log EVERYTHING (replay layer) — except while a replay is actively
    // running, or this feeds back into TSMReplayEngine's own array (see
    // header note above).
    try {
      if (!window.TSMReplayEngine?.replaying) {
        window.TSMReplayEngine?.log({
          type: event,
          payload,
          ts: Date.now()
        });
      }
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
      this.replaying = false;
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
      // Never record new events while a replay is in progress — see
      // header note. Without this guard, apply()'s own "REPLAY_APPLIED"
      // emit re-enters this method and grows _cache unboundedly while
      // replay() is still iterating over it.
      if (this.replaying) return;
      this._cache.push(event);
      this.save();
    }

    replay(store, bus) {

      console.log("[TSM-REPLAY] Rebuilding system from event log...");

      // Snapshot the current log as a plain array copy. Even with the
      // `replaying` guard above preventing new writes, iterating over a
      // copy rather than the live _cache reference is a second, cheap
      // line of defense against this class of bug recurring.
      const events = [...this._cache];

      if (!store || !bus) {
        console.warn("[TSM-REPLAY] Missing store or bus");
        return;
      }

      this.replaying = true;
      try {
        // reset state
        store.state.missions = [];
        store.state.history = [];

        for (const e of events) {
          this.apply(e, store, bus);
        }

        store.save();
      } finally {
        this.replaying = false;
      }

      console.log("[TSM-REPLAY] Replay complete:", events.length, "events");
    }

    apply(event, store, bus) {

      switch (event.type) {

        case "MISSION_CREATED":

          break;

        case "MISSION_UPDATED":
          bus.emit("MISSION_UPDATE", { id: event.payload.id, ...event.payload });
          break;

        case "MISSION_COMPLETE":
          bus.emit("MISSION_UPDATE", { id: event.payload.id, status: "COMPLETE" });
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