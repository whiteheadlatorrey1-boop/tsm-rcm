'use strict';

class ChaosEngine {
  constructor(twins) {
    this.twins = twins || {};
    this.intervalMs = 60000;
    this.timer = null;
    this.running = false;
    this.history = [];
    this.counters = { triggered: 0, succeeded: 0, failed: 0 };
  }

  // Walks a twin's state and buckets every discoverable entity (id + full
  // record) by the property name it was found under (e.g. "hosts", "users",
  // "links"). Schema-agnostic — uses whatever key names that twin's own state
  // actually has, so it self-adapts to VMware's nested clusters[].hosts[],
  // AD's users map, M365's mailboxes, etc. without hard-coding internals.
  // "events" is skipped since event log entries aren't fault targets.
  _collectPools(state, pools = {}, depth = 0) {
    if (!state || typeof state !== 'object' || depth > 3) return pools;
    for (const key of Object.keys(state)) {
      if (key === 'events') continue;
      const val = state[key];
      if (Array.isArray(val)) {
        const entries = val
          .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
          .map((item) => ({ id: item.id, record: item }));
        if (entries.length) pools[key] = (pools[key] || []).concat(entries);
        // Descend into each array item so nested collections (e.g. a VMware
        // cluster's .hosts[]) get their own pool too, not just the parent.
        val.forEach((item) => {
          if (item && typeof item === 'object') this._collectPools(item, pools, depth + 1);
        });
      } else if (val && typeof val === 'object') {
        const keys = Object.keys(val);
        // Only treat this as an id-keyed entity map (e.g. users: {jdoe: {...}})
        // if every value looks like a record, not a scalar config value.
        const looksLikeEntityMap = keys.length > 0 && keys.every((k) => val[k] && typeof val[k] === 'object');
        if (looksLikeEntityMap) {
          pools[key] = (pools[key] || []).concat(keys.map((k) => ({ id: k, record: val[k] })));
        }
      }
    }
    return pools;
  }

  // Routes a fault type to the pool(s) most likely to hold its valid targets,
  // matched against the pool's *actual* key name by pattern rather than an
  // exact literal — so "mailboxes", "mailboxAccounts", etc. all match /mail/i
  // without needing to know each twin's precise property name up front.
  // Falls back to every pool if nothing matches, so an unrecognized twin
  // still works, just less precisely (the retry loop covers the rest).
  _preferredPoolPatterns(type) {
    const t = (type || '').toLowerCase();
    const rules = [
      { match: /host|partition/, patterns: [/host/i, /node/i] },
      { match: /datastore/, patterns: [/datastore/i] },
      { match: /link|latency|packet|bgp/, patterns: [/link/i] },
      { match: /replication/, patterns: [/domaincontroller/i] },
      { match: /gpo/, patterns: [/organizationalunit/i, /^ou/i] },
      { match: /account|password|mfa/, patterns: [/^users?$/i] },
      { match: /disk|bsod|battery|driver|patch|printer/, patterns: [/endpoint/i, /device/i] },
      { match: /mailbox|sync/, patterns: [/mail/i] },
      { match: /license/, patterns: [/licens/i, /mail/i] },
      { match: /outage|service/, patterns: [/service/i, /vendor/i] },
      { match: /ticket|escalat|breach/, patterns: [/ticket/i] },
      { match: /shipment/, patterns: [/vendor/i, /shipment/i] },
    ];
    const hit = rules.find((r) => r.match.test(t));
    return hit ? hit.patterns : [];
  }

  // A few fault types need more than "any entity of the right kind" — they
  // need an entity with a specific attribute already present. Verified
  // against the actual twin data (e.g. the Command Center UI reads
  // link.bgpSession directly), rather than guessed.
  _matchesExtraConstraint(type, record) {
    if (type === 'bgp-flap') return record && record.bgpSession !== undefined;
    return true;
  }

  _pickTargetId(state, type) {
    const pools = this._collectPools(state);
    const patterns = this._preferredPoolPatterns(type);

    for (const pattern of patterns) {
      const poolKey = Object.keys(pools).find((k) => pattern.test(k));
      if (!poolKey) continue;
      const candidates = pools[poolKey].filter((e) => this._matchesExtraConstraint(type, e.record));
      if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)].id;
    }

    // No confident pool for this fault type (or twin schema we don't
    // recognize) — fall back to anything discoverable in the state that
    // still satisfies any known extra constraint.
    const all = Object.values(pools).flat().filter((e) => this._matchesExtraConstraint(type, e.record));
    if (!all.length) return undefined;
    return all[Math.floor(Math.random() * all.length)].id;
  }

  triggerOnce(moduleName) {
    const entry = this.twins[moduleName];
    if (!entry) throw new Error(`Unknown chaos module: ${moduleName}`);
    const { twin, faultTypes } = entry;

    // Try each distinct fault type at most once, rather than re-rolling
    // randomly (which could keep re-picking the same type that just failed
    // because no valid target currently exists for it, e.g. "sla-breach"
    // when there are no open vendor tickets yet).
    let remainingTypes = (faultTypes || []).filter((t) => t !== 'clear');
    let result;

    while (remainingTypes.length) {
      const type = remainingTypes[Math.floor(Math.random() * remainingTypes.length)];
      const targetId = this._pickTargetId(twin.getState(), type);
      result = { ts: new Date().toISOString(), module: moduleName, type, targetId };
      try {
        twin.applyFault(type, targetId);
        result.ok = true;
        break;
      } catch (err) {
        result.ok = false;
        result.error = err.message;
        remainingTypes = remainingTypes.filter((t) => t !== type);
      }
    }

    this.history.unshift(result);
    this.history = this.history.slice(0, 50);
    this.counters.triggered += 1;
    if (result.ok) this.counters.succeeded += 1;
    else this.counters.failed += 1;
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
      counters: { ...this.counters },
    };
  }
}

module.exports = { ChaosEngine };