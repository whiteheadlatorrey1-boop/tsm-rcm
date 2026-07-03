/**
 * TSM RELAY CORE v1
 * Standardized relay bus for all war rooms
 */

(function () {
  function buildKey(vertical) {
    return `TSM_${vertical.toUpperCase()}_RELAY`;
  }

  window.writeRelay = function (vertical, payload) {
    const key = buildKey(vertical);

    const enriched = {
      ...payload,
      relayKey: key,
      timestamp: new Date().toISOString(),
      source: "TSM_RELAY_CORE"
    };

    try {
      sessionStorage.setItem(key, JSON.stringify(enriched));
      localStorage.setItem(key, JSON.stringify(enriched));
    } catch (e) {
      console.error("Relay write failed:", e);
    }

    window.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", {
      detail: enriched
    }));

    console.log("[TSM RELAY]", key, enriched);

    return enriched;
  };
})();
