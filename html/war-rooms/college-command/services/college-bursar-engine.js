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

  // Seat inventory per section. held_students = students with an open
  // registration hold who are targeting that section (demand that cannot
  // convert until the hold clears).
  const SAMPLE_SEAT_SECTIONS = [
    { section_id: 'BIO-201-01', course: 'BIO 201', capacity: 30, enrolled: 30, waitlist: 9, held_students: 2 },
    { section_id: 'MTH-140-02', course: 'MTH 140', capacity: 40, enrolled: 38, waitlist: 4, held_students: 1 },
    { section_id: 'ENG-101-05', course: 'ENG 101', capacity: 25, enrolled: 16, waitlist: 0, held_students: 0 }
  ];

  // Operational defaults, not regulatory values: max days a hold may sit in
  // each workflow status before it counts as an SLA breach, and the seat
  // utilization at which a waitlisted section counts as a bottleneck.
  // Configure to match the institution's registrar/bursar service levels.
  const REGISTRATION_SLA_DAYS = { active: 21, review_pending: 5, release_pending: 2 };
  const SEAT_BOTTLENECK_UTILIZATION = 0.95;

  const REGISTRATION_WORKFLOW_STATUSES = [
    'active',
    'review_pending',
    'release_pending',
    'released'
  ];

  class TSMCollegeBursarEngine {
    constructor() {
      this.data = { payment_plans: [], registration_holds: [], seat_sections: [] };
    }

    loadSampleData() {
      this.data.payment_plans = [...SAMPLE_PAYMENT_PLANS];
      this.data.registration_holds = [...SAMPLE_REGISTRATION_HOLDS];
      this.data.seat_sections = [...SAMPLE_SEAT_SECTIONS];
    }

    loadRecords(entityKey, records) {
      if (!['payment_plans', 'registration_holds', 'seat_sections'].includes(entityKey)) {
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
        this.data.seat_sections = Array.isArray(parsed.seat_sections) ? parsed.seat_sections : [];
        return true;
      } catch (e) {
        console.warn('TSMCollegeBursarEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_COLLEGE_BURSAR_DATA'); } catch (e) { /* noop */ }
    }

    // A hold breaches SLA when days_active exceeds the allowance for its
    // current workflow status. Released holds are closed and never breach.
    getSlaBreaches(entityKey) {
      if (entityKey !== 'registration_holds') return [];
      return (this.data.registration_holds || [])
        .map(h => {
          const status = REGISTRATION_WORKFLOW_STATUSES.includes(h.workflow_status) ? h.workflow_status : 'active';
          const allowed = REGISTRATION_SLA_DAYS[status];
          if (allowed == null) return null;
          const days = Number(h.days_active || 0);
          if (days <= allowed) return null;
          return { id: h.hold_id, stage: status, days_active: days, sla_days: allowed, days_over: days - allowed, record: h };
        })
        .filter(Boolean)
        .sort((a, b) => b.days_over - a.days_over);
    }

    // A section is a bottleneck when it is at/above the utilization
    // threshold and has a waitlist. demand_blocked_by_holds counts waitlisted
    // + held students who cannot take an open seat until their hold clears.
    getSeatBottlenecks() {
      return (this.data.seat_sections || [])
        .map(sec => {
          const capacity = Number(sec.capacity || 0);
          if (capacity <= 0) return null;
          const enrolled = Number(sec.enrolled || 0);
          const waitlist = Number(sec.waitlist || 0);
          const utilization = enrolled / capacity;
          if (utilization < SEAT_BOTTLENECK_UTILIZATION || waitlist <= 0) return null;
          return {
            id: sec.section_id,
            course: sec.course,
            utilization: Math.round(utilization * 1000) / 1000,
            seats_open: Math.max(0, capacity - enrolled),
            waitlist,
            held_students: Number(sec.held_students || 0),
            record: sec
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.waitlist - a.waitlist);
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
        registration_holds_release_pending: registrationReleasePending.length,
        registration_holds_over_sla: this.getSlaBreaches('registration_holds').length,
        seat_bottleneck_sections: this.getSeatBottlenecks().length
      };
    }

    getRegistrationWorkflowStatuses() {
      return [...REGISTRATION_WORKFLOW_STATUSES];
    }

    getCanonicalRecords() {
      const now = new Date().toISOString();
      const breachedIds = new Set(this.getSlaBreaches('registration_holds').map(b => b.id));
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
          sla_state: breachedIds.has(h.hold_id) ? 'breached' : 'ok',
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
            registration_holds: this.data.registration_holds,
            seat_sections: this.data.seat_sections
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
          registration_holds: this.data.registration_holds,
          seat_sections: this.data.seat_sections
        },
        registration_sla_breaches: this.getSlaBreaches('registration_holds'),
        seat_bottlenecks: this.getSeatBottlenecks(),
        canonical_records: this.getCanonicalRecords(),
        registration_workflow_statuses: this.getRegistrationWorkflowStatuses(),
        ai_summary: aiText || null
      };
    }
  }

  global.TSMCollegeBursarEngine = TSMCollegeBursarEngine;
})(typeof window !== 'undefined' ? window : this);
