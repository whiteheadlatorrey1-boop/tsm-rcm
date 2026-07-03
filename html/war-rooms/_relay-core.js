/**
 * TSM Relay Core (Single Source of Truth)
 * Enterprise-grade storage abstraction layer
 */

function tsmRelayWrite(key, payload) {
  const json = JSON.stringify(payload);
  try {
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
  } catch (e) {
    console.error("Relay write failed:", key, e);
  }
  return json;
}

function tsmRelayRead(key) {
  return JSON.parse(
    sessionStorage.getItem(key) ||
    localStorage.getItem(key) ||
    "null"
  );
}

window.TSM_RELAY_CORE = {
  write: tsmRelayWrite,
  read: tsmRelayRead
};
