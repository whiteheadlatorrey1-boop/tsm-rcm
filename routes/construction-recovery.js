'use strict';
const eng = require('../lib/construction-recovery.js');
const defaultAuditStore = require('../server/construction-recovery/audit-store.js');

// Mounts the Ameris recovery routes onto the existing construction router.
// Audit is durable and fail-closed: a change-order decision is only recorded
// after its audit entry has been written. Decision state itself is still
// in memory (resets on restart); the audit trail is what persists.
module.exports = function mountConstructionRecovery({ router, requireAnyAuth, groqChat, getActor, auditStore }) {
  const audit = auditStore || defaultAuditStore;
  const data = eng.buildAmerisSeed();
  const recommended = new Map(eng.decideChangeOrders(data.changeOrders).map(d => [d.id, d]));
  const decisions = new Map();
  const VALID = ['approve', 'reject', 'escalate', 'defer'];
  // requireAnyAuth puts the signed session on req.tsmSession (not req.session).
  const sess = req => req.tsmSession || {};
  const actorOf = req => (getActor && getActor(req)) || sess(req).label || sess(req).staffId || sess(req).role || 'unknown';
  // Recording decisions and reading who made them is staff-only: a BPO client
  // access code is also a valid session and must not be able to approve change orders.
  const STAFF_ROLES = ['admin', 'manager', 'analyst'];
  const staffOnly = (req, res) => {
    if (STAFF_ROLES.includes(sess(req).role)) return false;
    res.status(403).json({ ok: false, error: 'staff_only' });
    return true;
  };
  const money = n => '$' + Number(n).toLocaleString('en-US');

  router.get('/api/construction/recovery', requireAnyAuth, (req, res) => {
    const ranked = eng.rankExposures(data);
    res.json({
      ok: true,
      project: data.project,
      schedule: eng.scheduleVariance(data.project),
      forecast: {
        before: eng.forecastAtCompletion(data.project, []),
        after: eng.forecastAtCompletion(data.project, eng.RECOVERY_PLAN)
      },
      recoveryPlan: eng.RECOVERY_PLAN,
      exposureCount: ranked.length,
      topExposures: ranked.slice(0, 10),
      changeOrders: data.changeOrders.map(c => Object.assign({}, c, {
        recommendation: recommended.get(c.id),
        decision: decisions.get(c.id) || null
      }))
    });
  });

  // Gated write-back: needs confirm:true, an override needs a written reason,
  // and the audit entry must be written before the decision is recorded.
  router.post('/api/construction/decisions', requireAnyAuth, (req, res) => {
    if (staffOnly(req, res)) return;
    const { coId, decision, confirm, note } = req.body || {};
    const rec = recommended.get(coId);
    if (!rec) return res.status(404).json({ ok: false, error: 'unknown_change_order' });
    if (!VALID.includes(decision)) return res.status(400).json({ ok: false, error: 'invalid_decision', valid: VALID });
    if (decisions.has(coId)) return res.status(409).json({ ok: false, error: 'already_decided' });
    const override = decision !== rec.decision;
    const hasNote = typeof note === 'string' && note.trim().length >= 10;
    if (confirm !== true || (override && !hasNote)) {
      return res.status(409).json({
        ok: false,
        error: 'confirmation_required',
        recommended: rec,
        override,
        needs: override ? 'confirm:true and a note of 10+ characters explaining the override' : 'confirm:true'
      });
    }
    const actor = actorOf(req);
    try {
      audit.recordAudit({
        eventType: 'CHANGE_ORDER_DECISION',
        actor,
        entityId: coId,
        decisionId: coId + ':' + decision,
        before: { status: 'pending', recommended: rec.decision },
        after: { status: decision, override },
        metadata: { project: data.project.id, note: hasNote ? note.trim() : null, reason: rec.reason }
      });
    } catch (e) {
      return res.status(503).json({ ok: false, error: 'audit_unavailable', detail: e.code || 'AUDIT_WRITE_FAILED' });
    }
    const record = { coId, decision, recommended: rec.decision, override, note: hasNote ? note.trim() : null, actor, ts: new Date().toISOString() };
    decisions.set(coId, record);
    res.json({ ok: true, decision: record });
  });

  router.get('/api/construction/audit', requireAnyAuth, (req, res) => {
    if (staffOnly(req, res)) return;
    try {
      res.json({ ok: true, count: audit.countAudit(), entries: audit.listAudit({ limit: 200 }) });
    } catch (e) {
      res.status(503).json({ ok: false, error: 'audit_unavailable', detail: e.code || 'AUDIT_READ_FAILED' });
    }
  });

  function fallbackDraft(type, item) {
    if (type === 'change_order') {
      return 'CHANGE ORDER DRAFT: ' + item.id + ' - ' + item.title + '\n' +
        'Cost impact: ' + money(item.amount) + '. Schedule impact: ' + item.days + ' business days' +
        (item.criticalPath ? ' (critical path)' : '') + '.\n' +
        'Cause: ' + item.cause + '. Please review pricing backup and route for owner approval.';
    }
    return 'RFI RESPONSE DRAFT: ' + item.id + ' - ' + item.subject + '\n' +
      'Trade: ' + item.trade + ', spec section ' + item.specSection + '. Open ' + item.daysOpen + ' days' +
      (item.criticalPath ? ' (critical path)' : '') + '.\n' +
      'Estimated cost impact ' + money(item.costImpact) + '. Design team to confirm and respond.';
  }

  // Draft only: never sends or approves anything. Logging is best-effort here
  // because a draft changes no state; decisions above are the gated action.
  router.post('/api/construction/draft', requireAnyAuth, async (req, res) => {
    const { type, id } = req.body || {};
    const item = type === 'change_order' ? data.changeOrders.find(c => c.id === id)
      : type === 'rfi' ? data.rfis.find(r => r.id === id) : null;
    if (!item) return res.status(404).json({ ok: false, error: 'unknown_item' });
    let text = null;
    if (process.env.GROQ_API_KEY) {
      try {
        const out = await groqChat(
          'You are a construction project controls assistant. Draft concise, professional documents. Use only the facts given.',
          'Draft a ' + (type === 'change_order' ? 'change order request' : 'RFI response') + ' from these facts: ' + JSON.stringify(item),
          600
        );
        if (out && String(out).trim()) text = String(out).trim();
      } catch (e) { /* fall through to template */ }
    }
    const grounded = text !== null;
    try {
      audit.recordAudit({ eventType: 'DRAFT_GENERATED', actor: actorOf(req), entityId: id, metadata: { type, grounded } });
    } catch (e) { /* best-effort */ }
    res.json({ ok: true, draft: { type, id, text: grounded ? text : fallbackDraft(type, item), grounded } });
  });
};
