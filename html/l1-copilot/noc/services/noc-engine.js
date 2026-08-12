/* ============================================================
   TSM NOC ENGINE
   war-rooms/noc/services/noc-engine.js
   Mirrors war-rooms/crm/services/crm-engine.js's method shape,
   generalized across NOC's three entity kinds (incident, alert,
   device). Unlike CRM, NOC has no conversion-style cross-entity
   event -- alerts correlate to incidents via alert.incident_id,
   but there's no state-mutating "convert" action to mirror.
   ============================================================ */

(function (global) {
  'use strict';

  const ENTITY_KEYS = ['incidents', 'alerts', 'devices'];

  class TSMNOCEngine {
    constructor(model) {
      this.model = model || { entities: {}, kpis: [], risk_signals: [] };
      this.data = { incidents: [], alerts: [], devices: [] };
      this._canonicalCore = null;
    }

    /* ---------- Loading ---------- */

    loadSampleData() {
      const sample = this.model.sample_data || {};
      ENTITY_KEYS.forEach(k => { this.data[k] = [...(sample[k] || [])]; });
    }

    loadRecords(entityKey, records) {
      if (!ENTITY_KEYS.includes(entityKey)) {
        console.warn('TSMNOCEngine: unknown entity key', entityKey);
        return;
      }
      this.data[entityKey] = [...(this.data[entityKey] || []), ...records];
    }

    /* ---------- Persistence ---------- */

    saveToStorage() {
      try {
        localStorage.setItem('TSM_NOC_DATA', JSON.stringify(this.data));
        return true;
      } catch (e) {
        console.warn('TSMNOCEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_NOC_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        ENTITY_KEYS.forEach(k => { this.data[k] = Array.isArray(parsed[k]) ? parsed[k] : []; });
        return true;
      } catch (e) {
        console.warn('TSMNOCEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_NOC_DATA'); } catch (e) { /* noop */ }
    }

    /* ---------- Stage model helpers ---------- */

    _idField(entityKey) {
      return { incidents: 'incident_id', alerts: 'alert_id', devices: 'device_id' }[entityKey];
    }

    _entityDef(entityKey) {
      const singular = entityKey.replace(/s$/, '');
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

    /** SLA breach detection, same "hours over" model CRM/O2C use. */
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

    /* ---------- KPIs ----------
       Field names match what noc-war-room.html reads directly:
       open_incidents, uptime_pct, devices_down, incident_breach_count,
       sev1_incidents. */

    computeKpis() {
      const openIncidents = this.data.incidents.filter(i => !['resolved', 'closed'].includes(i.stage)).length;
      const sev1Incidents = this.data.incidents.filter(i => i.severity === 'SEV1' && !['resolved', 'closed'].includes(i.stage)).length;
      const incidentBreaches = this.getSlaBreaches('incidents').length;

      const totalDevices = this.data.devices.length || 1;
      const devicesDown = this.data.devices.filter(d => d.stage === 'down').length;
      const devicesUp = this.data.devices.filter(d => d.stage === 'online').length;
      const uptimePct = Math.round((devicesUp / totalDevices) * 1000) / 10;

      const openAlerts = this.data.alerts.filter(a => !['resolved'].includes(a.stage)).length;

      return {
        open_incidents: openIncidents,
        sev1_incidents: sev1Incidents,
        incident_breach_count: incidentBreaches,
        uptime_pct: uptimePct,
        devices_down: devicesDown,
        open_alerts: openAlerts
      };
    }

    /* ---------- WIP (work-in-progress) by stage ----------
       Real "time in stage" board, driven off entered_stage_at_hours_ago
       and the stage's sla_hours (when the model defines one). Used by
       both the strategist (ops) and executive (CFO/RCM) views so the
       math lives in exactly one place. */

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

    /* ---------- Financial exposure (CFO / RCM view) ----------
       Rate card lives in the model (financial_model), never hard-coded
       here, so it stays a single editable assumption set instead of
       being duplicated across pages. Every number returned is derived
       from real record data (severity, hours_over, uptime_pct) times
       a disclosed estimate rate -- never invented outright. */

    getFinancialModel() {
      return this.model.financial_model || null;
    }

    getSlaExposure() {
      const fm = this.getFinancialModel();
      const breaches = this.getSlaBreaches('incidents');
      if (!fm || !fm.sla_penalty_per_hour_by_severity) {
        return { total: 0, currency: fm ? fm.currency : 'USD', items: [] };
      }
      const rates = fm.sla_penalty_per_hour_by_severity;
      const items = breaches.map(b => {
        const severity = (b.record && b.record.severity) || 'SEV3';
        const rate = rates[severity] != null ? rates[severity] : 0;
        const exposure = Math.round(b.hours_over * rate);
        return { id: b.id, title: b.record && b.record.title, severity, stage: b.stage, hours_over: b.hours_over, rate_per_hour: rate, exposure };
      }).sort((a, b) => b.exposure - a.exposure);
      return {
        total: items.reduce((s, it) => s + it.exposure, 0),
        currency: fm.currency || 'USD',
        items
      };
    }

    getRevenueAtRisk() {
      const fm = this.getFinancialModel();
      if (!fm || fm.revenue_at_risk_per_uptime_point_per_hour == null) {
        return { per_hour: 0, currency: fm ? fm.currency : 'USD', uptime_gap_pts: 0 };
      }
      const kpis = this.computeKpis();
      const gap = Math.max(0, 100 - kpis.uptime_pct);
      return {
        per_hour: Math.round(gap * fm.revenue_at_risk_per_uptime_point_per_hour),
        currency: fm.currency || 'USD',
        uptime_gap_pts: Math.round(gap * 10) / 10
      };
    }

    getFinancialSummary() {
      const sla = this.getSlaExposure();
      const revenue = this.getRevenueAtRisk();
      return {
        currency: sla.currency || revenue.currency || 'USD',
        sla_penalty_exposure_total: sla.total,
        sla_penalty_exposure_items: sla.items,
        revenue_at_risk_per_hour: revenue.per_hour,
        uptime_gap_pts: revenue.uptime_gap_pts,
        total_hourly_exposure: sla.total > 0 ? sla.total + revenue.per_hour : revenue.per_hour,
        note: this.model.financial_model ? this.model.financial_model.note : null
      };
    }

    /* ---------- Correlation graph (incident <-> alert <-> device) ----------
       No synthetic edges. Alerts already carry alert.incident_id (see
       sample_data), so alert->incident is a direct id match. Devices have
       no incident_id back-reference, but device.name matches
       incident.affected_system in every sample record, so device->incident
       is a name match against that field. Used by the strategist view to
       render a real correlation graph instead of a decorative one. */

    getCorrelationGraph() {
      const breachIds = new Set(this.getSlaBreaches('incidents').map(b => b.id));
      const nodes = [];
      const edges = [];

      this.data.incidents.forEach(inc => {
        nodes.push({
          id: 'incident:' + inc.incident_id,
          type: 'incident',
          label: inc.incident_id,
          title: inc.title,
          severity: inc.severity,
          breached: breachIds.has(inc.incident_id)
        });
      });

      this.data.alerts.forEach(a => {
        nodes.push({ id: 'alert:' + a.alert_id, type: 'alert', label: a.alert_id, title: a.message, severity: a.severity });
        if (a.incident_id && this.data.incidents.some(i => i.incident_id === a.incident_id)) {
          edges.push({ from: 'alert:' + a.alert_id, to: 'incident:' + a.incident_id, kind: 'correlates_to' });
        }
      });

      this.data.devices.forEach(d => {
        nodes.push({ id: 'device:' + d.device_id, type: 'device', label: d.device_id, title: d.name, stage: d.stage });
        this.data.incidents
          .filter(inc => inc.affected_system && inc.affected_system === d.name)
          .forEach(inc => {
            edges.push({ from: 'device:' + d.device_id, to: 'incident:' + inc.incident_id, kind: 'affects' });
          });
      });

      return { nodes, edges };
    }

    /* ---------- Canonical core wiring ---------- */

    async _canonical() {
      if (this._canonicalCore) return this._canonicalCore;
      if (typeof window === 'undefined' || !window.CanonicalCore) {
        console.warn('TSMNOCEngine: CanonicalCore not available -- include /runtime/kernel/canonical-core.js before noc-engine.js to enable getCanonicalRecords().');
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
      return breach.hours_over > 4 ? 'high' : 'medium';
    }

    async getCanonicalRecords() {
      const cc = await this._canonical();
      if (!cc) return this.data;

      const kindConfig = [
        { key: 'incidents', type: 'noc_incident', idField: 'incident_id', ownerField: 'owner', statusField: 'stage', warRoom: '/l1-copilot/noc/noc-war-room.html' },
        { key: 'alerts',    type: 'noc_alert',    idField: 'alert_id',    ownerField: null,     statusField: 'stage', warRoom: '/l1-copilot/noc/noc-war-room.html' },
        { key: 'devices',   type: 'noc_device',   idField: 'device_id',   ownerField: null,     statusField: 'stage', warRoom: '/l1-copilot/noc/noc-war-room.html' }
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
            vertical: 'noc',
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

    /* ---------- AI + relay (mirrors CRMEngine) ---------- */

    async runAnalysis() {
      const res = await fetch('/api/noc/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis: this.computeKpis(),
          incident_breaches: this.getSlaBreaches('incidents'),
          alerts: this.data.alerts,
          devices_down: this.data.devices.filter(d => d.stage === 'down')
        })
      });
      if (!res.ok) throw new Error('NOC analysis endpoint returned ' + res.status);
      return res.json();
    }

    buildRelayPayload(aiText) {
      return {
        vertical: 'noc',
        timestamp: Date.now(),
        kpis: this.computeKpis(),
        incident_breaches: this.getSlaBreaches('incidents'),
        incident_wip: this.getStageWip('incidents'),
        financials: this.getFinancialSummary(),
        correlation_graph: this.getCorrelationGraph(),
        records: {
          incidents: this.data.incidents,
          alerts: this.data.alerts,
          devices: this.data.devices
        },
        ai_summary: aiText || null,
        ts: Date.now()
      };
    }
  }

  global.TSMNOCEngine = TSMNOCEngine;
})(typeof window !== 'undefined' ? window : this);