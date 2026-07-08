/* ============================================================
   TSM O2C ENGINE
   war-rooms/o2c/services/o2c-engine.js
   Pure client-side computation layer for the Order-to-Cash
   War Room. No direct AI calls happen here -- this only
   shapes data. AI analysis goes through /api/o2c/query.
   ============================================================ */

(function (global) {
  'use strict';

  function _bus() {
    return (typeof window !== 'undefined' && window.TSMEventBus) || null;
  }

  class O2CEngine {
    constructor(model) {
      this.model = model || { stages: [], kpis: [], sample_orders: [] };
      this.orders = [];
      this.stageIndex = {};
      (this.model.stages || []).forEach((s, i) => { this.stageIndex[s.id] = s; });
    }

    loadOrders(orders) {
      this.orders = Array.isArray(orders) ? orders : [];
      const bus = _bus();
      if (bus && bus.emit) {
        bus.emit('O2C_ORDERS_LOADED', { count: this.orders.length, ts: Date.now() });
      }
      return this.orders;
    }

    loadSampleOrders() {
      return this.loadOrders(this.model.sample_orders || []);
    }

    /** Returns orders whose time-in-stage exceeds that stage's SLA. */
    getSlaBreaches() {
      return this.orders
        .map(o => {
          const stage = this.stageIndex[o.stage];
          if (!stage) return null;
          const hoursIn = Number(o.entered_stage_at_hours_ago || 0);
          const over = hoursIn > stage.sla_hours;
          return over
            ? {
                order_id: o.order_id,
                customer: o.customer,
                stage: stage.label,
                hours_in_stage: hoursIn,
                sla_hours: stage.sla_hours,
                hours_over: +(hoursIn - stage.sla_hours).toFixed(1),
                value: o.value,
                notes: o.notes || ''
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.hours_over - a.hours_over);
    }

    /** Counts open orders per stage -- feeds the bottleneck heatmap. */
    getStageDistribution() {
      const dist = {};
      (this.model.stages || []).forEach(s => { dist[s.id] = { label: s.label, count: 0, value: 0 }; });
      this.orders.forEach(o => {
        if (dist[o.stage]) {
          dist[o.stage].count += 1;
          dist[o.stage].value += Number(o.value || 0);
        }
      });
      return dist;
    }

    computeKpis() {
      const breaches = this.getSlaBreaches();
      const totalValue = this.orders.reduce((sum, o) => sum + Number(o.value || 0), 0);
      const creditHolds = this.orders.filter(o => o.stage === 'credit').length;
      const arOrders = this.orders.filter(o => o.stage === 'ar' || o.stage === 'reconcile');
      const avgDso = arOrders.length
        ? Math.round(arOrders.reduce((s, o) => s + Number(o.entered_stage_at_hours_ago || 0), 0) / arOrders.length / 24)
        : 0;
      const avgCycleHours = this.orders.length
        ? this.orders.reduce((s, o) => s + Number(o.entered_stage_at_hours_ago || 0), 0) / this.orders.length
        : 0;

      const kpis = {
        cycle_time: +(avgCycleHours / 24).toFixed(1),
        order_value: totalValue,
        bottleneck_count: breaches.length,
        credit_holds: creditHolds,
        dso: avgDso,
        fill_rate: this.orders.length
          ? +(((this.orders.length - breaches.length) / this.orders.length) * 100).toFixed(1)
          : 100
      };

      const bus = _bus();
      if (bus && bus.emit) {
        bus.emit('O2C_KPIS_COMPUTED', { kpis, ts: Date.now() });
      }
      return kpis;
    }

    /** Lightweight, local risk flags -- not a substitute for AI analysis,
     *  just enough signal to color the UI before the AI call returns. */
    getRiskFlags() {
      const flags = [];
      this.getSlaBreaches().forEach(b => {
        flags.push({
          type: b.hours_over > 48 ? 'high' : 'medium',
          signal: 'shipping_delay'.includes(b.stage.toLowerCase()) ? 'shipping_delay' : 'sla_breach',
          order_id: b.order_id,
          message: `${b.order_id} (${b.customer}) is ${b.hours_over}h over SLA in ${b.stage}.`
        });
      });
      return flags;
    }

    /** Builds the payload sent to the server-side AI proxy at /api/o2c/query.
     *  Mirrors the structured prompt-forcing pattern used elsewhere in TSM Shell. */
    buildAnalysisPayload(extraContext) {
      return {
        vertical: 'o2c',
        orders: this.orders,
        kpis: this.computeKpis(),
        sla_breaches: this.getSlaBreaches(),
        stage_distribution: this.getStageDistribution(),
        context: extraContext || ''
      };
    }

    async runAnalysis(extraContext) {
      const payload = this.buildAnalysisPayload(extraContext);
      const bus = _bus();
      if (bus && bus.emit) bus.emit('O2C_ANALYSIS_STARTED', { ts: Date.now() });

      const res = await fetch('/api/o2c/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        if (bus && bus.emit) bus.emit('O2C_ANALYSIS_FAILED', { status: res.status, ts: Date.now() });
        throw new Error('O2C analysis request failed: ' + res.status);
      }

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'O2C analysis returned ok:false');
      if (bus && bus.emit) bus.emit('AI_ANALYSIS_COMPLETE', { vertical: 'o2c', data, ts: Date.now() });
      return data;
    }

    /** Relay payload for handoff to the O2C Strategist / Executive Portal tier. */
    buildRelayPayload(analysis) {
      return {
        vertical: 'o2c',
        orders: this.orders,
        kpis: this.computeKpis(),
        sla_breaches: this.getSlaBreaches(),
        risk_flags: this.getRiskFlags(),
        explain: this.getExplainItems(),
        analysis: analysis || null,
        relayed_at: Date.now()
      };
    }

    /** Maps a breached stage onto the model's declared risk_signals vocabulary,
     *  so the explain claim names the same signal type the risk register uses
     *  elsewhere (credit_hold_aging, shipping_delay, payment_overdue, etc.)
     *  instead of a generic "sla_breach" label. */
    _signalForBreach(b) {
      const stageId = (Object.keys(this.stageIndex).find(id => this.stageIndex[id].label === b.stage)) || '';
      if (stageId === 'credit') return 'credit_hold_aging';
      if (stageId === 'shipping') return 'shipping_delay';
      if (stageId === 'atp') return 'atp_shortfall';
      if (stageId === 'ar' || stageId === 'reconcile') return 'payment_overdue';
      if (stageId === 'invoice') return 'invoice_dispute';
      return 'sla_breach';
    }

    /** Explainability feed for the risk register: every real SLA breach,
     *  grounded in the same getSlaBreaches() fields already surfaced on the
     *  KPI cards (order_id, customer, stage, hours_over, sla_hours, value). */
    getExplainItems() {
      const items = [];

      this.getSlaBreaches().forEach(b => {
        const signal = this._signalForBreach(b);
        const severity = b.hours_over > 48 || b.value >= 150000 ? 'high'
          : (b.value >= 50000 ? 'med' : 'low');

        items.push({
          id: 'order-' + b.order_id,
          claim: `${b.order_id} (${b.customer}) is $${Number(b.value || 0).toLocaleString()} stalled ${b.hours_over}h past its "${b.stage}" SLA`,
          confidence: 92,
          severity,
          impact: b.value ? ('$' + Number(b.value).toLocaleString() + ' order value delayed in cash cycle') : '',
          rationale: `Order ${b.order_id} for ${b.customer} entered the "${b.stage}" stage ${b.hours_in_stage}h ago, ` +
            `against a defined ${b.sla_hours}h SLA for that stage, and is now ${b.hours_over}h over. ` +
            `Signal: ${signal}.` + (b.notes ? ` Note on record: ${b.notes}` : ''),
          sources: ['O2C order record ' + b.order_id],
          dataPoints: [
            { label: 'Stage', value: b.stage },
            { label: 'Hours over SLA', value: b.hours_over + 'h' },
            { label: 'Order value', value: '$' + Number(b.value || 0).toLocaleString() }
          ]
        });
      });

      const rank = { high: 0, med: 1, low: 2 };
      return items.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
    }

    /* ── Canonical core wiring ──────────────────────────────────
       Maps each order onto the shared cross-vertical field contract
       (architecture/canonical/entities.json) so WIP, Collective BNCA,
       and any future consumer can read O2C orders generically without
       knowing O2C-specific field names. Vertical-specific fields
       (customer/value/currency/notes) ride along unchanged -- this is
       additive, not a replacement schema. */
    async _canonical() {
      if (this._canonicalCore) return this._canonicalCore;
      if (typeof window === 'undefined' || !window.CanonicalCore) {
        console.warn('O2CEngine: CanonicalCore not available -- include /runtime/kernel/canonical-core.js before o2c-engine.js to enable getCanonicalOrders().');
        return null;
      }
      const cc = new window.CanonicalCore();
      await cc.load();
      this._canonicalCore = cc;
      return cc;
    }

    _riskLevelFor(order, breachIds) {
      if (!breachIds.has(order.order_id)) return 'low';
      const breach = this.getSlaBreaches().find(b => b.order_id === order.order_id);
      return breach && breach.hours_over > 48 ? 'high' : 'medium';
    }

    /** Returns canonical-compliant records for every loaded order.
     *  Falls back to raw orders (unprocessed) if CanonicalCore isn't
     *  loaded, so callers can still function during partial rollout. */
    async getCanonicalOrders() {
      const cc = await this._canonical();
      if (!cc) return this.orders;

      const breaches = this.getSlaBreaches();
      const breachIds = new Set(breaches.map(b => b.order_id));
      const stage = id => this.stageIndex[id];

      return this.orders.map(o => {
        const s = stage(o.stage);
        const { record } = cc.process({
          id: o.order_id,
          type: 'o2c_order',
          vertical: 'o2c',
          owner: o.owner || 'Unassigned',
          status: s ? s.label : o.stage,
          current_stage: o.stage,
          risk_level: this._riskLevelFor(o, breachIds),
          sla_state: breachIds.has(o.order_id) ? 'breached' : 'on_track',
          linked_war_room: '/war-rooms/o2c/o2c-war-room.html',
          customer: o.customer,
          value: o.value,
          currency: o.currency,
          notes: o.notes || ''
        });
        return record;
      });
    }
  }

  global.TSMO2CEngine = O2CEngine;
})(typeof window !== 'undefined' ? window : this);