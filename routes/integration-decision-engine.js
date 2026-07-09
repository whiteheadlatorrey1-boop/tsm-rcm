// integration-decision-engine.js — governance layer for Integration Hub, mirroring the
// MDM decision-engine pattern: turns raw signals already being tracked (catalog status,
// error log) into ranked, actionable recommendations with an approve/reject workflow.
//
// Unlike MDM, there's no "duplicate" concept here — the analog signal is sync health.
// A degraded/warning integration IS the anomaly; this module just ranks and proposes
// what to do about it instead of leaving it sitting in the catalog unattended.
//
// Recommendation ids are deterministic (system id + status), same reasoning as MDM's
// engine: approve/reject re-derive the recommendation from live catalog state rather
// than trusting a client-held id, so a resolved or already-changed item naturally 404s.

const RISK_BY_STATUS = { degraded: 90, warning: 50 };
const ACTION_BY_STATUS = { degraded: 'ESCALATE_VENDOR', warning: 'RESYNC' };
const STALE_MS = 24 * 60 * 60 * 1000; // 24h with no sync, even if status still says "healthy"

function buildIssueText(item, kind) {
  if (kind === 'degraded') return `${item.system} integration is degraded (${item.errorCount} errors)`;
  if (kind === 'warning') return `${item.system} integration is throwing errors (${item.errorCount})`;
  return `${item.system} integration hasn't synced in over 24h`;
}

function generateRecommendations(catalog, errorLog) {
  const recs = [];
  const recentErrorsBySystem = {};
  for (const e of (errorLog || [])) {
    recentErrorsBySystem[e.system] = (recentErrorsBySystem[e.system] || 0) + 1;
  }

  for (const item of catalog) {
    if (item.status === 'degraded' || item.status === 'warning') {
      recs.push({
        id: `REC-INT-${item.id}-${item.status}`,
        integrationId: item.id,
        system: item.system,
        type: 'SYNC_HEALTH',
        issue: buildIssueText(item, item.status),
        action: ACTION_BY_STATUS[item.status],
        recentErrors: recentErrorsBySystem[item.system] || item.errorCount || 0,
        confidence: Math.min(100, 60 + (item.errorCount || 0) * 10),
        risk: RISK_BY_STATUS[item.status],
        requiresApproval: true,
        status: 'PENDING'
      });
      continue; // don't double-flag a degraded/warning item as also stale below
    }
    const staleForMs = item.lastSync ? (Date.now() - item.lastSync) : null;
    if (staleForMs !== null && staleForMs > STALE_MS) {
      recs.push({
        id: `REC-INT-${item.id}-stale`,
        integrationId: item.id,
        system: item.system,
        type: 'STALE_SYNC',
        issue: buildIssueText(item, 'stale'),
        action: 'RESYNC',
        confidence: 70,
        risk: 40,
        requiresApproval: true,
        status: 'PENDING'
      });
    }
  }
  return recs.sort((a, b) => b.risk - a.risk);
}

function findRecommendation(catalog, errorLog, id) {
  return generateRecommendations(catalog, errorLog).find(r => r.id === id) || null;
}

// Executes the recommended action against the real catalog record. Mirrors what
// /api/integration/:id/sync already does for RESYNC (mark healthy, stamp lastSync);
// ESCALATE_VENDOR doesn't mutate the record — that's a human/vendor-side action, this
// just logs that it was raised, same as WIP's manual decision log.
function executeAction(catalog, integrationId, action, actor, decision) {
  const item = catalog.find(i => i.id === integrationId);
  if (!item) return { error: 'Integration not found', status: 404 };

  const entry = {
    id: `IDEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    integrationId, system: item.system, action,
    decision: decision === 'REJECTED' ? 'REJECTED' : 'APPROVED',
    actor: actor || 'Unassigned',
    ts: new Date().toISOString()
  };

  if (entry.decision === 'APPROVED' && action === 'RESYNC') {
    item.status = 'healthy';
    item.errorCount = 0;
    item.lastSync = Date.now();
  }
  // ESCALATE_VENDOR approved: intentionally no mutation — status stays visible as
  // degraded/warning until the vendor-side fix lands and someone runs a real resync.

  return { entry, item };
}

module.exports = { generateRecommendations, findRecommendation, executeAction };
