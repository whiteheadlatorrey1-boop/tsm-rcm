/* ============================================================
   TSM HOTELOPS ENGINE
   war-rooms/hotelops/services/hotelops-engine.js
   Mirrors war-rooms/mortgage/services/mortgage-engine.js's method
   shape, generalized across HotelOps's three trackable entity kinds
   (maintenance_tickets, ota_charges, compliance_items) plus a
   revenue snapshot (property) that isn't stage-based like the other
   three -- RevPAR/ADR/Occupancy are point-in-time metrics, not a
   pipeline with SLA breaches, so they get their own accessor rather
   than being forced into the ENTITY_KEYS/getSlaBreaches shape.
   ============================================================ */

(function (global) {
  'use strict';

  const ENTITY_KEYS = ['maintenance_tickets', 'ota_charges', 'compliance_items'];

  class TSMHotelOpsEngine {
    constructor(model) {
      this.model = model || { entities: {}, kpis: [], sample_data: {}, portfolio: [] };
      this.data = { maintenance_tickets: [], ota_charges: [], compliance_items: [] };
      this.property = null; // revenue/occupancy snapshot, set via loadSampleData()
    }

    /* ---------- Loading ---------- */

    loadSampleData() {
      const sample = this.model.sample_data || {};
      ENTITY_KEYS.forEach(k => { this.data[k] = [...(sample[k] || [])]; });
      this.property = sample.property ? { ...sample.property } : null;
    }

    loadRecords(entityKey, records) {
      if (!ENTITY_KEYS.includes(entityKey)) {
        console.warn('TSMHotelOpsEngine: unknown entity key', entityKey);
        return;
      }
      this.data[entityKey] = [...(this.data[entityKey] || []), ...records];
    }

    /* ---------- Persistence ---------- */

    saveToStorage() {
      try {
        localStorage.setItem('TSM_HOTELOPS_DATA', JSON.stringify({ data: this.data, property: this.property }));
        return true;
      } catch (e) {
        console.warn('TSMHotelOpsEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_HOTELOPS_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        ENTITY_KEYS.forEach(k => { this.data[k] = Array.isArray(parsed.data && parsed.data[k]) ? parsed.data[k] : []; });
        this.property = parsed.property || this.property;
        return true;
      } catch (e) {
        console.warn('TSMHotelOpsEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_HOTELOPS_DATA'); } catch (e) { /* noop */ }
    }

    /* ---------- Maintenance: SLA breach detection ----------
       Same "hours over" model Mortgage/NOC/CRM use. sla_hours by
       severity comes from the model, never hard-coded here. */

    _maintSlaHours(severity) {
      const slaMap = (this.model.entities && this.model.entities.maintenance_ticket &&
        this.model.entities.maintenance_ticket.sla_hours_by_severity) || {};
      return slaMap[severity] != null ? slaMap[severity] : null;
    }

    getMaintenanceBreaches() {
      return (this.data.maintenance_tickets || [])
        .filter(t => t.stage !== 'resolved')
        .map(t => {
          const slaHours = this._maintSlaHours(t.severity);
          if (slaHours == null) return null;
          const hoursOver = (t.opened_hours_ago || 0) - slaHours;
          if (hoursOver <= 0) return null;
          return { id: t.ticket_id, room: t.room, title: t.title, severity: t.severity, hours_over: Math.round(hoursOver * 10) / 10, record: t };
        })
        .filter(Boolean)
        .sort((a, b) => b.hours_over - a.hours_over);
    }

    /* ---------- OTA overcharge exposure ----------
       Real math from contracted_pct vs charged_pct * amount, never
       an invented flat number -- same "rate card from the model,
       computed from data" pattern as Mortgage's exposure calcs. */

    getOtaExposure() {
      const items = (this.data.ota_charges || []).map(c => {
        const overchargePct = Math.max(0, (c.charged_pct || 0) - (c.contracted_pct || 0));
        const overchargeAmount = Math.round((overchargePct / 100) * (c.booking_amount || 0));
        return { ...c, overcharge_pct: Math.round(overchargePct * 10) / 10, overcharge_amount: overchargeAmount };
      }).filter(c => c.overcharge_amount > 0)
        .sort((a, b) => b.overcharge_amount - a.overcharge_amount);
      const periodTotal = items.reduce((s, it) => s + it.overcharge_amount, 0);
      return {
        period_total: periodTotal,
        annualized_estimate: Math.round(periodTotal * 12),
        items
      };
    }

    /* ---------- Compliance risk register ---------- */

    getComplianceRisk() {
      return (this.data.compliance_items || [])
        .filter(c => c.stage !== 'cleared')
        .map(c => ({
          id: c.item_id,
          type: c.type,
          detail: c.detail,
          due_in_days: c.due_in_days,
          severity: c.due_in_days != null && c.due_in_days <= 14 ? 'HIGH' : (c.due_in_days != null && c.due_in_days <= 30 ? 'MED' : 'LOW')
        }))
        .sort((a, b) => (a.due_in_days ?? 999) - (b.due_in_days ?? 999));
    }

    /* ---------- Revenue KPIs ----------
       Field names match what hotelops-war-room.html reads directly:
       revpar, adr, occupancy_pct, gop_margin_pct, nps_score,
       section179_eligible, weekday_occ_pct, weekend_occ_pct. */

    computeKpis() {
      const p = this.property || {};
      const roomsAvailable = p.rooms_total || 0;
      const roomsSold = p.rooms_sold || 0;
      const roomRevenue = p.room_revenue || 0;
      const occupancyPct = roomsAvailable > 0 ? Math.round((roomsSold / roomsAvailable) * 1000) / 10 : 0;
      const adr = roomsSold > 0 ? Math.round((roomRevenue / roomsSold) * 100) / 100 : 0;
      const revpar = roomsAvailable > 0 ? Math.round((roomRevenue / roomsAvailable) * 100) / 100 : 0;
      const maintBreaches = this.getMaintenanceBreaches();
      const urgentTickets = (this.data.maintenance_tickets || []).filter(t => t.stage !== 'resolved' && t.severity === 'urgent').length;
      const openTickets = (this.data.maintenance_tickets || []).filter(t => t.stage !== 'resolved').length;
      const complianceRisk = this.getComplianceRisk();

      return {
        revpar,
        adr,
        occupancy_pct: occupancyPct,
        gop_margin_pct: p.gop_margin_pct ?? null,
        gop_target_pct: p.gop_target_pct ?? null,
        nps_score: p.nps_score ?? null,
        nps_industry_avg: p.nps_industry_avg ?? null,
        section179_eligible: p.section179_eligible ?? null,
        weekday_occ_pct: p.weekday_occ_pct ?? null,
        weekend_occ_pct: p.weekend_occ_pct ?? null,
        open_maint_tickets: openTickets,
        urgent_maint_tickets: urgentTickets,
        maint_tickets_over_sla: maintBreaches.length,
        compliance_items_at_risk: complianceRisk.filter(c => c.severity !== 'LOW').length
      };
    }

    getFinancialSummary() {
      const ota = this.getOtaExposure();
      const kpis = this.computeKpis();
      return {
        currency: 'USD',
        ota_overcharge_period: ota.period_total,
        ota_overcharge_annualized: ota.annualized_estimate,
        ota_items: ota.items,
        room_revenue: (this.property && this.property.room_revenue) || 0,
        gop_margin_pct: kpis.gop_margin_pct,
        total_exposure: ota.period_total
      };
    }

    /* ---------- AI + relay (mirrors Mortgage/NOC) ---------- */

    async runAnalysis() {
      const res = await fetch('/api/hotelops/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis: this.computeKpis(),
          maintenance_breaches: this.getMaintenanceBreaches(),
          ota_exposure: this.getOtaExposure(),
          compliance_risk: this.getComplianceRisk()
        })
      });
      if (!res.ok) throw new Error('HotelOps analysis endpoint returned ' + res.status);
      return res.json();
    }

    buildRelayPayload(aiText) {
      return {
        vertical: 'hotelops',
        timestamp: Date.now(),
        kpis: this.computeKpis(),
        maintenance_breaches: this.getMaintenanceBreaches(),
        financials: this.getFinancialSummary(),
        compliance_risk: this.getComplianceRisk(),
        records: {
          maintenance_tickets: this.data.maintenance_tickets,
          ota_charges: this.data.ota_charges,
          compliance_items: this.data.compliance_items
        },
        ai_summary: aiText || null,
        ts: Date.now()
      };
    }

    /* ---------- Portfolio (Executive Portal, multi-property) ----------
       Static per-property snapshot data lives in the model
       (portfolio array), not invented here -- this just formats it
       for the card view and flags which property is "this" one. */

    getPortfolio() {
      return this.model.portfolio || [];
    }
  }

  global.TSMHotelOpsEngine = TSMHotelOpsEngine;
})(typeof window !== 'undefined' ? window : this);