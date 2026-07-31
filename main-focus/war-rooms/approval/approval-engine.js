/* TSM Approval Engine v1.0
   Handles multi-level approval pipeline, SLA breach detection, escalation
   flags, delegation checks, AI analysis, and strategist relay.
   Loaded by approval-war-room.html after canonical-core.js */

class TSMApprovalEngine {
  constructor(model) {
    this.model = model || {};
    this.requests = [];
    this._storageKey = 'TSM_APPROVAL_STATE';
  }

  /* ── Persistence ────────────────────────────────────────────────────────── */
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return false;
      const s = JSON.parse(raw);
      this.requests = s.requests || [];
      return this.requests.length > 0;
    } catch (e) { return false; }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this._storageKey,
        JSON.stringify({ requests: this.requests, savedAt: Date.now() }));
    } catch (e) { console.warn('[TSMApprovalEngine] localStorage write failed', e); }
  }

  clearStorage() {
    try { localStorage.removeItem(this._storageKey); } catch (e) {}
    this.requests = [];
  }

  loadSampleData() {
    const sd = this.model.sample_data || {};
    this.requests = (sd.requests || []).map(r => ({ ...r }));
  }

  /* ── KPI Computation ────────────────────────────────────────────────────── */
  computeKpis() {
    const total = this.requests.length;
    const pending = this.requests.filter(r => !['Approved', 'Rejected'].includes(r.stage)).length;
    const escalated = this.requests.filter(r => r.stage === 'Escalated').length;
    const slaBreachCount = this.getSlaBreaches().length;
    const decided = this.requests.filter(r => ['Approved', 'Rejected'].includes(r.stage));
    const approved = decided.filter(r => r.stage === 'Approved').length;
    const approvalRate = decided.length
      ? Math.round((approved / decided.length) * 1000) / 10
      : 0;
    const withCycle = decided.filter(r => r.submitted_at && r.decided_at);
    const avgCycleHours = withCycle.length
      ? Math.round(withCycle.reduce((s, r) =>
          s + (new Date(r.decided_at).getTime() - new Date(r.submitted_at).getTime()) / 3_600_000, 0)
          / withCycle.length * 10) / 10
      : 0;
    return {
      total_requests: total,
      pending_requests: pending,
      escalated_count: escalated,
      sla_breach_count: slaBreachCount,
      approval_rate_pct: approvalRate,
      avg_cycle_hours: avgCycleHours
    };
  }

  getStageDistribution() {
    const stages = (this.model.entities?.approval_request?.stages || []);
    const dist = {};
    stages.forEach(s => { dist[s.id] = { count: 0, label: s.label }; });
    this.requests.forEach(r => {
      const s = stages.find(st => st.label === r.stage);
      if (s) dist[s.id].count++;
    });
    return dist;
  }

  /* ── SLA / Attention ────────────────────────────────────────────────────── */
  getSlaBreaches() {
    const slaHours = this.model.thresholds?.sla_hours || {};
    const now = Date.now();
    return this.requests
      .filter(r => !['Approved', 'Rejected'].includes(r.stage) && r.submitted_at)
      .map(r => {
        const limit = slaHours[r.type] || 24;
        const elapsedHrs = (now - new Date(r.submitted_at).getTime()) / 3_600_000;
        const over = elapsedHrs - limit;
        return over > 0
          ? { request_id: r.request_id, stage: r.stage, hours_over: Math.round(over) }
          : null;
      })
      .filter(Boolean);
  }

  getAttentionFlags() {
    const flags = [];
    this.getSlaBreaches().forEach(b =>
      flags.push({ id: b.request_id, type: 'sla_breach', detail: `${b.hours_over}h over SLA in ${b.stage}` }));
    this.requests.filter(r => r.stage === 'Escalated').forEach(r =>
      flags.push({ id: r.request_id, type: 'escalated', detail: `${r.type} escalated — approver ${r.approver}` }));
    return flags;
  }

  /* ── Search / Filter ────────────────────────────────────────────────────── */
  search(term) {
    if (!term) return this.requests;
    const t = term.toLowerCase();
    return this.requests.filter(r =>
      (r.request_id || '').toLowerCase().includes(t) ||
      (r.type || '').toLowerCase().includes(t) ||
      (r.requestor || '').toLowerCase().includes(t) ||
      (r.approver || '').toLowerCase().includes(t)
    );
  }

  /* ── Delegation / Escalation Check ──────────────────────────────────────── */
  checkDelegation(approver) {
    const approvers = this.model.sample_data?.approvers || [];
    const info = approvers.find(a => a.name === approver);
    if (!info) {
      return { on_leave: false, message: `No delegation record found for ${approver}.` };
    }
    if (info.on_leave) {
      return {
        on_leave: true,
        message: `${approver} is currently on leave. Requests are being delegated to ${info.delegate_to || 'their manager'}.`
      };
    }
    return { on_leave: false, message: `${approver} is active and handling their own approval queue.` };
  }

  /* ── Explainability ─────────────────────────────────────────────────────── */
  getExplainItems() {
    const items = [];
    const byId = {};
    this.requests.forEach(r => { byId[r.request_id] = r; });

    this.getSlaBreaches().forEach(b => {
      const r = byId[b.request_id] || {};
      const amount = r.amount || 0;
      const severity = amount >= 50000 ? 'high' : (b.hours_over > 48 ? 'high' : (amount >= 10000 ? 'med' : 'low'));
      items.push({
        id: 'req-' + b.request_id,
        claim: `${b.request_id} (${r.type || 'request'}${amount ? ', $' + amount.toLocaleString() : ''}) is ${b.hours_over}h over SLA in "${b.stage}"`,
        confidence: 95,
        severity,
        impact: amount ? ('$' + amount.toLocaleString() + ' held up pending approval') : '',
        rationale: `Submitted ${r.submitted_at || 'unknown date'} as a "${r.type || 'request'}", carrying a defined SLA window for that type. ` +
          `It has been sitting in "${b.stage}" for ${b.hours_over}h past that window. Approver on record: ${r.approver || 'Unassigned'}.`,
        sources: ['Approval request record ' + b.request_id],
        dataPoints: [
          { label: 'Requestor', value: r.requestor || '\u2014' },
          { label: 'Approver', value: r.approver || 'Unassigned' },
          { label: 'Amount', value: amount ? '$' + amount.toLocaleString() : '\u2014' },
          { label: 'Hours over SLA', value: b.hours_over + 'h' }
        ]
      });
    });

    this.requests.filter(r => r.stage === 'Escalated').forEach(r => {
      const delegation = this.checkDelegation(r.approver);
      const amount = r.amount || 0;
      items.push({
        id: 'esc-' + r.request_id,
        claim: `${r.request_id} (${r.type || 'request'}) is escalated` + (amount ? ` with $${amount.toLocaleString()} pending` : ''),
        confidence: 90,
        severity: amount >= 50000 ? 'high' : 'med',
        impact: delegation.on_leave ? `Routed to delegate \u2014 approver ${r.approver} is on leave` : (amount ? '$' + amount.toLocaleString() + ' awaiting escalated review' : ''),
        rationale: `"${r.type || 'This request'}" was escalated to ${r.approver || 'an approver'}. ${delegation.message}`,
        sources: ['Approval request record ' + r.request_id],
        dataPoints: [
          { label: 'Requestor', value: r.requestor || '\u2014' },
          { label: 'Approver', value: r.approver || 'Unassigned' },
          { label: 'On leave', value: delegation.on_leave ? 'Yes \u2014 delegated' : 'No' },
          { label: 'Amount', value: amount ? '$' + amount.toLocaleString() : '\u2014' }
        ]
      });
    });

    const rank = { high: 0, med: 1, low: 2 };
    return items.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
  }

  /* ── AI Analysis ────────────────────────────────────────────────────────── */
  async runAnalysis() {
    const kpis = this.computeKpis();
    const attention_flags = this.getAttentionFlags();
    const stage_distribution = this.getStageDistribution();
    const res = await fetch('/api/approval/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: this.requests, kpis, attention_flags,
                             stage_distribution, maxTokens: 1200 })
    });
    const raw = await res.text();
    if (!res.ok || raw.trim().startsWith('<')) {
      throw new Error(`/api/approval/query returned non-JSON (status ${res.status}): ${raw.slice(0, 120)}`);
    }
    return JSON.parse(raw);
  }

  /* ── Strategist Relay ───────────────────────────────────────────────────── */
  buildRelayPayload(aiText) {
    return {
      vertical: 'approval',
      requests: this.requests,
      kpis: this.computeKpis(),
      attention_flags: this.getAttentionFlags(),
      explain: this.getExplainItems(),
      ai_analysis: aiText,
      timestamp: new Date().toISOString()
    };
  }
}

// expose globally
window.TSMApprovalEngine = TSMApprovalEngine;
