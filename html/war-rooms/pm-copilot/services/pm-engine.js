/* ============================================================
   TSM PM COPILOT ENGINE
   war-rooms/pm-copilot/services/pm-engine.js
   Mirrors war-rooms/schools-command/services/schools-engine.js's method
   shape, generalized across PM Copilot's three stage-tracked entity
   kinds (work_order, lease, vendor_compliance). Units are auxiliary
   reference data (occupancy status, not a stage/SLA lifecycle) --
   handled separately from ENTITY_KEYS, same way Mortgage keeps its
   property/borrower reference data outside the stage-tracked loan_file.
   ============================================================ */

(function (global) {
  'use strict';

  const ENTITY_KEYS = ['work_orders', 'leases', 'vendors', 'turnovers'];

  class TSMPmEngine {
    constructor(model) {
      this.model = model || { entities: {}, kpis: [], risk_signals: [] };
      this.data = { work_orders: [], leases: [], vendors: [], turnovers: [], units: [] };
      this._canonicalCore = null;
    }

    loadSampleData() {
      const sample = this.model.sample_data || {};
      ENTITY_KEYS.forEach(k => { this.data[k] = [...(sample[k] || [])]; });
      this.data.units = [...(sample.units || [])];
    }

    loadRecords(entityKey, records) {
      if (entityKey === 'units') {
        this.data.units = [...(this.data.units || []), ...records];
        return;
      }
      if (!ENTITY_KEYS.includes(entityKey)) {
        console.warn('TSMPmEngine: unknown entity key', entityKey);
        return;
      }
      this.data[entityKey] = [...(this.data[entityKey] || []), ...records];
    }

    saveToStorage() {
      try {
        localStorage.setItem('TSM_PM_DATA', JSON.stringify(this.data));
        return true;
      } catch (e) {
        console.warn('TSMPmEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_PM_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        ENTITY_KEYS.forEach(k => { this.data[k] = Array.isArray(parsed[k]) ? parsed[k] : []; });
        this.data.units = Array.isArray(parsed.units) ? parsed.units : [];
        return true;
      } catch (e) {
        console.warn('TSMPmEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_PM_DATA'); } catch (e) { /* noop */ }
    }

    _idField(entityKey) {
      return { work_orders: 'work_order_id', leases: 'lease_id', vendors: 'vendor_id', turnovers: 'turnover_id' }[entityKey];
    }

    _entityDef(entityKey) {
      const singular = { work_orders: 'work_order', leases: 'lease', vendors: 'vendor_compliance', turnovers: 'make_ready' }[entityKey];
      return (this.model.entities || {})[singular] || { stages: [] };
    }

    getStageDistribution(entityKey) {
      const def = this._entityDef(entityKey);
      const dist = {};
      (def.stages || []).forEach(s => { dist[s.id] = { count: 0 }; });
      (this.data[entityKey] || []).forEach(r => {
        if (!dist[r.stage]) dist[r.stage] = { count: 0 };
        dist[r.stage].count += 1;
      });
      return dist;
    }

    getSlaBreaches(entityKey) {
      const def = this._entityDef(entityKey);
      const stageMap = {};
      (def.stages || []).forEach(s => { stageMap[s.id] = s; });
      const idField = this._idField(entityKey);

      return (this.data[entityKey] || [])
        .map(r => {
          const stage = stageMap[r.stage];
          if (!stage || stage.sla_hours == null) return null;
          const hoursOver = (r.entered_stage_at_hours_ago || 0) - stage.sla_hours;
          if (hoursOver <= 0) return null;
          return { id: r[idField], stage: stage.label, hours_over: hoursOver, record: r };
        })
        .filter(Boolean)
        .sort((a, b) => b.hours_over - a.hours_over);
    }

    getStageWip(entityKey) {
      const def = this._entityDef(entityKey);
      const idField = this._idField(entityKey);
      const records = this.data[entityKey] || [];

      return (def.stages || []).map(stage => {
        const inStage = records.filter(r => r.stage === stage.id);
        const withAge = inStage.filter(r => r.entered_stage_at_hours_ago !== undefined);
        const avgHours = withAge.length
          ? Math.round((withAge.reduce((s, r) => s + r.entered_stage_at_hours_ago, 0) / withAge.length) * 10) / 10
          : null;
        const stalled = stage.sla_hours != null
          ? inStage.filter(r => (r.entered_stage_at_hours_ago || 0) > stage.sla_hours)
          : [];
        return {
          stage: stage.id,
          label: stage.label,
          order: stage.order,
          sla_hours: stage.sla_hours,
          count: inStage.length,
          avg_hours_in_stage: avgHours,
          stalled_count: stalled.length,
          stalled_ids: stalled.map(r => r[idField])
        };
      });
    }

    // ── Occupancy (units are auxiliary, not a stage-tracked entity) ────────

    getOccupancySummary() {
      const units = this.data.units || [];
      const total = units.length;
      const occupied = units.filter(u => u.status === 'occupied').length;
      const vacant = units.filter(u => u.status === 'vacant').length;
      const rate = total ? Math.round((occupied / total) * 1000) / 10 : null;
      return { total, occupied, vacant, occupancy_rate: rate };
    }

    getLeasesExpiring(withinDays = 60) {
      const now = Date.now();
      const cutoff = now + withinDays * 86400000;
      return (this.data.leases || []).filter(l => {
        if (['vacated'].includes(l.stage)) return false;
        const end = new Date(l.end_date).getTime();
        return Number.isFinite(end) && end <= cutoff;
      }).sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    }

    computeKpis() {
      const occ = this.getOccupancySummary();
      const workOrdersOpen = (this.data.work_orders || []).filter(
        w => !['verified', 'cancelled'].includes(w.stage)
      ).length;
      const workOrdersOverSla = this.getSlaBreaches('work_orders').length;
      const leasesExpiring60d = this.getLeasesExpiring(60).length;
      const vendorFlags = (this.data.vendors || []).filter(
        v => ['expiring_soon', 'expired'].includes(v.stage)
      ).length;
      const portfolioRentValue = (this.data.leases || [])
        .filter(l => ['active', 'renewed', 'notice_given', 'renewal_pending'].includes(l.stage))
        .reduce((sum, l) => sum + (l.rent || 0), 0);
      const turnoversInProgress = (this.data.turnovers || []).filter(
        t => t.stage !== 'leased'
      ).length;
      const turnoversOverSla = this.getSlaBreaches('turnovers').length;

      return {
        open_work_orders: workOrdersOpen,
        work_orders_over_sla: workOrdersOverSla,
        occupancy_rate: occ.occupancy_rate,
        units_vacant: occ.vacant,
        leases_expiring_60d: leasesExpiring60d,
        vendor_compliance_flags: vendorFlags,
        portfolio_rent_value: portfolioRentValue,
        turnovers_in_progress: turnoversInProgress,
        turnovers_over_sla: turnoversOverSla
      };
    }

    /**
     * Turnover / make-ready pipeline: joins each turnover record back to
     * its unit (property, address, days_vacant, market_rent) and flags
     * SLA breaches by stage, same breach math as getSlaBreaches().
     */
    getTurnoverPipeline() {
      const breaches = this.getSlaBreaches('turnovers');
      const breachMap = {};
      breaches.forEach(b => { breachMap[b.id] = b; });

      return (this.data.turnovers || []).map(t => {
        const unit = (this.data.units || []).find(u => u.unit_id === t.unit_id);
        const breach = breachMap[t.turnover_id];
        return {
          turnover_id: t.turnover_id,
          unit_id: t.unit_id,
          property: t.property || (unit && unit.property),
          address: unit ? unit.address : null,
          stage: t.stage,
          entered_stage_at_hours_ago: t.entered_stage_at_hours_ago || 0,
          days_vacant: unit ? unit.days_vacant : null,
          market_rent: unit ? unit.market_rent : null,
          over_sla: !!breach,
          hours_over_sla: breach ? breach.hours_over : 0,
          notes: t.notes || ''
        };
      }).sort((a, b) => (b.hours_over_sla || 0) - (a.hours_over_sla || 0));
    }

    getFinancialModel() {
      return this.model.financial_model || null;
    }

    /** Vacant units bleeding market rent every day they sit empty. */
    getVacancyExposure() {
      const fm = this.getFinancialModel();
      const vacant = (this.data.units || []).filter(u => u.status === 'vacant');
      if (!fm || fm.vacancy_cost_per_day == null) {
        return { total: 0, currency: fm ? fm.currency : 'USD', items: [] };
      }
      const rate = fm.vacancy_cost_per_day;
      const items = vacant.map(u => {
        const days = u.days_vacant || 0;
        const exposure = Math.round(days * rate);
        return { unit_id: u.unit_id, property: u.property, days_vacant: days, market_rent: u.market_rent, exposure };
      }).sort((a, b) => b.exposure - a.exposure);
      return { total: items.reduce((s, it) => s + it.exposure, 0), currency: fm.currency || 'USD', items };
    }

    /** SLA-breached work orders, priced by days over SLA. */
    getMaintenanceDelayExposure() {
      const fm = this.getFinancialModel();
      const breaches = this.getSlaBreaches('work_orders');
      if (!fm || fm.maintenance_delay_cost_per_day == null) {
        return { total: 0, currency: fm ? fm.currency : 'USD', items: [] };
      }
      const rate = fm.maintenance_delay_cost_per_day;
      const items = breaches.map(b => {
        const days = Math.max(1, Math.round((b.hours_over / 24) * 10) / 10);
        const exposure = Math.round(days * rate);
        return { id: b.id, unit_id: b.record && b.record.unit_id, stage: b.stage, hours_over: b.hours_over, days_over: days, exposure };
      }).sort((a, b) => b.exposure - a.exposure);
      return { total: items.reduce((s, it) => s + it.exposure, 0), currency: fm.currency || 'USD', items };
    }

    /**
     * Vendor insurance/license exposure. Vendors don't carry an explicit
     * severity field (unlike Schools' exceptions) -- severity is derived
     * from stage: expired -> HIGH, expiring_soon -> MEDIUM. Current/
     * remediated vendors carry no exposure.
     */
    getVendorComplianceExposure() {
      const fm = this.getFinancialModel();
      const flagged = (this.data.vendors || []).filter(v => ['expiring_soon', 'expired'].includes(v.stage));
      if (!fm || !fm.insurance_lapse_exposure_by_severity) {
        return { total: 0, currency: fm ? fm.currency : 'USD', items: [] };
      }
      const rates = fm.insurance_lapse_exposure_by_severity;
      const items = flagged.map(v => {
        const severity = v.stage === 'expired' ? 'HIGH' : 'MEDIUM';
        const rate = rates[severity] != null ? rates[severity] : 0;
        return { vendor_id: v.vendor_id, name: v.name, trade: v.trade, stage: v.stage, severity, exposure: rate };
      }).sort((a, b) => b.exposure - a.exposure);
      return { total: items.reduce((s, it) => s + it.exposure, 0), currency: fm.currency || 'USD', items };
    }

    getFinancialSummary() {
      const vacancy = this.getVacancyExposure();
      const maintenance = this.getMaintenanceDelayExposure();
      const vendorCompliance = this.getVendorComplianceExposure();
      return {
        currency: vacancy.currency || maintenance.currency || vendorCompliance.currency || 'USD',
        vacancy_exposure_total: vacancy.total,
        vacancy_exposure_items: vacancy.items,
        maintenance_delay_exposure_total: maintenance.total,
        maintenance_delay_exposure_items: maintenance.items,
        vendor_compliance_exposure_total: vendorCompliance.total,
        vendor_compliance_exposure_items: vendorCompliance.items,
        portfolio_rent_value: this.computeKpis().portfolio_rent_value,
        total_exposure: vacancy.total + maintenance.total + vendorCompliance.total,
        note: this.model.financial_model ? this.model.financial_model.note : null
      };
    }

    async _canonical() {
      if (this._canonicalCore) return this._canonicalCore;
      if (typeof window === 'undefined' || !window.CanonicalCore) {
        console.warn('TSMPmEngine: CanonicalCore not available -- include /runtime/kernel/canonical-core.js before pm-engine.js to enable getCanonicalRecords().');
        return null;
      }
      const cc = new window.CanonicalCore();
      await cc.load();
      this._canonicalCore = cc;
      return cc;
    }

    _riskLevelFor(entityKey, record) {
      const breaches = this.getSlaBreaches(entityKey);
      const idField = this._idField(entityKey);
      const breach = breaches.find(b => b.id === record[idField]);
      if (!breach) return 'low';
      return breach.hours_over > 24 ? 'high' : 'medium';
    }

    async getCanonicalRecords() {
      const cc = await this._canonical();
      if (!cc) return this.data;

      const kindConfig = [
        { key: 'work_orders', type: 'pm_work_order',        idField: 'work_order_id', ownerField: 'vendor_id', statusField: 'stage', warRoom: '/html/war-rooms/pm-copilot/pm-command.html' },
        { key: 'leases',      type: 'pm_lease',              idField: 'lease_id',      ownerField: null,        statusField: 'stage', warRoom: '/html/war-rooms/pm-copilot/pm-command.html' },
        { key: 'vendors',     type: 'pm_vendor_compliance',  idField: 'vendor_id',     ownerField: null,        statusField: 'stage', warRoom: '/html/war-rooms/pm-copilot/pm-command.html' },
        { key: 'turnovers',   type: 'pm_make_ready',         idField: 'turnover_id',   ownerField: null,        statusField: 'stage', warRoom: '/html/war-rooms/pm-copilot/pm-command.html' }
      ];

      const out = {};
      for (const cfg of kindConfig) {
        const breaches = this.getSlaBreaches(cfg.key);
        const breachIds = new Set(breaches.map(b => b.id));
        out[cfg.key] = this.data[cfg.key].map(r => {
          const def = this._entityDef(cfg.key);
          const stage = (def.stages || []).find(s => s.id === r.stage);
          const { record } = cc.process({
            id: r[cfg.idField],
            type: cfg.type,
            vertical: 'pm',
            owner: (cfg.ownerField && r[cfg.ownerField]) || 'Unassigned',
            status: stage ? stage.label : r.stage,
            current_stage: r.stage,
            risk_level: this._riskLevelFor(cfg.key, r),
            sla_state: breachIds.has(r[cfg.idField]) ? 'breached' : 'on_track',
            linked_war_room: cfg.warRoom,
            related_to: r.related_to || [],
            ...r
          });
          return record;
        });
      }
      return out;
    }

    buildEnrichmentContext(workOrderId) {
      const wo = this.data.work_orders.find(w => w.work_order_id === workOrderId);
      if (!wo) return null;

      const unit = this.data.units.find(u => u.unit_id === wo.unit_id);
      const vendor = wo.vendor_id ? this.data.vendors.find(v => v.vendor_id === wo.vendor_id) : null;

      const context = {
        vertical: 'pm',
        entity: unit ? unit.property + ' — ' + unit.address : wo.unit_id,
        documentType: 'Work Order',
        customer: { id: wo.unit_id, name: unit ? unit.address : wo.unit_id },
        contract: { id: wo.work_order_id, category: wo.category, cost_estimate: wo.cost_estimate },
        project: { id: wo.work_order_id, stage: wo.stage }
      };

      if (vendor) {
        context.compliance = { id: vendor.vendor_id, type: 'Vendor Insurance/License', severity: vendor.stage === 'expired' ? 'HIGH' : 'MEDIUM' };
      }

      return context;
    }

    async runEnterpriseEnrichment(workOrderId) {
      const context = this.buildEnrichmentContext(workOrderId);
      if (!context) throw new Error('TSMPmEngine: unknown work_order_id ' + workOrderId);

      const res = await fetch('/api/enterprise/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      if (!res.ok) throw new Error('Enterprise enrich endpoint returned ' + res.status);
      return res.json();
    }

    async runAnalysis() {
      const res = await fetch('/api/pm/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis: this.computeKpis(),
          work_order_breaches: this.getSlaBreaches('work_orders'),
          leases_expiring: this.getLeasesExpiring(60),
          vendor_flags: this.data.vendors.filter(v => ['expiring_soon', 'expired'].includes(v.stage)),
          turnover_pipeline: this.getTurnoverPipeline()
        })
      });
      if (!res.ok) throw new Error('PM analysis endpoint returned ' + res.status);
      return res.json();
    }

    /**
     * @param {string|null} aiText
     * @param {Array} [iotAlerts] - output of TSMPmIotEngine#getIotAlerts(),
     *   passed in by the caller (pm-command.html) since IoT sensors are
     *   owned by the separate pm-iot-engine.js instance, not this engine.
     *   Defaults to [] so callers that haven't wired IoT yet still work.
     */
    buildRelayPayload(aiText, iotAlerts) {
      return {
        vertical: 'pm',
        timestamp: Date.now(),
        kpis: this.computeKpis(),
        work_order_breaches: this.getSlaBreaches('work_orders'),
        work_order_wip: this.getStageWip('work_orders'),
        turnover_pipeline: this.getTurnoverPipeline(),
        turnover_wip: this.getStageWip('turnovers'),
        financials: this.getFinancialSummary(),
        iot_alerts: iotAlerts || [],
        records: {
          units: this.data.units,
          work_orders: this.data.work_orders,
          leases: this.data.leases,
          vendors: this.data.vendors,
          turnovers: this.data.turnovers
        },
        ai_summary: aiText || null,
        ts: Date.now()
      };
    }
  }

  global.TSMPmEngine = TSMPmEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TSMPmEngine;
  }
})(typeof window !== 'undefined' ? window : global);
