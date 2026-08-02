// ============================================================
// PATCH 2 for html/war-rooms/digital-twin/digital-twin.html
//
// This REPLACES the block from the first patch (countBySeverity
// through `const SIGNALS = VERTICAL_SIGNAL_CONFIG.map(buildLiveSignal);`)
// with an extended version that:
//   1. Supports an optional per-vertical `evaluate(raw)` override,
//      for verticals whose payload doesn't use the high/med/low
//      severity convention (BPO uses CRITICAL/HIGH/MED on a
//      different field entirely).
//   2. Folds BPO into VERTICAL_SIGNAL_CONFIG as a normal row,
//      using its real extraction.risks[].level data. This makes
//      getBpoLiveSignal() obsolete -- delete that function entirely
//      once this lands (it's no longer called anywhere).
//   3. Fixes RELAY_STORAGE_KEYS.INTEGRATION, which was wrong in the
//      first patch ('TSM_INTEGRATION_RELAY' -> should be
//      'TSM_INTEGRATION_HUB_RELAY', confirmed against the real
//      RELAY_REGISTRY in relay.core.js).
//
// After applying: delete the old getBpoLiveSignal() function
// entirely (it's dead code once BPO is in the config array), and
// remove getBpoLiveSignal() from anywhere else it's referenced.
// ============================================================

  // ── Shared severity tally for the `explain` arrays most verticals write.
  // Confirmed convention across O2C/CPQ/CRM/APPROVAL/GOVERNANCE/INTEGRATION:
  // getExplainItems() tags each item severity: 'high'|'med'|'low'.
  // BPO does NOT use this convention (see evaluateBpo below) -- it gets
  // its own `evaluate` override instead of relying on this helper.
  function countBySeverity(explain) {
    const c = { high: 0, med: 0, low: 0 };
    (explain || []).forEach(item => {
      if (item && c.hasOwnProperty(item.severity)) c[item.severity]++;
    });
    return c;
  }

  // ── Storage-key fallback map, sourced from relay.core.js RELAY_REGISTRY.
  // Kept as a local literal rather than importing RELAY_REGISTRY directly,
  // since relay.core.js may not expose it globally -- update this map if
  // RELAY_REGISTRY in relay.core.js ever changes.
  const RELAY_STORAGE_KEYS = {
    BPO: 'TSM_BPO_RELAY',
    O2C: 'TSM_O2C_RELAY',
    CPQ: 'TSM_CPQ_RELAY',
    CRM: 'TSM_CRM_RELAY',
    APPROVAL: 'TSM_APPROVAL_RELAY',
    GOVERNANCE: 'TSM_GOVERNANCE_RELAY',
    INTEGRATION: 'TSM_INTEGRATION_HUB_RELAY' // fixed: was 'TSM_INTEGRATION_RELAY'
  };

  // ── BPO's custom evaluator. BPO's payload has no `explain` array;
  // instead extraction.risks[] carries level: 'CRITICAL'|'HIGH'|'MED',
  // and extraction.severity carries an overall value (format not fully
  // confirmed -- treated as an optional extra signal, not load-bearing).
  // Returns the same {high,med,low} shape as countBySeverity() so
  // buildLiveSignal()'s tiering logic doesn't need to know the
  // difference between a default vertical and an override one.
  function evaluateBpo(raw) {
    const risks = (raw.extraction && raw.extraction.risks) || [];
    const c = { high: 0, med: 0, low: 0 };
    risks.forEach(rk => {
      if (rk.level === 'CRITICAL' || rk.level === 'HIGH') c.high++;
      else if (rk.level === 'MED') c.med++;
      else c.low++;
    });
    return c;
  }

  // ── Config-driven signal list. To add a new live vertical:
  //   - if its payload has explain[].severity (high/med/low), just add
  //     { key, label, tsField, okText } -- no function needed.
  //   - if it doesn't (like BPO), also supply evaluate(raw) returning
  //     {high, med, low} counts.
  const VERTICAL_SIGNAL_CONFIG = [
    { key: 'BPO',         label: 'BPO',         tsField: 'timestamp',   okText: 'BPO: pipeline operational — no risk signals', evaluate: evaluateBpo },
    { key: 'O2C',         label: 'O2C',         tsField: 'relayed_at',  okText: 'O2C: pipeline operational — no risk signals' },
    { key: 'CPQ',         label: 'CPQ',         tsField: 'timestamp',   okText: 'CPQ: quote pipeline healthy — no SLA risk' },
    { key: 'CRM',         label: 'CRM',         tsField: 'ts',          okText: 'CRM: cases and opportunities on track' },
    { key: 'APPROVAL',    label: 'APPROVALS',   tsField: 'timestamp',   okText: 'Approvals: queue clear — no SLA breaches' },
    { key: 'GOVERNANCE',  label: 'GOVERNANCE',  tsField: 'timestamp',   okText: 'Governance: controls passing — no open risks' },
    { key: 'INTEGRATION', label: 'INTEGRATION', tsField: 'timestamp',   okText: 'Integration Hub: systems and queues nominal' }
  ];

  function buildLiveSignal(cfg){
    try {
      let raw = null;
      if (window.TSM && window.TSM.relay && window.TSM.relay.read) {
        raw = window.TSM.relay.read(cfg.key);
      } else {
        const storageKey = RELAY_STORAGE_KEYS[cfg.key];
        const r = storageKey && (localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey));
        raw = r ? JSON.parse(r) : null;
      }
      if (raw) {
        const t = new Date(raw[cfg.tsField]);
        const time = isNaN(t) ? '—' : t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        const { high, med, low } = cfg.evaluate ? cfg.evaluate(raw) : countBySeverity(raw.explain);
        if (high > 0) {
          return {type:'bad', text:`${cfg.label}: ${high} high-severity item${high===1?'':'s'} flagged`, src:cfg.label, time, live:true};
        }
        if (med + low > 0) {
          const n = med + low;
          return {type:'warn', text:`${cfg.label}: ${n} item${n===1?'':'s'} needs attention`, src:cfg.label, time, live:true};
        }
        return {type:'ok', text:cfg.okText, src:cfg.label, time, live:true};
      }
    } catch(e) {}
    return {type:'warn', text:`${cfg.label}: no active data — open the ${cfg.label.toLowerCase()} war room to generate a live signal`, src:cfg.label, time:'—', live:false};
  }

  const SIGNALS = VERTICAL_SIGNAL_CONFIG.map(buildLiveSignal);