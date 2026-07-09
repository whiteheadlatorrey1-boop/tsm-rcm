// Catalog doesn't have a stage/SLA shape — it has stock levels, compliance
// flags, and lifecycle dates. Kept as its own small engine rather than forced
// into the stage-breach-engine.

function daysUntil(dateStr) {
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return null;
  return Math.round((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function generateRecommendations(catalogModel) {
  const products = (catalogModel.sample_data || {}).products || [];
  const thresholds = catalogModel.thresholds || {};
  const lowStockRatio = thresholds.low_stock_ratio != null ? thresholds.low_stock_ratio : 0.2;
  const eolWarningDays = thresholds.eol_warning_days != null ? thresholds.eol_warning_days : 90;

  const recs = [];

  for (const p of products) {
    // Stock risk: below reorder point at all is a flag; within lowStockRatio
    // of zero relative to reorder point is critical.
    if (typeof p.stock_qty === 'number' && typeof p.reorder_point === 'number' && p.stock_qty <= p.reorder_point) {
      const criticalFloor = p.reorder_point * lowStockRatio;
      recs.push({
        id: `CAT-STOCK-${p.sku}`,
        type: 'stock_risk',
        entity: 'product',
        recordId: p.sku,
        stage: p.stage,
        severity: p.stock_qty <= criticalFloor ? 'critical' : 'high',
        stockQty: p.stock_qty,
        reorderPoint: p.reorder_point,
        recommendedAction: `${p.name} (${p.sku}) is at ${p.stock_qty} units against a reorder point of ${p.reorder_point} — trigger a reorder.`,
        createdAt: new Date().toISOString()
      });
    }

    // Compliance risk: anything not explicitly "ok" is worth surfacing.
    if (p.compliance_status && p.compliance_status !== 'ok') {
      recs.push({
        id: `CAT-COMPLIANCE-${p.sku}`,
        type: 'compliance_risk',
        entity: 'product',
        recordId: p.sku,
        stage: p.stage,
        severity: 'high',
        complianceStatus: p.compliance_status,
        recommendedAction: `${p.name} (${p.sku}) has compliance status "${p.compliance_status}" — review before further sale/allocation.`,
        createdAt: new Date().toISOString()
      });
    }

    // Lifecycle risk: approaching end-of-life within the warning window.
    if (p.lifecycle_date) {
      const days = daysUntil(p.lifecycle_date);
      if (days != null && days >= 0 && days <= eolWarningDays) {
        recs.push({
          id: `CAT-EOL-${p.sku}`,
          type: 'lifecycle_risk',
          entity: 'product',
          recordId: p.sku,
          stage: p.stage,
          severity: days <= eolWarningDays / 3 ? 'critical' : 'medium',
          daysUntilLifecycle: days,
          recommendedAction: `${p.name} (${p.sku}) reaches its lifecycle date in ${days} day(s) — plan EOL communication/substitution now.`,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  const severityRank = { critical: 3, high: 2, medium: 1 };
  recs.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0));
  return recs;
}

module.exports = { generateRecommendations };
