/* ============================================================
   TSM MORTGAGE ENGINE
   war-rooms/mortgage/services/mortgage-engine.js
   Mirrors war-rooms/noc/services/noc-engine.js's method shape,
   generalized across Mortgage's three entity kinds (loan_file,
   condition, exception). Conditions and exceptions correlate to
   a loan_file via loan_id, same non-mutating correlation pattern
   NOC uses for alerts -> incidents.
   ============================================================ */

(function (global) {
  'use strict';

  const ENTITY_KEYS = ['loan_files', 'conditions', 'exceptions'];
  // Auxiliary data buckets: not stage-driven pipelines like ENTITY_KEYS,
  // so they don't get getStageDistribution/getSlaBreaches, but they load
  // and persist the same way and are used by the CRM/CPQ methods below.
  const AUX_KEYS = ['loan_officers', 'rate_locks'];

  class TSMMortgageEngine {
    constructor(model) {
      this.model = model || { entities: {}, kpis: [], risk_signals: [] };
      this.data = { loan_files: [], conditions: [], exceptions: [], loan_officers: [], rate_locks: [] };
      this._canonicalCore = null;
    }

    /* ---------- Loading ---------- */

    loadSampleData() {
      const sample = this.model.sample_data || {};
      ENTITY_KEYS.forEach(k => { this.data[k] = [...(sample[k] || [])]; });
      AUX_KEYS.forEach(k => { this.data[k] = [...(sample[k] || [])]; });
    }

    loadRecords(entityKey, records) {
      if (!ENTITY_KEYS.concat(AUX_KEYS).includes(entityKey)) {
        console.warn('TSMMortgageEngine: unknown entity key', entityKey);
        return;
      }
      this.data[entityKey] = [...(this.data[entityKey] || []), ...records];
    }

    /* ---------- Persistence ---------- */

    saveToStorage() {
      try {
        localStorage.setItem('TSM_MORTGAGE_DATA', JSON.stringify(this.data));
        return true;
      } catch (e) {
        console.warn('TSMMortgageEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_MORTGAGE_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        ENTITY_KEYS.concat(AUX_KEYS).forEach(k => { this.data[k] = Array.isArray(parsed[k]) ? parsed[k] : []; });
        return true;
      } catch (e) {
        console.warn('TSMMortgageEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_MORTGAGE_DATA'); } catch (e) { /* noop */ }
    }

    /* ---------- Stage model helpers ---------- */

    _idField(entityKey) {
      return { loan_files: 'loan_id', conditions: 'condition_id', exceptions: 'exception_id' }[entityKey];
    }

    _entityDef(entityKey) {
      const singular = { loan_files: 'loan_file', conditions: 'condition', exceptions: 'exception' }[entityKey];
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

    /** SLA breach detection, same "hours over" model NOC/CRM/O2C use. */
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
       Field names match what mortgage-war-room.html reads directly:
       open_loan_files, loans_over_sla, ctc_ready, pipeline_value,
       open_conditions, open_exceptions. */

    computeKpis() {
      const CLOSED_STAGES = ['funded', 'denied'];
      const openLoans = this.data.loan_files.filter(l => !CLOSED_STAGES.includes(l.stage)).length;
      const loansOverSla = this.getSlaBreaches('loan_files').length;
      const ctcReady = this.data.loan_files.filter(l => l.stage === 'clear_to_close').length;
      const pipelineValue = this.data.loan_files
        .filter(l => !CLOSED_STAGES.includes(l.stage))
        .reduce((sum, l) => sum + (l.loan_amount || 0), 0);
      const openConditions = this.data.conditions.filter(c => c.stage !== 'cleared').length;
      const openExceptions = this.data.exceptions.filter(e => e.stage !== 'remediated').length;

      return {
        open_loan_files: openLoans,
        loans_over_sla: loansOverSla,
        ctc_ready: ctcReady,
        pipeline_value: pipelineValue,
        open_conditions: openConditions,
        open_exceptions: openExceptions
      };
    }

    /* ---------- WIP (work-in-progress) by stage ---------- */

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

    /* ---------- Financial exposure ----------
       Rate card lives in the model (financial_model), never hard-coded
       here. Closing-delay cost applies to SLA-breached loan files;
       compliance exposure applies to open exceptions by severity. Both
       are disclosed estimate rates, never invented outright. */

    getFinancialModel() {
      return this.model.financial_model || null;
    }

    getClosingDelayExposure() {
      const fm = this.getFinancialModel();
      const breaches = this.getSlaBreaches('loan_files');
      if (!fm || fm.closing_delay_cost_per_day == null) {
        return { total: 0, currency: fm ? fm.currency : 'USD', items: [] };
      }
      const rate = fm.closing_delay_cost_per_day;
      const items = breaches.map(b => {
        const days = Math.max(1, Math.round((b.hours_over / 24) * 10) / 10);
        const exposure = Math.round(days * rate);
        return { id: b.id, borrower: b.record && b.record.borrower, stage: b.stage, hours_over: b.hours_over, days_over: days, exposure };
      }).sort((a, b) => b.exposure - a.exposure);
      return { total: items.reduce((s, it) => s + it.exposure, 0), currency: fm.currency || 'USD', items };
    }

    getComplianceExposure() {
      const fm = this.getFinancialModel();
      const open = this.data.exceptions.filter(e => e.stage !== 'remediated');
      if (!fm || !fm.compliance_exposure_by_severity) {
        return { total: 0, currency: fm ? fm.currency : 'USD', items: [] };
      }
      const rates = fm.compliance_exposure_by_severity;
      const items = open.map(e => {
        const rate = rates[e.severity] != null ? rates[e.severity] : 0;
        return { id: e.exception_id, loan_id: e.loan_id, type: e.type, severity: e.severity, exposure: rate };
      }).sort((a, b) => b.exposure - a.exposure);
      return { total: items.reduce((s, it) => s + it.exposure, 0), currency: fm.currency || 'USD', items };
    }

    getFinancialSummary() {
      const delay = this.getClosingDelayExposure();
      const compliance = this.getComplianceExposure();
      return {
        currency: delay.currency || compliance.currency || 'USD',
        closing_delay_exposure_total: delay.total,
        closing_delay_exposure_items: delay.items,
        compliance_exposure_total: compliance.total,
        compliance_exposure_items: compliance.items,
        pipeline_value: this.computeKpis().pipeline_value,
        total_exposure: delay.total + compliance.total,
        note: this.model.financial_model ? this.model.financial_model.note : null
      };
    }

    /* ---------- Canonical core wiring ---------- */

    async _canonical() {
      if (this._canonicalCore) return this._canonicalCore;
      if (typeof window === 'undefined' || !window.CanonicalCore) {
        console.warn('TSMMortgageEngine: CanonicalCore not available -- include /runtime/kernel/canonical-core.js before mortgage-engine.js to enable getCanonicalRecords().');
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
        { key: 'loan_files', type: 'mtg_loan_file',           idField: 'loan_id',       ownerField: 'owner', statusField: 'stage', warRoom: '/html/war-rooms/mortgage/mortgage-war-room.html' },
        { key: 'conditions', type: 'mtg_uw_condition',        idField: 'condition_id',  ownerField: null,    statusField: 'stage', warRoom: '/html/war-rooms/mortgage/mortgage-war-room.html' },
        { key: 'exceptions', type: 'mtg_compliance_exception',idField: 'exception_id',  ownerField: null,    statusField: 'stage', warRoom: '/html/war-rooms/mortgage/mortgage-war-room.html' }
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
            vertical: 'mtg',
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

    /* ---------- Enterprise capability enrichment ----------
       Wires a single loan file into the shared 10-capability
       enterprise engine (server/enterprise/) the other verticals
       already use — the same POST /api/enterprise/enrich endpoint,
       with a REAL context built from this loan's own data (no
       `demo` key, so the server treats it as a real document, per
       enterprise-router.js's resolveContext()).

       Field mapping to the capability modules' trigger fields:
         customer   <- borrower                (crm)
         contract   <- the loan file itself     (o2c)
         approval   <- open (non-cleared) conditions for this loan (approval)
         compliance <- open (non-remediated) exceptions for this loan (governance)
         project    <- the loan file's pipeline stage (wip)
       mdm always fires regardless of context — see mdm.js / mdm-engine.js,
       its anomaly detection is a static stub, not loan-specific. */

    buildEnrichmentContext(loanId) {
      const loan = this.data.loan_files.find(l => l.loan_id === loanId);
      if (!loan) return null;

      const openConditions = this.data.conditions.filter(
        c => c.loan_id === loanId && c.stage !== 'cleared'
      );
      const openExceptions = this.data.exceptions.filter(
        e => e.loan_id === loanId && e.stage !== 'remediated'
      );

      const context = {
        vertical: 'mortgage',
        entity: loan.borrower,
        documentType: 'Loan File',
        customer: { id: loan.loan_id, name: loan.borrower },
        contract: { id: loan.loan_id, program: loan.program, amount: loan.loan_amount },
        project: { id: loan.loan_id, stage: loan.stage }
      };

      if (openConditions.length) {
        const c = openConditions[0];
        context.approval = { id: c.condition_id, description: c.description };
      }

      if (openExceptions.length) {
        const e = openExceptions[0];
        context.compliance = { id: e.exception_id, type: e.type, severity: e.severity };
      }

      return context;
    }

    async runEnterpriseEnrichment(loanId) {
      const context = this.buildEnrichmentContext(loanId);
      if (!context) throw new Error('TSMMortgageEngine: unknown loan_id ' + loanId);

      const res = await fetch('/api/enterprise/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      if (!res.ok) throw new Error('Enterprise enrich endpoint returned ' + res.status);
      return res.json();
    }

    /* ---------- CRM: loan officer roster + workload ----------
       Non-mutating rollup of the open pipeline (same CLOSED_STAGES
       exclusion computeKpis uses) grouped by loan_officer_id, joined
       against the loan_officers roster in sample_data. */

    getLoanOfficers() {
      return this.data.loan_officers || [];
    }

    getLoanOfficerWorkload() {
      const CLOSED_STAGES = ['funded', 'denied'];
      const roster = this.data.loan_officers || [];
      const breaches = new Set(this.getSlaBreaches('loan_files').map(b => b.id));

      return roster.map(officer => {
        const loans = this.data.loan_files.filter(l => l.loan_officer_id === officer.officer_id);
        const openLoans = loans.filter(l => !CLOSED_STAGES.includes(l.stage));
        return {
          officer_id: officer.officer_id,
          name: officer.name,
          team: officer.team,
          channel: officer.channel,
          capacity: officer.capacity,
          open_loan_count: openLoans.length,
          utilization_pct: officer.capacity ? Math.round((openLoans.length / officer.capacity) * 1000) / 10 : null,
          pipeline_value: openLoans.reduce((sum, l) => sum + (l.loan_amount || 0), 0),
          loans_over_sla: loans.filter(l => breaches.has(l.loan_id)).length,
          loan_ids: loans.map(l => l.loan_id)
        };
      }).sort((a, b) => b.pipeline_value - a.pipeline_value);
    }

    /* ---------- CPQ: product catalog + rate-lock pricing ----------
       Rates always come from the model's product_catalog/rate_lock_options
       config, never hard-coded here — same pattern as getFinancialModel(). */

    getProductCatalog() {
      return this.model.product_catalog || null;
    }

    getRateLockOptions() {
      return this.model.rate_lock_options || null;
    }

    getRateLocks() {
      return this.data.rate_locks || [];
    }

    getActiveRateLocks() {
      const opts = this.getRateLockOptions();
      const extPct = opts && opts.extension_cost_per_day_pct != null ? opts.extension_cost_per_day_pct : 0;
      return (this.data.rate_locks || [])
        .filter(rl => rl.status === 'active')
        .map(rl => {
          const daysRemaining = rl.lock_days - Math.round((rl.locked_at_hours_ago || 0) / 24);
          return { ...rl, days_remaining: daysRemaining, at_risk: daysRemaining <= 5, extension_cost_per_day_pct: extPct };
        })
        .sort((a, b) => a.days_remaining - b.days_remaining);
    }

    /** Quotes a rate for a program + lock period from the product catalog
     *  and rate_lock_options config — this is the CPQ "quote" primitive;
     *  it does not create a rate_lock record, just prices one. */
    quoteRateLock(program, lockDays) {
      const catalog = this.getProductCatalog();
      const lockOpts = this.getRateLockOptions();
      if (!catalog || !lockOpts) return null;

      const productDef = (catalog.programs || []).find(p => p.program === program);
      const periodDef = (lockOpts.lock_periods || []).find(p => p.days === lockDays);
      if (!productDef || !periodDef) return null;

      const quotedRate = Math.round((productDef.base_rate_pct + periodDef.rate_adder_pct) * 1000) / 1000;
      return {
        program,
        label: productDef.label,
        lock_days: lockDays,
        lock_label: periodDef.label,
        base_rate_pct: productDef.base_rate_pct,
        rate_adder_pct: periodDef.rate_adder_pct,
        quoted_rate_pct: quotedRate,
        min_fico: productDef.min_fico,
        max_ltv_pct: productDef.max_ltv_pct,
        min_down_pct: productDef.min_down_pct,
        currency: catalog.currency || 'USD'
      };
    }

    /* ---------- Digital Twin: portfolio / servicing forecast ----------
       Projects the CURRENT open pipeline forward using the model's
       prepayment / default / servicing-cost assumptions. This is a
       planning projection, not a live MSR valuation. */

    getPortfolioForecast() {
      const fm = this.model.portfolio_forecast_model;
      if (!fm) return null;

      const CLOSED_STAGES = ['funded', 'denied'];
      const openLoans = this.data.loan_files.filter(l => !CLOSED_STAGES.includes(l.stage));
      const horizonMonths = fm.forecast_horizon_months || 12;
      const servicingCostPerLoan = fm.servicing_cost_per_loan_per_month || 0;

      const byProgram = {};
      openLoans.forEach(l => {
        if (!byProgram[l.program]) byProgram[l.program] = { program: l.program, loan_count: 0, upb: 0 };
        byProgram[l.program].loan_count += 1;
        byProgram[l.program].upb += (l.loan_amount || 0);
      });

      const programs = Object.values(byProgram).map(p => {
        const prepaySpeed = (fm.annual_prepayment_speed_pct || {})[p.program] || 0;
        const defaultRate = (fm.annual_default_rate_pct || {})[p.program] || 0;
        const horizonFraction = horizonMonths / 12;
        const projectedPrepaidUpb = Math.round(p.upb * (prepaySpeed / 100) * horizonFraction);
        const projectedDefaultedUpb = Math.round(p.upb * (defaultRate / 100) * horizonFraction);
        const projectedEndingUpb = Math.max(0, p.upb - projectedPrepaidUpb - projectedDefaultedUpb);
        const servicingCostHorizon = Math.round(p.loan_count * servicingCostPerLoan * horizonMonths);
        return {
          ...p,
          annual_prepayment_speed_pct: prepaySpeed,
          annual_default_rate_pct: defaultRate,
          projected_prepaid_upb: projectedPrepaidUpb,
          projected_defaulted_upb: projectedDefaultedUpb,
          projected_ending_upb: projectedEndingUpb,
          servicing_cost_over_horizon: servicingCostHorizon
        };
      }).sort((a, b) => b.upb - a.upb);

      return {
        horizon_months: horizonMonths,
        currency: this.getFinancialModel() ? this.getFinancialModel().currency : 'USD',
        total_upb: openLoans.reduce((s, l) => s + (l.loan_amount || 0), 0),
        total_projected_ending_upb: programs.reduce((s, p) => s + p.projected_ending_upb, 0),
        total_servicing_cost_over_horizon: programs.reduce((s, p) => s + p.servicing_cost_over_horizon, 0),
        programs,
        note: fm.note || null
      };
    }

    /* ---------- AI + relay (mirrors NOCEngine) ---------- */

    async runAnalysis() {
      const res = await fetch('/api/mortgage/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis: this.computeKpis(),
          loan_breaches: this.getSlaBreaches('loan_files'),
          conditions: this.data.conditions,
          exceptions: this.data.exceptions.filter(e => e.stage !== 'remediated')
        })
      });
      if (!res.ok) throw new Error('Mortgage analysis endpoint returned ' + res.status);
      return res.json();
    }

    buildRelayPayload(aiText) {
      return {
        vertical: 'mtg',
        timestamp: Date.now(),
        kpis: this.computeKpis(),
        loan_breaches: this.getSlaBreaches('loan_files'),
        loan_wip: this.getStageWip('loan_files'),
        financials: this.getFinancialSummary(),
        loan_officer_workload: this.getLoanOfficerWorkload(),
        active_rate_locks: this.getActiveRateLocks(),
        product_catalog: this.getProductCatalog(),
        portfolio_forecast: this.getPortfolioForecast(),
        records: {
          loan_files: this.data.loan_files,
          conditions: this.data.conditions,
          exceptions: this.data.exceptions,
          loan_officers: this.data.loan_officers,
          rate_locks: this.data.rate_locks
        },
        ai_summary: aiText || null,
        ts: Date.now()
      };
    }
  }

  global.TSMMortgageEngine = TSMMortgageEngine;
})(typeof window !== 'undefined' ? window : this);