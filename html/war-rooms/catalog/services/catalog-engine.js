/* TSM Catalog Engine v1.0
   Handles product hierarchy, lifecycle stages, low-stock / compliance / EOL
   attention flags, AI analysis, Publish-to-CPQ relay, and strategist relay.
   Loaded by catalog-war-room.html after canonical-core.js */

class TSMCatalogEngine {
  constructor(model) {
    this.model = model || {};
    this.products = [];
    this._storageKey = 'TSM_CATALOG_STATE';
  }

  /* ── Persistence ────────────────────────────────────────────────────────── */
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return false;
      const s = JSON.parse(raw);
      this.products = s.products || [];
      return this.products.length > 0;
    } catch(e) { return false; }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this._storageKey,
        JSON.stringify({ products: this.products, savedAt: Date.now() }));
    } catch(e) { console.warn('[CatalogEngine] localStorage write failed', e); }
  }

  clearStorage() {
    try { localStorage.removeItem(this._storageKey); } catch(e) {}
    this.products = [];
  }

  loadSampleData() {
    const sd = this.model.sample_data || {};
    this.products = (sd.products || []).map(p => ({ ...p }));
  }

  /* ── KPI Computation ────────────────────────────────────────────────────── */
  computeKpis() {
    const total = this.products.length;
    const active = this.products.filter(p => p.stage === 'Active').length;
    const lowStockProducts = this.getLowStockProducts();
    const complianceFlagProducts = this.getComplianceFlags();
    const lowStock = lowStockProducts.length;
    const complianceFlags = complianceFlagProducts.length;
    const eolProducts = this.products.filter(p => ['EOL Announced', 'End of Life', 'Discontinued'].includes(p.stage));
    const eol = eolProducts.length;
    const withMargin = this.products.filter(p => p.list_price && p.cost_basis_pct != null);
    const avgMargin = withMargin.length
      ? Math.round(withMargin.reduce((s, p) => s + (1 - p.cost_basis_pct) * 100, 0) / withMargin.length * 10) / 10
      : 0;
    // Revenue at risk: on-hand inventory value (list_price * stock_qty) for SKUs
    // that are low-stock, EOL/discontinued, or compliance-flagged. Uses only
    // fields already on the product record — no new data assumptions.
    const atRiskSkus = new Map();
    [...lowStockProducts, ...eolProducts, ...complianceFlagProducts].forEach(p => atRiskSkus.set(p.sku, p));
    const revenueAtRisk = Array.from(atRiskSkus.values())
      .reduce((s, p) => s + ((Number(p.list_price) || 0) * (Number(p.stock_qty) || 0)), 0);
    return {
      total_skus: total,
      active_skus: active,
      low_stock_count: lowStock,
      compliance_flag_count: complianceFlags,
      eol_count: eol,
      avg_margin_pct: avgMargin,
      revenue_at_risk: revenueAtRisk
    };
  }

  getStageDistribution() {
    const stages = (this.model.entities?.product?.stages || []);
    const dist = {};
    stages.forEach(s => { dist[s.id] = { count: 0, label: s.label }; });
    this.products.forEach(p => {
      const s = stages.find(st => st.label === p.stage);
      if (s) dist[s.id].count++;
    });
    return dist;
  }

  /* ── Attention Flags ────────────────────────────────────────────────────── */
  getLowStockProducts() {
    const ratio = Number(this.model.thresholds?.low_stock_ratio) || 0.2;
    return this.products.filter(p =>
      p.reorder_point > 0 && Number(p.stock_qty) <= Number(p.reorder_point) * (1 + ratio) &&
      !['End of Life', 'Discontinued'].includes(p.stage)
    );
  }

  getComplianceFlags() {
    return this.products.filter(p => p.compliance_status && p.compliance_status !== 'ok');
  }

  getUpcomingEol() {
    const warnDays = Number(this.model.thresholds?.eol_warning_days) || 90;
    const now = Date.now();
    return this.products.filter(p => {
      if (!p.lifecycle_date) return false;
      if (!['Active', 'EOL Announced'].includes(p.stage)) return false;
      const days = (new Date(p.lifecycle_date).getTime() - now) / 86_400_000;
      return days >= 0 && days <= warnDays;
    });
  }

  getAttentionFlags() {
    const flags = [];
    this.getLowStockProducts().forEach(p => flags.push({ sku: p.sku, name: p.name, type: 'low_stock', detail: `${p.stock_qty} on hand, reorder at ${p.reorder_point}` }));
    this.getComplianceFlags().forEach(p => flags.push({ sku: p.sku, name: p.name, type: 'compliance', detail: `Status: ${p.compliance_status}` }));
    this.getUpcomingEol().forEach(p => flags.push({ sku: p.sku, name: p.name, type: 'eol', detail: `Lifecycle date ${p.lifecycle_date}` }));
    return flags;
  }

  /* ── Search / Filter ────────────────────────────────────────────────────── */
  search(term) {
    if (!term) return this.products;
    const t = term.toLowerCase();
    return this.products.filter(p =>
      (p.sku || '').toLowerCase().includes(t) ||
      (p.name || '').toLowerCase().includes(t) ||
      (p.category || '').toLowerCase().includes(t) ||
      (p.family || '').toLowerCase().includes(t)
    );
  }

  /* ── AI Analysis ────────────────────────────────────────────────────────── */
  async runAnalysis() {
    const kpis = this.computeKpis();
    const attention_flags = this.getAttentionFlags();
    const lifecycle_distribution = this.getStageDistribution();
    const res = await fetch('/api/catalog/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: this.products, kpis, attention_flags,
                             lifecycle_distribution, maxTokens: 1200 })
    });
    const raw = await res.text();
    if (!res.ok || raw.trim().startsWith('<')) {
      throw new Error(`/api/catalog/query returned non-JSON (status ${res.status}): ${raw.slice(0, 120)}`);
    }
    return JSON.parse(raw);
  }

  /* ── Publish to CPQ (Catalog is source of truth) ────────────────────────── */
  buildCpqPublishPayload() {
    return {
      vertical: 'catalog',
      products: this.products.filter(p => ['Active', 'EOL Announced'].includes(p.stage)),
      compatibility_rules: this.model.sample_data?.compatibility_rules || [],
      bom: this.model.sample_data?.bom || {},
      published_at: new Date().toISOString()
    };
  }

  /* ── Strategist Relay ───────────────────────────────────────────────────── */
  buildRelayPayload(aiText) {
    return {
      vertical: 'catalog',
      products: this.products,
      kpis: this.computeKpis(),
      attention_flags: this.getAttentionFlags(),
      ai_analysis: aiText,
      timestamp: new Date().toISOString()
    };
  }
}