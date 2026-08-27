'use strict';
/**
 * Enterprise Capability Bridge
 * --------------------------------------------------------------------------
 * Standalone router module (no dependency on server.js's local groqChat/SP —
 * same pattern as routes/music.js). Adds:
 *
 *  1. Five session-persisted in-memory stores for the phases that previously
 *     had no persistence at all (O2C, CRM, CPQ, Catalog, Approval), mirroring
 *     the GOVERNANCE_AUDIT_LOG / GOVERNANCE_RISK_REGISTER pattern in server.js
 *     (in-memory array + generic id() + POST create + GET list). Approval
 *     additionally gets a HITL approve/reject gate via the same
 *     html/shared/tsm-hitl-gate.js factory governance already uses.
 *
 *  2. POST /api/enterprise/capability-sweep — the reference orchestrator.
 *     Given a case (vertical + caseId + title + summary + exposure +
 *     entities), it:
 *       - writes 5 real, case-linked records into the new stores
 *       - calls the existing /api/foundation/decision endpoint (self-fetch,
 *         same host) for each of those 5 phases to get real AI analysis
 *         grounded in the record just written
 *       - writes 2 more real records into the phases that already have
 *         genuine persistence with a generic create endpoint: Governance
 *         (POST /api/governance/risk) and WIP (POST /api/wip/task)
 *       - pulls read-only context (no fabricated writes) from the 3 phases
 *         that don't have a generic create path: MDM (/api/mdm/query with
 *         records: [] + context), Integration Hub (GET /api/integration/health),
 *         Digital Twin (GET /api/digital-twin/snapshot)
 *     ...then aggregates all 10 into one Enterprise Decision Package.
 *
 * Reference chain: BPO. Designed to be vertical-agnostic so the propagation
 * script for the other 9 chains only needs to change the seed inputs, not
 * this file.
 * ========================================================================== */

const express = require('express');
const router = express.Router();
const { createGate } = require('../html/shared/tsm-hitl-gate.js');
const tsmLedger = require('../server/tsm-ledger-service.js');
const { requireAnyAuth } = require('../middleware/require-auth');

// ── STORES ──────────────────────────────────────────────────────────────────
const O2C_ORDERS = [];
const CRM_RECORDS = [];
const CPQ_QUOTES = [];
const CATALOG_ITEMS = [];
const APPROVAL_REQUESTS = [];
// Backed by MongoDB via the same hitl_decisions collection + adapter
// Governance/Integration Hub/Exec Portal gates use in server.js -- see
// server/tsm-ledger-service.js hitlAdapter(). Falls back to in-memory-only
// (unchanged prior behavior) if MONGODB_URI isn't set.
const APPROVAL_HITL_GATE = createGate('APR', tsmLedger.hitlAdapter('APR'));
APPROVAL_HITL_GATE.hydrate().then(n => { if (n) console.log(`[HITL] APR gate hydrated ${n} prior decisions`); });
const RECENT_SWEEPS = new Map();
const RECENT_SWEEP_WINDOW_MS = 5 * 60 * 1000;
function sweepDedupKey(vertical, caseId) { return vertical + '|' + caseId; }

function ecbId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

// ── O2C ORDERS ───────────────────────────────────────────────────────────────
router.post('/api/o2c/orders', (req, res) => {
  const { caseId, vertical, orderRef, customer, amountAtRisk, status, notes } = req.body || {};
  if (!orderRef || !customer) return res.status(400).json({ ok: false, error: 'orderRef and customer required' });
  const order = {
    id: ecbId('o2c'), caseId: caseId || null, vertical: vertical || null,
    orderRef, customer, amountAtRisk: amountAtRisk || null,
    status: status || 'FROZEN', notes: notes || null, createdAt: Date.now()
  };
  O2C_ORDERS.push(order);
  res.json({ ok: true, order });
});
router.get('/api/o2c/orders', (req, res) => {
  const { caseId } = req.query;
  let orders = O2C_ORDERS;
  if (caseId) orders = orders.filter(o => o.caseId === caseId);
  res.json({ ok: true, orders });
});

// ── CRM RECORDS ──────────────────────────────────────────────────────────────
router.post('/api/crm/records', (req, res) => {
  const { caseId, vertical, accountName, relationshipType, riskFlag, notes } = req.body || {};
  if (!accountName) return res.status(400).json({ ok: false, error: 'accountName required' });
  const record = {
    id: ecbId('crm'), caseId: caseId || null, vertical: vertical || null,
    accountName, relationshipType: relationshipType || 'Customer',
    riskFlag: riskFlag || 'MEDIUM', notes: notes || null, createdAt: Date.now()
  };
  CRM_RECORDS.push(record);
  res.json({ ok: true, record });
});
router.get('/api/crm/records', (req, res) => {
  const { caseId } = req.query;
  let records = CRM_RECORDS;
  if (caseId) records = records.filter(r => r.caseId === caseId);
  res.json({ ok: true, records });
});

// ── CPQ QUOTES ───────────────────────────────────────────────────────────────
router.post('/api/cpq/quotes', (req, res) => {
  const { caseId, vertical, quoteRef, description, amount, status } = req.body || {};
  if (!quoteRef) return res.status(400).json({ ok: false, error: 'quoteRef required' });
  const quote = {
    id: ecbId('cpq'), caseId: caseId || null, vertical: vertical || null,
    quoteRef, description: description || null, amount: amount || null,
    status: status || 'DRAFT', createdAt: Date.now()
  };
  CPQ_QUOTES.push(quote);
  res.json({ ok: true, quote });
});
router.get('/api/cpq/quotes', (req, res) => {
  const { caseId } = req.query;
  let quotes = CPQ_QUOTES;
  if (caseId) quotes = quotes.filter(q => q.caseId === caseId);
  res.json({ ok: true, quotes });
});

// ── CATALOG ITEMS ────────────────────────────────────────────────────────────
router.post('/api/catalog/items', (req, res) => {
  const { caseId, vertical, sku, name, flag } = req.body || {};
  if (!sku || !name) return res.status(400).json({ ok: false, error: 'sku and name required' });
  const item = {
    id: ecbId('cat'), caseId: caseId || null, vertical: vertical || null,
    sku, name, flag: flag || 'REVIEW', createdAt: Date.now()
  };
  CATALOG_ITEMS.push(item);
  res.json({ ok: true, item });
});
router.get('/api/catalog/items', (req, res) => {
  const { caseId } = req.query;
  let items = CATALOG_ITEMS;
  if (caseId) items = items.filter(i => i.caseId === caseId);
  res.json({ ok: true, items });
});

// ── APPROVAL REQUESTS (HITL-gated) ───────────────────────────────────────────
router.post('/api/approval/requests', (req, res) => {
  const { caseId, vertical, title, requestedBy, amount } = req.body || {};
  if (!title) return res.status(400).json({ ok: false, error: 'title required' });
  const request = {
    id: ecbId('apr'), caseId: caseId || null, vertical: vertical || null,
    title, requestedBy: requestedBy || 'System', amount: amount || null,
    status: 'PENDING', createdAt: Date.now()
  };
  APPROVAL_REQUESTS.push(request);
  res.json({ ok: true, request });
});
router.get('/api/approval/requests', (req, res) => {
  const { caseId } = req.query;
  let requests = APPROVAL_REQUESTS;
  if (caseId) requests = requests.filter(r => r.caseId === caseId);
  res.json({ ok: true, requests });
});
router.post('/api/approval/requests/:id/approve', (req, res) => {
  const { actor } = req.body || {};
  const request = APPROVAL_REQUESTS.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ ok: false, error: 'Request not found' });
  if (request.status !== 'PENDING') return res.status(409).json({ ok: false, error: `Request already ${request.status}` });
  request.status = 'APPROVED';
  request.resolvedAt = Date.now();
  const decision = APPROVAL_HITL_GATE.recordDecision({
    entityId: request.id, entityType: 'approval-request', decision: 'APPROVED',
    actor, meta: { title: request.title, caseId: request.caseId }
  });
  res.json({ ok: true, request, decision });
});
router.post('/api/approval/requests/:id/reject', (req, res) => {
  const { actor } = req.body || {};
  const request = APPROVAL_REQUESTS.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ ok: false, error: 'Request not found' });
  if (request.status !== 'PENDING') return res.status(409).json({ ok: false, error: `Request already ${request.status}` });
  request.status = 'REJECTED';
  request.resolvedAt = Date.now();
  const decision = APPROVAL_HITL_GATE.recordDecision({
    entityId: request.id, entityType: 'approval-request', decision: 'REJECTED',
    actor, meta: { title: request.title, caseId: request.caseId }
  });
  res.json({ ok: true, request, decision });
});
// Mirrors the GET /api/governance/risk/decisions and /api/integration/decisions
// pattern -- exec portal reads the shared HITL gate's log + stats rollup
// (approval rate, trend vs. prior period) rather than re-deriving it
// client-side from APPROVAL_REQUESTS.
router.get('/api/approval/decisions', (req, res) => {
  const { limit } = req.query;
  res.json({
    ok: true,
    log: APPROVAL_HITL_GATE.getLog(parseInt(limit, 10) || 100),
    stats: APPROVAL_HITL_GATE.getStats()
  });
});

// ── CAPABILITY SWEEP ORCHESTRATOR ────────────────────────────────────────────
async function foundationDecision(baseUrl, vertical, mode, snapshot, context) {
  const r = await fetch(baseUrl + '/api/foundation/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vertical, mode, snapshot, context })
  });
  const data = await r.json();
  if (!r.ok || !data.ok) throw new Error('foundation/decision[' + vertical + '] failed: ' + (data.error || r.status));
  return data.answer;
}

// GCU PILOT FIX 2026-08-26: fetched by Schools, Legal, and Healthcare war
// rooms with no auth check; writes real case records + triggers AI analysis.
router.post('/api/enterprise/capability-sweep', requireAnyAuth, async (req, res) => {
  const body = req.body || {};
  const { vertical, title, summary, exposure, entities } = body;
  const caseId = body.caseId || ecbId('case');
  if (!vertical || !title || !summary) {
    return res.status(400).json({ ok: false, error: 'vertical, title, and summary required' });
  }
  const dedupKey = sweepDedupKey(vertical, caseId);
  const recent = RECENT_SWEEPS.get(dedupKey);
  if (recent && (Date.now() - recent.at) < RECENT_SWEEP_WINDOW_MS) {
    return res.json(Object.assign({}, recent.result, { deduped: true }));
  }
  const ent = entities || {};
  const baseUrl = req.protocol + '://' + req.get('host');
  const errors = [];
  const phases = {};

  // -- Phase writes: 5 previously-stateless phases. Record write and AI call
  // are independent — a Groq/network failure must never hide a record that
  // was actually persisted. phases[key].record is always populated once
  // written; aiAnalysis stays null (with its own error entry) only if that
  // specific call failed.
  const order = { id: ecbId('o2c'), caseId, vertical, orderRef: ent.orderRef || (caseId + '-PO'), customer: ent.customer || title, amountAtRisk: exposure || null, status: 'FROZEN', notes: summary, createdAt: Date.now() };
  O2C_ORDERS.push(order);
  phases.o2c = { record: order, aiAnalysis: null };
  try { phases.o2c.aiAnalysis = await foundationDecision(baseUrl, 'o2c', 'recommendation', { order }, summary); }
  catch (e) { errors.push('o2c.aiAnalysis: ' + e.message); }

  const record = { id: ecbId('crm'), caseId, vertical, accountName: ent.customer || title, relationshipType: ent.relationshipType || 'Supplier', riskFlag: 'HIGH', notes: summary, createdAt: Date.now() };
  CRM_RECORDS.push(record);
  phases.crm = { record, aiAnalysis: null };
  try { phases.crm.aiAnalysis = await foundationDecision(baseUrl, 'crm', 'recommendation', { record }, summary); }
  catch (e) { errors.push('crm.aiAnalysis: ' + e.message); }

  const quote = { id: ecbId('cpq'), caseId, vertical, quoteRef: caseId + '-CONTINGENCY', description: ent.contingency || 'Contingency reallocation quote', amount: exposure || null, status: 'DRAFT', createdAt: Date.now() };
  CPQ_QUOTES.push(quote);
  phases.cpq = { record: quote, aiAnalysis: null };
  try { phases.cpq.aiAnalysis = await foundationDecision(baseUrl, 'cpq', 'recommendation', { quote }, summary); }
  catch (e) { errors.push('cpq.aiAnalysis: ' + e.message); }

  const item = { id: ecbId('cat'), caseId, vertical, sku: ent.sku || (caseId + '-SKU'), name: ent.productName || title, flag: 'SUPPLY_RISK', createdAt: Date.now() };
  CATALOG_ITEMS.push(item);
  phases.catalog = { record: item, aiAnalysis: null };
  try { phases.catalog.aiAnalysis = await foundationDecision(baseUrl, 'catalog', 'recommendation', { item }, summary); }
  catch (e) { errors.push('catalog.aiAnalysis: ' + e.message); }

  const request = { id: ecbId('apr'), caseId, vertical, title: 'Activate contingency: ' + title, requestedBy: 'Capability Sweep', amount: exposure || null, status: 'PENDING', createdAt: Date.now() };
  APPROVAL_REQUESTS.push(request);
  phases.approval = { record: request, aiAnalysis: null };
  try { phases.approval.aiAnalysis = await foundationDecision(baseUrl, 'approval', 'recommendation', { request }, summary); }
  catch (e) { errors.push('approval.aiAnalysis: ' + e.message); }

  // -- Real writes: phases with genuine existing persistence + generic create
  try {
    const r = await fetch(baseUrl + '/api/governance/risk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, severity: 'CRITICAL', owner: 'Unassigned', vertical })
    });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data.error || String(r.status));
    phases.governance = { record: data.risk };
  } catch (e) { errors.push('governance: ' + e.message); }

  try {
    const r = await fetch(baseUrl + '/api/wip/task', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vertical, action: 'Resolve: ' + title, owner: 'Unassigned', status: 'TO DO', risk: 'HIGH' })
    });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data.error || String(r.status));
    phases.wip = { record: data.task };
  } catch (e) { errors.push('wip: ' + e.message); }

  // -- Context pulls: phases with no generic create path, real read, no fabricated write
  phases.mdm = { contextOnly: true, aiAnalysis: null };
  try { phases.mdm.aiAnalysis = await foundationDecision(baseUrl, 'mdm', 'recommendation', { records: [] }, summary + ' (context pull only — no MDM record created for this case)'); }
  catch (e) { errors.push('mdm.aiAnalysis: ' + e.message); }

  try {
    const r = await fetch(baseUrl + '/api/integration/health');
    const data = await r.json();
    phases.integration = { contextOnly: true, currentHealth: data };
  } catch (e) { errors.push('integration: ' + e.message); }

  try {
    const r = await fetch(baseUrl + '/api/digital-twin/snapshot');
    const data = await r.json();
    phases.digitalTwin = { contextOnly: true, currentSnapshot: data };
  } catch (e) { errors.push('digitalTwin: ' + e.message); }

  const decisionPackage = {
    ok: errors.length === 0,
    caseId, vertical, title, summary, exposure: exposure || null,
    generatedAt: new Date().toISOString(),
    phasesTouched: Object.keys(phases).length,
    phases,
    errors: errors.length ? errors : undefined
  };
  RECENT_SWEEPS.set(dedupKey, { result: decisionPackage, at: Date.now() });
  res.json(decisionPackage);
});

module.exports = router;
