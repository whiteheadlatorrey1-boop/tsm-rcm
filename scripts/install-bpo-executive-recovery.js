#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server.js');
const OUT = path.join(ROOT, 'html', 'bpo', 'bpo-executive-recovery.js');

if (!fs.existsSync(SERVER)) {
  throw new Error(`server.js not found: ${SERVER}`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

/* ------------------------------------------------------------------
 * 1. CLIENT-SIDE EXECUTIVE RECOVERY ENGINE
 * ------------------------------------------------------------------ */

const client = String.raw`/* TSM BPO — Executive Revenue Recovery Intelligence */
(function (global) {
  'use strict';

  const TSM_BPO_EXEC_RECOVERY = {
    version: '1.0.0',

    async generate(caseId, options = {}) {
      if (!caseId) throw new Error('caseId is required');

      const url =
        options.url ||
        '/api/bpo/work-items/' +
        encodeURIComponent(caseId) +
        '/executive-recovery';

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || 'Executive recovery request failed');
      }

      return body;
    },

    async render(caseId, container, options = {}) {
      if (!container) throw new Error('container is required');

      container.innerHTML =
        '<div class="tsm-er-loading">Generating Executive Revenue Recovery Package…</div>';

      try {
        const result = await this.generate(caseId, options);
        container.innerHTML = renderReport(result);
        return result;
      } catch (err) {
        container.innerHTML =
          '<div class="tsm-er-error">' +
          escapeHtml(err.message) +
          '</div>';
        throw err;
      }
    }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(v) {
    const n = Number(v || 0);
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }

  function pct(v) {
    const n = Number(v || 0);
    return `${Math.round(n * 100)}%`;
  }

  function renderReport(r) {
    const e = r.executive || {};
    const exposure = r.revenueExposure || {};
    const strategy = r.strategy || [];
    const triggers = r.escalationTriggers || [];
    const evidence = r.evidence || [];
    const decisions = r.decision || {};

    return `
      <section class="tsm-executive-recovery">

        <header class="tsm-er-header">
          <div>
            <div class="tsm-er-eyebrow">
              TSM BPO · DECISION INTELLIGENCE
            </div>
            <h1>Executive Revenue Recovery Brief</h1>
            <div class="tsm-er-meta">
              ${escapeHtml(e.client || 'Client')}
              · ${escapeHtml(e.caseId || '')}
            </div>
          </div>

          <div class="tsm-er-confidence">
            <strong>${Math.round(Number(e.confidence || 0))}%</strong>
            <span>confidence</span>
          </div>
        </header>

        <div class="tsm-er-kpis">
          <div>
            <span>Revenue Exposure</span>
            <strong>${money(exposure.total)}</strong>
          </div>

          <div>
            <span>Immediate Exposure</span>
            <strong>${money(exposure.immediate)}</strong>
          </div>

          <div>
            <span>Estimated Recoverable</span>
            <strong>${money(exposure.recoverable)}</strong>
          </div>

          <div>
            <span>At-Risk Remainder</span>
            <strong>${money(exposure.remaining)}</strong>
          </div>
        </div>

        <article class="tsm-er-card">
          <h2>Executive Summary</h2>
          <p>${escapeHtml(e.summary || 'No executive summary available.')}</p>
        </article>

        <article class="tsm-er-card">
          <h2>Critical Findings</h2>
          <ol>
            ${(r.criticalFindings || []).map(x =>
              `<li>${escapeHtml(x)}</li>`
            ).join('')}
          </ol>
        </article>

        <article class="tsm-er-card">
          <h2>Recommended Recovery Strategy</h2>

          <div class="tsm-er-strategy">
            ${strategy.map((x, i) => `
              <div class="tsm-er-strategy-item">
                <div class="tsm-er-number">${String(i + 1).padStart(2, '0')}</div>

                <div class="tsm-er-action">
                  <strong>${escapeHtml(x.action)}</strong>

                  <div class="tsm-er-details">
                    <span>Owner: ${escapeHtml(x.owner || 'Unassigned')}</span>
                    <span>Deadline: ${escapeHtml(x.deadline || 'Not stated')}</span>
                    <span>Expected recovery: ${money(x.expectedRecovery || 0)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </article>

        <article class="tsm-er-card">
          <h2>Escalation Triggers</h2>

          <div class="tsm-er-triggers">
            ${triggers.map(x => `
              <div class="tsm-er-trigger">
                <span>⚡</span>
                <span>${escapeHtml(x)}</span>
              </div>
            `).join('')}
          </div>
        </article>

        <article class="tsm-er-card">
          <h2>Decision Intelligence</h2>

          <div class="tsm-er-decision-grid">
            <div>
              <span>Risk</span>
              <strong>${escapeHtml(e.risk || 'UNASSESSED')}</strong>
            </div>

            <div>
              <span>Recovery Probability</span>
              <strong>${pct(exposure.recoveryProbability)}</strong>
            </div>

            <div>
              <span>Source Completeness</span>
              <strong>${pct(r.quality?.completeness || 0)}</strong>
            </div>

            <div>
              <span>Evidence Sources</span>
              <strong>${evidence.length}</strong>
            </div>
          </div>
        </article>

        <article class="tsm-er-card">
          <h2>Evidence Chain</h2>

          <div class="tsm-er-evidence">
            ${evidence.map(x => `
              <div>
                <span>✓</span>
                ${escapeHtml(x)}
              </div>
            `).join('')}
          </div>
        </article>

        <footer class="tsm-er-footer">
          <button type="button"
            onclick="window.TSMBPOExecutiveRecovery.approve('${escapeHtml(e.caseId || '')}')">
            APPROVE RECOVERY PLAN
          </button>

          <button type="button"
            onclick="window.TSMBPOExecutiveRecovery.escalate('${escapeHtml(e.caseId || '')}')">
            ESCALATE TO EXECUTIVE
          </button>

          <button type="button"
            onclick="window.print()">
            EXPORT / PRINT
          </button>
        </footer>

      </section>
    `;
  }

  TSM_BPO_EXEC_RECOVERY.approve = async function(caseId) {
    return postDecision(caseId, 'approve');
  };

  TSM_BPO_EXEC_RECOVERY.escalate = async function(caseId) {
    return postDecision(caseId, 'escalate');
  };

  async function postDecision(caseId, decision) {
    const res = await fetch(
      '/api/bpo/work-items/' +
      encodeURIComponent(caseId) +
      '/executive-recovery/decision',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decision })
      }
    );

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body.error || 'Decision failed');
    }

    return body;
  }

  global.TSMBPOExecutiveRecovery = TSM_BPO_EXEC_RECOVERY;

})(window);
`;

fs.writeFileSync(OUT, client);

/* ------------------------------------------------------------------
 * 2. SERVER ROUTES
 * ------------------------------------------------------------------ */

const marker = '// === TSM BPO EXECUTIVE REVENUE RECOVERY V1 ===';

if (!fs.readFileSync(SERVER, 'utf8').includes(marker)) {
  const patch = String.raw`

${marker}

function _tsmNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;

  const n = Number(
    String(v)
      .replace(/[$,%\s,]/g, '')
      .replace(/[^\d.-]/g, '')
  );

  return Number.isFinite(n) ? n : 0;
}

function _tsmFirst(obj, paths, fallback) {
  for (const p of paths) {
    const parts = p.split('.');
    let cur = obj;

    for (const part of parts) {
      if (cur == null) break;
      cur = cur[part];
    }

    if (cur !== undefined && cur !== null && cur !== '') {
      return cur;
    }
  }

  return fallback;
}

function _tsmArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v);
  return [];
}

function _tsmText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);

  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function _tsmCollectNumbers(root, keys) {
  let total = 0;

  function walk(v) {
    if (!v || typeof v !== 'object') return;

    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }

    for (const [k, value] of Object.entries(v)) {
      const key = k.toLowerCase();

      if (
        keys.some(x => key === x || key.includes(x))
        && (
          typeof value === 'number' ||
          typeof value === 'string'
        )
      ) {
        total += _tsmNum(value);
      }

      if (value && typeof value === 'object') {
        walk(value);
      }
    }
  }

  walk(root);
  return total;
}

function _tsmFindRisk(text) {
  const s = String(text || '').toLowerCase();

  if (/critical|severe|urgent|immediate/.test(s)) return 'CRITICAL';
  if (/high|major|significant/.test(s)) return 'HIGH';
  if (/medium|moderate/.test(s)) return 'MEDIUM';

  return 'LOW';
}

function _tsmBuildRecoveryPackage(caseId, workItem, reports, slaEvents, documents, notes) {

  const wi = workItem || {};
  const allReports = _tsmArray(reports);
  const allSla = _tsmArray(slaEvents);
  const allDocs = _tsmArray(documents);
  const allNotes = _tsmArray(notes);

  const rawText = [
    JSON.stringify(wi),
    JSON.stringify(allReports),
    JSON.stringify(allSla),
    JSON.stringify(allDocs),
    JSON.stringify(allNotes)
  ].join('\\n');

  const revenueExposure = _tsmFirst(wi, [
    'revenueExposure',
    'revenue_exposure',
    'financial.revenueExposure',
    'financial.exposure',
    'financial.revenue',
    'amount',
    'value',
    'claimAmount',
    'claim_amount'
  ], 0);

  const calculatedExposure =
    _tsmNum(revenueExposure) ||
    _tsmCollectNumbers(wi, [
      'revenue',
      'exposure',
      'claimamount',
      'contractvalue',
      'ordervalue',
      'invoicevalue'
    ]);

  const immediateExposure =
    _tsmNum(_tsmFirst(wi, [
      'immediateExposure',
      'immediate_exposure',
      'financial.immediateExposure',
      'atRiskAmount',
      'at_risk_amount'
    ], 0)) ||
    calculatedExposure;

  const customer =
    _tsmFirst(wi, [
      'clientName',
      'client_name',
      'client.name',
      'customerName',
      'customer.name',
      'organization',
      'company'
    ], 'Unknown Client');

  const priority =
    _tsmFirst(wi, [
      'priority',
      'severity',
      'risk',
      'status'
    ], _tsmFindRisk(rawText));

  const commitmentCount =
    _tsmNum(_tsmFirst(wi, [
      'customerCommitments',
      'customer_commitments',
      'commitmentCount',
      'commitments',
      'affectedCustomers'
    ], 0));

  const slaRisk =
    allSla.length
      ? _tsmFindRisk(JSON.stringify(allSla))
      : _tsmFindRisk(rawText);

  const risk = _tsmFindRisk(
    String(priority) + ' ' + slaRisk + ' ' + rawText
  );

  /*
   * Conservative deterministic recovery estimate.
   * This is deliberately not presented as an AI prediction.
   * The AI layer can later replace/enrich it.
   */
  let recoveryProbability = 0.75;

  if (risk === 'CRITICAL') recoveryProbability = 0.65;
  else if (risk === 'HIGH') recoveryProbability = 0.72;
  else if (risk === 'MEDIUM') recoveryProbability = 0.82;
  else recoveryProbability = 0.90;

  const recoverable = Math.round(
    calculatedExposure * recoveryProbability
  );

  const remaining = Math.max(
    0,
    calculatedExposure - recoverable
  );

  const criticalFindings = [];

  if (calculatedExposure > 0) {
    criticalFindings.push(
      'Revenue exposure identified at $' +
      Math.round(calculatedExposure).toLocaleString('en-US') +
      '.'
    );
  }

  if (allSla.length) {
    criticalFindings.push(
      allSla.length +
      ' SLA event(s) are associated with this work item and require executive monitoring.'
    );
  }

  if (commitmentCount > 0) {
    criticalFindings.push(
      commitmentCount +
      ' customer commitment(s) are potentially affected.'
    );
  }

  if (allReports.length) {
    criticalFindings.push(
      allReports.length +
      ' BNCA report(s) have been generated and are included in the evidence chain.'
    );
  }

  if (!criticalFindings.length) {
    criticalFindings.push(
      'Insufficient structured financial evidence is currently available; executive review is required.'
    );
  }

  const strategy = [
    {
      action: 'Validate and contain the identified revenue exposure using the source records.',
      owner: 'BPO Operations Lead',
      deadline: 'Immediate',
      expectedRecovery: Math.round(recoverable * 0.35)
    },
    {
      action: 'Review SLA, client and document evidence for recovery blockers.',
      owner: 'Account / Client Operations Lead',
      deadline: 'Immediate',
      expectedRecovery: Math.round(recoverable * 0.20)
    },
    {
      action: 'Execute the highest-value recovery actions identified in the BNCA analysis.',
      owner: 'Recovery Owner',
      deadline: 'Next operational cycle',
      expectedRecovery: Math.round(recoverable * 0.30)
    },
    {
      action: 'Escalate unresolved exposure and track recovered versus remaining revenue.',
      owner: 'Executive Sponsor',
      deadline: 'Before next review',
      expectedRecovery: Math.round(recoverable * 0.15)
    }
  ];

  const escalationTriggers = [
    'Revenue exposure remains unresolved after the immediate containment window.',
    'SLA breach or critical SLA event is detected.',
    'Recovery owner has not acknowledged the action plan.',
    'Tier-1 client/customer impact is identified.',
    'Remaining unrecovered exposure increases.'
  ];

  const evidence = [
    'BPO work item',
    allReports.length ? 'BNCA reports' : null,
    allSla.length ? 'SLA events' : null,
    allDocs.length ? 'Case documents' : null,
    allNotes.length ? 'Case notes' : null
  ].filter(Boolean);

  const summary =
    customer +
    ' has a ' +
    risk.toLowerCase() +
    ' operational/revenue exposure requiring coordinated containment and recovery. ' +
    'The current structured evidence indicates approximately $' +
    Math.round(calculatedExposure).toLocaleString('en-US') +
    ' in revenue exposure. ' +
    'The executive objective is to preserve the highest-value exposure, remove operational blockers, ' +
    'and continuously measure recovered versus remaining revenue.';

  return {
    ok: true,
    generatedAt: new Date().toISOString(),

    executive: {
      client: customer,
      caseId,
      risk,
      confidence: Math.round(recoveryProbability * 100),
      summary
    },

    revenueExposure: {
      total: calculatedExposure,
      immediate: immediateExposure,
      recoverable,
      remaining,
      recoveryProbability
    },

    criticalFindings,

    strategy,

    escalationTriggers,

    evidence,

    quality: {
      completeness: Math.min(
        1,
        evidence.length / 5
      ),
      sourceCount: evidence.length
    },

    decision: {
      status: 'PENDING_EXECUTIVE_DECISION',
      available: ['approve', 'escalate']
    },

    sourceCounts: {
      workItem: wi && Object.keys(wi).length ? 1 : 0,
      bncaReports: allReports.length,
      slaEvents: allSla.length,
      documents: allDocs.length,
      notes: allNotes.length
    }
  };
}

app.get(
  '/api/bpo/work-items/:caseId/executive-recovery',
  requireRole(BPO_INTERNAL_ROLES),
  async (req, res) => {
    try {
      const { caseId } = req.params;

      /*
       * Reuse the existing BPO routes internally rather than
       * duplicating database logic.
       */
      const base = req.protocol + '://' + req.get('host');
      const cookie = req.headers.cookie || '';

      async function getJson(url) {
        try {
          const r = await fetch(url, {
            headers: {
              cookie,
              accept: 'application/json'
            }
          });

          return await r.json().catch(() => ({}));
        } catch {
          return {};
        }
      }

      const [
        workItem,
        reports,
        sla,
        documents,
        notes
      ] = await Promise.all([
        getJson(base + '/api/bpo/work-items/' + encodeURIComponent(caseId)),
        getJson(base + '/api/bpo/work-items/' + encodeURIComponent(caseId) + '/bnca-reports'),
        getJson(base + '/api/bpo/work-items/' + encodeURIComponent(caseId) + '/sla-events'),
        getJson(base + '/api/bpo/work-items/' + encodeURIComponent(caseId) + '/documents'),
        getJson(base + '/api/bpo/work-items/' + encodeURIComponent(caseId) + '/notes')
      ]);

      const report = _tsmBuildRecoveryPackage(
        caseId,
        workItem.data || workItem.workItem || workItem,
        reports.data || reports.reports || reports,
        sla.data || sla.events || sla,
        documents.data || documents.documents || documents,
        notes.data || notes.notes || notes
      );

      res.json(report);

    } catch (err) {
      console.error('[BPO EXECUTIVE RECOVERY]', err);

      res.status(500).json({
        ok: false,
        error: 'Failed to generate executive recovery package'
      });
    }
  }
);

app.post(
  '/api/bpo/work-items/:caseId/executive-recovery/decision',
  requireRole(BPO_INTERNAL_ROLES),
  async (req, res) => {
    const { caseId } = req.params;
    const { decision } = req.body || {};

    if (!['approve', 'escalate'].includes(decision)) {
      return res.status(400).json({
        ok: false,
        error: 'Decision must be approve or escalate'
      });
    }

    console.log(JSON.stringify({
      type: 'bpo_executive_recovery_decision',
      ts: new Date().toISOString(),
      caseId,
      decision,
      actor: req.user?.username || req.user?.email || 'unknown'
    }));

    res.json({
      ok: true,
      caseId,
      decision,
      status:
        decision === 'approve'
          ? 'RECOVERY_PLAN_APPROVED'
          : 'ESCALATED_TO_EXECUTIVE',
      ts: new Date().toISOString()
    });
  }
);

`;

  const current = fs.readFileSync(SERVER, 'utf8');

  /*
   * Insert immediately before the final app.listen/startup section.
   */
  const candidates = [
    /app\.listen\(/,
    /server\.listen\(/
  ];

  let inserted = false;

  for (const re of candidates) {
    const match = current.match(re);

    if (match && match.index !== undefined) {
      const updated =
        current.slice(0, match.index) +
        patch +
        '\n' +
        current.slice(match.index);

      fs.writeFileSync(SERVER, updated);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    throw new Error(
      'Could not locate app.listen/server.listen in server.js'
    );
  }

  console.log('✓ Executive recovery routes installed');
} else {
  console.log('✓ Executive recovery routes already installed');
}

/* ------------------------------------------------------------------
 * 3. VALIDATION
 * ------------------------------------------------------------------ */

const { execFileSync } = require('child_process');

execFileSync(process.execPath, ['--check', SERVER], {
  stdio: 'inherit'
});

console.log('✓ server.js syntax valid');
console.log('✓ Client engine:', OUT);
console.log('');
console.log('NEXT: restart server and test:');
console.log('');
console.log(
  'GET /api/bpo/work-items/:caseId/executive-recovery'
);
