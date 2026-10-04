/* ============================================================
   TSM COLLEGE ENROLLMENT ENGINE
   war-rooms/college-command/services/college-enrollment-engine.js
   Mirrors college-finaid-engine.js's method shape (loadSampleData/
   computeKpis/getSlaBreaches/getFinancialSummary/buildRelayPayload),
   generalized across Enrollment's three entity kinds (melt_risk_case,
   application_completeness_case, yield_funnel_segment).
   Sixth College domain — first to cover the admissions/yield funnel
   rather than a purely financial/compliance case type.
   ============================================================ */

(function (global) {
  'use strict';

  const ENTITY_KEYS = ['melt_risk_cases', 'application_completeness_cases', 'yield_funnel_segments'];
  const MELTED_STAGES = ['melted', 'confirmed_enrolled'];
  const COMPLETE_STAGES = ['complete'];

  class TSMCollegeEnrollmentEngine {
    constructor(model) {
      this.model = model || { entities: {}, kpis: [] };
      this.data = { melt_risk_cases: [], application_completeness_cases: [], yield_funnel_segments: [] };
      this._canonicalCore = null;
    }

    loadSampleData() {
      const sample = this.model.sample_data || {};
      ENTITY_KEYS.forEach(k => { this.data[k] = [...(sample[k] || [])]; });
    }

    loadRecords(entityKey, records) {
      if (!ENTITY_KEYS.includes(entityKey)) {
        console.warn('TSMCollegeEnrollmentEngine: unknown entity key', entityKey);
        return;
      }
      this.data[entityKey] = [...(this.data[entityKey] || []), ...records];
    }

    saveToStorage() {
      try {
        localStorage.setItem('TSM_COLLEGE_ENROLLMENT_DATA', JSON.stringify(this.data));
        return true;
      } catch (e) {
        console.warn('TSMCollegeEnrollmentEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_COLLEGE_ENROLLMENT_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        ENTITY_KEYS.forEach(k => { this.data[k] = Array.isArray(parsed[k]) ? parsed[k] : []; });
        return true;
      } catch (e) {
        console.warn('TSMCollegeEnrollmentEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_COLLEGE_ENROLLMENT_DATA'); } catch (e) { /* noop */ }
    }

    _idField(entityKey) {
      return { melt_risk_cases: 'case_id', application_completeness_cases: 'case_id', yield_funnel_segments: 'segment_id' }[entityKey];
    }

    _entityDef(entityKey) {
      const singular = { melt_risk_cases: 'melt_risk_case', application_completeness_cases: 'application_completeness_case', yield_funnel_segments: 'yield_funnel_segment' }[entityKey];
      return (this.model.entities || {})[singular] || {};
    }

    // Melt risk is time-to-term-start driven, not a stage-SLA clock: a
    // student is "at risk" when they're both close to the term start AND
    // disengaged (low engagement_score) — thresholds live on the entity
    // def (risk_days_to_term_ceiling / risk_engagement_floor) so they're
    // configurable per model without touching engine code.
    // Application completeness breaches on proximity to the admission
    // decision deadline while still incomplete.
    getSlaBreaches(entityKey) {
      const idField = this._idField(entityKey);
      if (entityKey === 'melt_risk_cases') {
        const def = this._entityDef(entityKey);
        const daysCeiling = def.risk_days_to_term_ceiling != null ? def.risk_days_to_term_ceiling : 30;
        const engagementFloor = def.risk_engagement_floor != null ? def.risk_engagement_floor : 40;
        return (this.data.melt_risk_cases || [])
          .filter(r => !MELTED_STAGES.includes(r.stage))
          .filter(r => (r.days_to_term_start || 0) <= daysCeiling && (r.engagement_score == null || r.engagement_score < engagementFloor))
          .map(r => ({ id: r[idField], stage: r.stage, days_to_term_start: r.days_to_term_start, engagement_score: r.engagement_score, record: r }))
          .sort((a, b) => a.days_to_term_start - b.days_to_term_start);
      }
      if (entityKey === 'application_completeness_cases') {
        const def = this._entityDef(entityKey);
        const deadlineCeiling = def.risk_deadline_days_ceiling != null ? def.risk_deadline_days_ceiling : 7;
        return (this.data.application_completeness_cases || [])
          .filter(r => !COMPLETE_STAGES.includes(r.stage))
          .filter(r => (r.deadline_days_remaining != null ? r.deadline_days_remaining : Infinity) <= deadlineCeiling)
          .map(r => ({ id: r[idField], stage: r.stage, deadline_days_remaining: r.deadline_days_remaining, days_open: r.days_open, record: r }))
          .sort((a, b) => a.deadline_days_remaining - b.deadline_days_remaining);
      }
      return [];
    }

    computeKpis() {
      const openMelt = this.data.melt_risk_cases.filter(r => !MELTED_STAGES.includes(r.stage)).length;
      const meltOverThreshold = this.getSlaBreaches('melt_risk_cases').length;
      const totalDeposited = this.data.melt_risk_cases.filter(r => r.stage !== 'melted').length;
      const openCompleteness = this.data.application_completeness_cases.filter(r => !COMPLETE_STAGES.includes(r.stage)).length;
      const completenessOverThreshold = this.getSlaBreaches('application_completeness_cases').length;
      const yieldSegmentsAtRisk = this.data.yield_funnel_segments.filter(s => s.band === 'AT_RISK' || s.band === 'BEHIND').length;

      return {
        open_melt_risk_cases: openMelt,
        melt_risk_over_threshold: meltOverThreshold,
        total_deposited: totalDeposited,
        open_completeness_cases: openCompleteness,
        completeness_over_threshold: completenessOverThreshold,
        yield_segments_at_risk: yieldSegmentsAtRisk
      };
    }

    // Financial exposure is computed server-side against a private rate
    // card (server/private-config/college/enrollment-financial-model.json),
    // never shipped to the browser — see routes/college-enrollment-financial.js.
    async getFinancialSummary() {
      try {
        const res = await fetch('/api/college/enrollment/financial-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kpis: this.computeKpis(),
            melt_breaches: this.getSlaBreaches('melt_risk_cases'),
            completeness_breaches: this.getSlaBreaches('application_completeness_cases'),
            yield_segments: this.data.yield_funnel_segments
          })
        });
        if (!res.ok) throw new Error('financial-summary endpoint returned ' + res.status);
        return res.json();
      } catch (e) {
        console.warn('TSMCollegeEnrollmentEngine: getFinancialSummary failed, falling back to zeroed totals', e);
        return {
          currency: 'USD',
          melt_exposure_total: 0,
          melt_exposure_items: [],
          completeness_exposure_total: 0,
          completeness_exposure_items: [],
          yield_gap_exposure_total: 0,
          yield_gap_exposure_items: [],
          total_exposure: 0,
          note: 'Financial summary unavailable.',
          melt_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' },
          completeness_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' },
          yield_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' }
        };
      }
    }

    // Real Groq-backed enrollment/yield analysis — see
    // routes/college-enrollment-financial.js's POST /analysis.
    async getAiAnalysis(context) {
      try {
        const res = await fetch('/api/college/enrollment/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kpis: this.computeKpis(),
            melt_breaches: this.getSlaBreaches('melt_risk_cases'),
            completeness_breaches: this.getSlaBreaches('application_completeness_cases'),
            yield_segments: this.data.yield_funnel_segments,
            context: context || undefined
          })
        });
        if (!res.ok) throw new Error('analysis endpoint returned ' + res.status);
        const data = await res.json();
        return { answer: data.answer || 'No response.', degraded: !!data.degraded };
      } catch (e) {
        console.warn('TSMCollegeEnrollmentEngine: getAiAnalysis failed', e);
        return { answer: 'AI analysis unavailable — ' + e.message, degraded: true };
      }
    }

    // Relay payload written to TSM_COLLEGE_ENROLLMENT_RELAY (registered in
    // relay.core.js's RELAY_REGISTRY under domain key COLLEGE_ENROLLMENT).
    async buildRelayPayload(aiText) {
      return {
        vertical: 'college_enrollment',
        domain: 'ENROLLMENT',
        timestamp: Date.now(),
        kpis: this.computeKpis(),
        melt_breaches: this.getSlaBreaches('melt_risk_cases'),
        completeness_breaches: this.getSlaBreaches('application_completeness_cases'),
        financials: await this.getFinancialSummary(),
        records: {
          melt_risk_cases: this.data.melt_risk_cases,
          application_completeness_cases: this.data.application_completeness_cases,
          yield_funnel_segments: this.data.yield_funnel_segments
        },
        ai_summary: aiText || null
      };
    }

    // ── CanonicalCore integration ──────────────────────────────────────
    // Mirrors college-finaid-engine.js's _canonical()/_riskLevelFor()/
    // getCanonicalRecords() exactly, generalized across this domain's
    // three entity kinds.
    async _canonical() {
      if (this._canonicalCore) return this._canonicalCore;
      if (typeof window === 'undefined' || !window.CanonicalCore) {
        console.warn('TSMCollegeEnrollmentEngine: CanonicalCore not available -- include /runtime/kernel/canonical-core.js before college-enrollment-engine.js to enable getCanonicalRecords().');
        return null;
      }
      const cc = new window.CanonicalCore();
      await cc.load();
      this._canonicalCore = cc;
      return cc;
    }

    _riskLevelFor(entityKey, record) {
      const idField = this._idField(entityKey);
      const breaches = this.getSlaBreaches(entityKey);
      const breach = breaches.find(b => b.id === record[idField]);
      if (!breach) return 'low';
      if (entityKey === 'melt_risk_cases') {
        return breach.days_to_term_start <= 14 ? 'critical' : breach.days_to_term_start <= 25 ? 'high' : 'medium';
      }
      return breach.deadline_days_remaining <= 3 ? 'critical' : breach.deadline_days_remaining <= 5 ? 'high' : 'medium';
    }

    async getCanonicalRecords() {
      const cc = await this._canonical();
      if (!cc) return this.data;

      const kindConfig = [
        { key: 'melt_risk_cases',                type: 'col_melt_risk_case',        idField: 'case_id',    ownerField: 'owner', statusField: 'stage', warRoom: '/html/war-rooms/college-command/college-enrollment-command.html' },
        { key: 'application_completeness_cases', type: 'col_app_completeness_case', idField: 'case_id',    ownerField: 'owner', statusField: 'stage', warRoom: '/html/war-rooms/college-command/college-enrollment-command.html' },
        { key: 'yield_funnel_segments',           type: 'col_yield_funnel_segment',  idField: 'segment_id', ownerField: 'owner', statusField: 'band',  warRoom: '/html/war-rooms/college-command/college-enrollment-command.html' }
      ];

      const out = {};
      for (const cfg of kindConfig) {
        const breaches = cfg.key !== 'yield_funnel_segments' ? this.getSlaBreaches(cfg.key) : [];
        const breachIds = new Set(breaches.map(b => b.id));
        out[cfg.key] = this.data[cfg.key].map(r => {
          const def = this._entityDef(cfg.key);
          const stageOrBand = (def.stages || []).find(s => s.id === (r.stage || r.band));
          const { record } = cc.process({
            id: r[cfg.idField],
            type: cfg.type,
            vertical: 'college_enrollment',
            owner: (cfg.ownerField && r[cfg.ownerField]) || 'Unassigned',
            status: stageOrBand ? stageOrBand.label : (r.stage || r.band),
            current_stage: r.stage || r.band,
            risk_level: cfg.key !== 'yield_funnel_segments' ? this._riskLevelFor(cfg.key, r) : (r.band === 'BEHIND' ? 'critical' : r.band === 'AT_RISK' ? 'high' : 'low'),
            sla_state: breachIds.has(r[cfg.idField]) ? 'breached' : 'on_track',
            linked_war_room: cfg.warRoom,
            ...r
          });
          return record;
        });
      }
      return out;
    }
  }

  global.TSMCollegeEnrollmentEngine = TSMCollegeEnrollmentEngine;
})(typeof window !== 'undefined' ? window : this);
