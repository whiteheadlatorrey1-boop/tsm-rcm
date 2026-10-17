'use strict';
const eng = require('../lib/construction-recovery.js');

// Mounts the Ameris recovery routes onto the existing construction router.
// Decisions and audit entries are in memory for now; swap the two stores
// below for your real DB / audit module when ready.
module.exports = function mountConstructionRecovery({ router, requireAnyAuth, groqChat, getActor }) {
  const data = eng.buildAmerisSeed();
  const recommended = new Map(eng.decideChangeOrders(data.changeOrders).map(d => [d.id, d]));
  const decisions = new Map();
  const audit = [];
  const VALID = ['approve', 'reject', 'escalate', 'defer'];
  const actorOf = req => (getActor && getActor(req)) || (req.session && req.session.role) || 'session';
  const money = n => '$' + Number(n).toLocaleString('en-US');
  const log = entry => audit.push(Object.assign({ ts: new Date().toISOString() }, entry));

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

  // Gated write-back: nothing is recorded without confirm:true, and
  // overriding the engine's recommendation also needs a written reason.
  router.post('/api/construction/decisions', requireAnyAuth, (req, res) => {
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
    const record = { coId, decision, recommended: rec.decision, override, note: hasNote ? note.trim() : null, actor: actorOf(req), ts: new Date().toISOString() };
    decisions.set(coId, record);
    log({ action: 'change_order_decision', coId, decision, recommended: rec.decision, override, actor: record.actor, note: record.note });
    res.json({ ok: true, decision: record });
  });

  router.get('/api/construction/audit', requireAnyAuth, (req, res) => {
    res.json({ ok: true, count: audit.length, entries: audit });
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

  // Draft only: never sends or approves anything. Without a Groq key, or if
  // Groq fails, returns a template built from the seed data (grounded:false).
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
    log({ action: 'draft_generated', type, id, grounded, actor: actorOf(req) });
    res.json({ ok: true, draft: { type, id, text: grounded ? text : fallbackDraft(type, item), grounded } });
  });
};
