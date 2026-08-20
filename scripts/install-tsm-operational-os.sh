#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SERVER="server.js"
ENGINE="server/tsm-operational-os.js"
EXEC="html/tsm-operational-os-executive.html"

echo "============================================================"
echo " TSM OPERATIONAL OS — UNIVERSAL EXECUTIVE RECOVERY INSTALL"
echo "============================================================"

[[ -f "$SERVER" ]] || { echo "ERROR: server.js not found"; exit 1; }

mkdir -p server html backups

STAMP="$(date +%Y%m%d-%H%M%S)"
cp "$SERVER" "backups/server.js.operational-os-$STAMP.bak"

echo "[1/6] Installing universal recovery engine..."

cat > "$ENGINE" <<'NODE'
'use strict';

/**
 * TSM Operational OS
 * Universal cross-vertical recovery / exception intelligence.
 *
 * Input:
 *   tenant/member
 *   cases
 *   BNCA reports
 *   SLA events
 *   notes
 *   documents
 *
 * Output:
 *   executive recovery package
 *
 * This engine does NOT invent financial exposure.
 * Values are derived only from structured case data.
 */

const VERTICALS = [
  'healthcare',
  'mortgage',
  'construction',
  'real-estate',
  'insurance',
  'finops',
  'legal',
  'schools',
  'bpo',
  'concierge'
];

function num(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,%\s,]/g, '');
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function first(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function caseVertical(c) {
  return String(
    first(
      c.vertical,
      c.domain,
      c.practice,
      c.category,
      'unclassified'
    )
  ).toLowerCase();
}

function caseExposure(c) {
  return num(
    c.revenueExposure,
    c.revenue_exposure,
    c.recoveryExposure,
    c.recovery_exposure,
    c.financialExposure,
    c.financial_exposure,
    c.amountAtRisk,
    c.amount_at_risk,
    c.exposure,
    c.amount
  );
}

function caseRecovered(c) {
  return num(
    c.recoveredAmount,
    c.recovered_amount,
    c.revenueRecovered,
    c.revenue_recovered,
    c.amountRecovered
  ) || 0;
}

function casePrevented(c) {
  return num(
    c.preventedLoss,
    c.prevented_loss,
    c.lossPrevented,
    c.loss_prevented
  ) || 0;
}

function priorityWeight(priority) {
  return {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  }[String(priority || '').toLowerCase()] || 0;
}

function collectText(item) {
  if (!item || typeof item !== 'object') return '';

  return [
    item.title,
    item.summary,
    item.description,
    item.finding,
    item.recommendation,
    item.action,
    item.reason,
    item.note,
    item.text,
    item.message
  ].filter(Boolean).join(' ');
}

function deriveFinding(c) {
  const exposure = caseExposure(c);
  const status = String(c.status || c.stage || '').toLowerCase();
  const priority = String(c.priority || '').toLowerCase();

  if (exposure !== null && exposure > 0) {
    return `${priorityWeight(priority) >= 3 ? 'High-priority ' : ''}financial exposure of ${exposure}`;
  }

  if (status.includes('overdue') || status.includes('escalat')) {
    return 'Operational exception requires management intervention';
  }

  return first(c.title, c.summary, c.description, 'Operational exception identified');
}

function buildRecoveryPackage(input = {}) {
  const member = input.member || input.tenant || {};
  const cases = Array.isArray(input.cases) ? input.cases : [];
  const bnca = Array.isArray(input.bncaReports) ? input.bncaReports : [];
  const sla = Array.isArray(input.slaEvents) ? input.slaEvents : [];
  const notes = Array.isArray(input.notes) ? input.notes : [];
  const documents = Array.isArray(input.documents) ? input.documents : [];

  const exposure = cases.reduce((sum, c) => {
    const value = caseExposure(c);
    return sum + (value === null ? 0 : value);
  }, 0);

  const recovered = cases.reduce((sum, c) => sum + caseRecovered(c), 0);
  const prevented = cases.reduce((sum, c) => sum + casePrevented(c), 0);

  const verticalMap = {};

  for (const c of cases) {
    const vertical = caseVertical(c);

    if (!verticalMap[vertical]) {
      verticalMap[vertical] = {
        vertical,
        cases: 0,
        exposure: 0,
        recovered: 0,
        prevented: 0,
        critical: 0,
        high: 0
      };
    }

    const row = verticalMap[vertical];
    row.cases++;

    const e = caseExposure(c);
    if (e !== null) row.exposure += e;

    row.recovered += caseRecovered(c);
    row.prevented += casePrevented(c);

    const p = String(c.priority || '').toLowerCase();
    if (p === 'critical') row.critical++;
    if (p === 'high') row.high++;
  }

  const verticals = Object.values(verticalMap)
    .sort((a, b) => b.exposure - a.exposure);

  const criticalCases = cases
    .filter(c => ['critical', 'high'].includes(
      String(c.priority || '').toLowerCase()
    ))
    .sort((a, b) =>
      priorityWeight(b.priority) - priorityWeight(a.priority)
    );

  const findings = criticalCases.slice(0, 12).map(deriveFinding);

  const escalationTriggers = [];

  if (exposure > 0) {
    escalationTriggers.push(
      `Financial exposure identified across ${cases.length} case(s)`
    );
  }

  if (sla.length) {
    escalationTriggers.push(
      `${sla.length} SLA event(s) require executive review`
    );
  }

  if (criticalCases.length) {
    escalationTriggers.push(
      `${criticalCases.length} high/critical case(s) require prioritization`
    );
  }

  if (!documents.length) {
    escalationTriggers.push(
      'Evidence/document coverage is incomplete'
    );
  }

  const recoveryRate =
    exposure > 0 ? recovered / exposure : null;

  const containmentValue = recovered + prevented;

  return {
    schemaVersion: 'TSM-OPERATIONAL-OS-1.0',

    generatedAt: new Date().toISOString(),

    member: {
      id: first(member.id, member.memberId, member.tenantId, 'demo-member'),
      name: first(member.name, member.memberName, member.tenantName, 'SMB Member')
    },

    executiveSummary:
      exposure > 0
        ? `The portfolio currently carries ${exposure} of identified financial exposure across ${cases.length} operational case(s). The recovery engine has identified ${recovered} recovered value and ${prevented} prevented-loss value from structured case data.`
        : `The portfolio contains ${cases.length} operational case(s), but no structured financial exposure has been recorded yet.`,

    financials: {
      exposure,
      recovered,
      prevented,
      containmentValue,
      recoveryRate
    },

    portfolio: {
      totalCases: cases.length,
      criticalCases: cases.filter(c =>
        String(c.priority || '').toLowerCase() === 'critical'
      ).length,
      highCases: cases.filter(c =>
        String(c.priority || '').toLowerCase() === 'high'
      ).length,
      verticalCount: verticals.length
    },

    verticals,

    criticalFindings: findings,

    recommendedActions: criticalCases.slice(0, 8).map(c => ({
      caseId: first(c.caseId, c.id),
      vertical: caseVertical(c),
      priority: c.priority || null,
      owner: first(c.owner, c.assignee, c.assignedTo, 'Unassigned'),
      action: first(
        c.recommendedAction,
        c.recommendation,
        c.nextAction,
        c.action,
        'Review and resolve operational exception'
      ),
      exposure: caseExposure(c)
    })),

    escalationTriggers,

    evidence: {
      cases: cases.length > 0,
      bncaReports: bnca.length > 0,
      slaEvents: sla.length > 0,
      notes: notes.length > 0,
      documents: documents.length > 0
    },

    sourceCoverage: {
      cases: cases.length,
      bncaReports: bnca.length,
      slaEvents: sla.length,
      notes: notes.length,
      documents: documents.length
    },

    methodology: {
      verticalsSupported: VERTICALS,
      financialValuesOnlyFromStructuredData: true,
      fabricatedExposure: false,
      fabricatedRecoveryRate: false
    }
  };
}

module.exports = {
  VERTICALS,
  buildRecoveryPackage
};
NODE

echo "[2/6] Installing executive aggregation route..."

python3 - <<'PY'
from pathlib import Path

p = Path("server.js")
s = p.read_text()

if "TSM Operational OS" not in s:
    marker = "const express = require('express');"

    inject = r"""
// ============================================================
// TSM OPERATIONAL OS — UNIVERSAL EXECUTIVE RECOVERY
// ============================================================
const { buildRecoveryPackage } = require('./server/tsm-operational-os');
"""

    s = s.replace(marker, marker + inject, 1)

route = r"""
// TSM Operational OS universal executive recovery endpoint.
// Aggregates the existing BPO operational records without replacing
// the existing BPO routes.
app.get(
  '/api/bpo/work-items/:caseId/executive-recovery',
  requireRole(BPO_REPORT_ROLES),
  async (req, res) => {
    try {
      const caseId = req.params.caseId;

      const [
        workItem,
        bncaReports,
        slaEvents,
        notes,
        documents
      ] = await Promise.all([
        bpoStore.getWorkItem(caseId),
        bpoStore.listBncaReports(caseId),
        bpoStore.listSlaEvents(caseId),
        bpoStore.listNotes(caseId),
        bpoStore.listDocuments(caseId)
      ]);

      if (!workItem) {
        return res.status(404).json({
          ok: false,
          error: 'BPO work item not found',
          caseId
        });
      }

      const report = buildRecoveryPackage({
        member: {
          id: workItem.tenantId || workItem.clientId || null,
          name: workItem.clientName || workItem.tenantName || null
        },
        cases: [workItem],
        bncaReports,
        slaEvents,
        notes,
        documents
      });

      return res.json({
        ok: true,
        caseId,
        report
      });
    } catch (error) {
      console.error('[TSM Operational OS] executive recovery failed:', error);

      return res.status(500).json({
        ok: false,
        error: 'Executive Recovery aggregation failed',
        message: error.message
      });
    }
  }
);
"""

if "/executive-recovery'," not in s:
    # Put route before the first obvious generic 404/end section.
    anchor = "\n// ── Clients"
    if anchor in s:
        s = s.replace(anchor, route + anchor, 1)
    else:
        # Safe fallback: append. Express routes must be registered
        # before app.listen, which this installer validates below.
        idx = s.rfind("app.listen")
        if idx == -1:
            raise SystemExit("Could not find app.listen in server.js")
        s = s[:idx] + route + "\n" + s[idx:]

p.write_text(s)
PY

echo "[3/6] Creating cross-vertical Executive Command Center..."

cat > "$EXEC" <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TSM Operational OS · Executive Command Center</title>
<style>
:root{
  --bg:#090b12;
  --panel:#111521;
  --panel2:#171c29;
  --line:#283044;
  --text:#eef2f7;
  --muted:#8993a7;
  --good:#38d39f;
  --warn:#f5bd45;
  --bad:#ff6b78;
  --accent:#8b7cff;
}
*{box-sizing:border-box}
body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font:14px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
header{
  padding:28px 34px;
  border-bottom:1px solid var(--line);
  background:linear-gradient(180deg,#101522,#0b0e16);
}
.brand{font-size:11px;letter-spacing:.16em;color:var(--accent);font-weight:700}
h1{margin:8px 0 4px;font-size:28px}
.sub{color:var(--muted)}
main{padding:28px 34px;max-width:1500px;margin:auto}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:12px;
  padding:18px;
}
.label{font-size:11px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
.value{font-size:28px;font-weight:750;margin-top:8px}
.good{color:var(--good)}
.warn{color:var(--warn)}
.bad{color:var(--bad)}
.section{margin-top:26px}
.section h2{font-size:15px;letter-spacing:.08em;text-transform:uppercase}
table{width:100%;border-collapse:collapse;background:var(--panel)}
th,td{text-align:left;padding:12px;border-bottom:1px solid var(--line)}
th{font-size:11px;color:var(--muted);text-transform:uppercase}
.pill{padding:4px 8px;border-radius:999px;background:var(--panel2)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
ul{line-height:1.8}
button{
  background:var(--accent);
  border:0;
  border-radius:8px;
  color:white;
  padding:10px 14px;
  cursor:pointer;
}
input{
  background:var(--panel2);
  border:1px solid var(--line);
  color:white;
  padding:10px;
  border-radius:8px;
  width:340px;
}
pre{
  white-space:pre-wrap;
  background:#070910;
  border:1px solid var(--line);
  padding:14px;
  border-radius:8px;
  color:#b9c3d5;
}
@media(max-width:900px){
 .grid{grid-template-columns:repeat(2,1fr)}
 .cols{grid-template-columns:1fr}
}
</style>
</head>
<body>
<header>
  <div class="brand">TSM · OPERATIONAL OS</div>
  <h1>Executive Recovery Command Center</h1>
  <div class="sub">
    One operating system · multiple verticals · one executive view
  </div>
</header>

<main>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
    <input id="caseId"
      placeholder="BPO case ID, e.g. BPO-2026-08-18-ueqqtb">
    <button onclick="loadRecovery()">Load Recovery Package</button>
  </div>

  <div id="status" class="sub">
    Enter a case ID to load the live executive package.
  </div>

  <div id="dashboard" style="display:none">
    <section class="grid">
      <div class="card">
        <div class="label">Financial Exposure</div>
        <div class="value bad" id="exposure">$0</div>
      </div>
      <div class="card">
        <div class="label">Recovered</div>
        <div class="value good" id="recovered">$0</div>
      </div>
      <div class="card">
        <div class="label">Prevented Loss</div>
        <div class="value good" id="prevented">$0</div>
      </div>
      <div class="card">
        <div class="label">Cases</div>
        <div class="value" id="cases">0</div>
      </div>
      <div class="card">
        <div class="label">Verticals</div>
        <div class="value" id="verticals">0</div>
      </div>
    </section>

    <section class="section card">
      <div class="label">Executive Summary</div>
      <p id="summary"></p>
    </section>

    <section class="section cols">
      <div class="card">
        <h2>Vertical Recovery</h2>
        <table>
          <thead>
            <tr>
              <th>Vertical</th>
              <th>Cases</th>
              <th>Exposure</th>
              <th>Recovered</th>
            </tr>
          </thead>
          <tbody id="verticalTable"></tbody>
        </table>
      </div>

      <div class="card">
        <h2>Escalations</h2>
        <ul id="escalations"></ul>
      </div>
    </section>

    <section class="section cols">
      <div class="card">
        <h2>Recommended Actions</h2>
        <div id="actions"></div>
      </div>

      <div class="card">
        <h2>Evidence Coverage</h2>
        <div id="evidence"></div>
      </div>
    </section>

    <section class="section card">
      <h2>Recovery Package JSON</h2>
      <pre id="json"></pre>
    </section>
  </div>
</main>

<script>
const money = v =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('en-US',{
        style:'currency',
        currency:'USD',
        maximumFractionDigits:0
      }).format(v);

async function loadRecovery(){
  const id = document.getElementById('caseId').value.trim();

  if(!id){
    document.getElementById('status').textContent =
      'Enter a case ID.';
    return;
  }

  document.getElementById('status').textContent =
    'Loading executive recovery package…';

  try{
    const r = await fetch(
      '/api/bpo/work-items/' +
      encodeURIComponent(id) +
      '/executive-recovery'
    );

    const data = await r.json();

    if(!r.ok || !data.ok){
      throw new Error(data.error || 'Request failed');
    }

    render(data.report);

    document.getElementById('status').textContent =
      'EXECUTIVE PACKAGE READY · ' +
      new Date(data.report.generatedAt).toLocaleString();
  }catch(e){
    document.getElementById('status').textContent =
      'ERROR · ' + e.message;
  }
}

function render(r){
  document.getElementById('dashboard').style.display='block';

  document.getElementById('exposure').textContent =
    money(r.financials.exposure);

  document.getElementById('recovered').textContent =
    money(r.financials.recovered);

  document.getElementById('prevented').textContent =
    money(r.financials.prevented);

  document.getElementById('cases').textContent =
    r.portfolio.totalCases;

  document.getElementById('verticals').textContent =
    r.portfolio.verticalCount;

  document.getElementById('summary').textContent =
    r.executiveSummary;

  document.getElementById('verticalTable').innerHTML =
    r.verticals.length
      ? r.verticals.map(v => `
        <tr>
          <td><span class="pill">${escapeHtml(v.vertical)}</span></td>
          <td>${v.cases}</td>
          <td>${money(v.exposure)}</td>
          <td>${money(v.recovered)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="4">No vertical data.</td></tr>';

  document.getElementById('escalations').innerHTML =
    r.escalationTriggers.length
      ? r.escalationTriggers.map(x => `<li>${escapeHtml(x)}</li>`).join('')
      : '<li>No automatic escalation trigger detected.</li>';

  document.getElementById('actions').innerHTML =
    r.recommendedActions.length
      ? r.recommendedActions.map(a => `
        <div style="padding:12px 0;border-bottom:1px solid var(--line)">
          <strong>${escapeHtml(a.caseId || 'Case')}</strong>
          · ${escapeHtml(a.vertical)}
          <br>
          ${escapeHtml(a.action)}
          <br>
          <span class="sub">
            Owner: ${escapeHtml(a.owner)}
            · Exposure: ${money(a.exposure)}
          </span>
        </div>
      `).join('')
      : '<p class="sub">No recommended actions.</p>';

  const e = r.evidence;

  document.getElementById('evidence').innerHTML = `
    <p>${e.cases ? '✓' : '○'} Cases</p>
    <p>${e.bncaReports ? '✓' : '○'} BNCA Reports</p>
    <p>${e.slaEvents ? '✓' : '○'} SLA Events</p>
    <p>${e.notes ? '✓' : '○'} Notes</p>
    <p>${e.documents ? '✓' : '○'} Documents</p>
  `;

  document.getElementById('json').textContent =
    JSON.stringify(r,null,2);
}

function escapeHtml(v){
  return String(v ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}
</script>
</body>
</html>
HTML

echo "[4/6] Validating server and engine..."

node --check "$ENGINE"
node --check "$SERVER"

grep -q "TSM Operational OS" "$SERVER"
grep -q "/api/bpo/work-items/:caseId/executive-recovery" "$SERVER"
grep -q "buildRecoveryPackage" "$SERVER"
grep -q "Executive Recovery Command Center" "$EXEC"

echo "[5/6] Checking route placement..."

LISTEN_LINE="$(grep -nE 'app\.listen' "$SERVER" | head -1 | cut -d: -f1 || true)"
ROUTE_LINE="$(grep -n "executive-recovery" "$SERVER" | head -1 | cut -d: -f1 || true)"

if [[ -n "$LISTEN_LINE" && -n "$ROUTE_LINE" && "$ROUTE_LINE" -gt "$LISTEN_LINE" ]]; then
  echo "ERROR: Executive Recovery route was inserted after app.listen."
  echo "Route: $ROUTE_LINE"
  echo "listen: $LISTEN_LINE"
  exit 1
fi

echo "[6/6] Final validation..."

echo
echo "============================================================"
echo " TSM OPERATIONAL OS INSTALLED"
echo "============================================================"
echo
echo "Engine:"
echo "  $ENGINE"
echo
echo "Executive Command Center:"
echo "  $EXEC"
echo
echo "Existing BPO pipeline remains intact:"
echo "  Work Item"
echo "      ↓"
echo "  BNCA Reports"
echo "      ↓"
echo "  SLA Events"
echo "      ↓"
echo "  Notes"
echo "      ↓"
echo "  Documents"
echo "      ↓"
echo "  TSM Operational OS"
echo "      ↓"
echo "  Executive Recovery Package"
echo
echo "Financial values are derived from structured source data."
echo "No exposure/recovery figures are fabricated."
echo
echo "Backup:"
echo "  backups/server.js.operational-os-$STAMP.bak"
echo
echo "NEXT:"
echo "  npm start"
echo
echo "Then open:"
echo "  http://localhost:8080/html/tsm-operational-os-executive.html"
echo
