'use strict';

/**
 * TSM PM Risk Engine v2
 *
 * Deterministic 0–100 operational risk scoring.
 */

const VERSION = 'pm-risk-engine-v2';

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function calculateRisk(twin = {}, payload = {}) {
  const findings = Array.isArray(twin.findings) ? twin.findings : [];
  const workOrders = Array.isArray(twin.workOrders) ? twin.workOrders : [];
  const vendors = Array.isArray(twin.vendors) ? twin.vendors : [];

  let score = 0;
  const signals = [];

  const critical = findings.filter(
    x => x.severity === 'critical'
  );

  const high = findings.filter(
    x => x.severity === 'high'
  );

  if (critical.length) {
    score += Math.min(40, critical.length * 20);

    signals.push({
      type: 'CRITICAL_FINDINGS',
      count: critical.length,
      impact: 'HIGH',
      explanation: `${critical.length} critical operational finding(s) require immediate management attention.`
    });
  }

  if (high.length) {
    score += Math.min(25, high.length * 10);

    signals.push({
      type: 'HIGH_FINDINGS',
      count: high.length,
      impact: 'MEDIUM',
      explanation: `${high.length} high-priority finding(s) increase portfolio operating risk.`
    });
  }

  const overdue = workOrders.filter(x =>
    /overdue|breach|late|sla/i.test(String(x.status))
  );

  if (overdue.length) {
    score += Math.min(20, overdue.length * 5);

    signals.push({
      type: 'SLA_RISK',
      count: overdue.length,
      impact: 'MEDIUM',
      explanation: `${overdue.length} work order(s) indicate SLA or response risk.`
    });
  }

  const vendorRisk = vendors.filter(x =>
    /expired|non.?compliant|suspended|failed/i.test(String(x.status))
  );

  if (vendorRisk.length) {
    score += Math.min(15, vendorRisk.length * 5);

    signals.push({
      type: 'VENDOR_RISK',
      count: vendorRisk.length,
      impact: 'MEDIUM',
      explanation: `${vendorRisk.length} vendor record(s) indicate compliance or performance risk.`
    });
  }

  score = Math.min(100, score);

  const level =
    score >= 75 ? 'CRITICAL' :
    score >= 50 ? 'HIGH' :
    score >= 25 ? 'ELEVATED' :
    'LOW';

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    score,
    level,
    signals,
    methodology: 'DETERMINISTIC',
    humanReviewRequired: true
  };
}

module.exports = {
  VERSION,
  calculateRisk
};
