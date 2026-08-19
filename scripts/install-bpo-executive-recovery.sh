#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SERVER="server.js"
STRAT="html/war-rooms/bpo-war/bpo-strategist.html"
OUT="html/war-rooms/bpo-war/bpo-executive-recovery.js"

echo "============================================================"
echo " TSM BPO EXECUTIVE RECOVERY INSTALLER"
echo "============================================================"

[[ -f "$SERVER" ]] || { echo "ERROR: $SERVER not found"; exit 1; }
[[ -f "$STRAT" ]] || { echo "ERROR: $STRAT not found"; exit 1; }

mkdir -p backups

STAMP="$(date +%Y%m%d-%H%M%S)"

cp "$SERVER" "backups/server.js.bpo-executive-recovery-$STAMP.bak"
cp "$STRAT" "backups/bpo-strategist.bpo-executive-recovery-$STAMP.bak"

echo "[1/5] Backups created."
echo "  server:     backups/server.js.bpo-executive-recovery-$STAMP.bak"
echo "  strategist: backups/bpo-strategist.bpo-executive-recovery-$STAMP.bak"

echo "[2/5] Creating Executive Recovery engine..."

cat > "$OUT" <<'JS'
(function () {
  'use strict';

  const API = '/api/bpo';

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function getJSON(url, options) {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        ...(options && options.headers || {})
      },
      ...(options || {})
    });

    const text = await res.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(
        `${res.status} ${res.statusText}: ${data?.error || data?.message || 'request failed'}`
      );
    }

    return data;
  }

  function firstArray(value) {
    if (Array.isArray(value)) return value;

    if (!value || typeof value !== 'object') return [];

    for (const key of [
      'items',
      'data',
      'results',
      'reports',
      'notes',
      'events',
      'documents',
      'decisions',
      'workItems',
      'work_items'
    ]) {
      if (Array.isArray(value[key])) return value[key];
    }

    return [];
  }

  function numberFrom(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    if (typeof value === 'string') {
      const n = Number(value.replace(/[$,%\s,]/g, ''));
      return Number.isFinite(n) ? n : null;
    }

    return null;
  }

  function findNumbers(obj, names) {
    if (!obj || typeof obj !== 'object') return null;

    for (const name of names) {
      if (obj[name] !== undefined && obj[name] !== null) {
        const n = numberFrom(obj[name]);
        if (n !== null) return n;
      }
    }

    return null;
  }

  function money(value) {
    const n = numberFrom(value);
    if (n === null) return 'Not quantified';

    return '$' + n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function collectText(report) {
    const parts = [];

    function walk(value, depth) {
      if (depth > 4 || value == null) return;

      if (typeof value === 'string' || typeof value === 'number') {
        parts.push(String(value));
        return;
      }

      if (Array.isArray(value)) {
        value.slice(0, 50).forEach(v => walk(v, depth + 1));
        return;
      }

      if (typeof value === 'object') {
        Object.entries(value).slice(0, 100).forEach(([k, v]) => {
          parts.push(k);
          walk(v, depth + 1);
        });
      }
    }

    walk(report, 0);
    return parts.join(' ');
  }

  function extractFindings(reports) {
    const findings = [];

    for (const report of reports) {
      const source =
        report.findings ||
        report.criticalFindings ||
        report.critical_findings ||
        report.recommendations ||
        report.actions ||
        [];

      if (Array.isArray(source)) {
        source.forEach(item => {
          if (typeof item === 'string') {
            findings.push(item);
          } else if (item && typeof item === 'object') {
            findings.push(
              item.finding ||
              item.text ||
              item.description ||
              item.action ||
              item.recommendation ||
              JSON.stringify(item)
            );
          }
        });
      }
    }

    return [...new Set(findings.filter(Boolean))].slice(0, 20);
  }

  function extractRecommendations(reports) {
    const output = [];

    for (const report of reports) {
      const source =
        report.recommendations ||
        report.recommendedStrategy ||
        report.recommended_strategy ||
        report.actions ||
        [];

      if (Array.isArray(source)) {
        source.forEach(item => {
          if (typeof item === 'string') {
            output.push({ action: item });
          } else if (item && typeof item === 'object') {
            output.push({
              action:
                item.action ||
                item.recommendation ||
                item.description ||
                item.text ||
                'Recommended action',
              owner: item.owner || item.assignee || item.role || null,
              deadline: item.deadline || item.dueDate || item.due_date || null
            });
          }
        });
      }
    }

    return output.slice(0, 12);
  }

  function extractRisk(reports) {
    const risks = [];

    for (const report of reports) {
      const source =
        report.risks ||
        report.riskAssessment ||
        report.risk_assessment ||
        report.escalations ||
        [];

      if (Array.isArray(source)) {
        source.forEach(item => {
          if (typeof item === 'string') {
            risks.push(item);
          } else if (item && typeof item === 'object') {
            risks.push(
              item.description ||
              item.risk ||
              item.text ||
              JSON.stringify(item)
            );
          }
        });
      }
    }

    return [...new Set(risks.filter(Boolean))].slice(0, 15);
  }

  function summarizeCase(workItem, reports, slaEvents, notes) {
    const text = [
      collectText(workItem),
      ...reports.map(collectText),
      ...slaEvents.map(collectText),
      ...notes.map(collectText)
    ].join(' ');

    const revenue =
      findNumbers(workItem, [
        'revenueExposure',
        'revenue_exposure',
        'recoveryExposure',
        'recovery_exposure',
        'exposure',
        'amountAtRisk',
        'amount_at_risk'
      ]) ||
      reports.map(r =>
        findNumbers(r, [
          'revenueExposure',
          'revenue_exposure',
          'recoveryExposure',
          'recovery_exposure',
          'exposure',
          'amountAtRisk',
          'amount_at_risk'
        ])
      ).find(v => v !== null);

    const confidence =
      findNumbers(workItem, ['confidence', 'confidenceScore', 'confidence_score']) ||
      reports.map(r =>
        findNumbers(r, ['confidence', 'confidenceScore', 'confidence_score'])
      ).find(v => v !== null);

    return {
      caseId:
        workItem.caseId ||
        workItem.id ||
        workItem.workItemId ||
        workItem.case_id ||
        'Unknown Case',

      client:
        workItem.clientName ||
        workItem.client ||
        workItem.customerName ||
        workItem.customer ||
        'Unknown Client',

      title:
        workItem.title ||
        workItem.subject ||
        workItem.name ||
        workItem.description ||
        'BPO Recovery Case',

      status:
        workItem.status ||
        workItem.state ||
        'Unknown',

      severity:
        workItem.severity ||
        workItem.priority ||
        workItem.risk ||
        'Unknown',

      revenueExposure: revenue,

      confidence,

      sourceText: text
    };
  }

  async function buildExecutiveRecovery(caseId) {
    if (!caseId) {
      throw new Error('No BPO case ID supplied.');
    }

    const encoded = encodeURIComponent(caseId);

    const results = await Promise.allSettled([
      getJSON(`${API}/work-items/${encoded}`),
      getJSON(`${API}/work-items/${encoded}/bnca-reports`),
      getJSON(`${API}/work-items/${encoded}/sla-events`),
      getJSON(`${API}/work-items/${encoded}/notes`),
      getJSON(`${API}/work-items/${encoded}/documents`)
    ]);

    const value = index => {
      const r = results[index];
      return r.status === 'fulfilled' ? r.value : null;
    };

    const workItem = value(0) || {};
    const reports = firstArray(value(1));
    const slaEvents = firstArray(value(2));
    const notes = firstArray(value(3));
    const documents = firstArray(value(4));

    const summary = summarizeCase(
      workItem,
      reports,
      slaEvents,
      notes
    );

    const findings = extractFindings(reports);
    const recommendations = extractRecommendations(reports);
    const risks = extractRisk(reports);

    const escalationTriggers = [];

    if (summary.revenueExposure !== null) {
      escalationTriggers.push(
        `Revenue exposure requires executive containment: ${money(summary.revenueExposure)}`
      );
    }

    if (slaEvents.length) {
      escalationTriggers.push(
        `${slaEvents.length} SLA event(s) require review`
      );
    }

    if (risks.length) {
      escalationTriggers.push(
        `${risks.length} identified risk/escalation item(s)`
      );
    }

    if (!recommendations.length) {
      escalationTriggers.push(
        'No structured recovery recommendations have been recorded'
      );
    }

    return {
      generatedAt: new Date().toISOString(),

      case: summary,

      executiveSummary: {
        revenueExposure: summary.revenueExposure,
        confidence: summary.confidence,
        severity: summary.severity,
        status: summary.status,

        findingCount: findings.length,
        recommendationCount: recommendations.length,
        riskCount: risks.length,

        sourceCoverage: {
          workItem: !!value(0),
          bncaReports: !!value(1),
          slaEvents: !!value(2),
          notes: !!value(3),
          documents: !!value(4)
        }
      },

      criticalFindings: findings,

      recommendedStrategy: recommendations,

      riskAssessment: risks,

      escalationTriggers,

      operationalEvidence: {
        bncaReports: reports,
        slaEvents,
        notes,
        documents
      }
    };
  }

  function renderRecovery(report) {
    const root = document.getElementById('tsm-executive-recovery-panel');

    if (!root) return;

    const c = report.case;
    const e = report.executiveSummary;

    root.innerHTML = `
      <div class="tsm-er-header">
        <div>
          <div class="tsm-er-kicker">EXECUTIVE RECOVERY · DECISION INTELLIGENCE</div>
          <h2>${esc(c.client)} · ${esc(c.caseId)}</h2>
          <div class="tsm-er-meta">
            ${esc(c.title)}
            · Severity: ${esc(c.severity)}
            · Status: ${esc(c.status)}
          </div>
        </div>
        <div class="tsm-er-confidence">
          <strong>${e.confidence != null ? esc(e.confidence) + '%' : 'N/A'}</strong>
          <span>CONFIDENCE</span>
        </div>
      </div>

      <section class="tsm-er-card">
        <h3>EXECUTIVE SUMMARY</h3>

        <div class="tsm-er-metrics">
          <div>
            <span>REVENUE EXPOSURE</span>
            <strong>${money(e.revenueExposure)}</strong>
          </div>
          <div>
            <span>BNCA REPORTS</span>
            <strong>${esc(e.findingCount)}</strong>
          </div>
          <div>
            <span>RECOMMENDATIONS</span>
            <strong>${esc(e.recommendationCount)}</strong>
          </div>
          <div>
            <span>RISKS</span>
            <strong>${esc(e.riskCount)}</strong>
          </div>
        </div>
      </section>

      <section class="tsm-er-card">
        <h3>CRITICAL FINDINGS</h3>
        ${
          report.criticalFindings.length
            ? `<ol>${report.criticalFindings.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`
            : '<p>No structured BNCA findings recorded.</p>'
        }
      </section>

      <section class="tsm-er-card">
        <h3>RECOMMENDED RECOVERY STRATEGY</h3>
        ${
          report.recommendedStrategy.length
            ? report.recommendedStrategy.map((x, i) => `
              <div class="tsm-er-action">
                <div class="tsm-er-number">${String(i + 1).padStart(2, '0')}</div>
                <div>
                  <strong>${esc(x.action)}</strong>
                  ${
                    x.owner
                      ? `<div class="tsm-er-owner">OWNER · ${esc(x.owner)}</div>`
                      : ''
                  }
                  ${
                    x.deadline
                      ? `<div class="tsm-er-owner">DEADLINE · ${esc(x.deadline)}</div>`
                      : ''
                  }
                </div>
              </div>
            `).join('')
            : '<p>No structured recovery strategy recorded.</p>'
        }
      </section>

      <section class="tsm-er-card">
        <h3>ESCALATION TRIGGERS</h3>
        ${
          report.escalationTriggers.length
            ? `<ul>${report.escalationTriggers.map(x => `<li>⚡ ${esc(x)}</li>`).join('')}</ul>`
            : '<p>No automatic escalation trigger detected.</p>'
        }
      </section>

      <section class="tsm-er-card">
        <h3>WHY DOES THE SYSTEM BELIEVE THIS?</h3>
        <div class="tsm-er-evidence">
          <div>✓ Work Item: ${e.sourceCoverage.workItem ? 'AVAILABLE' : 'MISSING'}</div>
          <div>✓ BNCA Reports: ${e.sourceCoverage.bncaReports ? 'AVAILABLE' : 'MISSING'}</div>
          <div>✓ SLA Events: ${e.sourceCoverage.slaEvents ? 'AVAILABLE' : 'MISSING'}</div>
          <div>✓ Notes: ${e.sourceCoverage.notes ? 'AVAILABLE' : 'MISSING'}</div>
          <div>✓ Documents: ${e.sourceCoverage.documents ? 'AVAILABLE' : 'MISSING'}</div>
        </div>
      </section>

      <section class="tsm-er-card">
        <h3>ROUTE TO EXECUTIVE</h3>
        <button id="tsm-er-export" class="tsm-er-button">
          PACKAGE EXECUTIVE RECOVERY
        </button>
        <button id="tsm-er-json" class="tsm-er-button secondary">
          EXPORT JSON
        </button>
      </section>
    `;

    const exportButton = document.getElementById('tsm-er-export');

    if (exportButton) {
      exportButton.onclick = () => {
        const payload = JSON.stringify(report, null, 2);

        const blob = new Blob([payload], {
          type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download =
          `${c.caseId}-executive-recovery.json`;

        a.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
    }

    const jsonButton = document.getElementById('tsm-er-json');

    if (jsonButton) {
      jsonButton.onclick = () => {
        navigator.clipboard
          ?.writeText(JSON.stringify(report, null, 2))
          .then(() => {
            jsonButton.textContent = 'COPIED';
            setTimeout(() => {
              jsonButton.textContent = 'EXPORT JSON';
            }, 1500);
          });
      };
    }
  }

  function injectStyles() {
    if (document.getElementById('tsm-executive-recovery-style')) return;

    const style = document.createElement('style');

    style.id = 'tsm-executive-recovery-style';

    style.textContent = `
      #tsm-executive-recovery-panel {
        margin: 24px 0;
        font-family: inherit;
      }

      .tsm-er-header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 22px;
        border: 1px solid rgba(0,255,220,.25);
        background: rgba(5,12,25,.92);
      }

      .tsm-er-kicker {
        color: #00e6d0;
        letter-spacing: 2px;
        font-size: 11px;
        margin-bottom: 8px;
      }

      .tsm-er-header h2 {
        margin: 0;
        font-size: 22px;
      }

      .tsm-er-meta {
        margin-top: 8px;
        opacity: .7;
        font-size: 12px;
      }

      .tsm-er-confidence {
        min-width: 100px;
        text-align: center;
        border-left: 1px solid rgba(255,255,255,.1);
        padding-left: 20px;
      }

      .tsm-er-confidence strong {
        display: block;
        font-size: 28px;
        color: #00e6d0;
      }

      .tsm-er-confidence span {
        font-size: 9px;
        letter-spacing: 2px;
        opacity: .65;
      }

      .tsm-er-card {
        margin-top: 12px;
        padding: 20px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(8,15,30,.82);
      }

      .tsm-er-card h3 {
        margin: 0 0 16px;
        color: #00e6d0;
        font-size: 12px;
        letter-spacing: 2px;
      }

      .tsm-er-metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .tsm-er-metrics > div {
        padding: 14px;
        border: 1px solid rgba(255,255,255,.07);
      }

      .tsm-er-metrics span {
        display: block;
        font-size: 9px;
        opacity: .55;
        margin-bottom: 6px;
      }

      .tsm-er-metrics strong {
        font-size: 18px;
      }

      .tsm-er-card ol,
      .tsm-er-card ul {
        margin: 0;
        padding-left: 22px;
      }

      .tsm-er-card li {
        margin: 9px 0;
        line-height: 1.5;
      }

      .tsm-er-action {
        display: flex;
        gap: 14px;
        padding: 12px;
        border-bottom: 1px solid rgba(255,255,255,.07);
      }

      .tsm-er-number {
        color: #00e6d0;
        font-weight: bold;
      }

      .tsm-er-owner {
        margin-top: 5px;
        font-size: 10px;
        opacity: .6;
      }

      .tsm-er-evidence {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .tsm-er-button {
        padding: 11px 16px;
        margin-right: 8px;
        border: 1px solid #00e6d0;
        background: #00e6d0;
        color: #061016;
        font-weight: bold;
        cursor: pointer;
      }

      .tsm-er-button.secondary {
        background: transparent;
        color: #00e6d0;
      }

      @media (max-width: 800px) {
        .tsm-er-metrics {
          grid-template-columns: repeat(2, 1fr);
        }

        .tsm-er-header {
          flex-direction: column;
        }

        .tsm-er-evidence {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  async function launch(caseId) {
    injectStyles();

    let panel = document.getElementById(
      'tsm-executive-recovery-panel'
    );

    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'tsm-executive-recovery-panel';

      const target =
        document.querySelector('[data-executive-recovery]') ||
        document.querySelector('#executive-recovery') ||
        document.querySelector('.strategy-brief') ||
        document.querySelector('main') ||
        document.body;

      target.appendChild(panel);
    }

    panel.innerHTML =
      '<div class="tsm-er-card">Building Executive Recovery Package…</div>';

    try {
      const report = await buildExecutiveRecovery(caseId);

      window.TSMExecutiveRecovery = report;

      renderRecovery(report);

      return report;
    } catch (error) {
      console.error('[TSM Executive Recovery]', error);

      panel.innerHTML = `
        <div class="tsm-er-card">
          <h3>EXECUTIVE RECOVERY ERROR</h3>
          <p>${esc(error.message)}</p>
        </div>
      `;

      throw error;
    }
  }

  window.TSMExecutiveRecovery = {
    build: buildExecutiveRecovery,
    launch,
    render: renderRecovery
  };

  window.TSMBuildExecutiveRecovery = launch;

})();
JS

echo "[3/5] Wiring Strategist UI..."

node <<'NODE'
const fs = require('fs');

const file = 'html/war-rooms/bpo-war/bpo-strategist.html';
let html = fs.readFileSync(file, 'utf8');

const scriptTag =
  '<script src="/html/war-rooms/bpo-war/bpo-executive-recovery.js" defer></script>';

if (!html.includes('bpo-executive-recovery.js')) {
  if (html.includes('</head>')) {
    html = html.replace('</head>', `  ${scriptTag}\n</head>`);
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', `  ${scriptTag}\n</body>`);
  } else {
    html += `\n${scriptTag}\n`;
  }
}

const marker = 'data-executive-recovery';

if (!html.includes(marker)) {
  const buttonPattern =
    /(<button[^>]*(?:ROUTE TO EXECUTIVE|EXECUTIVE|executive)[^>]*>)/i;

  if (buttonPattern.test(html)) {
    html = html.replace(
      buttonPattern,
      `<div data-executive-recovery></div>\n$1`
    );
  } else {
    html = html.replace(
      /<body[^>]*>/i,
      match => `${match}\n<div data-executive-recovery></div>`
    );
  }
}

fs.writeFileSync(file, html);

console.log('  Strategist script wired.');
NODE

echo "[4/5] Validating installation..."

node --check "$OUT"

node <<'NODE'
const fs = require('fs');

const server = fs.readFileSync('server.js', 'utf8');
const strat = fs.readFileSync(
  'html/war-rooms/bpo-war/bpo-strategist.html',
  'utf8'
);

const checks = [
  ['BPO work item route', server.includes('/api/bpo/work-items/:caseId')],
  ['BNCA report route', server.includes('/api/bpo/work-items/:caseId/bnca-reports')],
  ['SLA route', server.includes('/api/bpo/work-items/:caseId/sla-events')],
  ['Notes route', server.includes('/api/bpo/work-items/:caseId/notes')],
  ['Documents route', server.includes('/api/bpo/work-items/:caseId/documents')],
  ['Executive Recovery engine', fs.existsSync('html/war-rooms/bpo-war/bpo-executive-recovery.js')],
  ['Strategist wiring', strat.includes('bpo-executive-recovery.js')],
  ['Recovery panel marker', strat.includes('data-executive-recovery')]
];

let failed = false;

for (const [name, ok] of checks) {
  console.log(`${ok ? '  PASS' : '  FAIL'} ${name}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
NODE

echo "[5/5] Installation complete."

echo
echo "============================================================"
echo " BPO EXECUTIVE RECOVERY READY"
echo "============================================================"
echo
echo "Engine:"
echo "  $OUT"
echo
echo "Strategist:"
echo "  $STRAT"
echo
echo "Backups:"
echo "  backups/server.js.bpo-executive-recovery-$STAMP.bak"
echo "  backups/bpo-strategist.bpo-executive-recovery-$STAMP.bak"
echo
echo "The recovery engine aggregates:"
echo "  1. Work Item"
echo "  2. BNCA Reports"
echo "  3. SLA Events"
echo "  4. Notes"
echo "  5. Documents"
echo
echo "Then produces:"
echo "  • Executive Summary"
echo "  • Revenue Exposure"
echo "  • Critical Findings"
echo "  • Recommended Recovery Strategy"
echo "  • Risk Assessment"
echo "  • Escalation Triggers"
echo "  • Evidence / Source Coverage"
echo "  • Executive Recovery JSON Package"
echo
