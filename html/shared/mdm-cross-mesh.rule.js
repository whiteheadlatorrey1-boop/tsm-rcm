/**
 * mdm-cross-mesh.rule.js
 * Roadmap #10 (Cross-War-Room Intelligence) — the piece tsm-cross-mesh.js's
 * migration note describes but that never actually got written.
 *
 * IMPORTANT: this is NOT a restoration of the original deriveGovernanceFindings()
 * / deriveMissions() logic tsm-cross-mesh.js's comments describe as the
 * "byte-for-byte" source of truth. That original logic is not in this repo
 * (no .bak, nothing in _archive/) — it's gone. Everything below is NEW logic,
 * written against the real MDM KPI fields confirmed in mdm-executive-portal.html's
 * CFG (total_records, duplicate_count, quality_score, pending_approvals,
 * anomalies, stewards_active — not invented names) and mdm-war-room.html's
 * actual relay write shape ({kpis: computeKpis(), ...}). Thresholds are
 * reasonable defaults, called out below, meant to be adjusted once real MDM
 * volume exists to calibrate against — same caveat tsm-process-mining.js
 * already carries for its own benchmark hours.
 *
 * Registers against TSMRuleRegistry (confirmed real API: register({id, domain,
 * when, execute}), execute returns {findings: [...]}). Consumed by
 * TSMRuntime.evaluateAndRoute(), which — confirmed against the real
 * tsm-enterprise-runtime.js — routes findings with target:'CROSS_MESH' into
 * the CROSS_MESH relay domain via TSMRelay, bucketing by type:
 * risk -> GOVERNANCE, advisory -> INTEGRATION, mission -> missions. Each
 * finding must carry a `payload` field holding the exact shape
 * tsm-cross-mesh.js's renderFindingsSection() expects:
 *   - GOVERNANCE/INTEGRATION findings: { name or message, severity (0-100)
 *     or status string, source }
 *   - missions: { title, owner, priority }
 */
(function (global) {
  'use strict';

  if (!global.TSMRuleRegistry) {
    console.warn('[mdm-cross-mesh.rule] TSMRuleRegistry not loaded — rule not registered.');
    return;
  }

  // Thresholds (NEW, not restored — adjust freely once real MDM volume exists):
  var DUP_RATE_WARN = 0.10;            // >10% duplicate rate -> Governance risk finding
  var QUALITY_SCORE_WARN = 80;         // quality_score below this -> Governance risk finding
  var ANOMALY_ADVISORY_MIN = 1;        // any anomalies at all -> Integration advisory
  // Matches the "85-point mission threshold" language in tsm-cross-mesh.js's
  // own migration-note comment — highest severity among this evaluation's
  // findings must cross this to auto-create a remediation mission.
  var MISSION_SEVERITY_THRESHOLD = 85;

  function computeDupRateSeverity(kpis) {
    var total = kpis.total_records || 0;
    if (total <= 0) return { rate: 0, severity: 0 };
    var rate = (kpis.duplicate_count || 0) / total;
    return { rate: rate, severity: Math.min(100, Math.round(rate * 100 * 3)) };
  }

  function computeQualitySeverity(kpis) {
    var score = kpis.quality_score != null ? kpis.quality_score : 100;
    return Math.max(0, Math.min(100, Math.round(100 - score)));
  }

  TSMRuleRegistry.register({
    id: 'mdmCrossMeshFindings',
    domain: 'MDM',
    description: 'Derives Governance/Integration cross-domain findings and remediation missions from MDM relay KPIs (duplicate rate, quality score, anomalies).',
    when: function (data) {
      return !!(data && data.kpis);
    },
    execute: function (data) {
      var kpis = data.kpis;
      var findings = [];
      var maxSeverity = 0;
      var missionSourceLabel = null;

      var dup = computeDupRateSeverity(kpis);
      if (dup.rate > DUP_RATE_WARN) {
        findings.push({
          target: 'CROSS_MESH',
          type: 'risk',
          payload: {
            id: 'mdm-dup-rate-' + (data.caseId || 'current'),
            name: 'MDM duplicate rate elevated (' + Math.round(dup.rate * 100) + '%)',
            severity: dup.severity,
            source: 'MDM'
          }
        });
        if (dup.severity > maxSeverity) { maxSeverity = dup.severity; missionSourceLabel = 'duplicate rate'; }
      }

      var qualitySeverity = computeQualitySeverity(kpis);
      if (kpis.quality_score != null && kpis.quality_score < QUALITY_SCORE_WARN) {
        findings.push({
          target: 'CROSS_MESH',
          type: 'risk',
          payload: {
            id: 'mdm-quality-score-' + (data.caseId || 'current'),
            name: 'MDM quality score below threshold (' + kpis.quality_score + '%)',
            severity: qualitySeverity,
            source: 'MDM'
          }
        });
        if (qualitySeverity > maxSeverity) { maxSeverity = qualitySeverity; missionSourceLabel = 'quality score'; }
      }

      if ((kpis.anomalies || 0) >= ANOMALY_ADVISORY_MIN) {
        findings.push({
          target: 'CROSS_MESH',
          type: 'advisory',
          payload: {
            message: kpis.anomalies + ' data anomal' + (kpis.anomalies === 1 ? 'y' : 'ies') + ' detected in MDM records',
            status: kpis.anomalies >= 5 ? 'HIGH' : 'MED',
            source: 'MDM'
          }
        });
      }

      if (maxSeverity >= MISSION_SEVERITY_THRESHOLD) {
        findings.push({
          target: 'CROSS_MESH',
          type: 'mission',
          payload: {
            title: 'Remediate MDM ' + missionSourceLabel + ' (severity ' + maxSeverity + ')',
            owner: 'Data Governance',
            priority: maxSeverity >= 95 ? 'P1' : 'P2'
          }
        });
      }

      return { findings: findings };
    }
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = true;
  }
})(typeof window !== 'undefined' ? window : this);