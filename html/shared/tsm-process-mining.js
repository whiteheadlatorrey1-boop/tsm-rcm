/**
 * TSM Process Mining Engine v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #5 — Process Mining ("discover broken processes,
 * not just process documents").
 *
 * No new instrumentation required: this mines the event log the relay
 * control plane already writes on every stage transition
 * (html/war-rooms/_relay_control_plane/relay.core.js -> TSM.relay.write()
 * appends {ts, domain, key, id} to TSM_EVENT_LOG on every write). In the
 * browser that log is read straight from TSM.relay.eventLog(); server-side
 * (or for a page that hasn't loaded relay.core.js) you can pass an
 * equivalent array in directly -- analyze() doesn't care where it came from.
 *
 * A "stage" is inferred from the relay `key` written for a given `domain`
 * (e.g. TSM_MDM_RELAY gets written once per hop: war-room -> strategist ->
 * executive-portal). Events are grouped by (domain, id) into a case, sorted
 * chronologically, and consecutive stage pairs are measured against a
 * configurable benchmark so you get findings like:
 *   "Construction change orders: war-room -> strategist averaging 18h,
 *    benchmark is 5h."
 * ========================================================================== */

(function (global) {
  'use strict';

  // Default benchmark hours per domain, per stage-to-stage hop. Conservative
  // placeholders based on the source doc's illustrative figures (converted
  // to hours) -- swap in real historicals via analyze(events, { benchmarks })
  // once enough live event-log volume exists (see #8 Benchmark Intelligence).
  var DEFAULT_BENCHMARK_HOURS = {
    CONSTRUCTION: 5 * 24,   // change-order approval, industry benchmark ~5 days
    HEALTHCARE: 7 * 24,     // denial resolution, top performers ~7 days
    MDM: 24,                // duplicate resolution
    GOVERNANCE: 48,
    APPROVAL: 24,
    DEFAULT: 72
  };

  function benchmarkFor(domain, benchmarks) {
    var table = benchmarks || DEFAULT_BENCHMARK_HOURS;
    return table[domain] != null ? table[domain] : table.DEFAULT || DEFAULT_BENCHMARK_HOURS.DEFAULT;
  }

  function toMillis(ts) {
    var t = Date.parse(ts);
    return isNaN(t) ? null : t;
  }

  function groupIntoCases(events) {
    var cases = {};
    (events || []).forEach(function (ev) {
      if (!ev || !ev.domain || !ev.id) return;
      var caseKey = ev.domain + '::' + ev.id;
      if (!cases[caseKey]) cases[caseKey] = { domain: ev.domain, id: ev.id, events: [] };
      cases[caseKey].events.push(ev);
    });
    Object.keys(cases).forEach(function (k) {
      cases[k].events.sort(function (a, b) { return (toMillis(a.ts) || 0) - (toMillis(b.ts) || 0); });
    });
    return cases;
  }

  /**
   * analyze(events, opts)
   * events: array of { ts (ISO string), domain, key, id } — the same shape
   *   TSM.relay.eventLog() already returns.
   * opts.benchmarks: optional override map { DOMAIN: hours }.
   * opts.minHopsToReport: only report hops slower than this many hours over
   *   benchmark (default 0 — report every hop that's over benchmark at all).
   */
  function analyze(events, opts) {
    opts = opts || {};
    var benchmarks = opts.benchmarks;
    var cases = groupIntoCases(events);
    var findings = [];
    var hopStats = {}; // "DOMAIN|from->to" -> { total, count, over }

    Object.keys(cases).forEach(function (k) {
      var c = cases[k];
      for (var i = 1; i < c.events.length; i++) {
        var prev = c.events[i - 1], cur = c.events[i];
        var t0 = toMillis(prev.ts), t1 = toMillis(cur.ts);
        if (t0 == null || t1 == null || t1 < t0) continue;
        var hours = (t1 - t0) / 36e5;
        var hopKey = c.domain + '|' + prev.key + '->' + cur.key;
        if (!hopStats[hopKey]) hopStats[hopKey] = { domain: c.domain, from: prev.key, to: cur.key, total: 0, count: 0, over: 0 };
        hopStats[hopKey].total += hours;
        hopStats[hopKey].count += 1;

        var bench = benchmarkFor(c.domain, benchmarks);
        if (hours > bench) {
          hopStats[hopKey].over += 1;
          findings.push({
            domain: c.domain,
            caseId: c.id,
            from: prev.key,
            to: cur.key,
            elapsedHours: Math.round(hours * 10) / 10,
            benchmarkHours: bench,
            overBenchmarkHours: Math.round((hours - bench) * 10) / 10,
            rootCauseHint: hours > bench * 2
              ? 'More than 2x benchmark — likely missing owner/approval routing rather than a one-off delay.'
              : 'Moderately over benchmark — worth spot-checking this case for a stuck handoff.'
          });
        }
      }
    });

    var hopSummary = Object.keys(hopStats).map(function (k) {
      var h = hopStats[k];
      var avg = Math.round((h.total / h.count) * 10) / 10;
      var bench = benchmarkFor(h.domain, benchmarks);
      return {
        domain: h.domain,
        from: h.from,
        to: h.to,
        avgHours: avg,
        benchmarkHours: bench,
        sampleSize: h.count,
        overBenchmarkRate: Math.round((h.over / h.count) * 100)
      };
    }).sort(function (a, b) { return (b.avgHours - b.benchmarkHours) - (a.avgHours - a.benchmarkHours); });

    findings.sort(function (a, b) { return b.overBenchmarkHours - a.overBenchmarkHours; });
    if (opts.minHopsToReport) findings = findings.filter(function (f) { return f.overBenchmarkHours >= opts.minHopsToReport; });

    return {
      caseCount: Object.keys(cases).length,
      findingCount: findings.length,
      findings: findings.slice(0, 25),
      hopSummary: hopSummary
    };
  }

  /** Convenience wrapper for the browser: pulls straight from TSM.relay.eventLog() if present. */
  function analyzeFromRelay(opts) {
    var events = (global.TSM && global.TSM.relay && typeof global.TSM.relay.eventLog === 'function')
      ? global.TSM.relay.eventLog() : [];
    return analyze(events, opts);
  }

  var TSMProcessMining = {
    analyze: analyze,
    analyzeFromRelay: analyzeFromRelay,
    DEFAULT_BENCHMARK_HOURS: DEFAULT_BENCHMARK_HOURS
  };

  global.TSMProcessMining = TSMProcessMining;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMProcessMining;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-process-mining.js`) ────────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Engine = module.exports;

  var base = Date.parse('2026-07-01T08:00:00Z');
  var hrs = function (h) { return new Date(base + h * 36e5).toISOString(); };

  var sampleEvents = [
    { ts: hrs(0), domain: 'CONSTRUCTION', key: 'TSM_CONSTRUCTION_WAR_RELAY', id: 'CO-501' },
    { ts: hrs(30), domain: 'CONSTRUCTION', key: 'TSM_CONSTRUCTION_STRATEGIST_RELAY', id: 'CO-501' }, // 30h, over the 5-day(120h)? no -> under; adjust below
    { ts: hrs(0), domain: 'CONSTRUCTION', key: 'TSM_CONSTRUCTION_WAR_RELAY', id: 'CO-502' },
    { ts: hrs(200), domain: 'CONSTRUCTION', key: 'TSM_CONSTRUCTION_STRATEGIST_RELAY', id: 'CO-502' }, // 200h, well over 120h benchmark
    { ts: hrs(0), domain: 'MDM', key: 'TSM_MDM_RELAY', id: 'REC-9' },
    { ts: hrs(40), domain: 'MDM', key: 'TSM_MDM_RELAY', id: 'REC-9' } // 40h, over the 24h benchmark
  ];

  
  console.log(JSON.stringify(Engine.analyze(sampleEvents), null, 2));
}