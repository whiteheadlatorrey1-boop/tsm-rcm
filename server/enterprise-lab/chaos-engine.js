'use strict';

class ChaosEngine {
  constructor(twins) {
    this.twins = twins || {};
    this.intervalMs = 60000;
    this.timer = null;
    this.running = false;
    this.history = [];
  }

  _pickTargetId(state) {
    const pools = [];
    for (const key of Object.keys(state)) {
      const val = state[key];
      if (Array.isArray(val)) {
        val.forEach((item) => {
          if (item && item.id) pools.push(item.id);
        });
      } else if (val && typeof val === 'object') {
        Object.keys(val).forEach((k) => pools.push(k));
      }
    }
    if (!pools.length) return undefined;
    return pools[Math.floor(Math.random() * pools.length)];
  }

  _pickFaultType(faultTypes) {
    const candidates = (faultTypes || []).filter((t) => t !== 'clear');
    if (!candidates.length) return undefined;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  triggerOnce(moduleName) {
    const entry = this.twins[moduleName];
    if (!entry) throw new Error(`Unknown chaos module: ${moduleName}`);
    const { twin, faultTypes } = entry;
    const type = this._pickFaultType(faultTypes);
    const targetId = this._pickTargetId(twin.getState());
    const result = { ts: new Date().toISOString(), module: moduleName, type, targetId };
    try {
      twin.applyFault(type, targetId);
      result.ok = true;
    } catch (err) {
      result.ok = false;
      result.error = err.message;
    }
    this.history.unshift(result);
    this.history = this.history.slice(0, 50);
    return result;
  }

  triggerRandom() {
    const names = Object.keys(this.twins);
    if (!names.length) throw new Error('No twins registered with chaos engine');
    const moduleName = names[Math.floor(Math.random() * names.length)];
    return this.triggerOnce(moduleName);
  }

  start(intervalMs) {
    if (intervalMs) this.intervalMs = intervalMs;
    if (this.running) return this.getStatus();
    this.running = true;
    this.timer = setInterval(() => {
      try {
        this.triggerRandom();
      } catch (err) {
        // no twins registered, or all failed — safe to ignore on a tick
      }
    }, this.intervalMs);
    if (this.timer.unref) this.timer.unref();
    return this.getStatus();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    return this.getStatus();
  }

  getStatus() {
    return {
      running: this.running,
      intervalMs: this.intervalMs,
      modules: Object.keys(this.twins),
      history: this.history.slice(0, 10),
    };
  }
}

module.exports = { ChaosEngine };
