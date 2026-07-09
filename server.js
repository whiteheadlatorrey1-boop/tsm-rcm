const express = require('express');
const fs = require('fs');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;
const HTML_ROOT = path.join(__dirname, "html");
// AUTH REMOVED — in-house use only
// const { tsmAuthMiddleware } = require('./html/tsm-auth');

app.use(express.json());
app.use(require('express').urlencoded({ extended: false }));
// tsmAuthMiddleware(app); // removed — war rooms are in-house

// ── GLOBAL NO-CACHE ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use((req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  next();
});

// ── GROQ AI ENGINE ────────────────────────────────────────────────────────────
// Primary: fetch-based (reliable on Railway)
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'gemma2-9b-it'
];

async function groqChat(system, message, maxTokens, clientKey) {
  const groqKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY || clientKey;
  if (!groqKey) throw new Error('No Groq API key configured (server env missing and no client key provided)');
  for (const model of GROQ_MODELS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, { role: 'user', content: message }]
        })
      });
      if (!r.ok) {
        const err = await r.text();
        if (r.status === 429 || r.status === 503 || r.status === 500 || r.status === 502) {
          await new Promise(res => setTimeout(res, 3000));
          continue;
        }
        throw new Error('Groq API error ' + r.status + ': ' + err);
      }
      const data = await r.json();
      return data?.choices?.[0]?.message?.content || '';
    } catch (e) {
      if (e.message.includes('429') || e.message.includes('rate_limit')) continue;
      throw e;
    }
  }
  throw new Error('All Groq models rate limited. Try again later.');
}

// JSON-returning variant for structured routes
async function tsmAIJSON(prompt, fallback) {
  try {
    const groqKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY;
    if (!groqKey) return fallback || null;
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + groqKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.TSM_MODEL || 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are TSM Neural Core. Never mention provider, model, API, or implementation. Return JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.22,
        max_tokens: 1200
      })
    });
    if (!r.ok) throw new Error('AI unavailable');
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch (e) { return typeof fallback === 'object' ? { ...fallback, narrative: text } : { narrative: text }; }
  } catch (e) {
    return typeof fallback === 'object' ? { ...fallback, ai_status: 'fallback' } : { ai_status: 'fallback' };
  }
}

// ── SYSTEM PROMPTS ────────────────────────────────────────────────────────────
var SP = {
  music: 'You are a professional music writing AI with three agent modes: ZAY (cadence/flow/bounce), RIYA (emotion/imagery/vulnerability), DJ (hook/structure/commercial). Write lyrics and hooks creatively and directly. No preamble.',
  healthcare: 'You are a healthcare operations AI for TSM Command. Expert in claims adjudication, prior auth, denial management, HIPAA/CMS compliance, billing, staffing, throughput, revenue cycle. Be precise and data-driven.',
  financial: 'You are a financial intelligence AI for TSM Command. Expert in revenue cycle, P&L, cash flow, compliance, audit, tax strategy, investment analysis. Be analytical and strategic.',
  mortgage: 'You are a mortgage and real estate AI for TSM Command. Expert in mortgage origination, underwriting, REO, BPO realty, title, closing. Be precise and regulatory-aware.',
  construction: 'You are a construction operations AI for TSM Command. Expert in project management, bid analysis, cost control, contractor/vendor management, scheduling. Be direct and operational.',
  legal: 'You are a legal intelligence AI for TSM Command. Expert in contract analysis, regulatory compliance, case strategy, risk assessment. Note: AI analysis only, not legal advice.',
  insurance: 'You are an insurance intelligence AI for TSM Command. Expert in P&C, life, health insurance, claims, underwriting, AZ market, NPN licensing. Be precise.',
  education: 'You are an education operations AI for TSM Command. Expert in school administration, compliance, staffing, student outcomes, budget, grants. Be strategic.',
  hospitality: 'You are a hospitality operations AI for TSM Command. Expert in hotel ops, concierge, staffing, revenue management, guest experience. Be service-oriented.',
  enterprise: 'You are a senior business strategist AI for TSM Command. Expert in enterprise strategy, GTM, operations optimization, ROI analysis. Be executive-level and direct.',
  o2c: 'You are an Order-to-Cash operations AI for TSM Command. Expert in quote-to-order, credit management, ATP/inventory allocation, shipping, invoicing, AR, and cash application. Given structured order, KPI, and SLA-breach data, identify root causes of bottlenecks, flag financial/operational risk, and recommend the specific next action for each at-risk order. Be precise and operational. No preamble.',
  crm: 'You are a CRM customer-lifecycle AI for TSM Command. Expert in lead qualification, account/opportunity management, pipeline health, case escalation, and churn risk. Given structured lead/contact/account/opportunity/case data, KPIs, and SLA-breach data, identify the highest-risk records, the root cause of stalled deals or breached cases, and the specific next action per record. Reference record IDs. Be precise and operational. No preamble.',
  noc: 'You are a Network Operations Center AI for TSM Command. Expert in incident management, alert correlation, device/fleet health, and SLA-driven escalation. Given structured incident/alert/device data, KPIs, and SLA-breach data, identify the highest-severity or highest-risk incidents, correlate related alerts to their root incident, flag devices contributing to fleet-uptime risk, and recommend the specific next action per at-risk incident or device. Reference incident/alert/device IDs. Be precise and operational. No preamble.',
  approval: 'You are an Enterprise Approval Center AI for TSM Command. Expert in multi-level approval workflows, delegation rules, escalation management, SLA compliance, and audit governance. Given structured approval request data, KPIs, SLA breaches, and attention flags, identify bottlenecks, escalation risks, and the specific next action per at-risk request. Reference request IDs. Be precise and operational. No preamble.',
  cpq: 'You are a CPQ (Configure-Price-Quote) operations AI for TSM Command. Expert in product configuration, compatibility rules, discount policy, margin management, quote lifecycle, and approval workflows. Given structured quote pipeline, KPI, and SLA-breach data, identify configuration conflicts, margin risks, stalled quotes, and the specific next action per at-risk quote. Reference quote IDs. Be precise and operational. No preamble.',
  catalog: 'You are a Product Catalog Management AI for TSM Command. Expert in product hierarchy, lifecycle management, SKU/variant management, bill of materials, compliance tracking, inventory linkage, and pricing synchronization. Given structured product catalog data, KPIs, and attention flags (low-stock, compliance, end-of-life), identify catalog data-quality risks, lifecycle bottlenecks, and the specific next action per flagged product. Reference SKUs/product IDs. Be precise and operational. No preamble.',
  governance: 'You are a Governance & Compliance AI for TSM Command. Expert in internal controls, risk management, regulatory compliance frameworks, and audit oversight. Given structured control status, open risks, and flagged audit events, identify the highest-priority failing or at-risk controls, the risks most likely to escalate, and any suspicious or flagged audit events requiring follow-up. Reference control IDs and risk IDs. Be precise and operational. No preamble.',
  strategist: 'You are the TSM Sovereign Strategist — the ultimate business consultant AI. Deep expertise across healthcare, financial, legal, real estate, construction, insurance, education, hospitality, enterprise strategy, M&A, GTM. Be bold and transformative.',
  mdm: 'You are a Master Data Management AI for TSM Command. Expert in data stewardship, golden-record strategy, duplicate resolution, validation rule design, and data quality governance. Given structured master-record data, duplicate-match clusters, and quality scores across customer/vendor/GL domains, identify the highest-risk data anomalies, recommend which record in each duplicate cluster should survive a merge and why, and flag stewardship or validation-rule gaps. Reference record IDs. Be precise and operational. No preamble.',
  integration: 'You are an Enterprise Integration AI for TSM Command. Expert in API monitoring, event-driven architecture, ETL pipelines, message queue health, and data lineage across CRM/ERP/HR/Finance/Supply Chain/Manufacturing/BI/AI systems. Given system health, integration flow throughput/latency, message queue depth, ETL job status, and recent error events, identify the highest-risk integration failures or bottlenecks, trace root cause across the affected flow, and recommend specific remediation. Reference system and flow IDs. Be precise and operational. No preamble.',
  digitalTwin: 'You are the Enterprise Digital Twin AI for TSM Command. Expert in cross-domain business simulation across Sales, Finance, Operations, Manufacturing, Procurement, HR, Customer Service, Supply Chain, Logistics, and IT Ops. Given structured domain health scores, live signal feed, and 30-day forecast data, synthesize an executive brief: identify the domains driving the biggest swings in enterprise health, the highest-priority cross-domain risk, and the single most important executive action this week. Reference domain names and specific figures. Be precise and operational. No preamble.',
  l1Assistant: 'You are the L1 Ticket Copilot Assistant for TSM Command IT support. ' +
    'A tier-1 technician will describe a live scenario in their own words — a ticket ' +
    'they are stuck on, an error message, a user complaint, or a "what should I do here" ' +
    'question. Give fast, practical, best-practice guidance a working L1 tech can act on ' +
    'immediately. Structure every answer as: (1) likely root cause in one line, ' +
    '(2) the 2-4 concrete next steps in order, (3) when to escalate and to whom ' +
    '(L2, vendor, or manager) if the steps do not resolve it. If the scenario mentions ' +
    'Dell hardware, factor in ProSupport vs Basic warranty guidance and what info ' +
    '(service tag / express service code) to have ready before contacting Dell. ' +
    'Be concise, no filler, no preamble, plain operational language a technician can ' +
    'read in a few seconds mid-ticket.',
  l1support: 'You are a Senior Network and Systems Engineer acting as the decision-making core of TSM L1 Ticket Copilot, a desktop/network support triage tool. You have 15+ years of enterprise IT experience across Windows/macOS endpoint management, Active Directory/Entra ID, DNS/DHCP, VLAN and routing, firewall/ACL policy, VPN and SD-WAN, virtualization, Microsoft 365/Azure, and OEM hardware (Dell, HP, Lenovo, Cisco, Meraki, Fortinet). Triage every ticket in OSI-layer order — physical/hardware first, then link/network (VLAN, switchport, DHCP, DNS), then transport/session (VPN, firewall, auth/SSO/MFA), then application — and do not skip layers. Distinguish clearly between an L1-actionable fix, a fix that needs elevated/L2 access, and a fix that needs vendor hardware service, and say which one applies and why. When recommending escalation, name the correct team (Desktop, Network, Server, Azure, O365, Security, Application, or Vendor) based on where in the stack the root cause actually sits, not just ticket category. Be precise, operational, and quantify confidence and risk where you can. No filler, no preamble, no restating the question back.',
};

// ── GLOBAL STATE ──────────────────────────────────────────────────────────────
global.MUSIC_PLATFORM = global.MUSIC_PLATFORM || {
  artistDNA: { status: 'active', artist: 'Current Artist', styleTerms: ['pain', 'resilience'], weights: { cadence: 0.88, emotion: 0.91, structure: 0.76, imagery: 0.82 }, learnedSongs: [] },
  agentRuns: [], activity: []
};
global.MUSIC_SUITE_STATE = global.MUSIC_SUITE_STATE || {
  artistsOnline: 12, releasesDropping: 3, monthlyStreams: '84M', revenueMTD: 847400, pipelineValue: 2400000, aiStatus: 'online'
};
const TSM_MEMORY = global.__TSM_MEMORY__ = global.__TSM_MEMORY__ || {
  healthcare: { nodes: {}, hcStrategist: null, mainStrategist: null, executive: null }
};
const TSM_MESH = {
  HEALTHCARE: { owner: 'HC Strategist', controller: 'Healthcare Command', risks: ['Revenue leakage', 'Denial escalation', 'Patient throughput degradation', 'Compliance exposure'] },
  CONSTRUCTION: { owner: 'Construction Strategist', controller: 'Construction Command', risks: ['Permit delays', 'Schedule variance', 'Cost overrun', 'Supply chain disruption'] },
  FINANCE: { owner: 'Financial Strategist', controller: 'Financial Command', risks: ['Margin compression', 'Payer variance', 'Cash flow slowdown', 'Revenue forecasting deviation'] }
};

app.use('/html/runtime', express.static(path.join(__dirname, 'html', 'runtime')));
// FIX (shadow-duplication routing bug): these two MUST be registered before
// the '/' catch-all below. html/runtime/kernel/canonical-core.js is a stale
// 7-line stub; the real CanonicalCore class lives at repo-root
// runtime/kernel/canonical-core.js. Express matches static mounts in
// registration order, so if the catch-all comes first, it silently serves
// the stub for every /runtime/* request and this mount never runs.
app.use('/runtime', express.static(path.join(__dirname, 'runtime'), { setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
app.use('/architecture', express.static(path.join(__dirname, 'architecture'), { setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
app.use('/', express.static(path.join(__dirname, 'html')));
const suites = [
  { route: '/construction', dir: 'html/construction-suite', index: 'construction-hub.html' },
  { route: '/finops', dir: 'html/finops-suite', index: 'finops-presentation/index.html' },
  { route: '/healthcare', dir: 'html/healthcare', index: 'index.html' },
  { route: '/insurance', dir: 'html/tsm-insurance', index: 'ins-presentation.html' },
  { route: '/music', dir: 'html/music-command', index: 'index.html' },
];

// ── HEALTH & STUB ROUTES ──────────────────────────────────────────────────────
app.post('/api/re/query', async (req, res) => {
  try { const a = await groqChat(SP.mortgage, req.body.message||req.body.question||req.body.query||'', req.body.maxTokens||1024); return res.json({ ok:true, answer:a, output:a }); }
  catch(e){ return res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/education/query', async (req, res) => {
  try { const a = await groqChat(SP.education, req.body.message||req.body.question||req.body.query||'', req.body.maxTokens||1024); return res.json({ ok:true, answer:a, output:a }); }
  catch(e){ return res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/enterprise/query', async (req, res) => {
  try { const a = await groqChat(SP.enterprise, req.body.message||req.body.question||req.body.query||'', req.body.maxTokens||1024); return res.json({ ok:true, answer:a, output:a }); }
  catch(e){ return res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/re/query', async (req, res) => {
  try { const a = await groqChat(SP.mortgage, req.body.message||req.body.question||req.body.query||'', req.body.maxTokens||1024); return res.json({ ok:true, answer:a, output:a, reply:a }); }
  catch(e){ return res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/education/query', async (req, res) => {
  try { const a = await groqChat(SP.education, req.body.message||req.body.question||req.body.query||'', req.body.maxTokens||1024); return res.json({ ok:true, answer:a, output:a, reply:a }); }
  catch(e){ return res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/enterprise/query', async (req, res) => {
  try { const a = await groqChat(SP.enterprise, req.body.message||req.body.question||req.body.query||'', req.body.maxTokens||1024); return res.json({ ok:true, answer:a, output:a, reply:a }); }
  catch(e){ return res.status(500).json({ ok:false, error:e.message }); }
});
app.get('/health', (req, res) => res.json({ status: 'ok', v: 3 }));
app.post('/api/bpo/query', async (req, res) => {
  try {
    const sys = 'You are a BPO operations intelligence AI for TSM Command. Expert in BPO, workforce management, SLA performance, staffing ops. Be direct.';
    const msg = req.body.message || req.body.question || req.body.query || '';
    const a = await groqChat(sys, msg, req.body.maxTokens || 1024);
    return res.json({ ok: true, reply: a, answer: a, output: a, createdAt: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});
app.post('/api/wip/sector-ai', (req, res) => res.json({ content: 'ok' }));

app.get('/api/hc/strategist-rollup', (req, res) => {
  res.json({ ok: true, controller: 'HC STRATEGIST', status: 'ROLLUP ACTIVE', nodes_online: 11, executive_escalations: 3, bnca: 'Enterprise healthcare synthesis complete', mesh: true, timestamp: new Date().toISOString() });
});

app.get('/api/hc/nodes', (req, res) => {
  res.json({ ok: true, status: 'HC node route online', nodes: ['operations', 'billing', 'medical', 'pharmacy', 'financial', 'legal', 'vendors', 'compliance', 'tax-prep', 'grants', 'insurance'] });
});

app.get('/api/music/activity', (_req, res) => res.json({ ok: true, activity: global.MUSIC_PLATFORM.activity || [], platform: global.MUSIC_PLATFORM }));
app.get('/api/music/platform', (_req, res) => res.json({ ok: true, platform: global.MUSIC_PLATFORM }));
app.get('/executive-portal', (req, res) => res.redirect('/html/executive-portal/index.html'));
app.get('/healthcare/executive-portal', (req, res) => res.redirect('/html/executive-portal/index.html'));

// ── STATIC MOUNTS ─────────────────────────────────────────────────────────────
const dirPath = path.join(__dirname, 'html');// ── STATIC MOUNTS v2 ──

app.use('/html', express.static(path.join(__dirname, 'html'), { setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
app.use('/js', express.static(path.join(__dirname, 'html/tsm-insurance/public/js')));
app.use('/js', express.static(path.join(__dirname, 'html/js')));
app.use('/bpo', express.static(path.join(__dirname, 'html/bpo')));
app.use('/shared', express.static(path.join(__dirname, 'html/bpo/shared')));
app.use('/insurance', express.static(path.join(__dirname, 'html/tsm-insurance')));
app.use('/construction', express.static(path.join(__dirname, 'html/construction-suite')));
// NOTE: /runtime and /architecture mounts now live earlier in this file
// (right after the '/html/runtime' mount, before the '/' catch-all) so they
// can't be shadowed by stale files inside html/. See fix note there.
app.use(express.static(dirPath));

// ── HC NODE ROUTES ────────────────────────────────────────────────────────────
app.get('/html/hc-strategist', (req, res) => res.redirect('/healthcare/hc-strategist/'));
app.get('/html/hc-strategist/', (req, res) => res.redirect('/healthcare/hc-strategist/'));
app.get('/html/hc-strategist/index.html', (req, res) => res.redirect('/healthcare/hc-strategist/'));

['hc-medical', 'hc-billing', 'hc-vendors', 'hc-grants', 'hc-insurance', 'hc-legal', 'hc-operations', 'hc-financial', 'hc-taxprep', 'hc-compliance', 'hc-pharmacy', 'hc-strategist'].forEach(function (node) {
  var dir = path.join(__dirname, 'html/healthcare', node);
  app.use('/healthcare/' + node, express.static(dir, { setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
  app.get('/healthcare/' + node, (req, res) => { res.setHeader('Cache-Control', 'no-store,no-cache,must-revalidate'); res.sendFile(path.join(dir, 'index.html')); });
  app.get('/healthcare/' + node + '/', (req, res) => { res.setHeader('Cache-Control', 'no-store,no-cache,must-revalidate'); res.sendFile(path.join(dir, 'index.html')); });
});

// ── SUITE ROUTES ──────────────────────────────────────────────────────────────
suites.forEach(s => {
  if (!s.route || !s.index) return;
  app.get(s.route, (req, res) => res.sendFile(path.join(dirPath, s.index)));
  app.get(s.route + '/', (req, res) => res.sendFile(path.join(dirPath, s.index)));
});

// ── HC API ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/hc/query', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = body.system || SP.healthcare;
    var msg = body.message || body.question || body.query;
    if (!msg) return res.status(400).json({ ok: false, error: 'Query required' });
    var a = await groqChat(sys, msg, body.maxTokens || 1024);
    console.log('[HC QUERY DEBUG] a =', JSON.stringify(a));
    return res.json({ ok: true, output: a, answer: a, reply: a, content: a, createdAt: new Date().toISOString() });
  } catch (e) { console.log('[HC ERROR]', e.message); return res.status(500).json({ ok: false, error: e.message }); }
});

const clientUsage = {}; // v3

// ── HC NODE REPORT STORE ──────────────────────────────────────────────────────
// In-memory store for node reports relayed from war rooms → strategist → exec
const hcNodeReports = {}; // keyed by node id

app.post('/api/hc/node-report', (req, res) => {
  try {
    const { nodeId, nodeLabel, report, analysisText, denialCodes, claimIds, severity, kpi, ts } = req.body || {};
    if (!nodeId) return res.status(400).json({ ok: false, error: 'nodeId required' });
    hcNodeReports[nodeId] = {
      nodeId,
      nodeLabel: nodeLabel || nodeId,
      report: report || '',
      analysisText: analysisText || '',
      denialCodes: denialCodes || [],
      claimIds: claimIds || [],
      severity: severity || 'INFO',
      kpi: kpi || {},
      ts: ts || Date.now(),
      receivedAt: Date.now()
    };
    console.log('[HC NODE REPORT] stored:', nodeId, 'severity:', severity);
    return res.json({ ok: true, nodeId, stored: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/hc/node-reports', (req, res) => {
  try {
    const reports = Object.values(hcNodeReports).sort((a, b) => b.ts - a.ts);
    return res.json({ ok: true, reports, count: reports.length });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/api/hc/node-reports', (req, res) => {
  const { nodeId } = req.body || req.query || {};
  if (nodeId) {
    delete hcNodeReports[nodeId];
    return res.json({ ok: true, cleared: nodeId });
  }
  Object.keys(hcNodeReports).forEach(k => delete hcNodeReports[k]);
  return res.json({ ok: true, cleared: 'all' });
});


app.post('/api/hc/stream', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { model, sys, user, maxTok } = req.body;
  if (!sys || !user) return res.status(400).json({ error: 'Missing sys or user' });

  const clientId = req.ip;
  const today = new Date().toDateString();
  const key = clientId + '_' + today;
  clientUsage[key] = (clientUsage[key] || 0) + 1;
  if (clientUsage[key] > 20) {
    return res.status(429).json({ error: 'Daily analysis limit reached. Contact TSM to upgrade.' });
  }

  const groqKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_KEY not configured on server.' });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.GROQ_KEY || process.env.GROQ_API_KEY)
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        stream: true,
        max_tokens: maxTok || 500,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      return res.status(502).json({ error: err.error?.message || 'Groq error' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const { Readable } = require('stream');
    Readable.fromWeb(groqRes.body).pipe(res);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

function debugLog(msg) {
  try {
    fs.appendFileSync('/app/data/debug.log', `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) { /* ignore logging failures */ }
}

async function fetchGroqWithRetry(groqKey, body, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqKey
      },
      body: JSON.stringify(body)
    });
    if (groqRes.ok) return groqRes;
    const err = await groqRes.json().catch(() => ({}));
    console.error('Groq error response:', JSON.stringify(err)); debugLog('Groq error: ' + JSON.stringify(err));
    const isRateLimit = err.error?.code === 'rate_limit_exceeded';
    if (isRateLimit && attempt < maxRetries) {
      const match = /try again in ([\d.]+)(ms|s)/.exec(err.error.message || '');
      let waitMs = 1500;
      if (match) {
        const val = parseFloat(match[1]);
        waitMs = match[2] === 's' ? val * 1000 : val;
      }
      waitMs = Math.min(waitMs + 250, 10000);
      console.error(`Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`); debugLog(`Retrying in ${waitMs}ms attempt ${attempt + 1}/${maxRetries}`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    const failErr = new Error(err.error?.message || 'Groq error');
    failErr.status = 502;
    throw failErr;
  }
}

app.post('/api/war-room/stream', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { model, messages, max_tokens, temperature } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Missing messages' });

  const groqKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_KEY not configured on server.' });

  async function fetchGroqStream(retriesLeft = 3) {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqKey
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        stream: true,
        max_tokens: max_tokens || 600,
        temperature: temperature ?? 0.4,
        reasoning_effort: 'low',
        messages
      })
    });
    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      console.error('Groq error response:', JSON.stringify(err));

      // Groq's TPM rate limit is transient and self-clears within seconds.
      // Retry automatically (honoring the wait time Groq reports) instead of
      // failing the whole engine run on a momentary cap — this is what was
      // surfacing as opaque "502" errors on engines fired in quick succession.
      if (groqRes.status === 429 && retriesLeft > 0) {
        const waitMatch = /try again in ([\d.]+)s/i.exec(err.error?.message || '');
        const waitMs = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) + 250 : 3000;
        console.warn(`[war-room/stream] Rate limited, retrying in ${waitMs}ms (${retriesLeft} retries left)`);
        await new Promise(r => setTimeout(r, waitMs));
        return fetchGroqStream(retriesLeft - 1);
      }

      const e = new Error(err.error?.message || 'Groq error');
      e.status = groqRes.status === 429 ? 429 : 502;
      throw e;
    }
    return groqRes;
  }

  const maxEmptyRetries = 2;
  let succeeded = false;
  let headersSent = false;

  function ensureHeaders() {
    if (!headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      headersSent = true;
    }
  }

  try {
    for (let attempt = 0; attempt <= maxEmptyRetries && !succeeded; attempt++) {
      const groqRes = await fetchGroqStream();
      const reader = groqRes.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let gotContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6);
          if (d === '[DONE]') continue;
          let delta = '';
          try { delta = JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch (e) {}
          if (delta) {
            gotContent = true;
            ensureHeaders();
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
          }
        }
      }

      if (gotContent) {
        succeeded = true;
      } else {
        debugLog(`Empty stream content on attempt ${attempt + 1}/${maxEmptyRetries + 1}, retrying`);
        if (attempt === maxEmptyRetries) {
          debugLog('Exhausted empty-stream retries, giving up');
        }
      }
    }

    ensureHeaders();
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    if (res.headersSent) {
      res.end();
    } else {
      res.status(e.status || 500).json({ error: e.message });
    }
  }
});

app.post('/api/hc/ask', async (req, res) => {
  try {
    var body = req.body || {};
    if (!body.message || !body.message.trim()) return res.status(400).json({ ok: false, error: 'Message is required' });
    var a = await groqChat(body.system || SP.healthcare, body.message, 1024);
    return res.json({ ok: true, output: a, content: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/hc/triage', async (req, res) => {
  try {
    const { client = '', taskType = '', department = '', priority = 'P3', deadline = '', description = '', notes = '' } = req.body || {};
    if (!description) return res.status(400).json({ ok: false, error: 'Description is required' });
    const sp = `You are an expert Healthcare BPO triage AI for TSM. Respond in this EXACT format:\nPRIORITY: [P1-CRITICAL / P2-HIGH / P3-MEDIUM / P4-LOW]\nDEPARTMENT: [best-fit department]\nROUTE_TO: [Billing & Coding / Clinical Operations / Compliance / Executive / Finance / Provider Relations]\nURGENCY_REASON: [1 sentence max]\nRECOMMENDED_ACTION: [2-4 bullet points starting with •]\nESCALATE_TO_STRATEGIST: [YES / NO]\nESCALATE_REASON: [1 sentence, or N/A]\nESTIMATED_RESOLUTION: [timeframe]`;
    const result = await groqChat(sp, `Client: ${client}\nTask Type: ${taskType}\nDepartment: ${department}\nPriority: ${priority}\nDeadline: ${deadline}\nDescription: ${description}\nNotes: ${notes}`, 1024);
    res.json({ ok: true, content: result });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/hc/strategist', async (req, res) => {
  try {
    const { task = {}, aiTriage = '', query = '' } = req.body || {};
    const sp = `You are the TSM Healthcare BPO Strategist. Produce executive-grade strategy in this EXACT format:\nSTRATEGIC_SUMMARY: [2-3 sentences]\nROOT_CAUSE: [1 sentence]\nIMPACT_LEVEL: [HIGH / MEDIUM / LOW] — [impact in 1 sentence]\nRECOMMENDED_STRATEGY:\n• [Action 1]\n• [Action 2]\n• [Action 3]\nOWNER_LANES: [departments]\nTIMELINE: [Day 1-2: ... / Week 1: ...]\nESCALATE_TO_EXECUTIVE: [YES / NO]\nESCALATE_REASON: [1 sentence, or N/A]\nCONFIDENCE: [percentage]`;
    const result = await groqChat(sp, `TASK: ${JSON.stringify(task)}\nTRIAGE_OUTPUT: ${aiTriage}\nQUERY: ${query || 'Full strategic assessment'}`, 1024);
    res.json({ ok: true, content: result });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/hc/layer2', async (req, res) => {
  try {
    const { system: org = 'TSM Healthcare', location = '' } = req.body || {};
    const sp = `You are a senior Healthcare BPO enterprise strategist for ${org}${location ? ' · ' + location : ''}. Synthesize findings across ALL nodes. Return structured BNCA:\n\nENTERPRISE BNCA SUMMARY\n========================\nTOP RISKS (ranked by revenue impact):\n1. [Risk · Node · $ impact]\n2. [Risk · Node · $ impact]\n3. [Risk · Node · $ impact]\n\nIMMEDIATE ACTIONS (next 48 hours):\n1. [Action · Owner Lane · Expected outcome]\n2. [Action · Owner Lane · Expected outcome]\n3. [Action · Owner Lane · Expected outcome]\n\n30-DAY RECOVERY PLAN:\n[Concise cross-node plan with milestones]\n\nESCALATE_TO_EXECUTIVE: YES/NO\nESCALATE_REASON: [reason if YES]\nCONFIDENCE: [0-100]%`;
    const result = await groqChat(sp, `Run full enterprise BNCA for ${org}${location ? ' at ' + location : ''}`, 1500);
    res.json({ ok: true, output: result });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/hc/node/:node', async (req, res) => {
  const node = req.params.node;
  const payload = req.body || {};
  const result = await tsmAIJSON(`Analyze healthcare node ${node}. Payload: ${JSON.stringify(payload).slice(0, 4000)}. Return JSON: {"node":"${node}","status":"READY|WATCH|RISK","top_issue":"...","findings":[],"actions":[],"bnca":"...","owner_lane":"...","confidence":0}`,
    { node, status: 'WATCH', top_issue: 'Node requires review', findings: [], actions: [], bnca: 'Review node output.', owner_lane: 'office manager', confidence: 80 });
  TSM_MEMORY.healthcare.nodes[node] = result;
  res.json({ ok: true, node, result, ts: new Date().toISOString() });
});

app.post('/api/hc/bnca', async (req, res) => {
  const payload = req.body || {};
  const result = await tsmAIJSON(`Healthcare Command BNCA. Nodes: ${JSON.stringify(TSM_MEMORY.healthcare.nodes).slice(0, 6000)}. Payload: ${JSON.stringify(payload).slice(0, 4000)}. Return JSON: {"suite":"healthcare-command","top_issue":"...","risk_level":"READY|WATCH|RISK|URGENT","node_summary":[],"bnca":"...","owner_lanes":[],"hitl_review_required":true,"confidence":0}`,
    { suite: 'healthcare-command', top_issue: 'Review needed', risk_level: 'WATCH', node_summary: [], bnca: 'Prioritize billing/auth/compliance.', owner_lanes: ['office manager'], hitl_review_required: true, confidence: 82 });
  TSM_MEMORY.healthcare.hcCommand = result;
  res.json({ ok: true, result, ts: new Date().toISOString() });
});

app.post('/api/hc-strategist/bnca', async (req, res) => {
  const payload = req.body || {};
  const result = await tsmAIJSON(`HC Strategist synthesis. Memory: ${JSON.stringify(TSM_MEMORY.healthcare).slice(0, 8000)}. Payload: ${JSON.stringify(payload).slice(0, 4000)}. Return JSON: {"suite":"hc-strategist","strategic_summary":"...","priority_actions":[],"bnca":"...","relay_to_main_strategist":true,"confidence":0}`,
    { suite: 'hc-strategist', strategic_summary: 'HC Strategist review needed.', priority_actions: [], bnca: 'Relay to Main Strategist.', relay_to_main_strategist: true, confidence: 82 });
  TSM_MEMORY.healthcare.hcStrategist = result;
  res.json({ ok: true, result, ts: new Date().toISOString() });
});

app.post('/api/main-strategist/healthcare', async (req, res) => {
  const payload = req.body || {};
  const result = await tsmAIJSON(`Main Strategist executive package. Memory: ${JSON.stringify(TSM_MEMORY.healthcare).slice(0, 9000)}. Return JSON: {"suite":"main-strategist","executive_issue":"...","financial_or_operational_impact":"...","recommendation":"...","decision_options":[],"hitl_relay":"...","send_to_executive_portal":true,"confidence":0}`,
    { suite: 'main-strategist', executive_issue: 'Healthcare readiness needs review.', financial_or_operational_impact: 'Billing pressure may affect throughput.', recommendation: 'Start office manager workflow pilot.', decision_options: ['30-day pilot'], hitl_relay: 'Review BNCA and confirm owner lanes.', send_to_executive_portal: true, confidence: 84 });
  TSM_MEMORY.healthcare.mainStrategist = result;
  res.json({ ok: true, result, ts: new Date().toISOString() });
});

app.post('/api/executive/portal', async (req, res) => {
  const payload = req.body || {};
  const result = await tsmAIJSON(`Executive Portal. Memory: ${JSON.stringify(TSM_MEMORY.healthcare).slice(0, 10000)}. Return JSON: {"portal":"executive","audience":"CFO / Decision Maker","decision_summary":"...","bnca_recommendation":"...","hitl_script":"...","approval_path":[],"next_step":"...","confidence":0}`,
    { portal: 'executive', audience: 'CFO / Decision Maker', decision_summary: 'Healthcare BNCA ready.', bnca_recommendation: 'Approve pilot workflow.', hitl_script: 'Action-ready recommendation and owner lanes for approval.', approval_path: ['Office Manager', 'CFO'], next_step: 'Book walkthrough or approve 30-day pilot.', confidence: 85 });
  TSM_MEMORY.healthcare.executive = result;
  res.json({ ok: true, result, ts: new Date().toISOString() });
});

// ── TSM Candidate Sync Routes ──
const candidateStore = []; // swap for DB later

// POST /api/candidate/submit  — called by candidate-intake.html
app.post('/api/candidate/submit', (req, res) => {
  const entry = {
    id: 'cand_' + Date.now(),
    timestamp: new Date().toISOString(),
    new: true,
    ...req.body
  };
  candidateStore.unshift(entry);
  if (candidateStore.length > 500) candidateStore.length = 500;
  res.json({ ok: true, id: entry.id });
});

// GET /api/candidate/list  — polled by wia2.html recruiter dashboard
app.get('/api/candidate/list', (req, res) => {
  res.json(candidateStore);
});

// POST /api/candidate/clear-new  — marks all as seen
app.post('/api/candidate/clear-new', (req, res) => {
  candidateStore.forEach(c => c.new = false);
  res.json({ ok: true });
});

// ── MUSIC API ROUTES ──────────────────────────────────────────────────────────
// Deterministic heuristic used only to rank/gate revision options (not a
// stand-in for AI judgment — the lyric content itself always comes from
// real groqChat() calls above; this just scores text shape for the UI).
function musicHeuristicScore(text){
  var body = String(text || '');
  var lines = body.split(/\n+/).filter(Boolean).length;
  var len = body.length;
  var cadence = Math.min(.99, .72 + (lines >= 2 ? .08 : 0) + (len > 60 ? .06 : 0));
  var emotion = Math.min(.99, .74 + (len > 120 ? .08 : 0));
  var structure = Math.min(.99, .70 + (lines >= 4 ? .12 : .05));
  var imagery = Math.min(.99, .70 + (len > 150 ? .08 : 0));
  var overall = Number(((cadence + emotion + structure + imagery) / 4).toFixed(2));
  return {
    cadence: Number(cadence.toFixed(2)),
    emotion: Number(emotion.toFixed(2)),
    structure: Number(structure.toFixed(2)),
    imagery: Number(imagery.toFixed(2)),
    overall
  };
}

app.post('/api/music/structure', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, a world-class music producer. Build a detailed song structure/blueprint. Return sections, BPM suggestion, key, mood, and arrangement notes. Write in plain text.';
    var msg = body.query || body.prompt || `Build a song blueprint. Genre: ${body.genre || 'Hip-Hop'}, Mood: ${body.mood || 'Motivational'}, Theme: ${body.theme || 'hustle and perseverance'}, Artist style: ${body.artist || 'versatile'}`;
    var a = await groqChat(sys, msg, 1200);
    return res.json({ ok: true, output: a, structure: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/hooks/generate10', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, a world-class songwriter. Generate exactly 10 distinct, catchy, numbered hook options. Make them memorable and genre-appropriate.';
    var msg = body.query || `Generate 10 hook options. Genre: ${body.genre || 'Hip-Hop'}, Mood: ${body.mood || 'Motivational'}, Theme: ${body.theme || 'hustle'}, Artist style: ${body.artist || 'versatile'}`;
    var a = await groqChat(sys, msg, 1024);
    return res.json({ ok: true, output: a, hooks: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/hooks', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, a world-class songwriter. Generate 10 distinct, catchy hook options. Number each one. Make them memorable and genre-appropriate.';
    var msg = body.query || `Generate 10 hook options. Genre: ${body.genre || 'Hip-Hop'}, Mood: ${body.mood || 'Motivational'}, Theme: ${body.theme || 'hustle'}`;
    var a = await groqChat(sys, msg, 1024);
    return res.json({ ok: true, output: a, hooks: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/song', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, a world-class songwriter. Write complete, full song lyrics. Include all sections: intro, verse 1, pre-chorus, chorus, verse 2, bridge, outro. Make it professional and authentic.';
    var msg = body.query || `Write a complete song. Genre: ${body.genre || 'Hip-Hop'}, Mood: ${body.mood || 'Motivational'}, Hook: ${body.hook || ''}, Theme: ${body.theme || 'hustle'}`;
    var a = await groqChat(sys, msg, 2048);
    return res.json({ ok: true, output: a, lyrics: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/revision/run', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, a world-class songwriter. Revise the provided lyrics based on the notes given. Return only the revised lyrics.';
    var msg = `Original lyrics:\n${body.lyrics || ''}\n\nRevision notes: ${body.notes || ''}\n\nHook to preserve: ${body.hook || ''}\nGenre: ${body.genre || 'Hip-Hop'}`;
    var a = await groqChat(sys, msg, 2048);
    return res.json({ ok: true, output: a, content: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/strategy', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, an expert music industry strategist. Create a detailed release strategy and marketing plan.';
    var msg = body.query || `Create a release strategy for a ${body.genre || 'Hip-Hop'} song titled "${body.title || 'Untitled'}" with theme: ${body.theme || ''}. Artist style: ${body.artist || 'independent'}. Cover: release timeline, DSP strategy, playlist targeting, social media rollout, sync licensing, marketing angles.`;
    var a = await groqChat(sys, msg, 1200);
    return res.json({ ok: true, output: a, answer: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/guidance', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, a music industry expert. Provide industry guidance and career development advice for independent artists.';
    var msg = body.query || `Provide industry guidance for an independent ${body.genre || 'Hip-Hop'} artist. Artist style: ${body.artist || 'independent'}. Theme: ${body.theme || ''}. Cover: career development, networking, monetization, next steps.`;
    var a = await groqChat(sys, msg, 1200);
    return res.json({ ok: true, output: a, answer: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/coach', async (req, res) => {
  try {
    var body = req.body || {};
    var sys = 'You are ZAY, a real music producer and artist coach. Keep responses direct, real, and helpful. Under 80 words unless asked for more.';
    var msg = body.query || body.message || 'How can I improve my song?';
    var a = await groqChat(sys, msg, 512);
    return res.json({ ok: true, output: a, content: a, reply: a });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/agent-pass', async (req, res) => {
  var body = req.body || {};
  var agent = body.agent || 'ZAY';
  var draft = body.draft || body.lyrics || '';
  var request = body.request || 'Refine this draft';
  try {
    var output = await groqChat(SP.music, 'Agent: ' + agent + '\nRequest: ' + request + '\n\nDraft:\n' + draft + '\n\nProvide your refined version:', 700);
    return res.json({ ok: true, agent: agent, output: output, createdAt: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/chain', async (req, res) => {
  var body = req.body || {};
  var draft = body.draft || '';
  var request = body.request || 'Sharpen this draft';
  try {
    // maxTokens bumped 400->900: each stage refines the previous stage's
    // (already generated) text, so a 400-token cap on ZAY truncated before
    // the hook/bridge ever appeared, RIYA then refined that truncated draft,
    // and DJ refined RIYA's truncated output -- compounding the cutoff
    // across all three hops so the final song never included a complete
    // hook, bridge, or outro.
    var zay = await groqChat(SP.music, 'Agent ZAY cadence/flow focus.\nRequest: ' + request + '\nDraft: ' + draft + '\nRefine:', 900);
    var riya = await groqChat(SP.music, 'Agent RIYA emotion/imagery focus.\nRequest: ' + request + '\nDraft: ' + zay + '\nRefine:', 900);
    var dj = await groqChat(SP.music, 'Agent DJ hook/structure focus.\nRequest: ' + request + '\nDraft: ' + riya + '\nFinal version:', 900);
    return res.json({ ok: true, mode: 'chain', input: draft, zay, riya, output: dj, score: { overall: 0.87 }, createdAt: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/revision/generate', async (req, res) => {
  try {
    var body = req.body || {};
    var draft = body.draft || '';
    var request = body.request || 'Give me 3 revision options';
    var results = await Promise.all([
      groqChat(SP.music, 'Flow-first revision.\nRequest: ' + request + '\nDraft: ' + draft + '\nOption A:', 700),
      groqChat(SP.music, 'Emotion-first revision.\nRequest: ' + request + '\nDraft: ' + draft + '\nOption B:', 700),
      groqChat(SP.music, 'Hook-first revision.\nRequest: ' + request + '\nDraft: ' + draft + '\nOption C:', 700)
    ]);
    var scoreA = musicHeuristicScore(results[0]);
    var scoreB = musicHeuristicScore(results[1]);
    var scoreC = musicHeuristicScore(results[2]);
    var options = [
      { id: 'A', title: 'Option A - Flow First', strategy: 'Cadence and bounce', output: results[0], score: scoreA },
      { id: 'B', title: 'Option B - Emotion First', strategy: 'Imagery and vulnerability', output: results[1], score: scoreB },
      { id: 'C', title: 'Option C - Hook First', strategy: 'Structure and repeatability', output: results[2], score: scoreC }
    ];
    var bestOverall = Math.max(scoreA.overall, scoreB.overall, scoreC.overall);
    var recommended = options.find(o => o.score.overall === bestOverall).id;
    var session = { id: Date.now(), request, input: draft, options, recommended, createdAt: new Date().toISOString() };
    if (!global.MUSIC_REVISIONS) global.MUSIC_REVISIONS = { sessions: [], selected: null };
    global.MUSIC_REVISIONS.sessions.unshift(session);
    global.MUSIC_REVISIONS.sessions = global.MUSIC_REVISIONS.sessions.slice(0, 20);
    return res.json({ ok: true, session });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/music/dna/save', async (req, res) => {
  var body = req.body || {};
  var dna = global.MUSIC_PLATFORM.artistDNA;
  dna.artist = body.artist || dna.artist;
  dna.styleTerms = Array.isArray(body.styleTerms) ? body.styleTerms : dna.styleTerms;
  dna.weights = Object.assign({}, dna.weights, body.weights || {});
  dna.updatedAt = new Date().toISOString();
  try { dna.aiInsight = await groqChat(SP.music, 'Artist: ' + dna.artist + '\nStyle: ' + dna.styleTerms.join(', ') + '\n\nSuggest 3 directions to push their sound.', 400); }
  catch (e) { dna.aiInsight = null; }
  return res.json({ ok: true, dna });
});

app.post('/api/music/song/learn', async (req, res) => {
  var body = req.body || {};
  var song = { id: Date.now(), title: body.title || 'Untitled', lyrics: body.lyrics || body.draft || '', learnedAt: new Date().toISOString() };
  global.MUSIC_PLATFORM.artistDNA.learnedSongs.unshift(song);
  global.MUSIC_PLATFORM.artistDNA.learnedSongs = global.MUSIC_PLATFORM.artistDNA.learnedSongs.slice(0, 12);
  try { song.aiAnalysis = await groqChat(SP.music, 'Analyze these lyrics for cadence, emotion, structure, imagery. Score each 0-1:\n\n' + song.lyrics, 400); }
  catch (e) { song.aiAnalysis = null; }
  return res.json({ ok: true, song, dna: global.MUSIC_PLATFORM.artistDNA });
});

// ── MUSIC API ROUTES (additional engine/revision/dna/billing layer) ───────────
// app.html calls a wider set of /api/music/* endpoints than were defined above
// (agent/run, agent/chain, dna/learn, engine, revision/select, revision/state,
// revision/pick-rerun, dashboard-sync, session/save, export, monetization/state,
// billing/state, billing/upgrade-intent, billing/set-tier-dev, and /api/music/state
// itself) — all of which were 404ing live. routes/music.js already implements
// them with the exact response shapes app.html expects; it just was never
// mounted. Mounted AFTER the routes above so those (already real, Groq-backed)
// inline handlers keep precedence for any overlapping paths.
app.use(require('./routes/music'));

// ── FINOPS ────────────────────────────────────────────────────────────────────
app.post('/api/finops/bnca/report', (req, res) => res.json({ ok: true }));
// routes/finops.js implements docs, run-doc, upload-doc (with field
// extraction), report, multi-report, and actions endpoints. Mounted after
// the inline handler above so that handler keeps precedence on any overlap.
const liveDataModule = require('./routes/live-data');
app.use(require('./routes/finops'));
app.use(liveDataModule);
app.post('/api/chat', (req, res) => res.json({ ok: true }));

// ── AI QUERY ROUTES ───────────────────────────────────────────────────────────
app.post('/api/ai/query', async (req, res) => {
  var body = req.body || {};
  var appType = body.app || 'enterprise';
  var question = body.question || body.query || body.input || '';
  var system = SP[appType] || SP.enterprise;
  try {
    var userMsg = body.context ? 'Context:\n' + body.context + '\n\nQuestion: ' + question : question;
    var answer = await groqChat(system, userMsg, body.maxTokens || 1024);
    return res.json({ ok: true, app: appType, question, answer, createdAt: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/prompt', async (req, res) => {
  try {
    const { key, context } = req.body || {};
    const prompts = {
      doc_controller: 'You are a financial document controller AI. Analyze accounting documents for errors, missing data, and compliance issues. Be precise and actionable.',
      doc_cfo: 'You are a CFO-level financial AI. Provide executive-level analysis of financial documents with strategic recommendations and risk assessment.',
      doc_variance: 'You are a variance analysis AI. Identify budget variances, anomalies, and financial discrepancies. Quantify impact and recommend corrective actions.',
      doc_triage: 'You are a financial document triage AI. Classify document type, extract key fields, flag critical items, and route to appropriate workflow.'
    };
    const prompt = prompts[key] || 'You are a financial operations AI assistant.';
    return res.json({ ok: true, prompt, context: context || '' });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/financial/query', async (req, res) => {
  try {
    const { system, message, question, query, maxTokens, messages } = req.body || {};
    let msg, sys;
    if (messages && Array.isArray(messages)) {
      sys = messages.find(m => m.role === 'system')?.content || SP.financial;
      msg = messages.find(m => m.role === 'user')?.content || '';
    } else {
      msg = message || question || query || '';
      sys = system || SP.financial;
    }
    if (!msg) return res.status(400).json({ ok: false, error: 'message required' });
    msg = msg.slice(0, 3000);
    let a = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        a = await groqChat(sys, msg, Math.min(maxTokens || 700, 700));
        break;
      } catch(retryErr) {
        if (attempt === 2) throw retryErr;
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() });
  }
  catch (e) {
    console.error('FINANCIAL QUERY ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message, detail: e.stack?.slice(0,200) });
  }
});

app.post('/api/mortgage/query', async (req, res) => {
  try { var sys = req.body.context || req.body.system || SP.mortgage; var a = await groqChat(sys, req.body.question || req.body.query || '', req.body.maxTokens || 1024); return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() }); }
  catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/legal/query', async (req, res) => {
  try { var a = await groqChat(SP.legal, req.body.question || req.body.query || '', req.body.maxTokens || 1024); return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() }); }
  catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/construction/query', async (req, res) => {
  try { var a = await groqChat(SP.construction, req.body.question || req.body.query || '', req.body.maxTokens || 400); return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() }); }
  catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/o2c/query', async (req, res) => {
  const { orders, kpis, sla_breaches, stage_distribution, context, maxTokens } = req.body || {};
  if (!Array.isArray(orders)) return res.status(400).json({ ok: false, error: 'orders array required' });
  const summary = JSON.stringify({ kpis, sla_breaches, stage_distribution, order_count: orders.length }, null, 2);
  const prompt = `Current O2C pipeline snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the top risks, the root cause of any SLA breaches, and the single most important next action for each at-risk order. Be specific and reference order IDs.`;
  try {
    const answer = await groqChat(SP.o2c, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('O2C GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/crm/query', async (req, res) => {
  const { leads, contacts, accounts, opportunities, cases, kpis, lead_breaches, opp_breaches, case_breaches, context, maxTokens } = req.body || {};
  const summary = JSON.stringify({
    kpis,
    lead_breaches, opp_breaches, case_breaches,
    counts: {
      leads: Array.isArray(leads) ? leads.length : undefined,
      contacts: Array.isArray(contacts) ? contacts.length : undefined,
      accounts: Array.isArray(accounts) ? accounts.length : undefined,
      opportunities: Array.isArray(opportunities) ? opportunities.length : undefined,
      cases: Array.isArray(cases) ? cases.length : undefined
    }
  }, null, 2);
  const prompt = `Current CRM snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the highest-risk leads/opportunities/cases, the root cause of any SLA breaches or stalled pipeline stages, and the single most important next action for each at-risk record. Reference record IDs.`;
  try {
    const answer = await groqChat(SP.crm, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('CRM GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


app.post('/api/noc/query', async (req, res) => {
  const { kpis, incident_breaches, alerts, devices_down, context, maxTokens } = req.body || {};
  const summary = JSON.stringify({
    kpis,
    incident_breaches,
    alerts,
    devices_down,
    counts: {
      alerts: Array.isArray(alerts) ? alerts.length : undefined,
      devices_down: Array.isArray(devices_down) ? devices_down.length : undefined
    }
  }, null, 2);
  const prompt = `Current NOC snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the highest-severity incidents, correlate any related alerts to their root incident, flag devices contributing to fleet-uptime risk, and the single most important next action for each at-risk incident or device. Reference incident/alert/device IDs.`;
  try {
    const answer = await groqChat(SP.noc, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('NOC GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


app.post('/api/approval/query', async (req, res) => {
  const { requests, kpis, sla_breaches, attention_flags, stage_distribution, context, maxTokens } = req.body || {};
  if (!Array.isArray(requests)) return res.status(400).json({ ok: false, error: 'requests array required' });
  const summary = JSON.stringify({ kpis, sla_breaches, attention_flags, stage_distribution, request_count: requests.length }, null, 2);
  const prompt = `Current Approval Center snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the highest-risk approval requests, root causes of SLA breaches or escalations, delegation conflicts, and the single most important next action per at-risk request. Reference request IDs. Be specific and operational.`;
  try {
    const answer = await groqChat(SP.approval, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('APPROVAL GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── FOUNDATION: AI Decision Engine ─────────────────────────────────────────
// Generic cross-war-room decision endpoint. Every vertical (o2c, crm, approval,
// cpq, catalog, mdm, and future phases) can call this instead of a bespoke
// /api/{vertical}/query route. `vertical` selects the SP[] system prompt;
// `mode` selects the analysis type; `snapshot` is the vertical's own JSON
// shape (kpis, breaches, records, whatever it already sends).
const FOUNDATION_MODES = {
  root_cause: 'Identify the root cause of the flagged breaches/anomalies below. For each, trace back to the specific operational or data condition that caused it. Reference record/order/request IDs. Be precise and operational. No preamble.',
  anomaly: 'Scan the snapshot below for anomalies -- values, patterns, or records that deviate from expected norms. Rank by severity. Reference specific IDs. No preamble.',
  recommendation: 'Given the snapshot below, recommend the single most important next action for each at-risk item, ordered by priority. Reference specific IDs. Be specific and operational. No preamble.',
  impact: 'Given the snapshot below, quantify the business impact (revenue, cost, SLA, risk exposure) of the flagged items if left unaddressed. Reference specific IDs. No preamble.',
  predictive: 'Given the snapshot below, predict which currently-healthy items are most likely to breach SLA or become at-risk next, and why. Reference specific IDs. No preamble.'
};

app.post('/api/foundation/decision', async (req, res) => {
  const { vertical, mode, snapshot, context, maxTokens } = req.body || {};
  if (!vertical || !SP[vertical]) {
    return res.status(400).json({ ok: false, error: `Unknown vertical "${vertical}". Must be one of: ${Object.keys(SP).join(', ')}` });
  }
  const modeInstruction = FOUNDATION_MODES[mode] || FOUNDATION_MODES.recommendation;
  const summary = JSON.stringify(snapshot || {}, null, 2);
  const prompt = `Current ${vertical.toUpperCase()} snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    modeInstruction;
  try {
    const answer = await groqChat(SP[vertical], prompt, maxTokens || 1200);
    return res.json({ ok: true, vertical, mode: mode || 'recommendation', answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('FOUNDATION DECISION ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/cpq/query', async (req, res) => {
  const { quotes, kpis, sla_breaches, stage_distribution, context, maxTokens } = req.body || {};
  if (!Array.isArray(quotes)) return res.status(400).json({ ok: false, error: 'quotes array required' });
  const summary = JSON.stringify({ kpis, sla_breaches, stage_distribution, quote_count: quotes.length }, null, 2);
  const prompt = `Current CPQ pipeline snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the top risks across the quote pipeline, root causes of any SLA breaches or margin violations, and the single most important next action for each at-risk quote. Reference quote IDs. Be specific and operational.`;
  try {
    const answer = await groqChat(SP.cpq, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('CPQ GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/catalog/query', async (req, res) => {
  const { products, kpis, attention_flags, lifecycle_distribution, context, maxTokens } = req.body || {};
  if (!Array.isArray(products)) return res.status(400).json({ ok: false, error: 'products array required' });
  const summary = JSON.stringify({ kpis, attention_flags, lifecycle_distribution, product_count: products.length }, null, 2);
  const prompt = `Current Product Catalog snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the top catalog risks (low-stock, compliance, end-of-life, missing data), root causes, and the single most important next action for each flagged product. Reference SKUs/product IDs. Be specific and operational.`;
  try {
    const answer = await groqChat(SP.catalog, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('CATALOG GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


app.post('/api/insurance/query', async (req, res) => {
  const { system, message, maxTokens, question, query } = req.body || {};
  const msg = message || question || query || '';
  if (!msg) return res.status(400).json({ ok: false, error: 'message required' });
  try { const answer = await groqChat(system || SP.insurance, msg, maxTokens || 1400); res.json({ ok: true, answer }); }
  catch (e) { console.error('GROQ ERROR:', e.message); res.status(500).json({ ok: false, error: e.message, detail: e.stack }); }
});

app.post('/api/insurance/quiz', async (req, res) => {
  const { topic, state, lob, count } = req.body || {};
  const prompt = `Generate ${count || 10} exam-level multiple choice questions for "${topic}" on the ${state} ${lob} insurance licensing exam. Return ONLY a JSON array: [{"q":"Question?","options":["A","B","C","D"],"answer":0,"explanation":"..."}]`;
  try {
    const raw = await groqChat('You are an insurance licensing exam question writer. Respond ONLY with valid JSON — no markdown, no backticks.', prompt, 2200);
    res.json({ ok: true, questions: JSON.parse(raw.replace(/```json|```/g, '').trim()) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/insurance/flashcards', async (req, res) => {
  const { topic, state, lob } = req.body || {};
  const prompt = `Create 15 flashcards for "${topic}" on the ${state} ${lob} insurance exam. Return ONLY JSON: [{"term":"Term","definition":"..."}]`;
  try {
    const raw = await groqChat('You are an insurance exam flashcard creator. Respond ONLY with valid JSON.', prompt, 1400);
    res.json({ ok: true, cards: JSON.parse(raw.replace(/```json|```/g, '').trim()) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/insurance/ahip', async (req, res) => {
  const { moduleTitle, moduleId } = req.body || {};
  try {
    const answer = await groqChat('You are a Medicare insurance compliance expert and AHIP certification trainer. Format with HTML only.', `Create a comprehensive AHIP study guide for: "${moduleTitle}".`, 1600);
    res.json({ ok: true, answer, moduleId });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/insurance/ahip-quiz', async (req, res) => {
  const { count } = req.body || {};
  const prompt = `Generate ${count || 25} AHIP-style multiple choice questions. Return ONLY JSON: [{"q":"Question?","options":["A","B","C","D"],"answer":0,"explanation":"..."}]`;
  try {
    const raw = await groqChat('You are an AHIP Medicare certification exam question writer. Respond ONLY with valid JSON.', prompt, 2800);
    res.json({ ok: true, questions: JSON.parse(raw.replace(/```json|```/g, '').trim()) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/l1-copilot/assistant', async (req, res) => {
  try {
    var scenario = (req.body.scenario || req.body.question || req.body.query || '').trim();
    if (!scenario) return res.status(400).json({ ok: false, error: 'scenario is required' });
    var a = await groqChat(SP.l1Assistant, scenario, req.body.maxTokens || 700);
    return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/analyze', async (req, res) => {
  const { ticket, maxTokens } = req.body || {};
  if (!ticket || !ticket.description) return res.status(400).json({ ok: false, error: 'ticket.description required' });
  const summary = JSON.stringify({
    incident: ticket.incident, priority: ticket.priority, requester: ticket.requester,
    department: ticket.department, asset: ticket.asset, manufacturer: ticket.manufacturer,
    model: ticket.model, warranty: ticket.warranty
  }, null, 2);
  const prompt = `Ticket metadata:\n${summary}\n\nTicket description:\n${ticket.description}\n\n` +
    `Analyze this ticket and return ONLY valid JSON, no markdown, no backticks, in exactly this shape:\n` +
    `{"issue_summary":"one sentence","likely_causes":["cause 1","cause 2"],"confidence":0-100,` +
    `"affected_system":"short label","business_impact":"short label","severity":"Low|Medium|High|Critical",` +
    `"recommended_path":"the single next diagnostic or remediation step, and why"}`;
  try {
    const raw = await groqChat(SP.l1support, prompt, maxTokens || 900);
    const analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.json({ ok: true, analysis, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT ANALYZE ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/vendor', async (req, res) => {
  const { manufacturer, serviceTag, warranty, issueSummary, maxTokens } = req.body || {};
  if (!manufacturer) return res.status(400).json({ ok: false, error: 'manufacturer required' });
  const prompt = `Manufacturer: ${manufacturer}\nService tag / express service code: ${serviceTag || 'not provided'}\n` +
    `Warranty status: ${warranty || 'unknown'}\nIssue summary: ${issueSummary || 'not provided'}\n\n` +
    `Recommend which ${manufacturer} support tier to engage (e.g. ProSupport vs ProSupport Plus vs Basic/standard warranty), ` +
    `exactly what information the technician should have ready before contacting them (service tag, diagnostic codes, ` +
    `error logs, etc.), and whether this looks like a case for phone support, chat, or an on-site dispatch. Be concise and operational.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 700);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT VENDOR ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/resolution', async (req, res) => {
  const { ticket, analysis, notes, maxTokens } = req.body || {};
  if (!ticket) return res.status(400).json({ ok: false, error: 'ticket required' });
  const prompt = `Ticket description:\n${ticket}\n\n` +
    (analysis ? `AI analysis on file:\n${JSON.stringify(analysis, null, 2)}\n\n` : '') +
    (notes ? `Technician notes / troubleshooting steps performed:\n${notes}\n\n` : '') +
    `Write a resolution record ready to paste into ServiceNow, with these exact section headers on their own lines: ` +
    `Problem / Cause / Actions Taken / Resolution / Validation / Next Steps. Be factual — only state actions that are ` +
    `reflected in the notes above; do not invent steps that weren't performed.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 900);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT RESOLUTION ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/escalation', async (req, res) => {
  const { ticket, analysis, reason, evidence, recommendedTeam, maxTokens } = req.body || {};
  if (!ticket) return res.status(400).json({ ok: false, error: 'ticket required' });
  const prompt = `Ticket description:\n${ticket}\n\n` +
    (analysis ? `AI analysis on file:\n${JSON.stringify(analysis, null, 2)}\n\n` : '') +
    `Escalation reason given by technician: ${reason || 'not specified'}\n` +
    `Evidence attached: ${evidence || 'none noted'}\n` +
    `Technician-selected team: ${recommendedTeam || 'not selected'}\n\n` +
    `Write a short escalation package for the receiving L2/vendor team: confirm or correct the recommended team based ` +
    `on where the root cause actually sits, summarize what's been ruled out at L1, state the business impact, and list ` +
    `exactly what the receiving team needs to pick this up without re-doing L1 steps.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 800);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT ESCALATION ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/imaging', async (req, res) => {
  const { taskSequence, bootMethod, status, asset, model, maxTokens } = req.body || {};
  if (!status) return res.status(400).json({ ok: false, error: 'status required' });
  const prompt = `Task sequence / target image: ${taskSequence || 'not specified'}\nBoot method: ${bootMethod || 'not specified'}\n` +
    `Current stage: ${status}\nAsset: ${asset || 'not provided'}\nModel: ${model || 'not provided'}\n\n` +
    `The technician is imaging/re-imaging a Windows 11 endpoint. Given the current stage, identify the most likely cause if the ` +
    `deployment is stuck or has failed at this stage (e.g. PXE/DHCP scope options 66/67, WDS/MDT boundary issues, driver pack ` +
    `mismatch, disk/partition prep, domain join failures), the single next diagnostic step, and whether this needs a driver ` +
    `pack update, a network/DHCP fix, or is progressing normally. Be concise and operational.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 700);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT IMAGING ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/ad-intune', async (req, res) => {
  const { deviceName, joinType, compliance, bitlocker, issueSummary, maxTokens } = req.body || {};
  if (!joinType) return res.status(400).json({ ok: false, error: 'joinType required' });
  const prompt = `Device: ${deviceName || 'not provided'}\nJoin type: ${joinType}\nCompliance state: ${compliance || 'unknown'}\n` +
    `BitLocker/escrow status: ${bitlocker || 'unknown'}\nIssue summary: ${issueSummary || 'not provided'}\n\n` +
    `Diagnose the most likely cause of any compliance drift or BitLocker/escrow gap given this state (e.g. sync delay, ` +
    `stale Autopilot record, conditional access policy, missing compliance policy assignment, TPM/escrow failure), the exact ` +
    `path to look up or force a BitLocker recovery key (Entra ID device blade vs on-prem AD DSA), and whether Autopilot ` +
    `re-enrollment or a compliance policy re-push is needed. Be concise and operational.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 700);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT AD/INTUNE ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/sccm', async (req, res) => {
  const { collection, packageName, status, maxTokens } = req.body || {};
  if (!packageName) return res.status(400).json({ ok: false, error: 'packageName required' });
  const prompt = `Collection: ${collection || 'not provided'}\nPackage/Application: ${packageName}\nLast deployment status: ${status || 'unknown'}\n\n` +
    `Diagnose the likely cause of this SCCM/Software Center deployment state (e.g. content not found on distribution point, ` +
    `client cache exhaustion, boundary/collection membership evaluation delay, execution timeout, pending restart chaining), ` +
    `the single next action (retry deployment, re-distribute content, clear ccmcache, manual install via Software Center, or ` +
    `escalate to the SCCM admin team), and whether this is an L1-actionable fix or needs elevated console access. Be concise and operational.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 700);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT SCCM ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/schools/query', async (req, res) => {
  try { var a = await groqChat(SP.education, req.body.question || req.body.query || '', req.body.maxTokens || 1024); return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() }); }
  catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/strategist/query', async (req, res) => {
  try { var a = await groqChat(SP.strategist, req.body.question || req.body.query || '', req.body.maxTokens || 2048); return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() }); }
  catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// ── MISC ROUTES ───────────────────────────────────────────────────────────────
app.get(['/html/healthcare/poc-html', '/html/healthcare/poc-html/'], (req, res) => res.sendFile(path.join(dirPath, 'healthcare', 'poc-html', 'index.html')));
app.get('/_debug', (_req, res) => res.json({ dirname: __dirname, dirPath, suitesConfigured: suites.length, cacheBust: 'v2-20260607' }));
app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.sendFile(path.join(dirPath, 'bpo', 'bpo-command-center.html'), (err) => {
    if (err) res.sendFile(path.join(dirPath, 'healthcare', 'hc-strategist', 'index.html'));
  });
});

/* ════════════════════════════════════════════════════════════════
   DOC ROUTER — paste this block into server.js
   Placement: anywhere after `const app = express()` and after
   `app.use(express.json(...))`, before `app.listen(...)`.
   Requires: process.env.GROQ_API_KEY already set (same as other nodes).
   Requires: Node 18+ for global fetch (already a project requirement).
════════════════════════════════════════════════════════════════ */

// Models — verify current availability in Groq console if these change
const GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Valid node IDs per vertical — keep in sync with VERTICALS in
// tsm-document-search.html if you add/rename nodes.
const DOC_ROUTER_NODES = {
  fo: ['fo-financial', 'fo-accounting', 'fo-pitch', 'fo-bpo', 'fo-demo', 'fo-index', 'strategist'],
  ins: ['ins-az', 'ins-hub', 'ins-bpo', 'ins-pitch', 'ins-index', 'strategist'],
  con: ['con-hub', 'con-pitch', 'con-permits', 'con-strategist', 'con-bpo', 'con-demo', 'con-index', 'strategist'],
  bpo: ['bpo-cmd', 'bpo-int1', 'bpo-access', 'bpo-launch', 'bpo-sops', 'bpo-sales', 'bpo-services', 'bpo-website', 'strategist'],
  re: ['re-finance', 're-market', 're-strategist', 're-exec', 're-doc-command', 'strategist'],
  leg: ['leg-index', 'leg-ediscovery', 'leg-strategist', 'leg-exec', 'strategist'],
  hc: ['hc-denial', 'strategist'],
};

const DOC_ROUTER_DOC_TYPES = [
  'CLAIM', 'CLAIM APPEAL', 'POLICY', 'VENDOR INVOICE', 'LEDGER',
  'PERMIT', 'REMITTANCE', 'DOCUMENT REPORT', 'ESCALATION',
  'CONTRACT', 'FILING', 'TITLE DOCUMENT', 'DENIAL',
];

const DOC_ROUTER_PROMPT = `You are TSM's document routing classifier. Analyze the document content (and filename) and return ONLY valid JSON — no markdown fences, no preamble, no commentary.

Return JSON matching exactly this schema:
{
  "documentType": one of ${JSON.stringify(DOC_ROUTER_DOC_TYPES)},
  "verticals": array, subset of ["fo","ins","con","bpo","re","leg","hc"] — include MULTIPLE verticals if the content is genuinely relevant to more than one (e.g. a vendor invoice tied to a construction project may be relevant to both "con" and "fo"; a property sale with a legal dispute may be relevant to both "re" and "leg"; a claim denial with financial exposure may be relevant to both "hc" and "fo"),
  "primaryVertical": one value from "verticals",
  "routing": {
    "<vertical>": { "sourceNode": "<one valid node id for that vertical>", "nodes": ["<valid node ids...>"] }
    ... one entry for EACH vertical listed in "verticals"
  },
  "fileName": suggested filename ending in ".record",
  "vendor": string or "",
  "invoiceNo": string or "",
  "exclusionCode": string or "",
  "amount": number — dollar exposure/value, 0 if none applicable,
  "client": string or "",
  "ref": string or "",
  "summary": one short sentence describing the document,
  "defectFlags": array of short strings — specific issues/exceptions found in the document. For vertical "re", choose ONLY from this fixed set when applicable: ["Financing Failure","Appraisal Gap","Title Defect","Inspection Issues","UW Conditions","Closing Delay"], and use them to inform routing.re.sourceNode (Financing Failure->re-finance, Appraisal Gap->re-market, Title Defect/UW Conditions->re-strategist, Closing Delay->re-exec, Inspection Issues->re-doc-command). For all other verticals, use concise 2-4 word freeform issue labels relevant to the content (e.g. "Coverage Gap", "Code Violation", "Late Filing"), or [] if no issues are present,
  "bnca": boolean — true ONLY if the document represents an anomaly, discrepancy, denial, dispute, or risk that should escalate to BNCA review
}

Valid node IDs per vertical:
fo:  ${DOC_ROUTER_NODES.fo.join(', ')}
ins: ${DOC_ROUTER_NODES.ins.join(', ')}
con: ${DOC_ROUTER_NODES.con.join(', ')}
bpo: ${DOC_ROUTER_NODES.bpo.join(', ')}
re:  ${DOC_ROUTER_NODES.re.join(', ')}  — finance/dti/loan/mortgage->re-finance, appraisal/valuation/comps->re-market, title/lien/compliance/disclosure->re-strategist, closing/escrow/hoa/wire->re-exec, intake/upload/extract->re-doc-command
leg: ${DOC_ROUTER_NODES.leg.join(', ')}
hc:  ${DOC_ROUTER_NODES.hc.join(', ')}

Rules:
- Always include "strategist" in routing.<vertical>.nodes for every vertical listed.
- If "bnca" is true, also append "bnca-engine" to routing.<vertical>.nodes for every vertical listed.
- "sourceNode" must be the node most directly responsible for this document type (not "strategist" unless nothing else fits).
- If the document doesn't clearly belong anywhere, return "verticals": [] and leave "routing" as {}.
- Be conservative with "bnca" — only flag genuine anomalies, denials, disputes, code violations, SLA breaches, or financial exposure outliers.`;

// crude in-memory rate limit: 20 requests / 5 min / IP
const docRouterHits = new Map();
function docRouterRateOk(ip) {
  const now = Date.now();
  const hits = (docRouterHits.get(ip) || []).filter(t => now - t < 5 * 60 * 1000);
  if (hits.length >= 20) return false;
  hits.push(now);
  docRouterHits.set(ip, hits);
  return true;
}

app.post('/api/doc-router/classify', async (req, res) => {
  try {
    if (!docRouterRateOk(req.ip)) {
      return res.status(429).json({ error: 'Rate limit exceeded — try again shortly.' });
    }

    const { fileName, mimeType, textContent, imageBase64 } = req.body || {};
    if (!textContent && !imageBase64) {
      return res.status(400).json({ error: 'No content provided.' });
    }

    let userContent;
    let model;

    if (imageBase64) {
      model = GROQ_VISION_MODEL;
      userContent = [
        { type: 'text', text: `Filename: ${fileName || 'unknown'}\n\n${DOC_ROUTER_PROMPT}` },
        { type: 'image_url', image_url: { url: `data:${mimeType || 'image/png'};base64,${imageBase64}` } },
      ];
    } else {
      model = GROQ_TEXT_MODEL;
      userContent = `Filename: ${fileName || 'unknown'}\n\nDocument content:\n${String(textContent).slice(0, 12000)}\n\n${DOC_ROUTER_PROMPT}`;
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Respond with ONLY valid JSON. No markdown fences, no preamble, no trailing text.' },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[doc-router] Groq error:', groqRes.status, errText);
      return res.status(502).json({ error: 'Classification service error.' });
    }

    const data = await groqRes.json();
    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('[doc-router] Bad JSON from model:', data.choices?.[0]?.message?.content);
      return res.status(502).json({ error: 'Invalid classification response.' });
    }

    res.json(parsed);
  } catch (err) {
    console.error('[doc-router] error:', err);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── COLLECTIVE BNCA ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const COLLECTIVE_VERTICALS = ['healthcare', 'finops', 'bpo', 'legal', 'real-estate', 'insurance', 'construction', 'o2c', 'crm', 'cpq'];

const COLLECTIVE_SIGNALS = []; // { vertical, signal, severity, riskLevel, confidence, topIssue, ownerLanes, hitlRequired, actions, impactDelta, kpi, warRoom, bnca, timestamp, source }
const COLLECTIVE_BNCA = [];   // synthesis results

// POST /api/collective/signal — war rooms push their BNCA signal here.
// Accepts both the legacy 3-field shape (vertical, signal, severity) and the
// richer war-room payload (warRoom, bnca, confidence, riskLevel, topIssue,
// ownerLanes, hitlRequired, actions, impactDelta, kpi).
app.post('/api/collective/signal', (req, res) => {
  const {
    vertical, signal, severity, source,
    warRoom, bnca, confidence, riskLevel, topIssue,
    ownerLanes, hitlRequired, actions, impactDelta, kpi
  } = req.body || {};
  if (!vertical) return res.status(400).json({ ok: false, error: 'vertical required' });
  const entry = {
    vertical,
    signal: signal || topIssue || (typeof bnca === 'string' ? bnca.slice(0, 200) : '') || 'War room signal received',
    severity: severity || riskLevel || 'MEDIUM',
    riskLevel: riskLevel || severity || 'WATCH',
    confidence: confidence != null ? confidence : null,
    topIssue: topIssue || '',
    warRoom: warRoom || '',
    bnca: bnca || '',
    ownerLanes: ownerLanes || [],
    hitlRequired: !!hitlRequired,
    actions: actions || [],
    impactDelta: impactDelta || '',
    kpi: kpi || {},
    source: source || '',
    timestamp: Date.now()
  };
  COLLECTIVE_SIGNALS.unshift(entry);
  if (COLLECTIVE_SIGNALS.length > 200) COLLECTIVE_SIGNALS.length = 200;
  res.json({ ok: true, entry });
});

// GET /api/collective/signals — fetch all pushed signals
app.get('/api/collective/signals', (req, res) => {
  res.json({ ok: true, signals: COLLECTIVE_SIGNALS });
});

// DELETE /api/collective/signals — clear all signals
app.delete('/api/collective/signals', (req, res) => {
  COLLECTIVE_SIGNALS.length = 0;
  res.json({ ok: true });
});

// POST /api/collective/bnca — run cross-vertical synthesis via Groq
app.post('/api/collective/bnca', async (req, res) => {
  try {
    if (!COLLECTIVE_SIGNALS.length) return res.status(400).json({ ok: false, error: 'No signals to synthesize' });
    const prompt = `You are TSM's cross-vertical BNCA synthesizer. Given the following signals from multiple verticals, identify: (1) conflicts between verticals, (2) synergies or compounding risks, (3) a ranked HITL decision queue. Respond ONLY in valid JSON with keys: conflicts (array), synergies (array), hitlQueue (array of {priority, vertical, action, rationale}), summary (string).\n\nSignals:\n${JSON.stringify(COLLECTIVE_SIGNALS.slice(0, 50), null, 2)}`;
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Respond with ONLY valid JSON. No markdown fences, no preamble.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });
    if (!groqRes.ok) return res.status(502).json({ ok: false, error: 'Groq error' });
    const data = await groqRes.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const result = { ...parsed, timestamp: Date.now(), signalCount: COLLECTIVE_SIGNALS.length };
    COLLECTIVE_BNCA.unshift(result);
    if (COLLECTIVE_BNCA.length > 20) COLLECTIVE_BNCA.length = 20;
    res.json({ ok: true, bnca: result });
  } catch (err) {
    console.error('[collective/bnca] error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/collective/bnca/latest — fetch most recent synthesis
app.get('/api/collective/bnca/latest', (req, res) => {
  res.json({ ok: true, bnca: COLLECTIVE_BNCA[0] || null });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── END COLLECTIVE BNCA ───────────────════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// ── WIP / EXECUTION COMMAND CENTER ────────────────────────────────────────────
// Per-vertical: WIP tasks, readiness score, data quality, decision queue, trends.
// ══════════════════════════════════════════════════════════════════════════════


// ── WIP PERSISTENCE LAYER ────────────────────────────────────────────────────
// Backed by Fly Volume mounted at /app/data (see fly.toml [mounts]).
// Falls back to local ./data if volume path is unavailable (local dev).
const WIP_DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data');
if (!fs.existsSync(WIP_DATA_DIR)) fs.mkdirSync(WIP_DATA_DIR, { recursive: true });
const WIP_STATE_FILE = path.join(WIP_DATA_DIR, 'wip-master.json');

function loadWipState() {
  try {
    if (fs.existsSync(WIP_STATE_FILE)) {
      const raw = fs.readFileSync(WIP_STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        tasks: parsed.tasks || {},
        readiness: parsed.readiness || {},
        dataQuality: parsed.dataQuality || {},
        decisions: parsed.decisions || {},
        trends: parsed.trends || {}
      };
    }
  } catch (err) {
    console.error('[wip-persistence] load failed, starting empty:', err.message);
  }
  return { tasks: {}, readiness: {}, dataQuality: {}, decisions: {}, trends: {} };
}

let wipSaveTimer = null;
function saveWipState() {
  // debounce rapid writes
  if (wipSaveTimer) clearTimeout(wipSaveTimer);
  wipSaveTimer = setTimeout(() => {
    try {
      const snapshot = {
        tasks: WIP_TASKS, readiness: WIP_READINESS, dataQuality: WIP_DATA_QUALITY,
        decisions: WIP_DECISIONS, trends: WIP_TRENDS, savedAt: Date.now()
      };
      fs.writeFileSync(WIP_STATE_FILE, JSON.stringify(snapshot, null, 2));
    } catch (err) {
      console.error('[wip-persistence] save failed:', err.message);
    }
  }, 250);
}

const _WIP_LOADED = loadWipState();
const WIP_TASKS = _WIP_LOADED.tasks;         // vertical -> [ {id, action, owner, status, due, risk, createdAt, updatedAt} ]
const WIP_READINESS = _WIP_LOADED.readiness;     // vertical -> { dataCompleteness, stakeholderCoverage, mitigationPlans, resourceAvailability, openRisks, updatedAt }
const WIP_DATA_QUALITY = _WIP_LOADED.dataQuality;  // vertical -> [ {id, source, status, updatedAt} ]
const WIP_DECISIONS = _WIP_LOADED.decisions;     // vertical -> [ {id, title, impact, cost, recommendation, confidence, status, createdAt, decidedAt} ]
const WIP_TRENDS = _WIP_LOADED.trends;        // vertical -> [ {id, event, date, resolutionHours, notes, createdAt} ]

function ensureWipVertical(v) {
  if (!COLLECTIVE_VERTICALS.includes(v)) return false;
  if (!WIP_TASKS[v]) WIP_TASKS[v] = [];
  if (!WIP_DATA_QUALITY[v]) WIP_DATA_QUALITY[v] = [];
  if (!WIP_DECISIONS[v]) WIP_DECISIONS[v] = [];
  if (!WIP_TRENDS[v]) WIP_TRENDS[v] = [];
  return true;
}

function computeReadinessOverall(r) {
  if (!r) return null;
  const fields = ['dataCompleteness', 'stakeholderCoverage', 'mitigationPlans', 'resourceAvailability', 'openRisks'];
  const vals = fields.map(f => Number(r[f])).filter(n => !isNaN(n));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// Map WIP verticals to live-data-store domains, where one exists.
// Only the 4 SAP-phase verticals that share the live-data-store pipeline
// have a real signal here — the other 6 (healthcare, finops, legal,
// real-estate, insurance, construction) have no server-side data source
// and stay manual-entry. This does not fabricate a value for them.
const WIP_LIVE_DATA_DOMAIN = { bpo: 'bpo', o2c: 'o2c', crm: 'crm', cpq: 'cpq' };

function getWipLiveSignal(vertical) {
  const domain = WIP_LIVE_DATA_DOMAIN[vertical];
  if (!domain) return { available: false };
  try {
    const stored = liveDataModule.readStore(domain);
    if (!stored || !Array.isArray(stored.records) || !stored.records.length) {
      return { available: false, domain };
    }
    return {
      available: true,
      domain,
      filename: stored.filename || null,
      uploadedAt: stored.uploaded_at || null,
      recordCount: stored.records.length
    };
  } catch (e) {
    return { available: false, domain };
  }
}

function wipId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// GET /api/wip/board?vertical=healthcare — combined read for the WIP Command Center page
app.get('/api/wip/board', (req, res) => {
  const v = req.query.vertical;
  if (!ensureWipVertical(v)) return res.status(400).json({ ok: false, error: `vertical must be one of: ${COLLECTIVE_VERTICALS.join(', ')}` });
  const liveSignal = getWipLiveSignal(v);
  let readiness = WIP_READINESS[v] || null;
  // Where a real live-data upload exists for this vertical, data completeness
  // is a known fact (data was actually supplied), not a guess -- override the
  // display value. Manual entries for the other 4 subjective fields are left
  // untouched; those aren't derivable from uploaded records.
  if (liveSignal.available) {
    readiness = Object.assign({}, readiness, { dataCompleteness: 100, dataCompletenessAuto: true });
  }
  res.json({
    ok: true,
    vertical: v,
    tasks: WIP_TASKS[v],
    readiness,
    readinessOverall: computeReadinessOverall(readiness),
    liveSignal,
    dataQuality: WIP_DATA_QUALITY[v],
    decisions: WIP_DECISIONS[v],
    trends: WIP_TRENDS[v]
  });
});

// ── WIP TASKS ──────────────────────────────────────────────────────────────────
app.post('/api/wip/task', (req, res) => {
  const { vertical, action, owner, status, due, risk } = req.body || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  if (!action) return res.status(400).json({ ok: false, error: 'action required' });
  const task = {
    id: wipId('wip'), action, owner: owner || 'Unassigned', status: status || 'TO DO',
    due: due || '', risk: risk || 'LOW', createdAt: Date.now(), updatedAt: Date.now()
  };
  WIP_TASKS[vertical].unshift(task);
  saveWipState();
  res.json({ ok: true, task });
});

app.patch('/api/wip/task/:id', (req, res) => {
  const { vertical } = req.body || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  const task = WIP_TASKS[vertical].find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ ok: false, error: 'task not found' });
  Object.assign(task, req.body, { id: task.id, vertical: undefined, updatedAt: Date.now() });
  delete task.vertical;
  saveWipState();
  res.json({ ok: true, task });
});

app.delete('/api/wip/task/:id', (req, res) => {
  const { vertical } = req.body || req.query || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  WIP_TASKS[vertical] = WIP_TASKS[vertical].filter(t => t.id !== req.params.id);
  saveWipState();
  res.json({ ok: true, deleted: req.params.id });
});

// ── READINESS SCORE ────────────────────────────────────────────────────────────
app.post('/api/wip/readiness', (req, res) => {
  const { vertical, dataCompleteness, stakeholderCoverage, mitigationPlans, resourceAvailability, openRisks } = req.body || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  const liveSignal = getWipLiveSignal(vertical);
  // If live data exists for this vertical, dataCompleteness is a known fact, not
  // a manual estimate -- always store 100 rather than whatever (or nothing) the
  // now-disabled slider on the client sent.
  const effectiveDataCompleteness = liveSignal.available ? 100 : dataCompleteness;
  WIP_READINESS[vertical] = { dataCompleteness: effectiveDataCompleteness, stakeholderCoverage, mitigationPlans, resourceAvailability, openRisks, updatedAt: Date.now() };
  saveWipState();
  const readiness = liveSignal.available
    ? Object.assign({}, WIP_READINESS[vertical], { dataCompletenessAuto: true })
    : WIP_READINESS[vertical];
  res.json({ ok: true, readiness, overall: computeReadinessOverall(readiness), liveSignal });
});

// ── DATA QUALITY ───────────────────────────────────────────────────────────────
app.post('/api/wip/data-quality', (req, res) => {
  const { vertical, source, status } = req.body || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  if (!source) return res.status(400).json({ ok: false, error: 'source required' });
  const list = WIP_DATA_QUALITY[vertical];
  const existing = list.find(d => d.source.toLowerCase() === String(source).toLowerCase());
  if (existing) {
    existing.status = status || existing.status;
    existing.updatedAt = Date.now();
    return res.json({ ok: true, entry: existing });
  }
  const entry = { id: wipId('dq'), source, status: status || 'UNKNOWN', updatedAt: Date.now() };
  list.unshift(entry);
  saveWipState();
  res.json({ ok: true, entry });
});

app.delete('/api/wip/data-quality/:id', (req, res) => {
  const { vertical } = req.body || req.query || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  WIP_DATA_QUALITY[vertical] = WIP_DATA_QUALITY[vertical].filter(d => d.id !== req.params.id);
  saveWipState();
  res.json({ ok: true, deleted: req.params.id });
});

// ── EXECUTIVE DECISION QUEUE ────────────────────────────────────────────────────
app.post('/api/wip/decision', (req, res) => {
  const { vertical, title, impact, cost, recommendation, confidence } = req.body || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  if (!title) return res.status(400).json({ ok: false, error: 'title required' });
  const decision = {
    id: wipId('dec'), title, impact: impact || '', cost: cost || '', recommendation: recommendation || '',
    confidence: confidence != null ? confidence : 80, status: 'PENDING', createdAt: Date.now(), decidedAt: null
  };
  WIP_DECISIONS[vertical].unshift(decision);
  saveWipState();
  res.json({ ok: true, decision });
});

app.patch('/api/wip/decision/:id', requireApiKey, (req, res) => {
  const { vertical, status } = req.body || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) return res.status(400).json({ ok: false, error: 'status must be APPROVED, REJECTED, or PENDING' });
  const decision = WIP_DECISIONS[vertical].find(d => d.id === req.params.id);
  if (!decision) return res.status(404).json({ ok: false, error: 'decision not found' });
  decision.status = status;
  decision.decidedAt = status === 'PENDING' ? null : Date.now();
  saveWipState();
  res.json({ ok: true, decision });
});

// ── TREND INTELLIGENCE ─────────────────────────────────────────────────────────
app.post('/api/wip/trend', (req, res) => {
  const { vertical, event, date, resolutionHours, notes } = req.body || {};
  if (!ensureWipVertical(vertical)) return res.status(400).json({ ok: false, error: 'valid vertical required' });
  if (!event) return res.status(400).json({ ok: false, error: 'event required' });
  const trend = {
    id: wipId('trend'), event, date: date || new Date().toISOString().slice(0, 10),
    resolutionHours: resolutionHours != null ? resolutionHours : null, notes: notes || '', createdAt: Date.now()
  };
  WIP_TRENDS[vertical].unshift(trend);
  saveWipState();
  res.json({ ok: true, trend });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── END WIP / EXECUTION COMMAND CENTER ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── PHASE 9: CAPABILITY DECISION ENGINES (CRM, CPQ, O2C, Approval, Catalog) ───
// Same recommendation pattern as MDM's decision engine (Phase 5), extended to
// the remaining capability rows in the Enterprise Capability Services Layer
// so every one of them can feed the Digital Twin's decision-intelligence
// rollup below. CRM/CPQ/O2C/Approval share a generic stage/SLA breach shape
// (server/capability-engines/stage-breach-engine.js); Catalog is a distinct
// stock/compliance/lifecycle shape and gets its own small engine. Governance
// stays a rollup-only capability, same as Digital Twin itself.
const CRM_MODEL = require('./html/war-rooms/crm/data/crm-model.json');
const CPQ_MODEL = require('./html/war-rooms/cpq/data/cpq-model.json');
const O2C_MODEL = require('./html/war-rooms/o2c/data/o2c-model.json');
const APPROVAL_MODEL = require('./html/war-rooms/approval/data/approval-model.json');
const CATALOG_MODEL = require('./html/war-rooms/catalog/data/catalog-model.json');

const CrmEngine = require('./server/capability-engines/crm-engine');
const CpqEngine = require('./server/capability-engines/cpq-engine');
const O2cEngine = require('./server/capability-engines/o2c-engine');
const ApprovalEngine = require('./server/capability-engines/approval-engine');
const CatalogEngine = require('./server/capability-engines/catalog-engine');

// One resolved-id set + decision log per vertical, mirroring MDM_RESOLVED_RECS
// / MDM_RECOMMENDATION_DECISIONS so an approved/dismissed item doesn't keep
// reappearing on the next fetch (engines are stateless/regenerated each call).
const CAPABILITY_RESOLVED = { crm: new Set(), cpq: new Set(), o2c: new Set(), approval: new Set(), catalog: new Set() };
const CAPABILITY_DECISIONS = { crm: [], cpq: [], o2c: [], approval: [], catalog: [] };

const CAPABILITY_ENGINES = {
  crm:      { model: CRM_MODEL,      generate: CrmEngine.generateRecommendations },
  cpq:      { model: CPQ_MODEL,      generate: CpqEngine.generateRecommendations },
  o2c:      { model: O2C_MODEL,      generate: O2cEngine.generateRecommendations },
  approval: { model: APPROVAL_MODEL, generate: ApprovalEngine.generateRecommendations },
  catalog:  { model: CATALOG_MODEL,  generate: CatalogEngine.generateRecommendations },
};

function registerCapabilityDecisionRoutes(targetApp) {
  for (const [vertical, cfg] of Object.entries(CAPABILITY_ENGINES)) {
    targetApp.get(`/api/${vertical}/recommendations`, (req, res) => {
      const resolved = CAPABILITY_RESOLVED[vertical];
      const recs = cfg.generate(cfg.model).filter(r => !resolved.has(r.id));
      res.json({ ok: true, vertical, count: recs.length, recommendations: recs });
    });

    targetApp.post(`/api/${vertical}/recommendations/:id/approve`, requireApiKey, (req, res) => {
      const { actor } = req.body || {};
      const rec = cfg.generate(cfg.model).find(r => r.id === req.params.id);
      if (!rec) return res.status(404).json({ ok: false, error: 'Recommendation not found or already resolved' });
      CAPABILITY_RESOLVED[vertical].add(rec.id);
      CAPABILITY_DECISIONS[vertical].push({
        id: `DEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recommendationId: rec.id, type: rec.type, decision: 'APPROVED',
        actor: actor || 'Unassigned', ts: new Date().toISOString()
      });
      res.json({ ok: true, resolved: rec });
    });

    targetApp.post(`/api/${vertical}/recommendations/:id/dismiss`, requireApiKey, (req, res) => {
      const { actor } = req.body || {};
      const rec = cfg.generate(cfg.model).find(r => r.id === req.params.id);
      if (!rec) return res.status(404).json({ ok: false, error: 'Recommendation not found or already resolved' });
      CAPABILITY_RESOLVED[vertical].add(rec.id);
      CAPABILITY_DECISIONS[vertical].push({
        id: `DEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recommendationId: rec.id, type: rec.type, decision: 'DISMISSED',
        actor: actor || 'Unassigned', ts: new Date().toISOString()
      });
      res.json({ ok: true, resolved: rec });
    });
  }
}
registerCapabilityDecisionRoutes(app);

app.get('/api/capability-engines/summary', (req, res) => {
  const summary = {};
  for (const [vertical, cfg] of Object.entries(CAPABILITY_ENGINES)) {
    const resolved = CAPABILITY_RESOLVED[vertical];
    const open = cfg.generate(cfg.model).filter(r => !resolved.has(r.id));
    const bySeverity = open.reduce((acc, r) => { acc[r.severity] = (acc[r.severity] || 0) + 1; return acc; }, {});
    summary[vertical] = { openRecommendations: open.length, bySeverity, decisionsLogged: CAPABILITY_DECISIONS[vertical].length };
  }
  res.json({ ok: true, generatedAt: Date.now(), engines: summary });
});

// ── PHASE 10: ENTERPRISE DIGITAL TWIN ──────────────────────────────────────────
// Rolls up existing WIP + Governance + MDM state into one executive snapshot.
// Deliberately does NOT invent a parallel simulation dataset -- it reflects
// the same state every other war room already writes to, so the numbers
// stay consistent everywhere they're shown.
app.get('/api/digital-twin/snapshot', (req, res) => {
  const wipVerticals = Object.keys(typeof WIP_DECISIONS !== 'undefined' ? WIP_DECISIONS : {});
  const openRisks = (typeof GOVERNANCE_RISK_REGISTER !== 'undefined' ? GOVERNANCE_RISK_REGISTER : [])
    .filter(r => r.status === 'OPEN').length;
  const mdmDomains = typeof MDM_SEED_DATA !== 'undefined' ? Object.keys(MDM_SEED_DATA) : [];

  // AI Decision Intelligence Layer rollup: MDM (Phase 5) plus the five
  // capability engines above (Phase 9) — this is what makes that layer real
  // across all 10 Enterprise Capability Services Layer rows rather than just
  // MDM/Integration Hub/WIP.
  let mdmOpenRecs = 0;
  try {
    mdmOpenRecs = generateRecommendations(MDM_SEED_DATA, MDM_RESOLVED_RECS).length;
  } catch (e) { /* MDM engine not loaded yet at snapshot time — leave at 0 */ }

  const capabilityEngines = { mdm: mdmOpenRecs };
  let capabilityOpenTotal = mdmOpenRecs;
  for (const [vertical, cfg] of Object.entries(CAPABILITY_ENGINES)) {
    const resolved = CAPABILITY_RESOLVED[vertical];
    const openCount = cfg.generate(cfg.model).filter(r => !resolved.has(r.id)).length;
    capabilityEngines[vertical] = openCount;
    capabilityOpenTotal += openCount;
  }

  res.json({
    ok: true,
    generatedAt: Date.now(),
    wip: { verticalsTracked: wipVerticals.length, verticals: wipVerticals },
    governance: { openRisks },
    mdm: { domainsTracked: mdmDomains.length, domains: mdmDomains },
    decisionIntelligence: {
      enginesLive: Object.keys(capabilityEngines).length,
      totalCapabilityRows: 10,
      openRecommendations: capabilityOpenTotal,
      byCapability: capabilityEngines
    },
  });
});

app.post('/api/digital-twin/query', async (req, res) => {
  const { domains, signals, forecasts, health_score, maxTokens } = req.body || {};
  if (!Array.isArray(domains)) return res.status(400).json({ ok: false, error: 'domains array required' });
  const summary = JSON.stringify({
    health_score,
    domains: domains.map(d => ({ name: d.name, score: d.score, delta: d.delta })),
    recent_signals: (signals || []).slice(0, 15).map(s => ({ text: s.text, src: s.src, time: s.time })),
    forecasts: (forecasts || []).map(f => ({ label: f.label, value: f.value, trend: f.trend }))
  }, null, 2);
  const prompt = `Current Enterprise Digital Twin snapshot:\n${summary}\n\nSynthesize an executive brief: identify the domains driving the biggest swings in enterprise health, the highest-priority cross-domain risk, and the single most important executive action this week. Reference domain names and specific figures. Be specific and operational.`;
  try {
    const answer = await groqChat(SP.digitalTwin, prompt, maxTokens || 1400);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('DIGITAL TWIN GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


// ── PHASE 8: GOVERNANCE & COMPLIANCE ───────────────────────────────────────────
const GOVERNANCE_AUDIT_LOG = [];
const GOVERNANCE_RISK_REGISTER = [];

function governanceId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

app.post('/api/governance/audit', (req, res) => {
  const { actor, action, resource, vertical } = req.body || {};
  if (!actor || !action) return res.status(400).json({ ok: false, error: "actor and action required" });
  const entry = { id: governanceId('audit'), actor, action, resource: resource || null, vertical: vertical || null, ts: Date.now() };
  GOVERNANCE_AUDIT_LOG.push(entry);
  res.json({ ok: true, entry });
});

app.get('/api/governance/audit', (req, res) => {
  const { vertical, limit } = req.query;
  let entries = GOVERNANCE_AUDIT_LOG;
  if (vertical) entries = entries.filter(e => e.vertical === vertical);
  entries = entries.slice(-1 * (parseInt(limit, 10) || 100));
  res.json({ ok: true, entries });
});

app.post('/api/governance/risk', (req, res) => {
  const { title, severity, owner, vertical } = req.body || {};
  if (!title || !severity) return res.status(400).json({ ok: false, error: "title and severity required" });
  const risk = { id: governanceId('risk'), title, severity, owner: owner || 'Unassigned', vertical: vertical || null, status: 'OPEN', createdAt: Date.now() };
  GOVERNANCE_RISK_REGISTER.push(risk);
  res.json({ ok: true, risk });
});

app.get('/api/governance/risk', (req, res) => {
  res.json({ ok: true, risks: GOVERNANCE_RISK_REGISTER });
});

app.post('/api/governance/risk/:id/resolve', requireApiKey, (req, res) => {
  const risk = GOVERNANCE_RISK_REGISTER.find(r => r.id === req.params.id);
  if (!risk) return res.status(404).json({ ok: false, error: "Risk not found" });
  risk.status = 'RESOLVED';
  risk.resolvedAt = Date.now();
  res.json({ ok: true, risk });
});

app.post('/api/governance/query', async (req, res) => {
  const { controls, risks, audit, kpis, maxTokens } = req.body || {};
  if (!Array.isArray(controls)) return res.status(400).json({ ok: false, error: 'controls array required' });
  const summary = JSON.stringify({
    kpis,
    failing_or_review_controls: (controls || []).filter(c => c.status !== 'PASS'),
    at_risk: (risks || []).filter(r => r.status === 'OPEN' || r.severity >= 70),
    flagged_or_blocked_audit_events: (audit || []).filter(a => a.result !== 'OK')
  }, null, 2);
  const prompt = `Current governance & compliance snapshot:\n${summary}\n\nIdentify the highest-priority failing or at-risk controls, the risks most likely to escalate, and any suspicious or flagged audit events requiring follow-up. Reference control IDs and risk IDs. Recommend the specific next action for each. Be specific and operational.`;
  try {
    const answer = await groqChat(SP.governance, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('GOVERNANCE GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


// ── PHASE 7: ENTERPRISE INTEGRATION HUB ────────────────────────────────────────
let INTEGRATION_CATALOG = [
  {
    "id": "int-01",
    "system": "CRM",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  },
  {
    "id": "int-02",
    "system": "ERP",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  },
  {
    "id": "int-03",
    "system": "HR",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  },
  {
    "id": "int-04",
    "system": "Finance",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  },
  {
    "id": "int-05",
    "system": "Supply Chain",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  },
  {
    "id": "int-06",
    "system": "Manufacturing",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  },
  {
    "id": "int-07",
    "system": "BI",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  },
  {
    "id": "int-08",
    "system": "AI",
    "status": "healthy",
    "lastSync": null,
    "errorCount": 0
  }
];

// Returns whichever catalog is currently "active": the live-uploaded one if
// a file has been uploaded via /api/live-data/integration-hub/upload, else
// the hardcoded sample INTEGRATION_CATALOG above.
function getActiveIntegrationCatalog() {
  try {
    const stored = liveDataModule.readStore('integration-hub');
    if (stored && Array.isArray(stored.records) && stored.records.length) {
      const normalized = stored.records.map((r, i) => ({
        id: r.id || `int-live-${i + 1}`,
        system: r.system || r.name || `System ${i + 1}`,
        status: r.status || 'healthy',
        lastSync: r.lastSync || null,
        errorCount: typeof r.errorCount === 'number' ? r.errorCount : 0
      }));
      return { records: normalized, live: true };
    }
  } catch (e) { /* fall through to sample */ }
  return { records: INTEGRATION_CATALOG, live: false };
}

// Persists a mutation (sync/error) back to wherever the record actually
// lives, so live-uploaded data doesn't silently revert to the file on the
// next request.
function persistIntegrationCatalog(records, live) {
  if (live) {
    const stored = liveDataModule.readStore('integration-hub') || {};
    stored.records = records;
    liveDataModule.writeStore('integration-hub', stored);
  } else {
    INTEGRATION_CATALOG = records;
  }
}

app.get('/api/integration/catalog', (req, res) => {
  const { records } = getActiveIntegrationCatalog();
  res.json({ ok: true, integrations: records });
});

app.post('/api/integration/:id/sync', requireApiKey, (req, res) => {
  const { records, live } = getActiveIntegrationCatalog();
  const item = records.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: "Integration not found" });
  item.lastSync = Date.now();
  item.status = 'healthy';
  persistIntegrationCatalog(records, live);
  res.json({ ok: true, integration: item });
});

app.post('/api/integration/:id/error', (req, res) => {
  const { records, live } = getActiveIntegrationCatalog();
  const item = records.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: "Integration not found" });
  item.errorCount = (item.errorCount || 0) + 1;
  item.status = item.errorCount >= 3 ? 'degraded' : 'warning';
  const message = (req.body && req.body.message) || `Sync error on ${item.system}`;
  INTEGRATION_ERROR_LOG.push({ id: `err-${Date.now()}`, ts: new Date().toISOString(), system: item.system, flowId: null, message });
  persistIntegrationCatalog(records, live);
  res.json({ ok: true, integration: item });
});

app.get('/api/integration/health', (req, res) => {
  const { records } = getActiveIntegrationCatalog();
  const healthy = records.filter(i => i.status === 'healthy').length;
  res.json({ ok: true, total: records.length, healthy, degraded: records.length - healthy });
});

// Point-to-point integration flows between systems — this IS the "integration catalog"
// and event bus visualization the doc calls for. INTEGRATION_CATALOG above is really a
// systems list; this is the actual connections between them, which the war room UI
// previously hardcoded client-side instead of asking the server for.
const INTEGRATION_FLOWS = [
  { id: 'flow-01', from: 'CRM', to: 'ERP', type: 'REST API', status: 'ok', throughputPerHr: 1240, latencyMs: 42 },
  { id: 'flow-02', from: 'ERP', to: 'Finance', type: 'IDOC', status: 'warning', throughputPerHr: 3310, latencyMs: 210 },
  { id: 'flow-03', from: 'Supply Chain', to: 'ERP', type: 'EDI', status: 'ok', throughputPerHr: 2180, latencyMs: 68 },
  { id: 'flow-04', from: 'Manufacturing', to: 'BI', type: 'Event Stream', status: 'ok', throughputPerHr: 5520, latencyMs: 33 },
  { id: 'flow-05', from: 'HR', to: 'Finance', type: 'REST API', status: 'ok', throughputPerHr: 440, latencyMs: 55 },
  { id: 'flow-06', from: 'AI', to: 'CRM', type: 'Webhook', status: 'ok', throughputPerHr: 670, latencyMs: 180 },
  { id: 'flow-07', from: 'BI', to: 'AI', type: 'GraphQL', status: 'warning', throughputPerHr: 920, latencyMs: 340 }
];

// Message queue monitor: backlog depth per flow. Depth/age drift a bit on each poll so
// the dashboard reads as live rather than static.
const MESSAGE_QUEUES = [
  { id: 'q-crm-erp', name: 'crm.orders.sync', flowId: 'flow-01', depth: 12, consumers: 3, oldestMsgAgeSec: 4 },
  { id: 'q-erp-fin', name: 'erp.finance.postings', flowId: 'flow-02', depth: 340, consumers: 2, oldestMsgAgeSec: 610 },
  { id: 'q-supply-erp', name: 'supply.inventory.updates', flowId: 'flow-03', depth: 28, consumers: 4, oldestMsgAgeSec: 9 },
  { id: 'q-mfg-bi', name: 'mfg.production.events', flowId: 'flow-04', depth: 5, consumers: 6, oldestMsgAgeSec: 1 },
  { id: 'q-bi-ai', name: 'bi.anomaly.signals', flowId: 'flow-07', depth: 87, consumers: 1, oldestMsgAgeSec: 420 }
];

// ETL job status
const ETL_JOBS = [
  { id: 'etl-01', name: 'Nightly GL Sync', system: 'ERP → Finance', status: 'success', lastRunISO: '2026-07-01T04:00:00Z', durationSec: 812, rowsProcessed: 48210 },
  { id: 'etl-02', name: 'CRM Contact Dedup Load', system: 'CRM → MDM', status: 'running', lastRunISO: '2026-07-01T13:40:00Z', durationSec: null, rowsProcessed: 12040 },
  { id: 'etl-03', name: 'Supply Chain Inventory Refresh', system: 'Supply Chain → ERP', status: 'failed', lastRunISO: '2026-07-01T02:15:00Z', durationSec: 94, rowsProcessed: 0, errorMsg: 'Timeout connecting to warehouse feed (10.2.4.18:443)' },
  { id: 'etl-04', name: 'BI Warehouse Aggregation', system: 'Manufacturing/Finance → BI', status: 'success', lastRunISO: '2026-07-01T05:30:00Z', durationSec: 2140, rowsProcessed: 918400 }
];

// Data lineage: which systems feed which shared entities, and where those entities flow
// downstream. Simple upstream/downstream graph, not a full column-level lineage engine —
// enough to answer "if CRM customer data is wrong, what else breaks downstream."
const DATA_LINEAGE = [
  { entity: 'Customer Master', upstream: ['CRM'], downstream: ['ERP', 'Finance', 'BI'] },
  { entity: 'Sales Order', upstream: ['CRM', 'ERP'], downstream: ['Finance', 'Supply Chain', 'BI'] },
  { entity: 'GL Posting', upstream: ['ERP'], downstream: ['Finance', 'BI'] },
  { entity: 'Production Event', upstream: ['Manufacturing'], downstream: ['BI', 'Supply Chain'] },
  { entity: 'Employee Record', upstream: ['HR'], downstream: ['Finance', 'BI'] }
];

// Real error log — /api/integration/:id/error below appends here, so the Error Handling
// Dashboard shows an actual event history, not just a bumped counter with no detail.
const INTEGRATION_ERROR_LOG = [
  { id: 'err-01', ts: '2026-07-01T13:12:00Z', system: 'Finance', flowId: 'flow-02', message: 'IDOC segment E1EDK01 rejected: missing required field WERKS' },
  { id: 'err-02', ts: '2026-07-01T11:48:00Z', system: 'BI', flowId: 'flow-07', message: 'GraphQL query timeout after 30000ms — anomaly-signals endpoint' }
];

app.get('/api/integration/detail', (req, res) => {
  const { records, live } = getActiveIntegrationCatalog();
  res.json({
    ok: true,
    systems: records,
    systems_source: live ? 'live' : 'sample',
    flows: INTEGRATION_FLOWS,
    queues: MESSAGE_QUEUES,
    etlJobs: ETL_JOBS,
    lineage: DATA_LINEAGE,
    errorLog: INTEGRATION_ERROR_LOG.slice(-100).reverse()
  });
});

app.post('/api/integration/query', async (req, res) => {
  const { systems, flows, queues, etlJobs, errorLog, kpis, maxTokens } = req.body || {};
  const summary = JSON.stringify({
    kpis,
    systems_summary: (systems || []).map(s => ({ system: s.system, status: s.status, errorCount: s.errorCount })),
    flow_bottlenecks: (flows || []).filter(f => f.status !== 'ok' || f.latencyMs > 150),
    queue_backlogs: (queues || []).filter(q => q.depth > 50 || q.oldestMsgAgeSec > 60),
    failed_etl: (etlJobs || []).filter(j => j.status === 'failed'),
    recent_errors: (errorLog || []).slice(0, 20)
  }, null, 2);
  const prompt = `Current integration hub snapshot:\n${summary}\n\nIdentify the highest-risk integration failures or bottlenecks right now, trace likely root cause across the affected flow/queue/ETL chain, and recommend specific remediation. Reference system and flow IDs. Be specific and operational.`;
  try {
    const answer = await groqChat(SP.integration, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('INTEGRATION GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


// ── PHASE 6: MASTER DATA MANAGEMENT (MDM) ──────────────────────────────────────
const { findDuplicates: mdmFindDuplicates, scoreDataset: mdmScoreDataset } = require('./html/mdm-suite/mdm-core.js');
const MDM_SEED_DATA = require('./html/mdm-suite/mdm-seed-data.json');
// Deep-cloned at load time, before any merge can mutate MDM_SEED_DATA, so a real
// reset is possible (restores retired records and clears the decision log).
const MDM_SEED_DATA_ORIGINAL = JSON.parse(JSON.stringify(MDM_SEED_DATA));

app.get('/api/mdm/analysis/:domain', (req, res) => {
  const domain = req.params.domain;
  const records = MDM_SEED_DATA[domain];
  if (!records) return res.status(404).json({ ok: false, error: `Unknown domain. Valid domains: ${Object.keys(MDM_SEED_DATA).join(', ')}` });
  res.json({
    ok: true,
    domain,
    duplicates: mdmFindDuplicates(records, domain),
    quality: mdmScoreDataset(records, domain)
  });
});

app.get('/api/mdm/summary', (req, res) => {
  const domains = Object.keys(MDM_SEED_DATA);
  const summary = domains.map(d => {
    const q = mdmScoreDataset(MDM_SEED_DATA[d], d);
    const dupes = mdmFindDuplicates(MDM_SEED_DATA[d], d);
    return { domain: d, avgQualityScore: q.avgScore, recordCount: q.recordCount, duplicateCount: dupes.length };
  });
  const overallScore = Math.round(summary.reduce((s, d) => s + d.avgQualityScore, 0) / (summary.length || 1));
  res.json({ ok: true, overallScore, domains: summary });
});

// Full detail across all domains: records + per-record quality/issues + duplicate clusters.
// This is the real single-source-of-truth feed the war room UI renders from.
app.get('/api/mdm/detail', (req, res) => {
  const domains = Object.keys(MDM_SEED_DATA);
  const records = [];
  const duplicates = [];
  domains.forEach(d => {
    const raw = MDM_SEED_DATA[d];
    const scored = mdmScoreDataset(raw, d);
    const dupes = mdmFindDuplicates(raw, d);
    const dupCountByRecordId = {};
    dupes.forEach(m => {
      dupCountByRecordId[m.recordA.id] = (dupCountByRecordId[m.recordA.id] || 0) + 1;
      dupCountByRecordId[m.recordB.id] = (dupCountByRecordId[m.recordB.id] || 0) + 1;
    });
    raw.forEach(r => {
      const s = scored.scores.find(x => x.recordId === r.id) || {};
      const dupCount = dupCountByRecordId[r.id] || 0;
      const status = dupCount > 0 ? 'DUPLICATE' : (s.overall < 70 ? 'INCOMPLETE' : 'CLEAN');
      records.push({
        id: r.id, domain: d, name: r.name,
        quality: s.overall ?? 0, duplicates: dupCount, status,
        issues: s.issues || [],
        steward: MDM_STEWARDS[d] || 'Unassigned',
        last_validated: MDM_LAST_VALIDATED[r.id] || 'Never'
      });
    });
    dupes.forEach(m => duplicates.push({ ...m, id: `${m.recordA.id}~${m.recordB.id}` }));
  });
  res.json({ ok: true, records, duplicates, mergeLog: MDM_MERGE_LOG.slice(-100).reverse() });
});

// Deterministic steward assignment + fake-but-stable "last validated" dates so the
// UI has something consistent to render without inventing new fabricated state each call.
const MDM_STEWARDS = {
  customer: 'R. Whitfield', vendor: 'M. Chen', gl: 'T. Osei',
  product: 'K. Park', employee: 'S. Novak', asset: 'D. Ibrahim',
  location: 'R. Whitfield', orgunit: 'M. Chen', costcenter: 'T. Osei', profitcenter: 'K. Park'
};
const MDM_LAST_VALIDATED = {};
(function seedValidatedDates(){
  const base = new Date('2026-06-20').getTime();
  let i = 0;
  Object.values(MDM_SEED_DATA).flat().forEach(r => {
    MDM_LAST_VALIDATED[r.id] = new Date(base + (i++ * 36e5 * 7)).toISOString().slice(0,10);
  });
})();

// In-memory version history / change-approval log. Every merge decision (approved or
// rejected) is appended here — this IS the audit trail for Phase 6's "version history"
// and "change approvals" requirements. Survives process lifetime, not restarts (matches
// the rest of the platform's in-memory-state pattern; swap for the Fly volume if needed).
const MDM_MERGE_LOG = [];

// ── AUTH: shared-secret gate for mutating endpoints ────────────────────────
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.TSM_API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

app.post('/api/mdm/merge', requireApiKey, (req, res) => {
  const { domain, survivorId, mergedId, actor, decision } = req.body || {};
  if (!domain || !survivorId || !mergedId) {
    return res.status(400).json({ ok: false, error: 'domain, survivorId, mergedId required' });
  }
  const raw = MDM_SEED_DATA[domain];
  if (!raw) return res.status(404).json({ ok: false, error: 'Unknown domain' });
  const survivor = raw.find(r => r.id === survivorId);
  const merged = raw.find(r => r.id === mergedId);
  if (!survivor || !merged) return res.status(404).json({ ok: false, error: 'Record not found in domain' });

  const entry = {
    id: `MRG-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    domain, survivorId, mergedId,
    survivorName: survivor.name, mergedName: merged.name,
    decision: decision === 'REJECTED' ? 'REJECTED' : 'APPROVED',
    actor: actor || 'Unassigned',
    ts: new Date().toISOString()
  };
  MDM_MERGE_LOG.push(entry);

  // Approved merge actually retires the losing record from the working dataset —
  // this is what makes it a real golden-record operation, not just a log entry.
  if (entry.decision === 'APPROVED') {
    MDM_SEED_DATA[domain] = raw.filter(r => r.id !== mergedId);
  }

  res.json({ ok: true, entry });
});

app.get('/api/mdm/merge-history', (req, res) => {
  res.json({ ok: true, log: MDM_MERGE_LOG.slice(-200).reverse() });
});

// ── PHASE 5: MDM DECISION ENGINE (recommendations + approve/reject) ───────────
const { generateRecommendations } = require('./html/mdm-suite/mdm-decision-engine.js');
// Tracks recommendation ids explicitly acted on. Merge recs don't strictly need
// this (retiring a record naturally removes the pair from regeneration), but
// quality-review recs flag a record without mutating it, so without this set
// a reviewed-and-dismissed item would just reappear on the next fetch.
const MDM_RESOLVED_RECS = new Set();
const MDM_RECOMMENDATION_DECISIONS = [];

app.get('/api/mdm/recommendations', (req, res) => {
  const recs = generateRecommendations(MDM_SEED_DATA, MDM_RESOLVED_RECS);
  res.json({ ok: true, count: recs.length, recommendations: recs });
});

app.post('/api/mdm/recommendations/:id/approve', requireApiKey, (req, res) => {
  const { actor } = req.body || {};
  const recs = generateRecommendations(MDM_SEED_DATA, MDM_RESOLVED_RECS);
  const rec = recs.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ ok: false, error: 'Recommendation not found or already resolved' });

  if (rec.type === 'merge') {
    const raw = MDM_SEED_DATA[rec.domain];
    const survivor = raw.find(r => r.id === rec.survivorId);
    const merged = raw.find(r => r.id === rec.mergedId);
    if (!survivor || !merged) return res.status(404).json({ ok: false, error: 'Underlying record no longer exists' });
    const entry = {
      id: `MRG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      domain: rec.domain, survivorId: rec.survivorId, mergedId: rec.mergedId,
      survivorName: survivor.name, mergedName: merged.name,
      decision: 'APPROVED', actor: actor || 'Unassigned', ts: new Date().toISOString(),
      recommendationId: rec.id
    };
    MDM_MERGE_LOG.push(entry);
    MDM_SEED_DATA[rec.domain] = raw.filter(r => r.id !== rec.mergedId);
  }

  MDM_RESOLVED_RECS.add(rec.id);
  MDM_MISSION_CLAIMS.delete(rec.id);
  MDM_RECOMMENDATION_DECISIONS.push({
    id: `DEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recommendationId: rec.id, domain: rec.domain, type: rec.type,
    decision: 'APPROVED', actor: actor || 'Unassigned', ts: new Date().toISOString()
  });
  res.json({ ok: true, resolved: rec });
});

app.post('/api/mdm/recommendations/:id/reject', requireApiKey, (req, res) => {
  const { actor } = req.body || {};
  const recs = generateRecommendations(MDM_SEED_DATA, MDM_RESOLVED_RECS);
  const rec = recs.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ ok: false, error: 'Recommendation not found or already resolved' });

  if (rec.type === 'merge') {
    MDM_MERGE_LOG.push({
      id: `MRG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      domain: rec.domain, survivorId: rec.survivorId, mergedId: rec.mergedId,
      survivorName: rec.survivorName, mergedName: rec.mergedName,
      decision: 'REJECTED', actor: actor || 'Unassigned', ts: new Date().toISOString(),
      recommendationId: rec.id
    });
  }

  MDM_RESOLVED_RECS.add(rec.id);
  MDM_MISSION_CLAIMS.delete(rec.id);
  MDM_RECOMMENDATION_DECISIONS.push({
    id: `DEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recommendationId: rec.id, domain: rec.domain, type: rec.type,
    decision: 'REJECTED', actor: actor || 'Unassigned', ts: new Date().toISOString()
  });
  res.json({ ok: true, resolved: rec });
});

app.get('/api/mdm/recommendation-decisions', (req, res) => {
  res.json({ ok: true, log: MDM_RECOMMENDATION_DECISIONS.slice(-200).reverse() });
});

// ── PHASE 6: MDM EXECUTIVE PORTAL ──────────────────────────────────────────
// Real governance KPI rollup, computed fresh from live MDM_SEED_DATA + the
// Phase 5 decision engine + the merge/decision logs -- no relay dependency,
// no AI dependency. This is the single-source-of-truth feed the executive
// portal renders from; the war-room-to-portal sessionStorage relay is kept
// as a fallback only (e.g. if this endpoint is ever unreachable client-side).
app.get('/api/mdm/executive-summary', (req, res) => {
  const domains = Object.keys(MDM_SEED_DATA);
  const domainSummaries = domains.map(d => {
    const q = mdmScoreDataset(MDM_SEED_DATA[d], d);
    const dupes = mdmFindDuplicates(MDM_SEED_DATA[d], d);
    return {
      domain: d,
      avgQualityScore: q.avgScore,
      recordCount: q.recordCount,
      duplicateCount: dupes.length,
      steward: MDM_STEWARDS[d] || 'Unassigned'
    };
  });

  const totalRecords = domainSummaries.reduce((s, d) => s + d.recordCount, 0);
  const totalDuplicates = domainSummaries.reduce((s, d) => s + d.duplicateCount, 0);
  const overallQuality = Math.round(
    domainSummaries.reduce((s, d) => s + d.avgQualityScore, 0) / (domainSummaries.length || 1)
  );

  const recs = generateRecommendations(MDM_SEED_DATA, MDM_RESOLVED_RECS);
  const riskBreakdown = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  recs.forEach(r => { riskBreakdown[r.risk] = (riskBreakdown[r.risk] || 0) + 1; });

  res.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    kpis: {
      total_records: totalRecords,
      duplicate_count: totalDuplicates,
      quality_score: overallQuality,
      pending_approvals: recs.length,
      anomalies: riskBreakdown.HIGH,
      stewards_active: new Set(Object.values(MDM_STEWARDS)).size
    },
    riskBreakdown,
    domains: domainSummaries.sort((a, b) => a.avgQualityScore - b.avgQualityScore),
    openRecommendations: recs.slice(0, 15),
    recentDecisions: MDM_RECOMMENDATION_DECISIONS.slice(-10).reverse()
  });
});

// ── PHASE 7: MDM MISSION QUEUE ──────────────────────────────────────────────
// A "mission" is an open Phase 5 recommendation plus claim/assignment state.
// No separate resolve step -- approving/rejecting the underlying recommendation
// (existing Phase 5 routes) is what retires a mission, so the queue can never
// drift out of sync with what recommendations actually exist.
const { buildQueue: mdmBuildQueue, summarize: mdmSummarizeQueue } = require('./html/mdm-suite/mdm-mission-queue.js');
const MDM_MISSION_CLAIMS = new Map(); // recommendationId -> { actor, claimedAt }

app.get('/api/mdm/mission-queue', (req, res) => {
  const queue = mdmBuildQueue(MDM_SEED_DATA, MDM_RESOLVED_RECS, MDM_MISSION_CLAIMS);
  res.json({ ok: true, summary: mdmSummarizeQueue(queue), queue });
});

app.post('/api/mdm/mission-queue/:id/claim', requireApiKey, (req, res) => {
  const { actor } = req.body || {};
  if (!actor) return res.status(400).json({ ok: false, error: 'actor required' });
  const queue = mdmBuildQueue(MDM_SEED_DATA, MDM_RESOLVED_RECS, MDM_MISSION_CLAIMS);
  const mission = queue.find(m => m.id === req.params.id);
  if (!mission) return res.status(404).json({ ok: false, error: 'Mission not found or already resolved' });
  if (mission.claimedBy && mission.claimedBy !== actor) {
    return res.status(409).json({ ok: false, error: `Already claimed by ${mission.claimedBy}` });
  }
  MDM_MISSION_CLAIMS.set(mission.id, { actor, claimedAt: new Date().toISOString() });
  res.json({ ok: true, mission: { ...mission, missionStatus: 'CLAIMED', claimedBy: actor } });
});

app.post('/api/mdm/mission-queue/:id/release', requireApiKey, (req, res) => {
  const existed = MDM_MISSION_CLAIMS.delete(req.params.id);
  if (!existed) return res.status(404).json({ ok: false, error: 'Mission was not claimed' });
  res.json({ ok: true, released: req.params.id });
});

// Real reset: restores every domain to its original seeded state (undoes any
// approved merges) and clears the decision log. Previously "RESET DATA" just
// re-fetched current state with no way to actually undo anything.
app.post('/api/mdm/reset', requireApiKey, (req, res) => {
  Object.keys(MDM_SEED_DATA_ORIGINAL).forEach(domain => {
    MDM_SEED_DATA[domain] = JSON.parse(JSON.stringify(MDM_SEED_DATA_ORIGINAL[domain]));
  });
  MDM_MERGE_LOG.length = 0;
  MDM_RESOLVED_RECS.clear();
  MDM_RECOMMENDATION_DECISIONS.length = 0;
  MDM_MISSION_CLAIMS.clear();
  res.json({ ok: true, reset: true });
});

app.post('/api/mdm/query', async (req, res) => {
  const { records, duplicates, kpis, context, maxTokens } = req.body || {};
  if (!Array.isArray(records)) return res.status(400).json({ ok: false, error: 'records array required' });
  const summary = JSON.stringify({
    kpis,
    record_count: records.length,
    duplicate_clusters: (duplicates || []).slice(0, 20).map(d => ({
      recordA: d.recordA?.id, recordB: d.recordB?.id, matchScore: d.matchScore, domain: d.domain
    })),
    flagged_records: records.filter(r => r.status !== 'CLEAN').slice(0, 30).map(r => ({
      id: r.id, domain: r.domain, status: r.status, quality: r.quality, issues: r.issues
    }))
  }, null, 2);
  const prompt = `Current MDM snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the highest-risk data anomalies, recommend which record should survive in each duplicate cluster and why, and flag any validation/stewardship gaps. Reference record IDs. Be specific and operational.`;
  try {
    const answer = await groqChat(SP.mdm, prompt, maxTokens || 1200);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('MDM GROQ ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


// ── HEALTH & STUB ROUTES ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[TSM GLOBAL ERROR]', err.message, err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
});

// ── START ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`TSM Platform Core Engine listening on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('💥 SERVER ERROR:', err.message, err.stack);
});