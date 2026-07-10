/**
 * TSM Relay Core (Runtime Enforcement + Audit Log)
 * Single write path for all war-room relay traffic.
 * Consolidates the three legacy control-plane scripts into one.
 */
(function (global) {
  const RELAY_REGISTRY = {
    CRM: "TSM_CRM_RELAY",
    CPQ: "TSM_CPQ_RELAY",
    BPO: "TSM_BPO_RELAY",
    O2C: "TSM_O2C_RELAY",
    MDM: "TSM_MDM_RELAY",
    APPROVAL: "TSM_APPROVAL_RELAY",
    CATALOG: "TSM_CATALOG_RELAY",
    GOVERNANCE: "TSM_GOVERNANCE_RELAY",
    DIGITAL_TWIN: "TSM_DIGITAL_TWIN_RELAY",
    HONEYWELL: "TSM_HONEYWELL_RELAY",
    INTEGRATION: "TSM_INTEGRATION_HUB_RELAY",
    NOC: "TSM_NOC_RELAY",
    VMWARE_COPILOT: "TSM_VMWARE_COPILOT_RELAY",
    CLOUD_COPILOT: "TSM_CLOUD_COPILOT_RELAY",
    L1COPILOT: "TSM_L1_COPILOT_RELAY"
  };
  const EVENT_LOG_KEY = "TSM_EVENT_LOG";
  const EVENT_LOG_MAX = 500;

  function now() { return new Date().toISOString(); }

  function appendEvent(domain, key, payload) {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]"); } catch (e) { log = []; }
    log.push({ ts: now(), domain, key, id: payload.id || null });
    if (log.length > EVENT_LOG_MAX) log = log.slice(log.length - EVENT_LOG_MAX);
    try { localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log)); } catch (e) {}
  }

  function write(domain, payload) {
    const key = RELAY_REGISTRY[domain];
    if (!key) throw new Error("Unknown relay domain: " + domain);
    if (!payload) throw new Error("Relay payload missing for " + domain);

    payload.timestamp = payload.timestamp || now();
    payload.id = payload.id || Math.random().toString(36).slice(2);

    const json = JSON.stringify(payload);
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
    appendEvent(domain, key, payload);

    try {
      global.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", { detail: { domain, payload } }));
    } catch (e) {}

    return payload;
  }

  function read(domain) {
    const key = RELAY_REGISTRY[domain];
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null");
    } catch (e) { return null; }
  }

  function eventLog() {
    try { return JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]"); } catch (e) { return []; }
  }

  global.TSM = global.TSM || {};
  global.TSM.relay = { write, read, eventLog, domains: Object.keys(RELAY_REGISTRY) };

  console.log("[TSM RELAY CORE] Active");
})(window);
