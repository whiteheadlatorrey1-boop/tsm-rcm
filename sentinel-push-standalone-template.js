/**
 * Sentinel push template for the 4 STANDALONE phases:
 *   governance | mdm | integration-hub | digital-twin
 *
 * Copy this block into each phase's *-strategist.html, right after the
 * point where the phase's own analysis/report has finished generating.
 * Replace every <VERTICAL> / <VERTICAL_UPPER> placeholder for the page
 * you're editing. This matches the confirmed working contract from
 * finops-main-strategist.html (TSM_FINOPS_STRATEGIST_RELAY) --
 * see that file's comments at ~1286-1300 for why each field is shaped
 * this way.
 *
 * DO NOT copy this into o2c / crm / cpq / catalog / approval / wip
 * strategist pages. Those 6 are analyze(context) services consumed by
 * Industry War Rooms -- they do not get their own relay key or route.
 * This was already caught and reverted twice (Phase 9 violation). Their
 * only path into Sentinel is via TSMCapabilitySweep enrichment/promotion,
 * not a direct push like this.
 */

(function () {
  'use strict';

  var VERTICAL = '<VERTICAL>';              // e.g. 'governance', 'mdm', 'integration-hub', 'digital-twin'
  var RELAY_KEY = 'TSM_<VERTICAL_UPPER>_STRATEGIST_RELAY'; // e.g. TSM_GOVERNANCE_STRATEGIST_RELAY

  // Sentinel's SEV_POINTS keys are CRIT/HIGH/MED/LOW -- must match exactly.
  var SEV_MAP = { critical: 'CRIT', high: 'HIGH', medium: 'MED', low: 'LOW' };

  function normalizeSeverity(raw) {
    var key = String(raw || '').toLowerCase();
    return SEV_MAP[key] || (['CRIT', 'HIGH', 'MED', 'LOW'].indexOf(String(raw).toUpperCase()) >= 0
      ? String(raw).toUpperCase()
      : 'MED');
  }

  /**
   * pushToSentinel(finding) -- finding: the result object this phase's own
   * analysis/report just produced. Shape it to whatever this page already
   * has in scope (e.g. lastGovernanceObj, lastMdmObj) -- the fields below
   * are the minimum Sentinel actually reads.
   */
  function pushToSentinel(finding) {
    if (!finding) return;
    try {
      var anomaly = {
        id: (finding.caseId || VERTICAL + '-' + Date.now()),
        title: finding.title || (VERTICAL.toUpperCase() + ' finding'),
        severity: normalizeSeverity(finding.severity),
        // Sentinel sums a.exposure directly (verticalExposure()) -- only
        // set this when the phase has a real, defensible dollar figure.
        exposure: typeof finding.exposure === 'number' ? finding.exposure : 0,
        confidence: typeof finding.confidence === 'number' ? finding.confidence : 60,
        rootCause: finding.rootCause || '',
        recommendedAction: finding.recommendedAction || '',
        impacts: finding.impacts || {}
        // Extra phase-specific detail can be added here alongside the
        // contract fields -- Sentinel ignores unknown keys.
      };

      var existing = JSON.parse(localStorage.getItem(RELAY_KEY) || 'null') || { anomalies: [] };
      if (!Array.isArray(existing.anomalies)) existing.anomalies = [];
      existing.anomalies = existing.anomalies.filter(function (a) { return a.id !== anomaly.id; });
      existing.anomalies.push(anomaly);
      existing.generatedAt = new Date().toISOString();

      localStorage.setItem(RELAY_KEY, JSON.stringify(existing));

      if (window.TSMCapabilitySweep && typeof window.TSMCapabilitySweep.autoEnrichSentinel === 'function') {
        window.TSMCapabilitySweep.autoEnrichSentinel(VERTICAL);
      }
      window.dispatchEvent(new CustomEvent('TSM_SENTINEL_REFRESH'));
    } catch (e) {
      console.warn('[sentinel-push] ' + VERTICAL + ' error:', e);
    }
  }

  // Wire this into whatever function currently finishes this phase's
  // analysis (e.g. right where escalateToExecutive() or its equivalent
  // is called), same as construction-strategist.html line ~1088/1221.
  window['pushToSentinel_' + VERTICAL.replace(/-/g, '_')] = pushToSentinel;
})();
