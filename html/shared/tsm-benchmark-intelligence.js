/**
 * TSM Benchmark Intelligence Engine v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #8 — "The system learns and publishes benchmarks,
 * turning TSM from processing into consulting."
 *
 * Two data sources, both already produced elsewhere in the platform:
 *  1. Live hop timings from TSMProcessMining.analyze() (#5) -- once real
 *     event-log volume builds up, aggregate() below turns that into
 *     per-domain avg/median/top-performer figures automatically.
 *  2. A static REFERENCE_BENCHMARKS table of illustrative industry figures
 *     (the same order-of-magnitude figures used in the BPO upgrade brief)
 *     to compare against until #5's live data has enough volume to be
 *     statistically meaningful. Clearly flagged as reference, not fact --
 *     swap out with your own sourced numbers before quoting them to a client.
 *
 * compare() always prefers live data once a domain has >= opts.minSample
 * cases; otherwise it falls back to the reference table so the panel never
 * shows a blank benchmark.
 * ========================================================================== */

(function (global) {
  'use strict';

  // Illustrative reference points only -- not sourced from a named report.
  // Replace per-domain once live volume (via aggregate()) clears minSample.
  var REFERENCE_BENCHMARKS = {
    HEALTHCARE: { metric: 'Denial resolution', avgDays: 14, topPerformerDays: 7, source: 'reference' },
    CONSTRUCTION: { metric: 'Change-order approval', avgDays: 11, topPerformerDays: 4, source: 'reference' },
    MDM: { metric: 'Duplicate-record resolution', avgDays: 3, topPerformerDays: 1, source: 'reference' },
    APPROVAL: { metric: 'Approval cycle time', avgDays: 2, topPerformerDays: 0.5, source: 'reference' },
    GOVERNANCE: { metric: 'Policy exception resolution', avgDays: 5, topPerformerDays: 2, source: 'reference' }
  };

  function round1(n) { return Math.round(n * 10) / 10; }

  function median(nums) {
    var s = nums.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  /**
   * aggregate(hopSummary)
   * hopSummary: the array TSMProcessMining.analyze().hopSummary already
   * produces -- [{ domain, from, to, avgHours, benchmarkHours, sampleSize,
   * overBenchmarkRate }]. Rolls hops up to one avg-days figure per domain
   * (top-performer approximated as the fastest hop average within the
   * domain, since we don't have per-case percentiles from hop summaries).
   */
  function aggregate(hopSummary) {
    var byDomain = {};
    (hopSummary || []).forEach(function (h) {
      if (!byDomain[h.domain]) byDomain[h.domain] = [];
      byDomain[h.domain].push(h);
    });
    var out = {};
    Object.keys(byDomain).forEach(function (domain) {
      var hops = byDomain[domain];
      var totalSample = hops.reduce(function (s, h) { return s + h.sampleSize; }, 0);
      var avgDays = round1(hops.reduce(function (s, h) { return s + h.avgHours * h.sampleSize; }, 0) / totalSample / 24);
      var fastestHopAvgDays = round1(Math.min.apply(null, hops.map(function (h) { return h.avgHours; })) / 24);
      out[domain] = { metric: domain + ' hop time', avgDays: avgDays, topPerformerDays: fastestHopAvgDays, sampleSize: totalSample, source: 'live' };
    });
    return out;
  }

  /**
   * compare(domain, opts)
   * opts.live: the aggregate() output (or a subset) to prefer when present.
   * opts.minSample: minimum sampleSize before live data is trusted over the
   *   reference table (default 5).
   */
  function compare(domain, opts) {
    opts = opts || {};
    var live = opts.live && opts.live[domain];
    var minSample = opts.minSample != null ? opts.minSample : 5;
    var chosen = (live && live.sampleSize >= minSample) ? live : REFERENCE_BENCHMARKS[domain];
    if (!chosen) return null;
    return Object.assign({ domain: domain }, chosen);
  }

  /** allBenchmarks(opts) -- one row per known domain, live where available. */
  function allBenchmarks(opts) {
    opts = opts || {};
    var domains = Object.keys(REFERENCE_BENCHMARKS).concat(Object.keys(opts.live || {}))
      .filter(function (v, i, a) { return a.indexOf(v) === i; });
    return domains.map(function (d) { return compare(d, opts); }).filter(Boolean);
  }

  var TSMBenchmarkIntelligence = {
    REFERENCE_BENCHMARKS: REFERENCE_BENCHMARKS,
    aggregate: aggregate,
    compare: compare,
    allBenchmarks: allBenchmarks
  };

  global.TSMBenchmarkIntelligence = TSMBenchmarkIntelligence;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMBenchmarkIntelligence;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-benchmark-intelligence.js`) ────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Engine = module.exports;

  // Reference-only, no live data yet.
  console.log('[reference only]', JSON.stringify(Engine.compare('HEALTHCARE'), null, 2));

  // Simulate enough live volume to flip MDM over to live data.
  var liveAgg = Engine.aggregate([
    { domain: 'MDM', from: 'TSM_MDM_RELAY', to: 'TSM_MDM_RELAY', avgHours: 20, benchmarkHours: 24, sampleSize: 6, overBenchmarkRate: 10 }
  ]);
  console.log('[live overrides reference]', JSON.stringify(Engine.compare('MDM', { live: liveAgg }), null, 2));

  console.log('[all benchmarks]', JSON.stringify(Engine.allBenchmarks({ live: liveAgg }), null, 2));
}