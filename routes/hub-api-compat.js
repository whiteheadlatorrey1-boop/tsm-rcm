'use strict';
// Endpoints that hub pages already call but that had no server handler (every call 404'd and
// the pages silently fell back to "relay unavailable"). All routes require a session, like
// /api/chat and /api/audit, because the first two spend Groq credits.
//
//   POST /api/groq                        copilot.html
//   POST /api/finance/query               financial-ui, legal-account, tsm-finops-pitch
//   POST /api/finops/workpaper-push       finops-operations.html
//   GET  /api/finops/workpapers           read side for the pushes above
//   POST /api/wip/finops/accrual-recon    financial-ui.html (logic lives in wip-handlers.js)
//   GET  /api/auth/me                     re-exec-portal.html (approve buttons need {id, name, role})
//   GET  /api/auth/me                     re-exec-portal.html (approve buttons need {id, name, role})
const express = require('express');
const { requireAnyAuth } = require('../middleware/require-auth');
const { finopsAccrualRecon } = require('../wip-handlers');

const router = express.Router();
const json = express.json({ limit: '2mb' });
const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = () => process.env.TSM_MODEL || 'openai/gpt-oss-120b';

async function groq(messages, maxTokens) {
  const key = process.env.GROQ_API_KEY;
  if (!key) { const e = new Error('GROQ_API_KEY not set'); e.status = 503; throw e; }
  const r = await fetch(GROQ_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL(), messages, temperature: 0.3, max_tokens: maxTokens || 1024 })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((d.error && d.error.message) || 'Groq error'); e.status = 502; throw e; }
  const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  if (!text) { const e = new Error('No completion returned'); e.status = 502; throw e; }
  return text;
}
const fail = (res, e) => res.status(e.status || 500).json({ ok: false, error: e.message });

// copilot.html sends { query } and reads data.output; the older { messages, system } shape
// (groq-route.js) is still accepted. Both reply keys are returned.
router.post('/api/groq', requireAnyAuth, json, async (req, res) => {
  const { messages, system, query } = req.body || {};
  let msgs;
  if (Array.isArray(messages) && messages.length) msgs = system ? [{ role: 'system', content: String(system) }, ...messages] : messages;
  else if (typeof query === 'string' && query.trim()) msgs = [{ role: 'user', content: query }];
  else return res.status(400).json({ ok: false, error: 'query or messages required' });
  try { const t = await groq(msgs); res.json({ ok: true, output: t, content: t }); }
  catch (e) { fail(res, e); }
});

// Pages send { payload: { sector, node, context, ... } } and read d.reply || d.content.
const FINANCE_SYSTEM = 'You are the TSM FinOps Strategist. You are given a sector, a node label and a request, ' +
  'but NOT the organization\'s ledger or source documents. Give a concise executive framework (risks, owners, next ' +
  'actions) and state plainly what data you would need to verify. Do not invent figures.';
router.post('/api/finance/query', requireAnyAuth, json, async (req, res) => {
  const p = (req.body && req.body.payload) || null;
  if (!p || typeof p !== 'object') return res.status(400).json({ ok: false, error: 'payload required' });
  const prompt = ['sector', 'node', 'context'].filter(k => p[k]).map(k => `${k}: ${p[k]}`).join('\n') +
    (p.executive ? '\nAudience: executive. Lead with the headline.' : '');
  try { const t = await groq([{ role: 'system', content: FINANCE_SYSTEM }, { role: 'user', content: prompt || 'Provide a FinOps briefing.' }]); res.json({ ok: true, reply: t, content: t }); }
  catch (e) { fail(res, e); }
});

// In-memory (lost on restart). Newest first, capped. Swap for the real store when one exists.
const WORKPAPERS = [];
router.post('/api/finops/workpaper-push', requireAnyAuth, json, (req, res) => {
  const b = req.body || {};
  if (!b.workpaperId || !b.workpaperType) return res.status(400).json({ ok: false, error: 'workpaperId and workpaperType required' });
  const rec = {
    id: `WP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    workpaperId: String(b.workpaperId), workpaperType: String(b.workpaperType),
    preparedBy: String(b.preparedBy || ''), reviewedBy: String(b.reviewedBy || ''),
    summary: b.summary == null ? '' : b.summary, payload: b.payload == null ? null : b.payload,
    clientTs: b.ts || null, receivedAt: new Date().toISOString(),
    pushedBy: (req.tsmSession && (req.tsmSession.label || req.tsmSession.role)) || null
  };
  WORKPAPERS.unshift(rec); if (WORKPAPERS.length > 200) WORKPAPERS.length = 200;
  res.json({ ok: true, id: rec.id });
});
router.get('/api/finops/workpapers', requireAnyAuth, (req, res) => res.json({ ok: true, workpapers: WORKPAPERS }));

router.post('/api/wip/finops/accrual-recon', requireAnyAuth, json, async (req, res) => {
  try { res.json(await finopsAccrualRecon(req.body || {})); } catch (e) { fail(res, e); }
});

// The caller's own session claims, so an approval can be attributed. Read-only; 401 without a session.
router.get('/api/auth/me', requireAnyAuth, (req, res) => {
  const t = req.tsmSession || {};
  const id = t.staffId || t.clientId || t.label || t.role;
  res.json({ ok: true, id, name: t.label || t.staffId || t.clientId || t.role, role: t.role, staffId: t.staffId || null, clientId: t.clientId || null, tenantId: t.tenantId || null });
});

// The caller's own session claims, so an approval can be attributed. Read-only; 401 without a session.
router.get('/api/auth/me', requireAnyAuth, (req, res) => {
  const t = req.tsmSession || {};
  const id = t.staffId || t.clientId || t.label || t.role;
  res.json({ ok: true, id, name: t.label || t.staffId || t.clientId || t.role, role: t.role, staffId: t.staffId || null, clientId: t.clientId || null, tenantId: t.tenantId || null });
});

module.exports = router;
