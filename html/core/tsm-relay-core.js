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

    // Callers pass either an object or a JSON string (JSON.stringify(payload)).
    // Spreading a string directly would silently produce character-indexed
    // garbage instead of the real fields, so normalize to an object first.
    let data = payload;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("[TSM RELAY] payload was a non-JSON string, wrapping raw:", e);
        data = { raw: data };
      }
    }

    const enriched = {
      ...data,
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
