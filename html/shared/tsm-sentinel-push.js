/*
 * TSM Sentinel Push — shared utility
 *
 * Every vertical war room that feeds Sentinel Center (see
 * html/sentinel-center.html's VERTICALS list) ends up hand-rolling the same
 * three lines at the point it relays to its Strategist page:
 *
 *   localStorage.setItem('TSM_<VERTICAL>_STRATEGIST_RELAY', JSON.stringify(payload));
 *   window.dispatchEvent(new CustomEvent('TSM_SENTINEL_REFRESH'));
 *
 * (Schools: schPushToSentinel(), PM Copilot: pmPushToSentinel(), Mortgage:
 * inline in relayToStrategist(), HotelOps: inline in relayToStrategist(),
 * FinOps/Legal/BPO/Construction/Insurance/RealEstate/Healthcare: their own
 * inline equivalents.) This file is a drop-in, load-order-independent
 * utility (same pattern as relay.core.js) that verticals can call instead
 * of hand-writing that tail -- it does NOT touch how any vertical computes
 * its anomalies; each war room's own anomaly-building function (e.g.
 * mtgBuildSentinelAnomalies(), buildSentinelAnomalies()) is untouched and
 * still owns all the real severity/exposure/confidence math.
 *
 * USAGE
 *   <script src="/html/shared/tsm-sentinel-push.js"></script>
 *   ...
 *   // Minimal form -- pass just the anomalies array, gets wrapped in the
 *   // {generatedAt, anomalies} envelope Sentinel Center expects:
 *   TSMSentinelPush.push('SCHOOLS', anomalies);
 *
 *   // Full-payload form -- some verticals (Mortgage, HotelOps) already
 *   // write their whole war-room -> Strategist relay payload into the
 *   // same TSM_<VERTICAL>_STRATEGIST_RELAY key (it doubles as both the
 *   // Strategist's fallback read and Sentinel's anomaly feed, since the
 *   // payload already carries .anomalies + .generatedAt). Pass that
 *   // object through as-is and it's stored unmodified:
 *   TSMSentinelPush.push('MORTGAGE', payload);
 *
 *   // Optional third arg for verticals that also mirror into
 *   // sessionStorage (HotelOps does, matching its existing behavior):
 *   TSMSentinelPush.push('HOTELOPS', signedPayload, { alsoSession: true });
 *
 * DEDUPE
 * push() keeps an in-memory (per page-load) signature of the last
 * anomalies list pushed per vertical, and skips the storage write + event
 * dispatch entirely if the incoming anomalies are unchanged (same ids,
 * severities, exposures). None of the hand-rolled versions this replaces
 * had that guard -- every relay click re-dispatches TSM_SENTINEL_REFRESH
 * unconditionally today, even when nothing about the anomaly set actually
 * changed, which just means Sentinel Center's storage listener re-renders
 * for no reason. Real fix, not a behavior change anyone depends on.
 *
 * SEVERITY HELPER
 * Schools/Mortgage/PM Copilot each independently define an identical
 * ratio-based breach-severity function (SCH_SEV_THRESHOLDS / PM_SEV_
 * THRESHOLDS, both { crit: 0.30, high: 0.15 }). Exposed here too so new
 * callers don't have to redefine it, but existing per-vertical copies are
 * left in place rather than force-migrated -- they're correct and tiny,
 * and ripping them out isn't required to close this gap.
 */
(function (global) {
  'use strict';

  var DEFAULT_THRESHOLDS = { crit: 0.30, high: 0.15 };

  // verticalId -> last-pushed signature, in-memory for this page load only
  // (intentionally NOT persisted -- a fresh page load should always push
  // once regardless of what a previous tab/session last sent).
  var lastSignature = {};

  function breachSeverity(breachCount, totalCount, thresholds) {
    var t = thresholds || DEFAULT_THRESHOLDS;
    if (!totalCount) return breachCount > 0 ? 'MED' : 'LOW';
    var ratio = breachCount / totalCount;
    if (ratio >= t.crit) return 'CRIT';
    if (ratio >= t.high) return 'HIGH';
    if (ratio > 0) return 'MED';
    return 'LOW';
  }

  function signatureOf(anomalies) {
    return (anomalies || [])
      .map(function (a) {
        return [a && a.id, a && a.severity, a && a.exposure].join(':');
      })
      .sort()
      .join('|');
  }

  /**
   * @param {string} verticalId - e.g. 'SCHOOLS', 'MORTGAGE' (case-insensitive)
   * @param {Array|Object} anomaliesOrPayload - either a plain anomalies
   *   array (gets wrapped as {generatedAt, anomalies}) or an already-built
   *   payload object that has an .anomalies field (stored as-is, with
   *   .generatedAt filled in only if missing).
   * @param {Object} [opts]
   * @param {boolean} [opts.alsoSession] - also mirror the write into
   *   sessionStorage under the same key (HotelOps' existing behavior).
   * @returns {boolean} true if a write + TSM_SENTINEL_REFRESH dispatch
   *   actually happened, false if skipped (missing verticalId, storage
   *   failure, or deduped because nothing changed).
   */
  function push(verticalId, anomaliesOrPayload, opts) {
    if (!verticalId) {
      console.warn('TSMSentinelPush.push: verticalId is required');
      return false;
    }
    var options = opts || {};
    var isFullPayload = !Array.isArray(anomaliesOrPayload) && anomaliesOrPayload && typeof anomaliesOrPayload === 'object';
    var anomalies = isFullPayload ? (anomaliesOrPayload.anomalies || []) : (anomaliesOrPayload || []);

    var vId = String(verticalId).toUpperCase();
    var sig = signatureOf(anomalies);
    if (lastSignature[vId] === sig) return false; // unchanged since last push this page load
    lastSignature[vId] = sig;

    var storedPayload = isFullPayload
      ? Object.assign({}, anomaliesOrPayload, { generatedAt: anomaliesOrPayload.generatedAt || new Date().toISOString() })
      : { generatedAt: new Date().toISOString(), anomalies: anomalies };

    var key = 'TSM_' + vId + '_STRATEGIST_RELAY';
    try {
      var json = JSON.stringify(storedPayload);
      localStorage.setItem(key, json);
      if (options.alsoSession) {
        try { sessionStorage.setItem(key, json); } catch (e2) { /* noop, matches existing best-effort pattern */ }
      }
      global.dispatchEvent(new CustomEvent('TSM_SENTINEL_REFRESH'));
      return true;
    } catch (e) {
      console.warn('TSMSentinelPush.push(' + vId + '): failed', e);
      return false;
    }
  }

  global.TSMSentinelPush = { push: push, breachSeverity: breachSeverity };
})(window);
