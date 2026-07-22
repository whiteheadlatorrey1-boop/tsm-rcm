'use strict';
const express = require('express');
const router  = express.Router();


router.post('/api/strategist/hc/system-posture', (req, res) => {
  try {
    const {
      system = 'HonorHealth',
      offices = ['Scottsdale - Shea', 'Mesa', 'Tempe', 'North Mountain']
    } = req.body || {};

    const state = readJson(HC_NODE_STATE_FILE, {});
    const officePayloads = [];

    for (const office of offices) {
      const officeState = filterHCState(state, system, office);
      const layer2 = buildLayer2Summary(officeState, system, office);
      officePayloads.push({
        office,
        state: officeState,
        layer2
      });
    }

    const posture = buildStrategistSystemPosture(system, officePayloads);
    return res.json(posture);
  } catch (e) {
    return res.status(500).json({ ok:false, error:e.message });
  }
});

router.post('/api/strategist/hc/dee-action', (req, res) => {
  try {
    const {
      system = 'HonorHealth',
      selectedOffice = 'Scottsdale - Shea',
      offices = ['Scottsdale - Shea', 'Mesa', 'Tempe', 'North Mountain'],
      prompt = ''
    } = req.body || {};

    const state = readJson(HC_NODE_STATE_FILE, {});
    const selectedState = filterHCState(state, system, selectedOffice);
    const layer2 = buildLayer2Summary(selectedState, system, selectedOffice);

    const officePayloads = offices.map(office => {
      const officeState = filterHCState(state, system, office);
      const officeLayer2 = buildLayer2Summary(officeState, system, office);
      return { office, state: officeState, layer2: officeLayer2 };
    });

    const posture = buildStrategistSystemPosture(system, officePayloads);

    const alerts = [];
    Object.entries(state || {}).forEach(([nodeKey, n]) => {
      if (!n || typeof n !== 'object') return;
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
    });

    const top = posture?.officeRanking?.[0] || {};
    const selectedOps = selectedState.operations || {};
    const selectedBilling = selectedState.billing || {};
    const selectedInsurance = selectedState.insurance || {};

    const liveSignals = [
      {
        title: 'Top Priority',
        urgency: top.status || 'high',
        source: top.office || selectedOffice,
        detail: top.summary || `Intervene in ${selectedOffice}`
      },
      {
        title: 'Payer Friction',
        urgency: Number(selectedInsurance.authDelayHours || 0) > 48 ? 'urgent' : 'med',
        source: selectedOffice,
        detail: `Auth backlog ${selectedInsurance.authBacklog || 0} · delay ${selectedInsurance.authDelayHours || 0}h`
      },
      {
        title: 'Denial Pressure',
        urgency: Number(selectedBilling.denialRate || 0) > 10 ? 'urgent' : 'med',
        source: selectedOffice,
        detail: `Denial ${selectedBilling.denialRate || 0}% · lag ${selectedBilling.claimLagDays || 0}d`
      },
      {
        title: 'Throughput',
        urgency: Number(selectedOps.queueDepth || 0) > 25 ? 'high' : 'med',
        source: selectedOffice,
        detail: `Queue ${selectedOps.queueDepth || 0} · backlog ${selectedOps.intakeBacklog || 0} · staffing ${selectedOps.staffingCoverage || 0}%`
      }
    ];

    const actionBoard = {
      source: 'TSM Strategist',
      selectedOffice,
      posture: posture.systemPosture || {},
      topPriorityNow: top.summary || `Intervene in ${selectedOffice}`,
      officeToEscalate: top.office || selectedOffice,
      payerFocus: Number(selectedInsurance.authDelayHours || 0) > 48 ? 'Prior Authorization' : 'Medicare',
      liveSignals,
      actions: [
        `Run denial recovery plan for ${selectedOffice}`,
        `Escalate payer auth blockers for ${selectedOffice}`,
        `Compare ${selectedOffice} vs best-performing office`
      ],
      strategistNarrative:
        `${system} risk is concentrated in ${top.office || selectedOffice}. ` +
        `Highest-yield lane is ${layer2.highestYieldLane || 'Billing'}. ` +
        `Immediate focus: ${layer2.bestNextActions?.[0] || 'Clear highest-value backlog first'}`,
      alertCount: alerts.length
    };

    // Prompt-based action branching
    const promptLower = (prompt || '').toLowerCase();
    let actionView = 'default';
    if (promptLower.includes('denial recovery')) actionView = 'denial';
    else if (promptLower.includes('auth blocker') || promptLower.includes('payer')) actionView = 'auth';
    else if (promptLower.includes('compare') || promptLower.includes('best-performing')) actionView = 'compare';

    let actionDetail = null;
    if (actionView === 'denial') {
      actionDetail = {
        view: 'denial',
        title: 'Denial Recovery Plan',
        steps: [
          `1. Pull all denied claims for ${selectedOffice} from last 30 days`,
          `2. Sort by denial reason — current top: ${selectedBilling.denialRate || 0}% rate`,
          `3. Resubmit clean claims within 72h — ${layer2.recoverable72h ? '$'+Number(layer2.recoverable72h).toLocaleString()+' recoverable' : 'calculate recoverable'}`,
          `4. Escalate payer-specific denials to billing lead`,
          `5. Flag claim lag (${selectedBilling.claimLagDays || 0}d) for process review`,
        ],
        metric: { label: 'Denial Rate', value: selectedBilling.denialRate + '%', target: '<5%' }
      };
    } else if (actionView === 'auth') {
      actionDetail = {
        view: 'auth',
        title: 'Payer Auth Escalation',
        steps: [
          `1. Pull all pending auth requests for ${selectedOffice} older than 24h`,
          `2. Auth backlog: ${selectedInsurance.authBacklog || 0} cases · delay: ${selectedInsurance.authDelayHours || 0}h`,
          `3. Call top 3 payers directly — prioritize Medicare/Prior Auth cases`,
          `4. Submit peer-to-peer review requests for denials over $5,000`,
          `5. Escalate unresolved auths >72h to medical director`,
        ],
        metric: { label: 'Auth Delay', value: selectedInsurance.authDelayHours + 'h', target: '<24h' }
      };
    } else if (actionView === 'compare') {
      const best = officePayloads.find(o => o.office === posture?.systemPosture?.bestPerformingOffice) || officePayloads[1];
      actionDetail = {
        view: 'compare',
        title: `${selectedOffice} vs ${best?.office || 'Best Office'}`,
        comparison: [
          { label: 'Denial Rate', selected: selectedBilling.denialRate + '%', best: (best?.layer2?.denialRate || 0) + '%' },
          { label: 'Auth Delay', selected: selectedInsurance.authDelayHours + 'h', best: (best?.layer2?.authDelayHours || 0) + 'h' },
          { label: 'Queue Depth', selected: selectedOps.queueDepth, best: best?.layer2?.queueDepth || 0 },
          { label: 'Revenue at Risk', selected: '$'+Number(layer2.revenueAtRisk||0).toLocaleString(), best: '$'+Number(best?.layer2?.revenueAtRisk||0).toLocaleString() },
          { label: 'Recoverable 72h', selected: '$'+Number(layer2.recoverable72h||0).toLocaleString(), best: '$'+Number(best?.layer2?.recoverable72h||0).toLocaleString() },
        ]
      };
    }

    return res.json({
      ok: true,
      source: 'TSM Strategist',
      generatedAt: new Date().toISOString(),
      selectedOffice,
      prompt,
      actionView,
      actionDetail,
      layer2,
      posture,
      alerts,
      actionBoard
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error:e.message });
  }
});

router.post('/api/strategist/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.strategist, body.question||body.query||'', body.maxTokens||2048); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/api/main-strategist/hc-report', (req,res)=>{
  res.json({
    ok:true,
    report: tsmHealthcareReport.report,
    updated_at: tsmHealthcareReport.updated_at
  });
});

router.post('/api/main-strategist/hc-report', express.json({limit:'5mb'}), (req,res)=>{
  const body = req.body || {};

  const report = {
    source: body.source || 'ghs-presentation',
    document: body.document || body.latestDocument || 'Claim Denial V3',
    nodes_reporting: body.nodes_reporting || body.nodes || 11,
    risk_posture: body.risk_posture || 'WATCH',
    status: 'READY',
    summary: body.summary || body.bnca || `HC STRATEGIST SYNTHESIS

NODES REPORTING: 11

LATEST DOCUMENT:
Claim Denial V3

BEST NEXT COURSE OF ACTION:
Prioritize highest-severity denial and prior authorization blockers, assign owner lanes, generate follow-up documentation, preserve HITL approval, and relay executive summary to leadership.

EXECUTIVE IMPACT:
Revenue risk and operational delay are now visible at the Main Strategist layer.`,
    ts: new Date().toISOString()
  };

  tsmHealthcareReport = {
    report,
    updated_at: new Date().toISOString()
  };

  res.json({ok:true, report});
});

router.post('/api/honor/dee/dashboard', (req, res) => {
  try {
    const {
      system = 'HonorHealth',
      selectedOffice = 'Scottsdale - Shea',
      offices = ['Scottsdale - Shea', 'Mesa', 'Tempe', 'North Mountain'],
      audience = 'cfo',
      format = 'email'
    } = req.body || {};

    const state = readJson(HC_NODE_STATE_FILE, {});
    const selectedState = filterHCState(state, system, selectedOffice);
    const selectedLayer2 = buildLayer2Summary(selectedState, system, selectedOffice);
    const selectedBrief = buildHCBrief({
      system,
      location: selectedOffice,
      audience,
      format,
      question: 'What is driving current revenue pressure and what are we doing about it?'
    }, state);

    const officePayloads = offices.map(office => {
      const officeState = filterHCState(state, system, office);
      const layer2 = buildLayer2Summary(officeState, system, office);
      return { office, state: officeState, layer2 };
    });

    const systemPosture = buildStrategistSystemPosture(system, officePayloads);
    
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


    return res.json({
      ok: true,
      persona: {
        name: 'Dee Montee',
        role: 'Revenue Cycle Manager',
        system
      },
      generatedAt: new Date().toISOString(),
      selectedOffice,
      selectedOfficeData: {
        state: selectedState,
        layer2: selectedLayer2,
        brief: selectedBrief
      },
      systemPosture,
      alerts
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error:e.message });
  }
});

module.exports = router;