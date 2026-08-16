'use strict';
const express = require('express');
const router  = express.Router();
const fs = require('fs');
const {
  readJson, writeJson,
  HC_NODE_STATE_FILE, HC_REPORTS_FILE, HC_PROFILES_FILE,
  aggregateLayer2, buildSystemRollup,
  groqChat, callGroq, SP
} = require('./_shared');

// Canonical 11 HC nodes (mirrors NODES/NODE_KEYS in hc-academy poc-html and
// the preferredOrder list used elsewhere in this file).
const HC_NODE_KEYS = ['operations','medical','pharmacy','insurance','financial','legal','vendors','compliance','billing','taxprep','grants'];

// TSM FIX: this used to be a hardcoded stub in server.js
// (`nodes_online: 11, executive_escalations: 3` no matter what) that never
// read HC_NODE_STATE_FILE at all. Moved here and wired to real state so the
// numbers reflect what's actually been escalated.
router.get('/api/hc/strategist-rollup', (req, res) => {
  const state = readJson(HC_NODE_STATE_FILE, {});
  const nodesOnline = HC_NODE_KEYS.filter(k => state[k]).length;
  const executiveEscalations = HC_NODE_KEYS.filter(k => state[k] && String(state[k].status || '').toLowerCase() === 'critical').length;
  res.json({
    ok: true,
    controller: 'HC STRATEGIST',
    status: nodesOnline > 0 ? 'ROLLUP ACTIVE' : 'AWAITING FIRST ESCALATION',
    nodes_online: nodesOnline,
    executive_escalations: executiveEscalations,
    bnca: nodesOnline > 0 ? 'Enterprise healthcare synthesis complete' : 'No node-level findings escalated yet',
    mesh: true,
    timestamp: new Date().toISOString()
  });
});

router.get('/api/hc/reports', (req, res) => {
  const reports = readJson(HC_REPORTS_FILE, []);
  res.json({ ok: true, count: reports.length, reports });
});

router.post('/api/hc/reports', (req, res) => {
  const reports = readJson(HC_REPORTS_FILE, []);
  const now = new Date().toISOString();
  const report = {
    id: `rpt_${Date.now()}`,
    title: req.body.title || 'Untitled Report',
    company: req.body.company || 'General Healthcare',
    query: req.body.query || '',
    summary: req.body.summary || '',
    nodeResults: req.body.nodeResults || {},
    createdAt: now,
    updatedAt: now
  };
  reports.unshift(report);
  writeJson(HC_REPORTS_FILE, reports.slice(0, 300));
  res.json({ ok: true, report });
});

router.delete('/api/hc/reports/:id', (req, res) => {
  const reports = readJson(HC_REPORTS_FILE, []);
  const next = reports.filter(r => r.id !== req.params.id);
  writeJson(HC_REPORTS_FILE, next);
  res.json({ ok: true });
});

router.get('/api/hc/nodes', (req, res) => {
  const state = readJson(HC_NODE_STATE_FILE, {});
  res.json({ ok: true, state, generatedAt: new Date().toISOString() });
});

router.post('/api/hc/nodes/:nodeKey', (req, res) => {
  const state = readJson(HC_NODE_STATE_FILE, {});
  const merged = {
    ...(state[req.params.nodeKey] || {}),
    ...req.body,
    nodeKey: req.params.nodeKey,
    updatedAt: new Date().toISOString()
  };

  // Generate live BNCA from actual node telemetry
  const n = merged;
  merged.bnca = `TOP ISSUE
${n.findings || 'Cross-lane operational drag is the primary issue.'}

WHY IT MATTERS
Live telemetry received for ${n.system || 'this system'} · ${n.location || 'all locations'}.

METRICS
Queue Depth: ${n.queueDepth ?? 'N/A'} · Intake Backlog: ${n.intakeBacklog ?? 'N/A'} · Staffing: ${n.staffingCoverage ?? 'N/A'}%
Denial Rate: ${n.denialRate ?? 'N/A'}% · Claim Lag: ${n.claimLagDays ?? 'N/A'} days · AR >30: ${n.arOver30 ?? 'N/A'}
Auth Backlog: ${n.authBacklog ?? 'N/A'} · Auth Delay: ${n.authDelayHours ?? 'N/A'}h · Pending Claims: ${n.pendingClaimsValue ?? 'N/A'}

BEST NEXT COURSE OF ACTION
1. Clear highest-value backlog first
2. Escalate auth and documentation blockers older than 24-72 hours
3. Align intake, billing, and scheduling handoffs for the next shift

OWNER LANES
Operations · Billing · Insurance

CONFIDENCE
92%`;

  state[req.params.nodeKey] = merged;
  writeJson(HC_NODE_STATE_FILE, state);
  res.json({ ok: true, node: state[req.params.nodeKey] });
});

router.get('/api/hc/profiles', (req, res) => {
  res.json({ ok: true, profiles: readJson(HC_PROFILES_FILE, []) });
});

router.get('/api/hc/nodes/filter', (req, res) => {
  const { system = '', location = '' } = req.query;
  const state = readJson(HC_NODE_STATE_FILE, {});
  const filtered = Object.fromEntries(
    Object.entries(state).filter(([_, v]) => {
      return (!system || v.system === system) &&
             (!location || location === 'All' || v.location === location);
    })
  );
  res.json({ ok: true, state: filtered });
});

router.post('/api/hc/bnca', (req, res) => {
  const { system = '', location = '' } = req.body || {};
  const state = readJson(HC_NODE_STATE_FILE, {});

  const nodes = Object.values(state).filter(v =>
    (!system || v.system === system) &&
    (!location || location === 'All' || v.location === location)
  );

  const top = nodes.find(v => v.findings)?.findings || 'Operational drag across nodes';

  res.json({
    ok: true,
    bnca: {
      system,
      location,
      topIssue: top,
      whyItMatters: 'Revenue + throughput pressure',
      bestNextCourseOfAction: [
        'Clear high-value backlog',
        'Escalate auth delays',
        'Rebalance intake + billing'
      ],
      ownerLanes: ['Operations', 'Billing', 'Insurance'],
      confidence: '88%'
    }
  });
});

router.post('/api/hc/layer2', (req, res) => {
  try {
    const { system = '', location = '' } = req.body || {};
    const state = readJson(HC_NODE_STATE_FILE, {});

    const filtered = Object.fromEntries(
      Object.entries(state).filter(([_, n]) =>
        (!system || (n.system || '') === system) &&
        (!location || location === 'All' || (n.location || '') === location)
      )
    );

    const result = aggregateLayer2(filtered);
    const top = result.top;

    const rootCauseLines = top.map(t => {
      if (t.nodeKey === 'operations') {
        return `- Operations: queue ${t.node.queueDepth ?? 'N/A'}, backlog ${t.node.intakeBacklog ?? 'N/A'}, staffing ${t.node.staffingCoverage ?? 'N/A'}%`;
      }
      if (t.nodeKey === 'billing') {
        return `- Billing: denial ${t.node.denialRate ?? 'N/A'}%, lag ${t.node.claimLagDays ?? 'N/A'}d`;
      }
      if (t.nodeKey === 'insurance') {
        return `- Insurance: auth backlog ${t.node.authBacklog ?? 'N/A'}, delay ${t.node.authDelayHours ?? 'N/A'}h`;
      }
      if (t.nodeKey === 'compliance') {
        return `- Compliance: open findings ${t.node.openFindings ?? 'N/A'}, exposure $${t.node.auditExposure ?? 'N/A'}`;
      }
      if (t.nodeKey === 'medical') {
        return `- Medical: chart defects ${t.node.chartDefects ?? 'N/A'}`;
      }
      return `- ${t.nodeKey}: active pressure`;
    }).join('\n');

    const topIssue = top.length
      ? `${top.map(t => t.nodeKey).join(' + ')} are compounding into reimbursement and throughput drag.`
      : 'No qualifying node pressure found.';

    const highestYieldLane = top[0]?.nodeKey
      ? top[0].nodeKey.charAt(0).toUpperCase() + top[0].nodeKey.slice(1)
      : 'Unassigned';

    const cashAcceleration14d = Math.round(result.recoverable30d * 0.7);

    const output = `TOP ISSUE
${topIssue}

SYSTEM
${system || 'General Healthcare'}

LOCATION
${location || 'All'}

REVENUE AT RISK
$${result.revenueAtRisk.toLocaleString()}

RECOVERABLE VALUE
72 HOURS: $${result.recoverable72h.toLocaleString()}
30 DAYS: $${result.recoverable30d.toLocaleString()}

PROJECTED CASH ACCELERATION
14 DAYS: $${cashAcceleration14d.toLocaleString()}

HIGHEST-YIELD LANE
${highestYieldLane}

ROOT CAUSE
${rootCauseLines || '- No live node telemetry'}

BEST NEXT COURSE OF ACTION
1. Clear the highest-value backlog first
2. Escalate auth and documentation blockers older than 24–72 hours
3. Align intake, billing, and scheduling handoffs for the next shift

OWNER LANES
Operations · Billing · Insurance · Compliance

CONFIDENCE
91%`;

    res.json({
      ok: true,
      output,
      revenueAtRisk: result.revenueAtRisk,
      recoverable72h: result.recoverable72h,
      recoverable30d: result.recoverable30d,
      cashAcceleration14d,
      highestYieldLane,
      top: result.top
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/api/hc/rollup', (req, res) => {
  try {
    const { system = '', top_n = 3 } = req.body || {};
    const state = readJson(HC_NODE_STATE_FILE, {});
    const rollup = buildSystemRollup(state, system, Number(top_n || 3));

    res.json({
      ok: true,
      system,
      ...rollup
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/api/hc/brief', async (req, res) => {
  try {
    const {
      system = '',
      location = '',
      audience = 'om',
      format = 'brief',
      question = ''
    } = req.body || {};

    const state = readJson(HC_NODE_STATE_FILE, {});
    const filtered = Object.fromEntries(
      Object.entries(state).filter(([_, n]) =>
        (!system || (n.system || '') === system) &&
        (!location || location === 'All' || (n.location || '') === location)
      )
    );

    const result = aggregateLayer2(filtered);

    const highestYieldLane =
      result.top?.[0]?.nodeKey
        ? result.top[0].nodeKey.charAt(0).toUpperCase() + result.top[0].nodeKey.slice(1)
        : 'Unassigned';

    result.highestYieldLane = highestYieldLane;
    result.cashAcceleration14d = result.cashAcceleration14d || Math.round((result.recoverable30d || 0) * 0.7);

    const rawBrief = buildAudienceBrief({
      system, location, audience, format, question, filtered, result
    });

    const audienceLabel = { om: 'Office Manager', director: 'Director', cfo: 'CFO', ceo: 'CEO' }[audience] || 'leadership';
    const formatLabel = { brief: 'executive brief', email: 'professional email', status_update: 'status update', talking_points: 'bullet-point talking points' }[format] || 'brief';

    const topNode = result.top?.[0]?.node || {};
    const topNodeDetail = [
      topNode.authBacklog != null ? `auth backlog ${topNode.authBacklog}` : null,
      topNode.authDelayHours != null ? `avg auth delay ${topNode.authDelayHours}h` : null,
      topNode.denialRate != null ? `denial rate ${topNode.denialRate}%` : null
    ].filter(Boolean).join(', ');

    const systemPrompt = `You are a senior healthcare revenue cycle strategist writing on behalf of the Revenue Cycle team at ${system || 'the health system'} ${location || ''}.

You will be given the ACTUAL computed figures for this office/system, derived from live node telemetry. Use ONLY those figures — do not invent, round dramatically, or substitute different numbers. If a figure is missing or zero, say so plainly rather than making one up.

RULES:
1. Open with a specific dollar figure or action — never with 'I am writing to' or 'I wanted to reach out'
2. Never use placeholder names like [CFO Name] or [Your Name] — omit the salutation and sign off as 'Revenue Cycle${location ? ' · ' + location : ''}'
3. Never fabricate context like 'following our previous discussion'
4. Every sentence ties to a dollar figure, a lane, or a named action with an owner
5. Output must be copy-paste ready — no brackets, no blanks, no instructions to the reader
6. Only name a specific payer if it appears in the data provided

Audience: ${audienceLabel}
Format: ${formatLabel} — ${format === 'email' ? 'include Subject: line, then the email body, then sign off as Revenue Cycle' + (location ? ' · ' + location : '') : format === 'talking_points' ? 'tight bullets, dollar figure on every line' : format === 'status_update' ? 'structured paragraphs, metrics up front' : 'two paragraphs max, action and dollar impact only'}`;

    const userMessage = `ACTUAL FIGURES — computed from live node data, use only these:
- Revenue at risk: $${Number(result.revenueAtRisk || 0).toLocaleString()}
- Recoverable in 72 hours: $${Number(result.recoverable72h || 0).toLocaleString()}
- Recoverable in 30 days: $${Number(result.recoverable30d || 0).toLocaleString()}
- 14-day cash acceleration: $${Number(result.cashAcceleration14d || 0).toLocaleString()}
- Highest-yield lane: ${highestYieldLane}
${topNodeDetail ? '- Top lane detail: ' + topNodeDetail : ''}

Operational context (narrative only):
${rawBrief}

${question ? 'The reader specifically asked: ' + question : ''}

Write the ${formatLabel} for the ${audienceLabel} now. Sharp, specific, sendable. Only use the figures above — do not introduce other numbers.`;

    let brief = rawBrief; // fallback if Groq fails
    try {
      const groqResult = await callGroq(systemPrompt, userMessage);
      if (groqResult) brief = groqResult;
    } catch(groqErr) {
      console.error('Groq brief failed, using template fallback:', groqErr.message);
    }

    res.json({
      ok: true,
      brief,
      audience,
      format,
      system,
      location,
      revenueAtRisk: result.revenueAtRisk || 0,
      recoverable72h: result.recoverable72h || 0,
      recoverable30d: result.recoverable30d || 0,
      cashAcceleration14d: result.cashAcceleration14d || 0,
      highestYieldLane
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/api/hc/query', async (req,res)=>{
  try{
    const {query='',system='',location='',nodeKey='',message='',maxTokens} = req.body||{};

    // Full-context strategist analysis path. hc-strategist/index.html and
    // hc-main-strategist.html (the "RUN HC STRATEGIST ANALYSIS" button) post
    // a rich HC-mesh context in `system` plus a detailed BRIEF/JSON prompt in
    // `message`, and read the answer back from `data.output`. That never
    // matched anything below: this handler only ever read query/nodeKey and
    // returned `content`, never `output`, so the strategist's `if(data.output)`
    // check always failed and threw "AI returned an empty response. Try
    // again." even on a healthy server. Route it to a real Groq call instead.
    if (message) {
      const systemPrompt = system ? SP.strategist + '\n\n' + system : SP.strategist;
      const answer = await callGroq(systemPrompt, message, maxTokens || 1024);
      return res.json({ ok: true, output: answer, content: answer, answer, reply: answer });
    }

    const state = readJson(HC_NODE_STATE_FILE,{});
    // Groq persona analysis for specific node
    if(nodeKey && state[nodeKey]) {
      const n = state[nodeKey];
      const sp = `You are the ${nodeKey.toUpperCase()} specialist for HonorHealth Scottsdale - Shea. Use the actual metrics. Be specific and actionable. Max 8 lines.`;
      const um = `QUERY: ${query||'Provide BNCA analysis'}\nDATA: ${JSON.stringify({findings:n.findings,...n})}`;
      const gr = await callGroq(sp, um);
      return res.json({ok:true, content: gr || n.bnca || n.findings || 'No data'});
    }

    const nodes = Object.values(state).filter(n=>
      (!system || n.system===system) &&
      (!location || location==='All' || n.location===location)
    );

    if(nodes.length===0){
      return res.json({
        ok:true,
        content:`TOP ISSUE
No live node data available.

WHY IT MATTERS
The strategist is scoped correctly, but no matching node has reported data yet.

BEST NEXT COURSE OF ACTION
1. Post live node telemetry for the selected system/location
2. Re-run BNCA after node sync
3. Validate filtered node coverage

OWNER LANES
Operations · Billing · Insurance

CONFIDENCE
65%`
      });
    }

    const preferredOrder = ['operations','billing','insurance','compliance','medical','financial','pharmacy','legal','grants','vendors','taxprep'];

    nodes.sort((a,b)=>{
      const ai = preferredOrder.indexOf((a.nodeKey||'').toLowerCase());
      const bi = preferredOrder.indexOf((b.nodeKey||'').toLowerCase());
      const av = ai === -1 ? 999 : ai;
      const bv = bi === -1 ? 999 : bi;
      return av - bv;
    });

    const n = nodes[0];

    const queueDepth = n.queueDepth ?? 'N/A';
    const intakeBacklog = n.intakeBacklog ?? 'N/A';
    const staffingCoverage = n.staffingCoverage ?? 'N/A';
    const noShowRate = n.noShowRate ?? 'N/A';
    const bnca = n.bnca || 'Re-sequence intake coverage, clear aged queues, and rebalance shift coverage.';

    const output = `TOP ISSUE
${n.findings || 'Cross-lane operational drag is the primary issue.'}

SYSTEM
${n.system || system || 'General Healthcare'}

LOCATION
${n.location || location || 'All'}

WHY IT MATTERS
Queue depth ${queueDepth}, intake backlog ${intakeBacklog}, staffing ${staffingCoverage}%, and no-show rate ${noShowRate} are constraining throughput and delaying clean handoffs.

BEST NEXT COURSE OF ACTION
1. Re-sequence intake coverage immediately
2. Clear queues older than 24 hours
3. Rebalance scheduling blocks for the next shift

OWNER LANES
Operations · Front Desk · Scheduling

NODE BNCA
${bnca}

FOLLOW-UP WINDOW
24–72 hours

CONFIDENCE
92%`;

    return res.json({ok:true,content:output});

  }catch(e){
    return res.status(500).json({ok:false,error:e.message});
  }
});

// TSM FIX: this router.post('/api/hc/query', ...) handler was previously
// missing its closing `});` right after the catch block above. Everything
// between here and a stray `});` ~190 lines down — four helper functions
// (filterHCState, normalizeOfficeState, officeRiskModel, summarizeOfficeDriver,
// none of which are called anywhere else in this file or exported) plus five
// router.use(...) static mounts — was being parsed as dead code inside this
// handler's unreachable tail (every branch above already returns). None of
// it ever ran. The static mounts duplicate what server.js already serves
// for the same html/ directory, and this file never `require('path')`, so
// naively closing the brace where it was written would crash on boot the
// moment this route fired. Removed as dead/orphaned rather than reconnected.

router.post('/api/hc/rollup/brief', (req, res) => {
  try {
    const { system = '', audience = 'cfo', format = 'email', top_n = 3 } = req.body || {};
    const state = readJson(HC_NODE_STATE_FILE, {});
    const rollup = buildSystemRollup(state, system, Number(top_n || 3));
    const top = rollup.topOffices?.[0] || null;

    const brief = `Subject: ${system || 'Healthcare'} System Revenue Risk Update

Team,

Across ${system || 'the system'}, we are currently tracking $${Number(rollup.totalRevenueAtRisk || 0).toLocaleString()} in revenue at risk.

Primary exposure is concentrated at ${top?.officeName || 'N/A'}${top?.location ? ` (${top.location})` : ''}, with ${top?.highestYieldLane || 'Unassigned'} identified as the highest-yield recovery lane.

We expect:
• $${Number(rollup.totalRecoverable72h || 0).toLocaleString()} recoverable within 72 hours
• $${Number(rollup.totalCashAcceleration14d || 0).toLocaleString()} in 14-day cash acceleration

Root drivers include cross-lane pressure in billing, insurance, and operations.

Immediate actions underway:
1. Clear high-value backlog
2. Escalate auth delays >48h
3. Align intake, billing, and scheduling

We will continue monitoring and provide updates as recovery progresses.

— Operations Intelligence`;

    res.json({
      ok: true,
      system,
      audience,
      format,
      brief,
      ...rollup
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/api/hc/alerts', (req, res) => {
  try {
    const { system = '' } = req.body || {};
    const state = readJson(HC_NODE_STATE_FILE, {});
    const alerts = [];

    Object.entries(state || {}).forEach(([nodeKey, n]) => {
      if (system && (n.system || '') !== system) return;

      if (n.denialRate != null && Number(n.denialRate) > 10) {
        alerts.push({
          type: 'DENIAL_SPIKE',
          severity: 'HIGH',
          nodeKey,
          location: n.location || 'Unknown',
          officeName: n.officeName || '',
          message: `${n.location || 'Unknown'}: denial rate ${n.denialRate}%`
        });
      }

      if (n.authDelayHours != null && Number(n.authDelayHours) > 48) {
        alerts.push({
          type: 'AUTH_DELAY',
          severity: 'HIGH',
          nodeKey,
          location: n.location || 'Unknown',
          officeName: n.officeName || '',
          message: `${n.location || 'Unknown'}: auth delay ${n.authDelayHours}h`
        });
      }

      if (n.queueDepth != null && Number(n.queueDepth) > 25) {
        alerts.push({
          type: 'QUEUE_PRESSURE',
          severity: 'MEDIUM',
          nodeKey,
          location: n.location || 'Unknown',
          officeName: n.officeName || '',
          message: `${n.location || 'Unknown'}: queue depth ${n.queueDepth}`
        });
      }

      if (n.revenueAtRisk != null && Number(n.revenueAtRisk) > 250000) {
        alerts.push({
          type: 'REVENUE_RISK',
          severity: 'HIGH',
          nodeKey,
          location: n.location || 'Unknown',
          officeName: n.officeName || '',
          message: `${n.location || 'Unknown'}: revenue at risk $${Number(n.revenueAtRisk).toLocaleString()}`
        });
      }
    });

    res.json({
      ok: true,
      system,
      count: alerts.length,
      alerts
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/api/hc/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.healthcare, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

module.exports = router;