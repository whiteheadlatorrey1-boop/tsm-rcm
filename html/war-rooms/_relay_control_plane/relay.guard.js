/**
 * TSM Relay Guard (Runtime Enforcement Layer)
 * Prevents invalid relay keys at runtime
 */

const RelaySchema = {
  pattern: /^TSM_[A-Z0-9_]+_RELAY$/,
  validate(key) {
    return this.pattern.test(key);
  }
};

function assertRelayKey(key) {
  if (!RelaySchema.validate(key)) {
    console.error("[TSM RELAY GUARD] Invalid relay key blocked:", key);
    throw new Error("Invalid Relay Key: " + key);
  }
  return true;
}

const _setItem = Storage.prototype.setItem;

Storage.prototype.setItem = function(key, value) {
  if (typeof key === "string" && key.startsWith("TSM_") && key.includes("RELAY")) {
    assertRelayKey(key);
  }
  return _setItem.apply(this, arguments);
};

console.log("[TSM RELAY GUARD] Active");
