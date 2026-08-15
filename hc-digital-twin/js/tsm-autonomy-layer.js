/**
 * TSM AUTONOMY LAYER v1
 * Controlled self-triggering system
 */

(function () {
  "use strict";

  const MAX_DEPTH = 2;
  const COOLDOWN_MS = 4000;

  const state = {
    depth: 0,
    lastTrigger: 0
  };

  function canTrigger() {
    const now = Date.now();

    if (state.depth >= MAX_DEPTH) return false;
    if (now - state.lastTrigger < COOLDOWN_MS) return false;

    return true;
  }

  function trigger(signal, depth = 0) {
    if (!window.TSMEventBus) return;

    if (!canTrigger()) return;

    state.depth = depth;
    state.lastTrigger = Date.now();

    window.TSMEventBus.emit("SIGNAL", {
      ...signal,
      __autonomy: true,
      __depth: depth
    });
  }

  function onMissionComplete(mission) {
    if (!mission) return;

    if (mission.severity >= 70 || mission.status === "FAILED") {
      trigger({
        type: "AUTONOMY_REPLAY",
        payload: mission
      }, 1);
    }
  }

  function init() {
    window.TSMEventBus.on("MISSION_COMPLETE", onMissionComplete);
  }

  window.TSMAutonomyLayer = { init, trigger };

  window.addEventListener("load", init);
})();
