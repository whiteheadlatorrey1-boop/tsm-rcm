const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.NODE_PORT || 3000;

app.use(express.json({ limit: '6mb' }));

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://tsm-shell.fly.dev';
const DATA_DIR = path.join(__dirname, 'data', 'hc-strategist');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const NODE_STATE_FILE = path.join(DATA_DIR, 'node-state.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const SCORE_HISTORY_FILE = path.join(DATA_DIR, 'score-history.json');

const DEFAULT_PROFILE = {
  id: 'general-healthcare-om',
  name: 'General Healthcare Office Manager',
  company: 'General Healthcare',
  sector: 'healthcare',
  audience: 'office_manager',
  priorities: [
    'claims_backlog',
    'prior_auth_delay',
    'denial_rate',
    'staffing_throughput',
    'compliance_drift'
  ]
};

// ─────────────────────────────────────────────
// STORE HELPERS
// ─────────────────────────────────────────────
function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, '[]', 'utf8');
  if (!fs.existsSync(NODE_STATE_FILE)) fs.writeFileSync(NODE_STATE_FILE, '{}', 'utf8');
  if (!fs.existsSync(PROFILES_FILE)) fs.writeFileSync(PROFILES_FILE, JSON.stringify([DEFAULT_PROFILE], null, 2), 'utf8');
  if (!fs.existsSync(SCORE_HISTORY_FILE)) fs.writeFileSync(SCORE_HISTORY_FILE, '[]', 'utf8');
}
ensureStore();

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ─────────────────────────────────────────────
// NODE HEALTH / FRESHNESS / SCORING
// ─────────────────────────────────────────────
function minutesSince(isoString) {
  if (!isoString) return Infinity;
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.max(0, (Date.now() - then) / 60000);
}

function freshnessStatus(updatedAt) {
  const mins = minutesSince(updatedAt);
  if (mins <= 2) return 'LIVE';
  if (mins <= 10) return 'STALE';
  return 'OFFLINE';
}

function computeNodeScore(nodeKey, node = {}) {
  let score = 100;

  const denialRate = safeNum(node.denialRate, null);
  const claimsPending = safeNum(node.claimsPending, null);
  const complianceScore = safeNum(node.complianceScore, null);
  const staffingCoverage = safeNum(node.staffingCoverage, null);
  const noShowRate = safeNum(node.noShowRate, null);
  const freshness = freshnessStatus(node.updatedAt);

  if (freshness === 'STALE') score -= 8;
  if (freshness === 'OFFLINE') score -= 20;

  if (denialRate !== null) {
    if (denialRate > 18) score -= 18;
    else if (denialRate > 12) score -= 10;
    else if (denialRate > 8) score -= 5;
  }

  if (claimsPending !== null) {
    if (claimsPending > 250) score -= 15;
    else if (claimsPending > 125) score -= 8;
  }

  if (complianceScore !== null) {
    if (complianceScore < 80) score -= 18;
    else if (complianceScore < 90) score -= 9;
  }

  if (staffingCoverage !== null) {
    if (staffingCoverage < 80) score -= 14;
    else if (staffingCoverage < 90) score -= 7;
  }

  if (noShowRate !== null) {
    if (noShowRate > 12) score -= 10;
    else if (noShowRate > 8) score -= 5;
  }

  if (typeof node.criticalAlerts === 'number') {
    score -= Math.min(node.criticalAlerts * 4, 16);
  }

  if (typeof node.mediumAlerts === 'number') {
    score -= Math.min(node.mediumAlerts * 2, 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyScore(score) {
  if (score >= 92) return 'GOOD';
  if (score >= 80) return 'WATCH';
  return 'CRITICAL';
}

function summarizeEnterpriseState(state) {
  const keys = Object.keys(state);
  const online = keys.filter(k => freshnessStatus(state[k].updatedAt) !== 'OFFLINE').length;

  let revenueAtRisk = 0;
  let topFindings = [];

  for (const [key, node] of Object.entries(state)) {
    revenueAtRisk += safeNum(node.revenueAtRisk, 0);
    if (node.findings) {
      topFindings.push({
        node: key,
        findings: node.findings,
        updatedAt: node.updatedAt || null,
        score: computeNodeScore(key, node)
      });
    }
  }

  topFindings = topFindings
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return {
    totalNodes: keys.length,
    onlineNodes: online,
    revenueAtRisk,
    topFindings
  };
}

// ─────────────────────────────────────────────
// BNCA COMPOSER
// ─────────────────────────────────────────────
function buildEnterpriseBNCA({ profile, state, query }) {
  const items = Object.entries(state).map(([key, node]) => ({
    key,
    node,
    score: computeNodeScore(key, node),
    freshness: freshnessStatus(node.updatedAt)
  }));

  items.sort((a, b) => a.score - b.score);

  const top = items[0];
  const second = items[1];

  const ownerLanes = [];
  if (items.some(x => x.key === 'billing')) ownerLanes.push('Billing');
  if (items.some(x => x.key === 'insurance')) ownerLanes.push('Insurance');
  if (items.some(x => x.key === 'operations')) ownerLanes.push('Operations');
  if (items.some(x => x.key === 'compliance')) ownerLanes.push('Compliance');

  const topIssue = top
    ? `${top.key.toUpperCase()} is currently the primary drag point with a score of ${top.score} and freshness status ${top.freshness}.`
    : 'No live node issue was available.';

  const why = second
    ? `The strongest pressure pattern is coming from ${top.key} with additional drag from ${second.key}. This is affecting queue flow, reimbursement timing, and office execution.`
    : `The system is prioritizing the main drag point based on current node reporting and profile priorities.`;

  const nextSteps = [];
  if (top?.key === 'operations') {
    nextSteps.push('Re-sequence intake and front-desk coverage for the next active shift.');
    nextSteps.push('Escalate unresolved operational queues older than 24 hours.');
  }
  if (top?.key === 'billing' || second?.key === 'billing') {
    nextSteps.push('Clear the highest-value denial and scrub queues first.');
  }
  if (top?.key === 'insurance' || second?.key === 'insurance') {
    nextSteps.push('Escalate prior authorization blockers older than 72 hours.');
  }
  if (top?.key === 'compliance' || second?.key === 'compliance') {
    nextSteps.push('Route documentation exceptions before rebill or resubmission.');
  }
  if (!nextSteps.length) {
    nextSteps.push('Work the highest-value operational queue first.');
    nextSteps.push('Escalate aged blockers and document owners.');
    nextSteps.push('Validate follow-through in the next 24–72 hours.');
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    topIssue,
    whyItMatters: why,
    bestNextCourseOfAction: nextSteps,
    ownerLanes,
    followUp: 'Validate throughput improvement, recheck the highest-risk queues, and confirm that remediation owners executed.',
    escalationRisk: top && top.score < 80 ? 'High' : 'Moderate',
    confidence: `${Math.max(82, 96 - (top ? Math.max(0, 90 - top.score) : 4))}%`,
    query
  };
}

// ─────────────────────────────────────────────
// GROQ PROXY
// ─────────────────────────────────────────────
app.post('/api/groq', (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY not set on server' });

  const {
    messages,
    model = 'openai/gpt-oss-120b',
    max_tokens = 1200,
    stream = true
  } = req.body;

  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const payload = JSON.stringify({ model, max_tokens, stream, messages });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  const groqReq = https.request(options, groqRes => {
    if (groqRes.statusCode !== 200) {
      let body = '';
      groqRes.on('data', d => body += d);
      groqRes.on('end', () => {
        try { res.status(groqRes.statusCode).json(JSON.parse(body)); }
        catch { res.status(groqRes.statusCode).end(body); }
      });
      return;
    }
    groqRes.pipe(res);
  });

  groqReq.on('error', e => {
    console.error('[/api/groq]', e.message);
    res.status(502).json({ error: e.message });
  });

  groqReq.write(payload);
  groqReq.end();
});

// ─────────────────────────────────────────────
// HEALTH CHECK / URL CHECK
// ─────────────────────────────────────────────
app.get('/api/ping', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  let parsed;
  try { parsed = new URL(url); } catch { return res.json({ live: false }); }

  if (parsed.hostname === 'tsm-shell.fly.dev') {
    const localPath = parsed.pathname.replace(/\/$/, '') || '/index';
    const candidates = [
      path.join(__dirname, 'html', ...localPath.replace(/^\/html/, '').split('/'), 'index.html'),
      path.join(__dirname, localPath.replace(/^\//, '') + '.html'),
      path.join(__dirname, localPath.replace(/^\//, '')),
    ];
    const live = candidates.some(p => { try { return fs.statSync(p).isFile(); } catch { return false; } });
    return res.json({ live });
  }

  const allowed = ['tsmatter.com', 'fly.dev', 'clients.tsmatter.com'];
  if (!allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))) {
    return res.json({ live: false });
  }

  try {
    const mod = url.startsWith('https') ? https : http;
    const live = await new Promise(resolve => {
      const r = mod.request(url, { method: 'HEAD', timeout: 5000 }, res2 => resolve(res2.statusCode < 500));
      r.on('error', () => resolve(false));
      r.on('timeout', () => { r.destroy(); resolve(false); });
      r.end();
    });
    res.json({ live });
  } catch {
    res.json({ live: false });
  }
});

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────
app.get('/api/hc/profiles', (req, res) => {
  const profiles = readJson(PROFILES_FILE, [DEFAULT_PROFILE]);
  res.json({ ok: true, profiles });
});

app.post('/api/hc/profiles', (req, res) => {
  const profiles = readJson(PROFILES_FILE, [DEFAULT_PROFILE]);
  const now = nowIso();
  const profile = {
    id: req.body.id || `profile_${Date.now()}`,
    name: req.body.name || 'Untitled Profile',
    company: req.body.company || 'General Healthcare',
    sector: req.body.sector || 'healthcare',
    audience: req.body.audience || 'office_manager',
    priorities: Array.isArray(req.body.priorities) ? req.body.priorities : DEFAULT_PROFILE.priorities,
    createdAt: now,
    updatedAt: now
  };
  profiles.unshift(profile);
  writeJson(PROFILES_FILE, profiles.slice(0, 100));
  res.json({ ok: true, profile });
});

// ─────────────────────────────────────────────
// HC REPORTS
// ─────────────────────────────────────────────
app.get('/api/hc/reports', (req, res) => {
  const reports = readJson(REPORTS_FILE, []);
  res.json({ ok: true, count: reports.length, reports });
});

app.post('/api/hc/reports', (req, res) => {
  const reports = readJson(REPORTS_FILE, []);
  const now = nowIso();

  const report = {
    id: `rpt_${Date.now()}`,
    title: req.body.title || 'Untitled Report',
    company: req.body.company || 'General Healthcare',
    profileId: req.body.profileId || DEFAULT_PROFILE.id,
    query: req.body.query || '',
    summary: req.body.summary || '',
    nodeResults: req.body.nodeResults || {},
    bnca: req.body.bnca || null,
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    createdAt: now,
    updatedAt: now
  };

  reports.unshift(report);
  writeJson(REPORTS_FILE, reports.slice(0, 500));
  res.json({ ok: true, report });
});

app.put('/api/hc/reports/:id', (req, res) => {
  const reports = readJson(REPORTS_FILE, []);
  const idx = reports.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Report not found' });

  reports[idx] = {
    ...reports[idx],
    ...req.body,
    id: reports[idx].id,
    updatedAt: nowIso()
  };

  writeJson(REPORTS_FILE, reports);
  res.json({ ok: true, report: reports[idx] });
});

app.delete('/api/hc/reports/:id', (req, res) => {
  const reports = readJson(REPORTS_FILE, []);
  const next = reports.filter(r => r.id !== req.params.id);
  writeJson(REPORTS_FILE, next);
  res.json({ ok: true, deleted: reports.length - next.length });
});

// ─────────────────────────────────────────────
// HC NODE STATE
// ─────────────────────────────────────────────
app.get('/api/hc/nodes', (req, res) => {
  const state = readJson(HC_NODE_STATE_FILE, {});
  const scored = {};

  for (const [key, node] of Object.entries(state)) {
    const score = computeNodeScore(key, node);
    scored[key] = {
      ...node,
      score,
      severity: classifyScore(score),
      freshness: freshnessStatus(node.updatedAt)
    };
  }

  res.json({
    ok: true,
    state: scored,
    enterpriseSummary: summarizeEnterpriseState(scored),
    generatedAt: nowIso()
  });
});

app.post('/api/hc/nodes/:nodeKey', (req, res) => {
  const state = readJson(HC_NODE_STATE_FILE, {});
  const existing = state[req.params.nodeKey] || {};

  const merged = {
    ...existing,
    ...req.body,
    nodeKey: req.params.nodeKey,
    updatedAt: nowIso()
  };

  merged.score = computeNodeScore(req.params.nodeKey, merged);
  merged.severity = classifyScore(merged.score);
  merged.freshness = freshnessStatus(merged.updatedAt);

  state[req.params.nodeKey] = merged;
  writeJson(HC_NODE_STATE_FILE, state);

  const history = readJson(SCORE_HISTORY_FILE, []);
  history.unshift({
    nodeKey: req.params.nodeKey,
    score: merged.score,
    severity: merged.severity,
    updatedAt: merged.updatedAt
  });
  writeJson(SCORE_HISTORY_FILE, history.slice(0, 3000));

  res.json({ ok: true, node: merged });
});

// ─────────────────────────────────────────────
// BNCA API
// ─────────────────────────────────────────────
app.post('/api/hc/bnca', (req, res) => {
  const profiles = readJson(PROFILES_FILE, [DEFAULT_PROFILE]);
  const state = readJson(HC_NODE_STATE_FILE, {});
  const profileId = req.body.profileId || DEFAULT_PROFILE.id;
  const profile = profiles.find(p => p.id === profileId) || DEFAULT_PROFILE;
  const query = req.body.query || '';

  const bnca = buildEnterpriseBNCA({ profile, state, query });

  res.json({
    ok: true,
    bnca,
    generatedAt: nowIso()
  });
});

// ─────────────────────────────────────────────
// SUITE DEPLOY
// ─────────────────────────────────────────────
app.post('/api/suite', (req, res) => {
  const { title, audience, apps, narratives = {}, slug: rawSlug } = req.body;
  if (!title || !apps?.length) return res.status(400).json({ error: 'title and apps required' });

  const slug = (rawSlug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'suite-' + Date.now();

  const suiteDir = path.join(__dirname, 'html', 'suite', slug);
  try { fs.mkdirSync(suiteDir, { recursive: true }); } catch {}

  const appCards = apps.map((a, i) => {
    const openUrl = a.url.startsWith('http') ? a.url : APP_BASE_URL + a.url;
    const narrative = narratives[a.url] || '';
    const narBlock = narrative
      ? `<div class="narr">${narrative.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>`
      : '';
    return `
    <div class="app-card" onclick="window.open('${openUrl}','_blank')">
      <div class="app-num">${String(i+1).padStart(2,'0')}</div>
      <div class="app-body">
        <div class="app-name">${a.name}</div>
        <div class="app-url">${a.url}</div>
        ${narBlock}
      </div>
      <div class="app-arrow">↗</div>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} · TSM Suite</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>
:root{--bg:#04080f;--gold:#c9a84c;--border:rgba(100,200,255,0.08);--text:#b8cfe2;--dim:#3a5070;--bright:#eef4ff;--glass:rgba(13,24,40,0.6);--green:#10b981;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh;padding:0;}
.header{padding:32px 40px 24px;border-bottom:0.5px solid var(--border);background:rgba(4,8,15,.9);backdrop-filter:blur(20px);position:sticky;top:0;z-index:10;}
.logo{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--gold);letter-spacing:3px;margin-bottom:6px;}
.suite-title{font-size:22px;font-weight:500;color:var(--bright);letter-spacing:1px;}
.suite-meta{font-size:10px;color:var(--dim);letter-spacing:2px;margin-top:4px;text-transform:uppercase;}
.content{max-width:900px;margin:0 auto;padding:36px 40px;}
.section-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:14px;border-bottom:0.5px solid var(--border);padding-bottom:6px;}
.app-card{display:flex;align-items:flex-start;gap:16px;padding:16px 18px;border:0.5px solid var(--border);border-radius:10px;background:var(--glass);margin-bottom:8px;cursor:pointer;transition:all .15s;}
.app-card:hover{border-color:rgba(201,168,76,.4);transform:translateX(3px);}
.app-num{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--gold);opacity:.4;min-width:36px;line-height:1;}
.app-body{flex:1;}
.app-name{font-size:13px;font-weight:500;color:var(--bright);margin-bottom:3px;}
.app-url{font-size:9px;color:var(--dim);margin-bottom:6px;}
.narr{font-size:10px;color:var(--text);line-height:1.7;padding:8px 10px;background:rgba(0,0,0,.2);border-left:2px solid var(--gold);border-radius:4px;margin-top:6px;}
.app-arrow{font-size:16px;color:var(--dim);opacity:.4;margin-top:4px;}
.dot{width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block;margin-right:6px;box-shadow:0 0 5px var(--green);}
.footer{padding:32px 40px;border-top:0.5px solid var(--border);text-align:center;font-size:9px;color:var(--dim);letter-spacing:2px;text-transform:uppercase;}
</style>
</head>
<body>
<div class="header">
  <div class="logo">TSM</div>
  <div class="suite-title">${title}</div>
  <div class="suite-meta"><span class="dot"></span>Live Suite · ${apps.length} apps · Audience: ${audience || 'General'}</div>
</div>
<div class="content">
  <div class="section-label">Presentation Sequence</div>
  ${appCards}
</div>
<div class="footer">TSM Matter · ${APP_BASE_URL} · Built with Suite Builder</div>
</body>
</html>`;

  try {
    fs.writeFileSync(path.join(suiteDir, 'index.html'), html);
    const suiteUrl = `${APP_BASE_URL}/html/suite/${slug}/`;
    res.json({ ok: true, url: suiteUrl, slug });
  } catch (e) {
    console.error('[/api/suite]', e.message);
    res.status(500).json({ error: 'Failed to write suite: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// STATUS
// ─────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const state = readJson(HC_NODE_STATE_FILE, {});
  res.json({
    status: 'TSM ENTERPRISE MODE ONLINE',
    bridge: 'CONNECTED',
    groq: !!process.env.GROQ_API_KEY ? 'READY' : 'NO KEY',
    reports: readJson(REPORTS_FILE, []).length,
    profiles: readJson(PROFILES_FILE, []).length,
    nodes: Object.keys(state).length,
    summary: summarizeEnterpriseState(state)
  });
});

// ─────────────────────────────────────────────
// STATIC APPS
// ─────────────────────────────────────────────
app.use('/html/suite', express.static(path.join(__dirname, 'html', 'suite')));
app.use('/html/healthcare', express.static(path.join(__dirname, 'html', 'healthcare')));
app.use('/html/hc-strategist', express.static(path.join(__dirname, 'html', 'hc-strategist')));

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
app.listen(PORT, () => console.log(`TSM Enterprise Mode · port ${PORT}`));
