window.TSM_KERNEL = (function () {
  const PREFIX = "tsm_war_relay_";

  function setRelay(v, p) {
    if (!v) throw new Error("Missing vertical relay key");

    // tsm-enforcer.js blocks any localStorage write to a "tsm_war_relay_"
    // key to stop old, scattered, direct writes that bypass this kernel.
    // But that block was unconditional and caught the kernel's own
    // sanctioned write too -- this flag tells the enforcer "this write IS
    // going through the kernel, let it through" for the duration of the
    // call only. (tsm-enforcer.js is currently stubbed out/disabled, but
    // this is kept so behavior is correct if it's ever re-enabled.)
    window.__TSM_KERNEL_WRITE__ = true;
    try {
      const key = PREFIX + v;
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), v, p }));
      return { status: "OK", key, written: true };
    } finally {
      window.__TSM_KERNEL_WRITE__ = false;
    }
  }

  function getRelay(v) {
    const key = PREFIX + v;
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function listRelays() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .map(k => ({ key: k, value: localStorage.getItem(k) }));
  }

  return { setRelay, getRelay, listRelays };
})();
