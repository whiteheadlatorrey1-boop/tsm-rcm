/* ============================================================
   TSM SCHOOLS ENGINE
   war-rooms/schools-command/services/schools-engine.js
   Mirrors war-rooms/mortgage/services/mortgage-engine.js's method
   shape, generalized across Schools' three entity kinds (grant_file,
   monitoring_item, exception). Monitoring items and exceptions
   correlate to a grant_file via grant_id, same non-mutating
   correlation pattern Mortgage uses for conditions/exceptions -> loan_file.
   ============================================================ */

(function (global) {
  'use strict';

  const ENTITY_KEYS = ['grant_files', 'monitoring_items', 'exceptions'];
  const CLOSED_STAGES = ['closed', 'denied'];

  class TSMSchoolsEngine {
    constructor(model) {
      this.model = model || { entities: {}, kpis: [], risk_signals: [] };
      this.data = { grant_files: [], monitoring_items: [], exceptions: [] };
      this._canonicalCore = null;
    }

    loadSampleData() {
      const sample = this.model.sample_data || {};
      ENTITY_KEYS.forEach(k => { this.data[k] = [...(sample[k] || [])]; });
    }

    loadRecords(entityKey, records) {
      if (!ENTITY_KEYS.includes(entityKey)) {
        console.warn('TSMSchoolsEngine: unknown entity key', entityKey);
        return;
      }
      this.data[entityKey] = [...(this.data[entityKey] || []), ...records];
    }

    saveToStorage() {
      try {
        localStorage.setItem('TSM_SCHOOLS_DATA', JSON.stringify(this.data));
        return true;
      } catch (e) {
        console.warn('TSMSchoolsEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_SCHOOLS_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        ENTITY_KEYS.forEach(k => { this.data[k] = Array.isArray(parsed[k]) ? parsed[k] : []; });
        return true;
      } catch (e) {
        console.warn('TSMSchoolsEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_SCHOOLS_DATA'); } catch (e) { /* noop */ }
    }

    _idField(entityKey) {
      return { grant_files: 'grant_id', monitoring_items: 'monitoring_id', exceptions: 'exception_id' }[entityKey];
    }

    _entityDef(entityKey) {
      const singular = { grant_files: 'grant_file', monitoring_items: 'monitoring_item', exceptions: 'exception' }[entityKey];
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

    computeKpis() {
      const openGrants = this.data.grant_files.filter(g => !CLOSED_STAGES.includes(g.stage)).length;
      const grantsOverSla = this.getSlaBreaches('grant_files').length;
      const closeoutReady = this.data.grant_files.filter(g => g.stage === 'closeout_ready').length;
      const activeAwardValue = this.data.grant_files
        .filter(g => g.stage === 'active')
        .reduce((sum, g) => sum + (g.award_amount || 0), 0);
      const openMonitoringItems = this.data.monitoring_items.filter(m => m.stage !== 'cleared').length;
      const openComplianceExceptions = this.data.exceptions.filter(e => e.stage !== 'remediated').length;

      return {
        open_grant_files: openGrants,
        grants_over_sla: grantsOverSla,
        closeout_ready: closeoutReady,
        active_award_value: activeAwardValue,
        open_monitoring_items: openMonitoringItems,
        open_compliance_exceptions: openComplianceExceptions
      };
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

    // Financial exposure is now computed server-side against a private rate
    // card (server/private-config/schools/financial-model.json) that is
    // never shipped to the browser -- see routes/schools-financial.js.
    // getFinancialSummary() therefore became async; buildRelayPayload() and
    // every caller (schools-command.html) await it.
    async getFinancialSummary() {
      try {
        const res = await fetch('/api/schools/financial-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kpis: this.computeKpis(),
            grant_breaches: this.getSlaBreaches('grant_files'),
            exceptions: this.data.exceptions.filter(e => e.stage !== 'remediated')
          })
        });
        if (!res.ok) throw new Error('financial-summary endpoint returned ' + res.status);
        return res.json();
      } catch (e) {
        console.warn('TSMSchoolsEngine: getFinancialSummary failed, falling back to zeroed totals', e);
        return {
          currency: 'USD',
          funding_delay_exposure_total: 0,
          funding_delay_exposure_items: [],
          compliance_exposure_total: 0,
          compliance_exposure_items: [],
          active_award_value: this.computeKpis().active_award_value,
          total_exposure: 0,
          note: 'Financial summary unavailable.',
          funding_delay_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' },
          compliance_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' }
        };
      }
    }



    async _canonical() {
      if (this._canonicalCore) return this._canonicalCore;
      if (typeof window === 'undefined' || !window.CanonicalCore) {
        console.warn('TSMSchoolsEngine: CanonicalCore not available -- include /runtime/kernel/canonical-core.js before schools-engine.js to enable getCanonicalRecords().');
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
        { key: 'grant_files',      type: 'sch_grant_file',           idField: 'grant_id',      ownerField: 'owner', statusField: 'stage', warRoom: '/html/war-rooms/schools-command/schools-command.html' },
        { key: 'monitoring_items', type: 'sch_monitoring_item',      idField: 'monitoring_id', ownerField: null,    statusField: 'stage', warRoom: '/html/war-rooms/schools-command/schools-command.html' },
        { key: 'exceptions',       type: 'sch_compliance_exception', idField: 'exception_id',  ownerField: null,    statusField: 'stage', warRoom: '/html/war-rooms/schools-command/schools-command.html' }
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
            vertical: 'sch',
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

    buildEnrichmentContext(grantId) {
      const grant = this.data.grant_files.find(g => g.grant_id === grantId);
      if (!grant) return null;

      const openMonitoring = this.data.monitoring_items.filter(
        m => m.grant_id === grantId && m.stage !== 'cleared'
      );
      const openExceptions = this.data.exceptions.filter(
        e => e.grant_id === grantId && e.stage !== 'remediated'
      );

      const context = {
        vertical: 'sch',
        entity: grant.grantee,
        documentType: 'Grant File',
        customer: { id: grant.grant_id, name: grant.grantee },
        contract: { id: grant.grant_id, program: grant.program, amount: grant.award_amount },
        project: { id: grant.grant_id, stage: grant.stage }
      };

      if (openMonitoring.length) {
        const m = openMonitoring[0];
        context.approval = { id: m.monitoring_id, description: m.description };
      }

      if (openExceptions.length) {
        const e = openExceptions[0];
        context.compliance = { id: e.exception_id, type: e.type, severity: e.severity };
      }

      return context;
    }

    async runEnterpriseEnrichment(grantId) {
      const context = this.buildEnrichmentContext(grantId);
      if (!context) throw new Error('TSMSchoolsEngine: unknown grant_id ' + grantId);

      const res = await fetch('/api/enterprise/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      if (!res.ok) throw new Error('Enterprise enrich endpoint returned ' + res.status);
      return res.json();
    }

    async runAnalysis() {
      const res = await fetch('/api/schools/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis: this.computeKpis(),
          grant_breaches: this.getSlaBreaches('grant_files'),
          monitoring_items: this.data.monitoring_items,
          exceptions: this.data.exceptions.filter(e => e.stage !== 'remediated')
        })
      });
      if (!res.ok) throw new Error('Schools analysis endpoint returned ' + res.status);
      return res.json();
    }

    async buildRelayPayload(aiText) {
      return {
        vertical: 'sch',
        timestamp: Date.now(),
        kpis: this.computeKpis(),
        grant_breaches: this.getSlaBreaches('grant_files'),
        grant_wip: this.getStageWip('grant_files'),
        financials: await this.getFinancialSummary(),
        records: {
          grant_files: this.data.grant_files,
          monitoring_items: this.data.monitoring_items,
          exceptions: this.data.exceptions
        },
        ai_summary: aiText || null,
        ts: Date.now()
      };
    }
  }

  global.TSMSchoolsEngine = TSMSchoolsEngine;
})(typeof window !== 'undefined' ? window : this);