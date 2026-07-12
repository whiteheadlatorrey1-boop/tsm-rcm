window.TSM_KERNEL = (function () {
  const STORAGE_PREFIX = "tsm_war_relay_";

  function setRelay(vertical, payload) {
    if (!vertical) throw new Error("Missing vertical relay key");

    const key = STORAGE_PREFIX + vertical;

    const normalizedPayload = {
      timestamp: Date.now(),
      vertical,
      payload
    };

    localStorage.setItem(key, JSON.stringify(normalizedPayload));

    return { status: "OK", key, written: true };
  }

  function getRelay(vertical) {
    const key = STORAGE_PREFIX + vertical;
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    try { return JSON.parse(raw); } catch { return null; }
  }

  function listRelays() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_PREFIX))
      .map(k => ({ key: k, value: localStorage.getItem(k) }));
  }

  return { setRelay, getRelay, listRelays };
})();
