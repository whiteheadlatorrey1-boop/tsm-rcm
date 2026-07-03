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
    INTEGRATION: "TSM_INTEGRATION_HUB_RELAY"
  };

  function now() {
    return new Date().toISOString();
  }

  function normalize(payload) {
    if (!payload) return payload;

    // basic drift repair layer
    if (!payload.timestamp) payload.timestamp = now();
    if (!payload.id) payload.id = Math.random().toString(36).substring(2);

    return payload;
  }

  function validate(domain, payload) {
    // lightweight guard (extend later into schema engine)
    if (!domain) throw new Error("Relay domain missing");
    if (!payload) throw new Error("Relay payload missing");
    return true;
  }

  function emit(domain, payload) {
    try {
      global.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", {
        detail: { domain, payload }
      }));
    } catch (e) {}
  }

  function write(domain, payload) {

    validate(domain, payload);

    const normalized = normalize(payload);

    const key = RELAY_REGISTRY[domain];
    if (!key) throw new Error("Unknown relay domain: " + domain);

    const json = JSON.stringify(normalized);

    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);

    emit(domain, normalized);

    console.log("[TSM RELAY]", domain, "written →", key);

    return normalized;
  }

  function read(domain) {
    const key = RELAY_REGISTRY[domain];
    if (!key) return null;

    return JSON.parse(
      localStorage.getItem(key) ||
      sessionStorage.getItem(key) ||
      "null"
    );
  }

  global.TSM = global.TSM || {};
  global.TSM.relay = {
    write,
    read,
    normalize,
    validate
  };

})(window);