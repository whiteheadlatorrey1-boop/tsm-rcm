/* TSM CPQ Engine v1.0
   Handles quote lifecycle, compatibility rules, discount evaluation,
   SLA breach detection, AI analysis, and strategist relay.
   Loaded by cpq-war-room.html after canonical-core.js */

class TSMCPQEngine {
  constructor(model) {
    this.model = model || {};
    this.quotes = [];
    this.products = [];
    this._storageKey = 'TSM_CPQ_STATE';
  }

  /* ── Persistence ────────────────────────────────────────────────────────── */
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return false;
      const s = JSON.parse(raw);
      this.quotes   = s.quotes   || [];
      this.products = s.products || [];
      return this.quotes.length > 0;
    } catch(e) { return false; }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this._storageKey,
        JSON.stringify({ quotes: this.quotes, products: this.products, savedAt: Date.now() }));
    } catch(e) { console.warn('[CPQEngine] localStorage write failed', e); }
  }

  clearStorage() {
    try { localStorage.removeItem(this._storageKey); } catch(e) {}
    this.quotes = [];
    this.products = [];
  }

  loadSampleData() {
    const sd = this.model.sample_data || {};
    this.products = (sd.products || []).map(p => ({ ...p }));
    this.quotes   = (sd.quotes   || []).map(q => ({ ...q }));
  }

  /* ── KPI Computation ────────────────────────────────────────────────────── */
  computeKpis() {
    const activeStages = ['Draft','Configured','Priced','Under Review',
                          'Pending Approval','Sent to Customer','Negotiation'];
    const open = this.quotes.filter(q => activeStages.includes(q.stage));
    const totalValue = open.reduce((s, q) => s + (Number(q.net_value) || 0), 0);
    const avgDisc = open.length
      ? Math.round(open.reduce((s, q) => s + (Number(q.discount_pct) || 0), 0) / open.length * 10) / 10
      : 0;
    const breaches = this.getSlaBreaches();
    const pendingApproval = this.quotes.filter(q => q.needs_approval &&
      ['Under Review','Pending Approval'].includes(q.stage)).length;
    const won  = this.quotes.filter(q => q.stage === 'Won').length;
    const closed = this.quotes.filter(q => ['Won','Lost'].includes(q.stage)).length;
    return {
      open_quotes:      open.length,
      quote_value:      totalValue,
      avg_discount_pct: avgDisc,
      sla_breach_count: breaches.length,
      approval_pending: pendingApproval,
      win_rate:         closed ? Math.round(won / closed * 100) : 0
    };
  }

  getStageDistribution() {
    const stages = (this.model.entities?.quote?.stages || []);
    const dist = {};
    stages.forEach(s => { dist[s.id] = { count: 0, value: 0, label: s.label }; });
    this.quotes.forEach(q => {
      const s = stages.find(st => st.label === q.stage);
      if (s) {
        dist[s.id].count++;
        dist[s.id].value += Number(q.net_value) || 0;
      }
    });
    return dist;
  }

  getSlaBreaches() {
    const slaMap = this.model.sample_data?.sla_hours_by_stage || {};
    const now = Date.now();
    const closed = ['Won','Lost'];
    return this.quotes
      .filter(q => !closed.includes(q.stage) && q.stage_entered_at)
      .map(q => {
        const sla = Number(slaMap[q.stage]) || 72;
        const hoursIn = (now - new Date(q.stage_entered_at).getTime()) / 3_600_000;
        return { quote_id: q.quote_id, stage: q.stage, hours_over: Math.round(hoursIn - sla) };
      })
      .filter(b => b.hours_over > 0);
  }

  /* ── Rules Engine ───────────────────────────────────────────────────────── */
  checkCompatibility(skus) {
    const rules = this.model.compatibility_rules || [];
    const conflicts = [];
    rules.forEach(rule => {
      const hasA = skus.includes(rule.sku_a);
      const hasB = skus.includes(rule.sku_b);
      if (rule.type === 'incompatible' && hasA && hasB) {
        conflicts.push({ sku: rule.sku_b, reason: rule.reason || `Incompatible with ${rule.sku_a}` });
      }
    });
    return { compatible: conflicts.length === 0, conflicts };
  }

  evaluateDiscount(listValue, netValue, costBasisPct) {
    const policy  = this.model.sample_data?.discount_policy || {};
    const discPct = listValue > 0
      ? Math.round((1 - netValue / listValue) * 1000) / 10
      : 0;
    const needsApproval = discPct > (Number(policy.auto_approve_max_pct) || 15);
    let marginPct = null, belowFloor = false;
    if (costBasisPct != null && listValue > 0) {
      const cost = listValue * costBasisPct;
      marginPct = Math.round((netValue - cost) / netValue * 1000) / 10;
      belowFloor = marginPct < (Number(policy.margin_floor_pct) || 28);
    }
    return { discount_pct: discPct, needs_approval: needsApproval,
             margin_pct: marginPct, below_margin_floor: belowFloor };
  }

  /* ── AI Analysis ────────────────────────────────────────────────────────── */
  async runAnalysis() {
    const kpis           = this.computeKpis();
    const sla_breaches   = this.getSlaBreaches();
    const stage_distribution = this.getStageDistribution();
    const res = await fetch('/api/cpq/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotes: this.quotes, kpis, sla_breaches,
                             stage_distribution, maxTokens: 1200 })
    });
    if (!res.ok) throw new Error(`/api/cpq/query returned ${res.status}`);
    return res.json();
  }

  /* ── Strategist Relay ───────────────────────────────────────────────────── */
  buildRelayPayload(aiText) {
    return {
      vertical:      'cpq',
      quotes:        this.quotes,
      kpis:          this.computeKpis(),
      sla_breaches:  this.getSlaBreaches(),
      explain:       this.getExplainItems(),
      ai_analysis:   aiText,
      timestamp:     new Date().toISOString()
    };
  }

  /* ── Explainability feed for the risk register ──────────────────────────
     Three real quote-risk scenarios, grounded in fields already on the
     quote record: stalled SLA stage, discount above the auto-approve
     threshold, and margin below the policy floor. */
  getExplainItems() {
    const items = [];
    const policy = this.model.sample_data?.discount_policy || {};
    const policyConfigured = policy.auto_approve_max_pct != null && policy.margin_floor_pct != null;
    const autoApproveMax = Number(policy.auto_approve_max_pct) || 15;
    const marginFloor = Number(policy.margin_floor_pct) || 28;
    const quoteIndex = {};
    this.quotes.forEach(q => { quoteIndex[q.quote_id] = q; });

    // Confidence isn't a model guess -- the SLA/discount/margin checks are
    // deterministic. It instead signals data completeness: whether the
    // quote has its identifying name, or whether the discount policy is
    // actually configured vs. silently running on the 15%/28% fallback
    // defaults above.
    const identConfidence = (base, ok) => ok ? base : Math.max(60, base - 25);

    this.getSlaBreaches().forEach(b => {
      const q = quoteIndex[b.quote_id] || {};
      const severity = b.hours_over > 96 || (q.net_value || 0) >= 100000 ? 'high'
        : ((q.net_value || 0) >= 30000 ? 'med' : 'low');
      items.push({
        id: 'sla-' + b.quote_id,
        claim: `${b.quote_id} (${q.name || 'quote'}) worth $${Number(q.net_value || 0).toLocaleString()} is stalled ${b.hours_over}h past its "${b.stage}" SLA`,
        confidence: identConfidence(90, !!q.name),
        severity,
        impact: q.net_value ? ('$' + Number(q.net_value).toLocaleString() + ' quote value at risk of slipping') : '',
        rationale: `${q.name || b.quote_id} has been in the "${b.stage}" stage since ${q.stage_entered_at || 'an unrecorded time'}, ` +
          `now ${b.hours_over}h past that stage's SLA window.`,
        sources: ['CPQ quote record ' + b.quote_id],
        dataPoints: [
          { label: 'Stage', value: b.stage },
          { label: 'Hours over SLA', value: b.hours_over + 'h' },
          { label: 'Net value', value: '$' + Number(q.net_value || 0).toLocaleString() }
        ]
      });
    });

    this.quotes.filter(q => q.needs_approval && !['Won', 'Lost'].includes(q.stage)).forEach(q => {
      const severity = q.discount_pct >= 20 ? 'high' : 'med';
      items.push({
        id: 'approval-' + q.quote_id,
        claim: `${q.quote_id} (${q.name}) needs approval — ${q.discount_pct}% discount exceeds the ${autoApproveMax}% auto-approve limit`,
        confidence: identConfidence(95, policyConfigured),
        severity,
        impact: q.net_value ? ('$' + Number(q.net_value).toLocaleString() + ' quote blocked pending approval') : 'Quote blocked pending approval',
        rationale: `${q.name} carries a ${q.discount_pct}% discount off list ($${Number(q.list_value || 0).toLocaleString()} \u2192 $${Number(q.net_value || 0).toLocaleString()}), ` +
          `above the ${autoApproveMax}% threshold that can auto-approve, so it's routed for manual sign-off.`,
        sources: ['CPQ quote record ' + q.quote_id],
        dataPoints: [
          { label: 'Discount', value: q.discount_pct + '%' },
          { label: 'Auto-approve limit', value: autoApproveMax + '%' },
          { label: 'Net value', value: '$' + Number(q.net_value || 0).toLocaleString() }
        ]
      });
    });

    this.quotes.filter(q => q.margin_pct != null && q.margin_pct < marginFloor).forEach(q => {
      const severity = q.margin_pct < marginFloor - 5 ? 'high' : 'med';
      items.push({
        id: 'margin-' + q.quote_id,
        claim: `${q.quote_id} (${q.name}) margin is ${q.margin_pct}% — below the ${marginFloor}% policy floor`,
        confidence: identConfidence(88, policyConfigured),
        severity,
        impact: q.net_value ? ('$' + Number(q.net_value).toLocaleString() + ' quote running under margin floor') : 'Margin policy risk',
        rationale: `${q.name} is priced at ${q.margin_pct}% margin, below the ${marginFloor}% floor set by policy. ` +
          `Discount is currently ${q.discount_pct}% off list.`,
        sources: ['CPQ quote record ' + q.quote_id],
        dataPoints: [
          { label: 'Margin', value: q.margin_pct + '%' },
          { label: 'Margin floor', value: marginFloor + '%' },
          { label: 'Discount', value: q.discount_pct + '%' }
        ]
      });
    });

    const rank = { high: 0, med: 1, low: 2 };
    return items.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
  }
}
