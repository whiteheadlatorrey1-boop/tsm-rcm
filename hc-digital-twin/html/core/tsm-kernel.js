window.TSM_KERNEL = (function () {
  const PREFIX = "tsm_war_relay_";

  function setRelay(v, p) {
    // tsm-enforcer.js blocks any localStorage write to a "tsm_war_relay_"
    // key to stop old, scattered, direct writes that bypass this kernel.
    // But that block was unconditional and caught the kernel's own
    // sanctioned write too -- this flag tells the enforcer "this write IS
    // going through the kernel, let it through" for the duration of the
    // call only.
    window.__TSM_KERNEL_WRITE__ = true;
    try {
      localStorage.setItem(PREFIX + v, JSON.stringify({
        ts: Date.now(),
        v, p
      }));
    } finally {
      window.__TSM_KERNEL_WRITE__ = false;
    }
  }

  function getRelay(v) {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + v));
    } catch {
      return null;
    }
  }

  return { setRelay, getRelay };
})();