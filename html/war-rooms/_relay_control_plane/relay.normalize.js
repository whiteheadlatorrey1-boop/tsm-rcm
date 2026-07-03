/**
 * TSM Relay Auto-Normalizer
 * Fixes legacy hyphen drift at runtime
 */

function normalizeRelayKey(key) {
  if (!key) return key;
  if (!key.includes("RELAY")) return key;
  return key.replace(/-/g, "_");
}

function safeSetRelay(key, value) {
  const normalized = normalizeRelayKey(key);
  return localStorage.setItem(normalized, value);
}

function safeGetRelay(key) {
  const normalized = normalizeRelayKey(key);
  return localStorage.getItem(normalized);
}

window.TSMRelay = {
  set: safeSetRelay,
  get: safeGetRelay,
  normalize: normalizeRelayKey
};

console.log("[TSM RELAY NORMALIZER] Active");
