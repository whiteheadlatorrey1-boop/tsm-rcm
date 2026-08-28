#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== TSM PM EXECUTIVE DECISION LAYER ==="

mkdir -p server/pm
mkdir -p html/war-rooms/pm-copilot/services
mkdir -p scripts

cat > server/pm/decision-engine.js <<'JS'
'use strict';

/**
 * TSM PM Executive Decision Engine v1
 *
 * Purpose:
 *   Convert existing PM Copilot evidence into deterministic,
 *   exposure-ranked executive decisions.
 *
 * Design:
 *   - Does NOT replace pm-engine.js.
 *   - Does NOT ask an LLM to determine priority.
 *   - Consumes existing KPI / exception / risk / exposure payloads.
 *   - Produces decisions, recommendedActions, executiveSummary,
 *     and an auditable decision trail.
 */

const VERSION = 'pm-decision-engine-v1';

function num(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[$,%\s,]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function text(value) {
  return value == null ? '' : String(value);
}

function money(value) {
  return Math.round(num(value) * 100) / 100;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function severityRank(severity) {
  return ({
    critical: 4,
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  })[text(severity).toLowerCase()] || 1;
}

function priorityFrom(severity, exposure, domain) {
  const s = severityRank(severity);
  const e = num(exposure);

  if (s >= 4) return 'CRITICAL';
  if (s >= 3) return 'HIGH';

  if (domain === 'vendor_compliance' && e >= 10000) return 'HIGH';
  if (e >= 10000) return 'HIGH';
  if (e >= 1000) return 'MEDIUM';

  return 'MEDIUM';
}

function ownerFor(domain) {
  return {
    vendor_compliance: 'Vendor Management',
    maintenance: 'Maintenance Operations',
    vacancy: 'Leasing / Property Management',
    lease: 'Leasing / Property Management',
    turnover: 'Property Management',
    iot: 'Maintenance Operations'
  }[domain] || 'Property Management';
}

function urgencyFor(priority, domain) {
  if (priority === 'CRITICAL') return 'Immediate';
  if (domain === 'maintenance') return priority === 'HIGH' ? 'Today' : 'Next business day';
  if (priority === 'HIGH') return 'Today';
  return 'This week';
}

function actionFor(domain, item) {
  const id = firstDefined(item.id, item.work_order_id, item.vendor_id, item.unit_id, item.sensor_id);

  switch (domain) {
    case 'vendor_compliance':
      return text(item.status || item.stage).toLowerCase() === 'expired'
        ? `Suspend new work assignment to ${id || 'the affected vendor'} and initiate compliance renewal/replacement review.`
        : `Complete compliance renewal for ${id || 'the affected vendor'} before the credential expires.`;

    case 'maintenance':
      return `Escalate ${id || 'the overdue work order'} and confirm vendor response, next milestone, and SLA recovery plan.`;

    case 'vacancy':
      return `Assign a leasing action plan for ${id || 'the vacant unit'} and review pricing, make-ready, and showing readiness.`;

    case 'lease':
      return `Initiate renewal outreach for ${id || 'the affected lease'} and record the renewal decision path.`;

    case 'turnover':
      return `Escalate ${id || 'the turnover'} and establish a dated completion plan with accountable owner.`;

    case 'iot':
      return `Dispatch inspection/remediation for ${id || 'the affected sensor alert'} and verify the condition clears after remediation.`;

    default:
      return `Review ${id || 'the finding'} and assign an accountable owner with a dated next action.`;
  }
}

function inferDomain(item) {
  const raw = [
    item.domain,
    item.category,
    item.type,
    item.source,
    item.id,
    item.claim,
    item.rationale,
    item.description
  ].join(' ').toLowerCase();

  if (/vendor|certificate|compliance|license|insurance/.test(raw)) return 'vendor_compliance';
  if (/work.?order|maintenance|sla|repair/.test(raw)) return 'maintenance';
  if (/vacan|unit/.test(raw)) return 'vacancy';
  if (/lease|renew/.test(raw)) return 'lease';
  if (/turnover|make.?ready/.test(raw)) return 'turnover';
  if (/iot|sensor|thermostat|leak|door/.test(raw)) return 'iot';

  return 'operations';
}

function extractItems(payload) {
  const sections = payload?.sections || payload || {};
  const items = [];

  const pushMany = (arr, domainHint) => {
    normalizeArray(arr).forEach(item => {
      if (!item || typeof item !== 'object') return;
      items.push({
        ...item,
        domain: domainHint || item.domain || inferDomain(item)
      });
    });
  };

  const exceptionReport = sections.exceptionReport || payload.exceptionReport;
  const riskReport = sections.riskReport || payload.riskReport;

  pushMany(exceptionReport?.exceptions);
  pushMany(riskReport?.risks);

  pushMany(sections.maintenance_delay_exposure_items || payload.maintenance_delay_exposure_items, 'maintenance');
  pushMany(sections.vendor_compliance_exposure_items || payload.vendor_compliance_exposure_items, 'vendor_compliance');
  pushMany(sections.vacancy_exposure_items || payload.vacancy_exposure_items, 'vacancy');
  pushMany(sections.iot_alerts || payload.iot_alerts, 'iot');

  const structured = sections.structuredData || payload.structuredData;
  pushMany(structured?.items);

  return items;
}

function makeDecision(item, index) {
  const domain = item.domain || inferDomain(item);

  const exposure = money(firstDefined(
    item.exposure,
    item.exposureAmount,
    item.financialExposure,
    item.estimatedExposure,
    item.amount,
    item.cost
  ));

  const severity = text(firstDefined(
    item.severity,
    item.priority,
    item.risk
  ) || 'medium').toLowerCase();

  const priority = priorityFrom(severity, exposure, domain);

  const id = firstDefined(
    item.id,
    item.work_order_id,
    item.vendor_id,
    item.unit_id,
    item.sensor_id,
    `finding-${index + 1}`
  );

  const finding = text(firstDefined(
    item.claim,
    item.finding,
    item.description,
    item.rationale,
    item.label,
    item.title
  ) || 'Operational finding requiring management review.');

  return {
    id: `PM-DEC-${String(index + 1).padStart(3, '0')}`,
    priority,
    priorityRank: priority === 'CRITICAL' ? 4 : priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1,
    domain,
    entityId: id,
    finding,
    exposure,
    action: actionFor(domain, item),
    owner: ownerFor(domain),
    urgency: urgencyFor(priority, domain),
    status: 'OPEN',
    evidence: {
      source: firstDefined(...normalizeArray(item.sources)),
      sourceId: id,
      severity,
      rationale: text(item.rationale || item.explain || '')
    },
    generatedBy: VERSION
  };
}

function dedupeDecisions(decisions) {
  const seen = new Set();

  return decisions.filter(d => {
    const key = [
      d.domain,
      d.entityId,
      d.finding.toLowerCase().slice(0, 120)
    ].join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildExecutiveSummary(decisions, exposure) {
  const critical = decisions.filter(d => d.priority === 'CRITICAL').length;
  const high = decisions.filter(d => d.priority === 'HIGH').length;

  const top = decisions[0];

  let headline = 'PM portfolio operating position requires management review.';

  if (top) {
    headline =
      `${decisions.length} management decisions identified; ` +
      `${money(exposure).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      })} of modeled exposure is represented in the current decision set.`;
  }

  return {
    headline,
    decisionCount: decisions.length,
    criticalCount: critical,
    highCount: high,
    modeledExposure: money(exposure),
    topPriority: top
      ? {
          decisionId: top.id,
          domain: top.domain,
          finding: top.finding,
          exposure: top.exposure,
          action: top.action,
          owner: top.owner,
          urgency: top.urgency
        }
      : null,
    confidence: 'DETERMINISTIC',
    disclaimer: 'Exposure values are modeled planning figures unless explicitly confirmed by a live financial source.'
  };
}

function buildDecisionPackage(payload) {
  const rawItems = extractItems(payload);

  let decisions = rawItems
    .map(makeDecision)
    .filter(d => d.finding);

  decisions = dedupeDecisions(decisions);

  decisions.sort((a, b) => {
    if (b.priorityRank !== a.priorityRank) return b.priorityRank - a.priorityRank;
    return b.exposure - a.exposure;
  });

  decisions = decisions.map((d, i) => ({
    ...d,
    rank: i + 1
  }));

  const existingFinancials =
    payload?.sections?.financials ||
    payload?.financials ||
    {};

  const modeledExposure = money(firstDefined(
    existingFinancials.total_exposure,
    existingFinancials.totalExposure,
    payload?.total_exposure,
    payload?.totalExposure,
    decisions.reduce((sum, d) => sum + d.exposure, 0)
  ));

  const recommendedActions = decisions.map(d => ({
    decisionId: d.id,
    text: d.action,
    owner: d.owner,
    urgency: d.urgency,
    priority: d.priority,
    exposure: d.exposure,
    entityId: d.entityId
  }));

  const auditTrail = decisions.map(d => ({
    timestamp: new Date().toISOString(),
    event: 'DECISION_GENERATED',
    decisionId: d.id,
    entityId: d.entityId,
    domain: d.domain,
    priority: d.priority,
    exposure: d.exposure,
    source: d.evidence.source || VERSION,
    engine: VERSION
  }));

  return {
    engine: VERSION,
    generatedAt: new Date().toISOString(),

    decisionSummary: {
      total: decisions.length,
      critical: decisions.filter(d => d.priority === 'CRITICAL').length,
      high: decisions.filter(d => d.priority === 'HIGH').length,
      medium: decisions.filter(d => d.priority === 'MEDIUM').length,
      modeledExposure
    },

    executiveSummary: buildExecutiveSummary(decisions, modeledExposure),

    decisions,

    recommendedActions,

    auditTrail,

    governance: {
      mode: 'DETERMINISTIC',
      llmRequired: false,
      humanApprovalRequired: true,
      writeBackToSourceSystems: false
    }
  };
}

module.exports = {
  VERSION,
  buildDecisionPackage
};
JS

cat > html/war-rooms/pm-copilot/services/pm-decision-bridge.js <<'JS'
(function () {
  'use strict';

  const API = '/api/pm/executive-decisions';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(v) {
    const n = Number(v || 0);
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }

  function findRelayPayload() {
    const keys = [];

    for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i));
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));

    const preferred = keys
      .filter(Boolean)
      .filter(k => /pm.*relay|relay.*pm|pm.*war/i.test(k))
      .reverse();

    for (const key of preferred) {
      try {
        const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }

    return null;
  }

  async function run(payload) {
    if (!payload || typeof payload !== 'object') return;

    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Decision engine HTTP ' + response.status);

      const result = await response.json();
      render(result);
    } catch (err) {
      console.warn('[PM Decision Engine]', err);
    }
  }

  function render(result) {
    const old = document.getElementById('pmDecisionEnginePanel');
    if (old) old.remove();

    const summary = result.executiveSummary || {};
    const decisions = result.decisions || [];

    const panel = document.createElement('section');
    panel.id = 'pmDecisionEnginePanel';

    panel.style.cssText =
      'margin:24px 0;padding:22px;border:1px solid rgba(255,255,255,.12);' +
      'border-radius:16px;background:rgba(10,14,20,.92);color:#fff;' +
      'font-family:inherit;box-shadow:0 12px 40px rgba(0,0,0,.25);';

    const rows = decisions.slice(0, 8).map(d => `
      <div style="padding:14px 0;border-top:1px solid rgba(255,255,255,.08)">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <strong>#${esc(d.rank)} ${esc(d.priority)}</strong>
          <span>${esc(d.domain.replace(/_/g, ' '))}</span>
          <span style="margin-left:auto;font-weight:700">${money(d.exposure)}</span>
        </div>
        <div style="margin-top:7px;font-weight:600">${esc(d.finding)}</div>
        <div style="margin-top:6px;opacity:.78">
          Action: ${esc(d.action)}
        </div>
        <div style="margin-top:5px;font-size:.88em;opacity:.65">
          Owner: ${esc(d.owner)} · Urgency: ${esc(d.urgency)} · Evidence: ${esc(d.entityId)}
        </div>
      </div>
    `).join('');

    panel.innerHTML = `
      <div style="font-size:12px;letter-spacing:.12em;opacity:.65">
        TSM PM DECISION ENGINE · ${esc(result.engine || 'v1')}
      </div>

      <h2 style="margin:7px 0 5px">Executive Decision Queue</h2>

      <p style="margin:0 0 16px;opacity:.8">
        ${esc(summary.headline || 'Management decisions generated from current PM evidence.')}
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>MODELED EXPOSURE</small><br>
          <strong>${money(summary.modeledExposure)}</strong>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>DECISIONS</small><br>
          <strong>${esc(summary.decisionCount || decisions.length)}</strong>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>CRITICAL</small><br>
          <strong>${esc(summary.criticalCount || 0)}</strong>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06)">
          <small>HIGH</small><br>
          <strong>${esc(summary.highCount || 0)}</strong>
        </div>
      </div>

      ${rows || '<div style="opacity:.65">No actionable decisions were generated from the current payload.</div>'}

      <div style="margin-top:14px;font-size:.78em;opacity:.55">
        Deterministic priority engine · Human approval required · No source-system write-back
      </div>
    `;

    const anchor =
      document.querySelector('main') ||
      document.querySelector('#app') ||
      document.body.firstElementChild;

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(panel, anchor);
    } else {
      document.body.prepend(panel);
    }
  }

  function boot() {
    const payload = findRelayPayload();
    if (payload) run(payload);

    window.addEventListener('storage', function (event) {
      if (/pm.*relay|relay.*pm|pm.*war/i.test(event.key || '')) {
        try {
          run(JSON.parse(event.newValue));
        } catch (_) {}
      }
    });

    window.addEventListener('TSM_RELAY_EVENT', function (event) {
      const payload = event.detail || event.payload;
      if (payload) run(payload);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
JS

cat > scripts/test-pm-decision-engine.js <<'JS'
'use strict';

const assert = require('assert');
const { buildDecisionPackage } = require('../server/pm/decision-engine');

const fixture = {
  sections: {
    financials: {
      total_exposure: 40445
    },

    exceptionReport: {
      exceptions: [
        {
          id: 'V-03',
          domain: 'vendor_compliance',
          claim: 'Vendor V-03 is expired',
          severity: 'high',
          exposure: 25000,
          sources: ['pm-engine.js computeKpis()']
        },
        {
          id: 'WO-2201',
          domain: 'maintenance',
          claim: 'WO-2201 is over SLA',
          severity: 'high',
          exposure: 40,
          sources: ['pm-engine.js getSlaBreaches()']
        }
      ]
    },

    riskReport: {
      risks: [
        {
          id: 'S-211',
          domain: 'iot',
          claim: 'Urgent water leak sensor alert',
          severity: 'critical',
          exposure: 3000,
          sources: ['pm-iot-engine.js']
        }
      ]
    }
  }
};

const result = buildDecisionPackage(fixture);

assert(result);
assert(Array.isArray(result.decisions));
assert(Array.isArray(result.recommendedActions));
assert(Array.isArray(result.auditTrail));
assert(result.executiveSummary);

assert.strictEqual(result.decisionSummary.modeledExposure, 40445);
assert.strictEqual(result.decisions[0].entityId, 'S-211');
assert.strictEqual(result.decisions[0].priority, 'CRITICAL');

console.log('PM decision engine test: PASS');
console.log(JSON.stringify({
  exposure: result.executiveSummary.modeledExposure,
  decisions: result.decisions.length,
  top: result.decisions[0]
}, null, 2));
JS

node - <<'JS'
const fs = require('fs');

const file = 'server.js';
let s = fs.readFileSync(file, 'utf8');

if (!s.includes("require('./server/pm/decision-engine')")) {
  const marker = "app.post('/api/pm/executive-decisions'";
  if (!s.includes(marker)) {
    const anchor = "const express = require('express');";
    const importLine = "\nconst { buildDecisionPackage } = require('./server/pm/decision-engine');\n";

    if (s.includes(anchor)) {
      s = s.replace(anchor, anchor + importLine);
    } else {
      s = "const { buildDecisionPackage } = require('./server/pm/decision-engine');\n" + s;
    }

    const route = `
/* ── PM EXECUTIVE DECISION ENGINE ─────────────────────────────────────────── */
app.post('/api/pm/executive-decisions', (req, res) => {
  try {
    const payload = req.body || {};
    const result = buildDecisionPackage(payload);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[PM Executive Decision Engine]', err);
    res.status(500).json({
      ok: false,
      error: 'PM executive decision generation failed'
    });
  }
});
/* ── END PM EXECUTIVE DECISION ENGINE ─────────────────────────────────────── */

`;

    const listenMatch = s.match(/\n(?=app\.listen\s*\()/);
    if (listenMatch) {
      const idx = listenMatch.index + 1;
      s = s.slice(0, idx) + route + s.slice(idx);
    } else {
      throw new Error('Could not locate app.listen() in server.js');
    }
  }
}

fs.writeFileSync(file, s);
JS

node - <<'JS'
const fs = require('fs');

const file = 'html/war-rooms/pm-copilot/pm-exec-portal.html';
let s = fs.readFileSync(file, 'utf8');

const tag = '<script src="/html/war-rooms/pm-copilot/services/pm-decision-bridge.js"></script>';

if (!s.includes('pm-decision-bridge.js')) {
  const marker = '</body>';
  if (!s.includes(marker)) throw new Error('Could not find </body> in PM Executive Portal');
  s = s.replace(marker, '  ' + tag + '\\n' + marker);
  fs.writeFileSync(file, s);
}
JS

node --check server/pm/decision-engine.js
node --check html/war-rooms/pm-copilot/services/pm-decision-bridge.js
node --check scripts/test-pm-decision-engine.js

node scripts/test-pm-decision-engine.js

echo
echo "=== IMPLEMENTATION COMPLETE ==="
echo
echo "Files:"
echo "  server/pm/decision-engine.js"
echo "  html/war-rooms/pm-copilot/services/pm-decision-bridge.js"
echo "  scripts/test-pm-decision-engine.js"
echo
echo "Modified:"
echo "  server.js"
echo "  html/war-rooms/pm-copilot/pm-exec-portal.html"
echo
echo "Next: inspect diff before staging."
