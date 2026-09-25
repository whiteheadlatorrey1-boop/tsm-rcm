/* ============================================================
   TSM COLLEGE BURSAR ENGINE
   war-rooms/college-command/services/college-bursar-engine.js
   Mirrors college-finaid-engine.js's method shape
   (loadSampleData/computeKpis/getFinancialSummary/getAiAnalysis/
   buildRelayPayload), generalized across Bursar's two entity kinds
   (payment_plans, registration_holds). Second College domain to get real
   backend wiring, matching how Financial Aid was built first among its
   five peers.
   ============================================================ */

(function (global) {
  'use strict';

  const SAMPLE_PAYMENT_PLANS = [
    { plan_id: 'PP-4471', student_ref: 'S-88213', term: 'Fall 2026', severity: 'HIGH', days_past_due: 42, balance: 3120 },
    { plan_id: 'PP-4502', student_ref: 'S-88940', term: 'Fall 2026', severity: 'MEDIUM', days_past_due: 18, balance: 1450 },
    { plan_id: 'PP-4519', student_ref: 'S-89112', term: 'Fall 2026', severity: 'HIGH', days_past_due: 51, balance: 4780 },
    { plan_id: 'PP-4560', student_ref: 'S-89344', term: 'Fall 2026', severity: 'LOW', days_past_due: 6, balance: 610 }
  ];
  const SAMPLE_REGISTRATION_HOLDS = [
    { hold_id: 'H-2201', student_ref: 'S-88213', reason: 'Unpaid balance', severity: 'HIGH', days_active: 30, workflow_status: 'review_pending', owner: 'Bursar — Registration Holds' },
    { hold_id: 'H-2214', student_ref: 'S-89112', reason: 'Unpaid balance', severity: 'HIGH', days_active: 25, workflow_status: 'active', owner: 'Bursar — Registration Holds' },
    { hold_id: 'H-2233', student_ref: 'S-90021', reason: 'Missing enrollment agreement', severity: 'MEDIUM', days_active: 9, workflow_status: 'release_pending', owner: 'Bursar — Registration Holds' }
  ];

  const REGISTRATION_WORKFLOW_STATUSES = [
    'active',
    'review_pending',
    'release_pending',
    'released'
  ];

  class TSMCollegeBursarEngine {
    constructor() {
      this.data = { payment_plans: [], registration_holds: [] };
    }

    loadSampleData() {
      this.data.payment_plans = [...SAMPLE_PAYMENT_PLANS];
      this.data.registration_holds = [...SAMPLE_REGISTRATION_HOLDS];
    }

    loadRecords(entityKey, records) {
      if (!['payment_plans', 'registration_holds'].includes(entityKey)) {
        console.warn('TSMCollegeBursarEngine: unknown entity key', entityKey);
        return;
      }
      this.data[entityKey] = [...(this.data[entityKey] || []), ...records];
    }

    saveToStorage() {
      try {
        localStorage.setItem('TSM_COLLEGE_BURSAR_DATA', JSON.stringify(this.data));
        return true;
      } catch (e) {
        console.warn('TSMCollegeBursarEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_COLLEGE_BURSAR_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        this.data.payment_plans = Array.isArray(parsed.payment_plans) ? parsed.payment_plans : [];
        this.data.registration_holds = Array.isArray(parsed.registration_holds) ? parsed.registration_holds : [];
        return true;
      } catch (e) {
        console.warn('TSMCollegeBursarEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_COLLEGE_BURSAR_DATA'); } catch (e) { /* noop */ }
    }

    computeKpis() {
      const pastDuePlans = this.data.payment_plans.filter(p => (p.days_past_due || 0) > 30);
      const totalArBalance = this.data.payment_plans.reduce((sum, p) => sum + (p.balance || 0), 0);
      const openRegistrationHolds = this.data.registration_holds.filter(
        h => (h.workflow_status || 'active') !== 'released'
      );
      const registrationReviewPending = this.data.registration_holds.filter(
        h => h.workflow_status === 'review_pending'
      );
      const registrationReleasePending = this.data.registration_holds.filter(
        h => h.workflow_status === 'release_pending'
      );

      return {
        open_payment_plans: this.data.payment_plans.length,
        plans_past_due: pastDuePlans.length,
        total_ar_balance: totalArBalance,
        registration_holds_active: openRegistrationHolds.length,
        registration_holds_review_pending: registrationReviewPending.length,
        registration_holds_release_pending: registrationReleasePending.length
      };
    }

    getRegistrationWorkflowStatuses() {
      return [...REGISTRATION_WORKFLOW_STATUSES];
    }

    getCanonicalRecords() {
      const now = new Date().toISOString();
      const holds = this.data.registration_holds.map(h => {
        const workflowStatus = REGISTRATION_WORKFLOW_STATUSES.includes(h.workflow_status)
          ? h.workflow_status
          : 'active';

        const riskLevel = String(h.severity || 'LOW').toLowerCase();

        return {
          id: h.hold_id,
          type: 'col_registration_hold',
          vertical: 'college_bursar',
          owner: h.owner || 'Bursar — Registration Holds',
          status: workflowStatus,
          current_stage: workflowStatus,
          risk_level: ['low', 'medium', 'high', 'critical'].includes(riskLevel)
            ? riskLevel
            : 'low',
          sla_state: 'n/a',
          linked_war_room: '/html/war-rooms/college-command/college-bursar-command.html',
          created_at: h.created_at || now,
          updated_at: h.updated_at || now,

          hold_id: h.hold_id,
          student_ref: h.student_ref,
          reason: h.reason,
          severity: h.severity,
          days_active: Number(h.days_active || 0),
          workflow_status: workflowStatus
        };
      });

      return {
        payment_plans: this.data.payment_plans,
        registration_holds: holds
      };
    }

    // Financial exposure is computed server-side against a private rate
    // card (server/private-config/college/bursar-financial-model.json),
    // never shipped to the browser — see routes/college-bursar-financial.js.
    async getFinancialSummary() {
      try {
        const res = await fetch('/api/college/bursar/financial-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kpis: this.computeKpis(),
            payment_plans: this.data.payment_plans,
            registration_holds: this.data.registration_holds
          })
        });
        if (!res.ok) throw new Error('financial-summary endpoint returned ' + res.status);
        return res.json();
      } catch (e) {
        console.warn('TSMCollegeBursarEngine: getFinancialSummary failed, falling back to balance-only totals', e);
        const totalArBalance = this.computeKpis().total_ar_balance;
        return {
          currency: 'USD',
          late_fee_exposure_total: 0,
          late_fee_exposure_items: [],
          writeoff_risk_exposure_total: 0,
          writeoff_risk_exposure_items: [],
          hold_revenue_at_risk_total: 0,
          hold_revenue_at_risk_items: [],
          total_ar_balance: totalArBalance,
          total_exposure: totalArBalance,
          note: 'Financial summary unavailable — showing raw AR balance only, no late-fee/write-off/hold-revenue modeling.',
          late_fee_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' },
          writeoff_risk_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' },
          hold_revenue_confidence: { confidence: 0, note: ' Financial summary endpoint unreachable.' }
        };
      }
    }

    // Real Groq-backed collections analysis — see
    // routes/college-bursar-financial.js's POST /analysis. Same try/catch
    // shape as getFinancialSummary() above: the endpoint itself is already
    // resilient (always 200, degraded flag instead of throwing), but the
    // fetch itself can still fail (network, route unmounted, etc.), so
    // this still needs its own fallback message rather than letting the
    // war room page's await throw uncaught.
    async getAiAnalysis(context) {
      try {
        const res = await fetch('/api/college/bursar/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kpis: this.computeKpis(),
            payment_plans: this.data.payment_plans,
            registration_holds: this.data.registration_holds,
            context: context || undefined
          })
        });
        if (!res.ok) throw new Error('analysis endpoint returned ' + res.status);
        const data = await res.json();
        return { answer: data.answer || 'No response.', degraded: !!data.degraded };
      } catch (e) {
        console.warn('TSMCollegeBursarEngine: getAiAnalysis failed', e);
        return { answer: 'AI analysis unavailable — ' + e.message, degraded: true };
      }
    }

    // Relay payload written to TSM_COLLEGE_BURSAR_RELAY (registered in
    // relay.core.js's RELAY_REGISTRY under domain key COLLEGE_BURSAR).
    // Shape mirrors college-finaid-engine.js's buildRelayPayload() so
    // college-strategist.html's aggregator can list/sort alerts across all
    // five college domains without per-domain special-casing.
    async buildRelayPayload(aiText) {
      return {
        vertical: 'college_bursar',
        domain: 'COLLEGE_BURSAR',
        timestamp: Date.now(),
        kpis: this.computeKpis(),
        financials: await this.getFinancialSummary(),
        records: {
          payment_plans: this.data.payment_plans,
          registration_holds: this.data.registration_holds
        },
        canonical_records: this.getCanonicalRecords(),
        registration_workflow_statuses: this.getRegistrationWorkflowStatuses(),
        ai_summary: aiText || null
      };
    }
  }

  global.TSMCollegeBursarEngine = TSMCollegeBursarEngine;
})(typeof window !== 'undefined' ? window : this);
