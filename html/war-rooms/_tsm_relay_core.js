/**
 * TSM Relay Core (Safe Wrapper Layer)
 * Does NOT replace architecture, only standardizes writes.
 */

function TSM_RELAY_WRITE(key, payload) {
  const json = JSON.stringify(payload);

  try {
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
  } catch (e) {
    console.error("[TSM RELAY ERROR]", key, e);
  }

  return payload;
}

function TSM_RELAY_READ(key) {
  try {
    return JSON.parse(
      sessionStorage.getItem(key) ||
      localStorage.getItem(key) ||
      "null"
    );
  } catch (e) {
    return null;
  }
}

window.TSM_RELAY = {
  write: TSM_RELAY_WRITE,
  read: TSM_RELAY_READ
};
