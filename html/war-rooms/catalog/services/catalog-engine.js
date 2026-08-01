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
    const lowStock = this.getLowStockProducts().length;
    const complianceFlags = this.getComplianceFlags().length;
    const eol = this.products.filter(p => ['EOL Announced', 'End of Life', 'Discontinued'].includes(p.stage)).length;
    const withMargin = this.products.filter(p => p.list_price && p.cost_basis_pct != null);
    const avgMargin = withMargin.length
      ? Math.round(withMargin.reduce((s, p) => s + (1 - p.cost_basis_pct) * 100, 0) / withMargin.length * 10) / 10
      : 0;
    return {
      total_skus: total,
      active_skus: active,
      low_stock_count: lowStock,
      compliance_flag_count: complianceFlags,
      eol_count: eol,
      avg_margin_pct: avgMargin
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
      explain: this.getExplainItems(),
      ai_analysis: aiText,
      timestamp: new Date().toISOString()
    };
  }

  /* ── Explainability feed for the risk register ──────────────────────────
     Mirrors the three real signal types getAttentionFlags() already
     detects (low stock, compliance, upcoming EOL), grounded in the same
     product fields used on the KPI cards. */
  // Confidence isn't a model guess -- these are deterministic threshold
  // checks. It signals data completeness: whether the record actually has
  // the field(s) the check depends on, vs. silently running on a fallback
  // default (e.g. reorder_point defaulting to 0, or the EOL warning window
  // defaulting to 90 days because model.thresholds wasn't configured).
  _fieldConfidence(base, fieldOk) {
    return fieldOk ? base : Math.max(60, base - 25);
  }

  getExplainItems() {
    const items = [];

    this.getLowStockProducts().forEach(p => {
      const qty = Number(p.stock_qty || 0);
      const reorder = Number(p.reorder_point || 0);
      const severity = qty <= 0 ? 'high' : (qty <= reorder * 0.5 ? 'high' : 'med');
      items.push({
        id: 'stock-' + p.sku,
        claim: `${p.sku} (${p.name}) has ${qty} on hand against a reorder point of ${reorder}`,
        confidence: this._fieldConfidence(90, p.reorder_point != null),
        severity,
        impact: p.list_price ? ('Stockout risk on a $' + Number(p.list_price).toLocaleString() + ' list-price SKU') : 'Stockout risk',
        rationale: `${p.name} (${p.sku}) is at ${qty} units on hand, at or below its reorder point of ${reorder} ` +
          `(within the ${Math.round((this.model.thresholds?.low_stock_ratio || 0.2) * 100)}% low-stock buffer). Stage: ${p.stage}.`,
        sources: ['Catalog product record ' + p.sku],
        dataPoints: [
          { label: 'Stock on hand', value: String(qty) },
          { label: 'Reorder point', value: String(reorder) },
          { label: 'Stage', value: p.stage }
        ]
      });
    });

    this.getComplianceFlags().forEach(p => {
      const severity = p.compliance_status === 'flagged' ? 'high' : 'med';
      items.push({
        id: 'compliance-' + p.sku,
        claim: `${p.sku} (${p.name}) compliance status is "${p.compliance_status}"`,
        confidence: this._fieldConfidence(88, !!p.name),
        severity,
        impact: 'Regulatory / sellability risk until resolved',
        rationale: `${p.name} (${p.sku}) is currently flagged with compliance status "${p.compliance_status}" ` +
          `rather than "ok", and needs review before it can ship without exception.`,
        sources: ['Catalog product record ' + p.sku],
        dataPoints: [
          { label: 'Compliance status', value: p.compliance_status },
          { label: 'Stage', value: p.stage }
        ]
      });
    });

    this.getUpcomingEol().forEach(p => {
      const days = Math.round((new Date(p.lifecycle_date).getTime() - Date.now()) / 86_400_000);
      const severity = days <= 30 ? 'high' : 'med';
      items.push({
        id: 'eol-' + p.sku,
        claim: `${p.sku} (${p.name}) reaches its lifecycle date in ${days} day${days === 1 ? '' : 's'} (${p.lifecycle_date})`,
        confidence: this._fieldConfidence(85, this.model.thresholds?.eol_warning_days != null),
        severity,
        impact: p.list_price ? ('$' + Number(p.list_price).toLocaleString() + ' list-price SKU transitioning off active sale') : 'SKU transitioning off active sale',
        rationale: `${p.name} (${p.sku}) is currently "${p.stage}" with a lifecycle date of ${p.lifecycle_date}, ` +
          `${days} day${days === 1 ? '' : 's'} away, within the ${this.model.thresholds?.eol_warning_days || 90}-day EOL warning window.`,
        sources: ['Catalog product record ' + p.sku],
        dataPoints: [
          { label: 'Lifecycle date', value: p.lifecycle_date },
          { label: 'Days remaining', value: String(days) },
          { label: 'Stage', value: p.stage }
        ]
      });
    });

    const rank = { high: 0, med: 1, low: 2 };
    return items.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
  }
}