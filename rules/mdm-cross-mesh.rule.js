/**
 * rules/mdm-cross-mesh.rule.js
 *
 * Direct port of tsm-cross-mesh.js's deriveGovernanceFindings() /
 * deriveIntegrationFindings() / deriveMissions() into a declarative
 * TSMRuleRegistry rule. Field shapes, IDs, thresholds, and copy are taken
 * verbatim from the real engine (uploaded source), not reinvented —
 * this is meant to be a behavior-preserving refactor, not a redesign.
 *
 * Source data (mdm.explain / mdm.kpis) comes from the real payload shape
 * written by html/war-rooms/mdm/mdm-war-room.html's
 * TSM.relay.write("MDM", {records, duplicates, kpis, explain, ...}).
 *
 * Output: all three finding types (risk/advisory/mission) target the
 * CROSS_MESH domain — never GOVERNANCE or INTEGRATION's own relay payload
 * directly — matching the original engine's design (a war room re-firing
 * its own relay.write() must never clobber cross-domain findings derived
 * from it). tsm-enterprise-runtime.js batches and writes these; see its
 * routeCrossMeshBatch() for the CROSS_MESH payload shape.
 *
 * Once this rule + TSMRuntime.start({domain:'MDM'}) are live, tsm-cross-
 * mesh.js's own evaluate()/init() (the relay-read + auto-listen logic)
 * should be removed to avoid double-writes — its getFindings() /
 * getMissions() / renderFindingsSection() read-side functions stay as-is,
 * since the CROSS_MESH payload shape they read is unchanged.
 *
 * Requires tsm-rule-registry.js loaded first.
 */
(function (global) {
  'use strict';

  if (!global.TSMRuleRegistry) {
    throw new Error('[mdm-cross-mesh.rule.js] TSMRuleRegistry must be loaded first.');
  }

  // Mirrors tsm-cross-mesh.js's SEVERITY_TO_SCORE exactly — Governance's own
  // risk register uses a 0-100 severity number, so MDM's high/med/low needs
  // to land on the same scale to sit naturally alongside native entries.
  var SEVERITY_TO_SCORE = { high: 85, med: 60, low: 30 };
  var MISSION_SEVERITY_THRESHOLD = 85; // mirrors deriveMissions()'s f.severity >= 85

  global.TSMRuleRegistry.register({
    id: 'mdmCrossMesh',
    domain: 'MDM',
    description: 'Ported from tsm-cross-mesh.js: MDM data-quality issues -> Governance risk register + Integration Hub advisory + auto-created P1 remediation missions.',
    priority: 10,

    when: function (mdm) {
      return !!mdm && ((Array.isArray(mdm.explain) && mdm.explain.length > 0) || !!mdm.kpis);
    },

    execute: function (mdm) {
      var findings = [];
      var createdAt = mdm.timestamp || new Date().toISOString();

      // ── RULE 1 (deriveGovernanceFindings): MDM explain items -> Governance risk register ──
      var governanceFindings = [];
      (mdm.explain || []).forEach(function (item) {
        if (item.severity === 'low') return; // low-severity MDM items aren't worth a Governance risk entry

        var gf = {
          id: 'xmesh-gov-' + item.id,
          name: item.claim,
          severity: SEVERITY_TO_SCORE[item.severity] || 50,
          status: 'OPEN',
          owner: 'Compliance',
          source: 'MDM Cross-Mesh',
          rationale: item.rationale,
          createdAt: createdAt
        };
        governanceFindings.push(gf);
        findings.push({ target: 'CROSS_MESH', type: 'risk', payload: gf });
      });

      // ── RULE 2 (deriveIntegrationFindings): MDM sync-relevant KPIs -> Integration Hub advisory ──
      var kpis = mdm.kpis || {};
      if ((kpis.duplicate_count || 0) > 0) {
        findings.push({
          target: 'CROSS_MESH',
          type: 'advisory',
          payload: {
            id: 'xmesh-int-duplicates',
            message: kpis.duplicate_count + ' unresolved MDM duplicate cluster(s) may propagate to any downstream system currently syncing from master data.',
            status: 'warning',
            source: 'MDM Cross-Mesh',
            createdAt: createdAt
          }
        });
      }
      if ((kpis.anomalies || 0) > 0) {
        findings.push({
          target: 'CROSS_MESH',
          type: 'advisory',
          payload: {
            id: 'xmesh-int-anomalies',
            message: kpis.anomalies + ' MDM record(s) flagged INCOMPLETE/STALE — downstream ETL jobs reading these records may need a re-run once resolved.',
            status: 'warning',
            source: 'MDM Cross-Mesh',
            createdAt: createdAt
          }
        });
      }

      // ── RULE 3 (deriveMissions): high-severity Governance findings -> auto-created P1 mission ──
      governanceFindings
        .filter(function (f) { return f.severity >= MISSION_SEVERITY_THRESHOLD; })
        .forEach(function (f) {
          findings.push({
            target: 'CROSS_MESH',
            type: 'mission',
            payload: {
              id: 'xmesh-mission-' + f.id,
              title: 'Remediation: ' + f.name,
              priority: 'P1',
              owner: f.owner,
              linkedFindingId: f.id,
              status: 'QUEUED',
              createdAt: f.createdAt
            }
          });
        });

      return { findings: findings };
    }
  });

  console.info('[TSMRuleRegistry] Registered rule: mdmCrossMesh');
})(typeof window !== 'undefined' ? window : this);