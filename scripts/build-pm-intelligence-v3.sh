#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "============================================================"
echo " TSM PM — INTELLIGENCE V3 BUILD"
echo " Action Center + Verification Loop + Executive Control"
echo "============================================================"

mkdir -p server/pm

###############################################################################
# 1. ACTION ENGINE
###############################################################################

cat > server/pm/action-engine.js <<'JS'
'use strict';

/**
 * TSM PM Action Engine v1
 *
 * Deterministic-first operational action lifecycle.
 *
 * Lifecycle:
 *   OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> VERIFIED
 *
 * No source-system writeback is performed here.
 * Actions remain TSM-side until explicitly integrated with an external system.
 */

const VERSION = 'pm-action-engine-v1';

const VALID_TRANSITIONS = {
  OPEN: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'OPEN'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['VERIFIED', 'IN_PROGRESS'],
  VERIFIED: []
};

function now() {
  return new Date().toISOString();
}

function clean(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

function actionFromDecision(decision) {
  const id = clean(decision.id, `PM-ACTION-${Date.now()}`);

  return {
    id: `ACT-${id}`,
    decisionId: id,
    entityId: clean(decision.entityId),
    domain: clean(decision.domain),
    priority: clean(decision.priority, 'MEDIUM'),
    finding: clean(decision.finding, 'Management review required'),
    exposure: Number(decision.exposure || 0),
    action: clean(decision.action, 'Review and remediate the identified condition.'),
    owner: clean(decision.owner, 'Property Management'),
    urgency: clean(decision.urgency, 'Next business day'),
    status: 'OPEN',
    createdAt: now(),
    updatedAt: now(),
    verification: {
      required: true,
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
      outcome: null,
      exposureAfter: null,
      notes: null
    },
    governance: {
      humanApprovalRequired: true,
      sourceSystemWriteback: false
    }
  };
}

function buildActionQueue(decisions = []) {
  return decisions
    .filter(Boolean)
    .map(actionFromDecision)
    .sort((a, b) => {
      const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (rank[b.priority] || 0) - (rank[a.priority] || 0)
        || b.exposure - a.exposure;
    });
}

function transition(action, nextStatus, metadata = {}) {
  if (!action || !nextStatus) {
    throw new Error('Action and next status are required');
  }

  const current = action.status || 'OPEN';
  const allowed = VALID_TRANSITIONS[current] || [];

  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Invalid PM action transition: ${current} -> ${nextStatus}`
    );
  }

  const updated = {
    ...action,
    status: nextStatus,
    updatedAt: now()
  };

  if (nextStatus === 'VERIFIED') {
    updated.verification = {
      ...(action.verification || {}),
      required: true,
      verified: true,
      verifiedAt: now(),
      verifiedBy: clean(metadata.verifiedBy, 'PM Manager'),
      outcome: clean(metadata.outcome, 'CONDITION_VERIFIED'),
      exposureAfter:
        metadata.exposureAfter == null
          ? action.exposure
          : Number(metadata.exposureAfter),
      notes: clean(metadata.notes, '')
    };
  }

  return updated;
}

function verifyAction(action, verification = {}) {
  if (!action) throw new Error('Action is required');

  if (action.status !== 'RESOLVED') {
    throw new Error('Only RESOLVED actions may be verified');
  }

  return transition(action, 'VERIFIED', verification);
}

function summarizeActions(actions = []) {
  const counts = {
    total: actions.length,
    open: 0,
    acknowledged: 0,
    inProgress: 0,
    resolved: 0,
    verified: 0
  };

  let exposureAtRisk = 0;
  let verifiedExposureReduction = 0;

  for (const action of actions) {
    const status = action.status || 'OPEN';

    if (status === 'OPEN') counts.open++;
    if (status === 'ACKNOWLEDGED') counts.acknowledged++;
    if (status === 'IN_PROGRESS') counts.inProgress++;
    if (status === 'RESOLVED') counts.resolved++;
    if (status === 'VERIFIED') counts.verified++;

    if (status !== 'VERIFIED') {
      exposureAtRisk += Number(action.exposure || 0);
    }

    if (
      status === 'VERIFIED' &&
      action.verification &&
      action.verification.exposureAfter != null
    ) {
      verifiedExposureReduction += Math.max(
        0,
        Number(action.exposure || 0) -
          Number(action.verification.exposureAfter || 0)
      );
    }
  }

  return {
    ...counts,
    exposureAtRisk,
    verifiedExposureReduction
  };
}

module.exports = {
  VERSION,
  VALID_TRANSITIONS,
  actionFromDecision,
  buildActionQueue,
  transition,
  verifyAction,
  summarizeActions
};
JS

###############################################################################
# 2. VERIFICATION ENGINE
###############################################################################

cat > server/pm/verification-engine.js <<'JS'
'use strict';

/**
 * TSM PM Verification Engine v1
 *
 * Converts completed operational work into measurable verification.
 */

const VERSION = 'pm-verification-engine-v1';

function verifyOutcome(action, input = {}) {
  const before = Number(action.exposure || 0);
  const after = Number(
    input.exposureAfter == null ? before : input.exposureAfter
  );

  const reduction = Math.max(0, before - after);

  let outcome = 'NO_CHANGE';

  if (after === 0) {
    outcome = 'CONDITION_CLEARED';
  } else if (after < before) {
    outcome = 'EXPOSURE_REDUCED';
  } else if (after > before) {
    outcome = 'EXPOSURE_INCREASED';
  }

  return {
    engine: VERSION,
    actionId: action.id,
    verified: Boolean(input.verified),
    outcome,
    exposureBefore: before,
    exposureAfter: after,
    exposureReduction: reduction,
    verifiedAt: new Date().toISOString(),
    verifiedBy: input.verifiedBy || 'PM Manager',
    notes: input.notes || ''
  };
}

module.exports = {
  VERSION,
  verifyOutcome
};
JS

###############################################################################
# 3. INTELLIGENCE V3 AGGREGATOR
###############################################################################

cat > server/pm/intelligence-v3.js <<'JS'
'use strict';

const {
  buildActionQueue,
  summarizeActions
} = require('./action-engine');

const {
  verifyOutcome
} = require('./verification-engine');

const VERSION = 'pm-intelligence-v3';

function buildPmIntelligenceV3(payload = {}) {
  const intelligence = payload.intelligence || payload;

  const decisions =
    intelligence.decisions ||
    payload.decisions ||
    [];

  const existingActions =
    payload.actions ||
    intelligence.actions ||
    buildActionQueue(decisions);

  const actions = existingActions.map(action => ({
    ...action,
    verification: action.verification || {
      required: true,
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
      outcome: null,
      exposureAfter: null,
      notes: null
    }
  }));

  const actionSummary = summarizeActions(actions);

  const totalExposure = Number(
    intelligence?.decisionSummary?.modeledExposure ??
    payload?.decisionSummary?.modeledExposure ??
    payload?.financials?.total_exposure ??
    0
  );

  const verifiedReduction = Number(
    actionSummary.verifiedExposureReduction || 0
  );

  const remainingExposure = Math.max(
    0,
    totalExposure - verifiedReduction
  );

  const criticalOpen = actions.filter(
    a => a.priority === 'CRITICAL' && a.status !== 'VERIFIED'
  ).length;

  const highOpen = actions.filter(
    a => a.priority === 'HIGH' && a.status !== 'VERIFIED'
  ).length;

  return {
    ok: true,
    engine: VERSION,
    generatedAt: new Date().toISOString(),

    portfolio: {
      modeledExposure: totalExposure,
      verifiedExposureReduction: verifiedReduction,
      remainingModeledExposure: remainingExposure,
      criticalOpen,
      highOpen
    },

    actionSummary,

    actions,

    operatingLoop: {
      observe: true,
      understand: decisions.length > 0,
      predict: Boolean(intelligence.forecast),
      decide: decisions.length > 0,
      execute: actions.length > 0,
      verify: actions.some(a => a.status === 'VERIFIED'),
      explain: true
    },

    governance: {
      mode: 'DETERMINISTIC',
      humanApprovalRequired: true,
      sourceSystemWriteback: false,
      llmRequired: false
    }
  };
}

function verifyPmAction(action, input = {}) {
  return verifyOutcome(action, input);
}

module.exports = {
  VERSION,
  buildPmIntelligenceV3,
  verifyPmAction
};
JS

###############################################################################
# 4. SERVER ROUTES
###############################################################################

python3 - <<'PY'
from pathlib import Path

p = Path("server.js")
s = p.read_text()

marker = "/* ── END PM EXECUTIVE DECISION ENGINE ─────────────────────────────────────── */"

if marker not in s:
    raise SystemExit("ERROR: PM executive decision route marker not found")

imports_marker = "const { buildDecisionPackage } = require('./server/pm/decision-engine');"

if imports_marker not in s:
    raise SystemExit("ERROR: decision-engine import not found")

if "require('./server/pm/intelligence-v3')" not in s:
    s = s.replace(
        imports_marker,
        imports_marker +
        "\nconst { buildPmIntelligenceV3, verifyPmAction } = require('./server/pm/intelligence-v3');"
    )

route = r"""
/* ── PM INTELLIGENCE V3 ACTION/VERIFICATION ──────────────────────────────── */
app.post('/api/pm/intelligence-v3', (req, res) => {
  try {
    res.json(buildPmIntelligenceV3(req.body || {}));
  } catch (err) {
    console.error('[PM Intelligence V3]', err);
    res.status(500).json({
      ok: false,
      error: 'PM intelligence v3 generation failed'
    });
  }
});

app.post('/api/pm/actions/verify', (req, res) => {
  try {
    const body = req.body || {};

    if (!body.action) {
      return res.status(400).json({
        ok: false,
        error: 'action is required'
      });
    }

    res.json({
      ok: true,
      ...verifyPmAction(body.action, body.verification || {})
    });
  } catch (err) {
    console.error('[PM Action Verification]', err);
    res.status(400).json({
      ok: false,
      error: err.message || 'PM action verification failed'
    });
  }
});
/* ── END PM INTELLIGENCE V3 ACTION/VERIFICATION ───────────────────────────── */
"""

if "app.post('/api/pm/intelligence-v3'" not in s:
    s = s.replace(marker, marker + "\n" + route)

p.write_text(s)
print("Patched server.js")
PY

###############################################################################
# 5. UNIT TEST
###############################################################################

cat > scripts/test-pm-intelligence-v3.js <<'JS'
'use strict';

const assert = require('assert');

const {
  buildPmIntelligenceV3,
  verifyPmAction
} = require('../server/pm/intelligence-v3');

const fixture = {
  decisionSummary: {
    modeledExposure: 40445
  },

  decisions: [
    {
      id: 'PM-DEC-001',
      priority: 'CRITICAL',
      domain: 'iot',
      entityId: 'S-211',
      finding: 'Urgent water leak sensor alert',
      exposure: 3000,
      action: 'Dispatch inspection/remediation for S-211.',
      owner: 'Maintenance Operations',
      urgency: 'Immediate'
    },
    {
      id: 'PM-DEC-002',
      priority: 'HIGH',
      domain: 'vendor_compliance',
      entityId: 'V-03',
      finding: 'Vendor V-03 is expired',
      exposure: 25000,
      action: 'Complete compliance renewal for V-03.',
      owner: 'Vendor Management',
      urgency: 'Today'
    },
    {
      id: 'PM-DEC-003',
      priority: 'HIGH',
      domain: 'maintenance',
      entityId: 'WO-2201',
      finding: 'WO-2201 is over SLA',
      exposure: 40,
      action: 'Escalate WO-2201.',
      owner: 'Maintenance Operations',
      urgency: 'Today'
    }
  ]
};

const result = buildPmIntelligenceV3(fixture);

assert(result.ok);
assert.strictEqual(result.engine, 'pm-intelligence-v3');
assert.strictEqual(result.actions.length, 3);
assert.strictEqual(result.actionSummary.total, 3);
assert.strictEqual(result.actionSummary.open, 3);
assert.strictEqual(result.portfolio.modeledExposure, 40445);
assert.strictEqual(result.portfolio.criticalOpen, 1);
assert.strictEqual(result.portfolio.highOpen, 2);
assert(result.operatingLoop.decide);
assert(result.operatingLoop.execute);
assert(result.governance.humanApprovalRequired);
assert.strictEqual(result.governance.sourceSystemWriteback, false);

const resolved = {
  ...result.actions[0],
  status: 'RESOLVED'
};

const verification = verifyPmAction(resolved, {
  verified: true,
  exposureAfter: 0,
  verifiedBy: 'PM Manager',
  notes: 'Leak condition cleared and inspection completed.'
});

assert(verification.verified);
assert.strictEqual(verification.outcome, 'CONDITION_CLEARED');
assert.strictEqual(verification.exposureReduction, 3000);

console.log('PM Intelligence v3 test: PASS');
console.log(JSON.stringify({
  engine: result.engine,
  modeledExposure: result.portfolio.modeledExposure,
  actions: result.actionSummary,
  verification: {
    outcome: verification.outcome,
    exposureReduction: verification.exposureReduction
  }
}, null, 2));
JS

###############################################################################
# 6. EXECUTIVE PORTAL UI
###############################################################################

FILE="html/war-rooms/pm-copilot/pm-exec-portal.html"

python3 - <<'PY'
from pathlib import Path

p = Path("html/war-rooms/pm-copilot/pm-exec-portal.html")
s = p.read_text()

if 'tsm-pm-intelligence-v3' in s:
    print("V3 UI already present")
    raise SystemExit(0)

css = r'''
<style id="tsm-pm-intelligence-v3-css">
#tsm-pm-intelligence-v3 {
  margin: 24px 0;
}

.tsm-pm-v3-shell {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  padding: 18px;
  background: rgba(0,0,0,.18);
}

.tsm-pm-v3-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:16px;
  margin-bottom:16px;
}

.tsm-pm-v3-title {
  font-size:18px;
  font-weight:700;
}

.tsm-pm-v3-subtitle {
  opacity:.7;
  font-size:12px;
  margin-top:4px;
}

.tsm-pm-v3-metrics {
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
  margin-bottom:16px;
}

.tsm-pm-v3-metric {
  padding:14px;
  border-radius:12px;
  background:rgba(255,255,255,.05);
}

.tsm-pm-v3-metric-label {
  font-size:10px;
  opacity:.65;
  text-transform:uppercase;
  letter-spacing:.08em;
}

.tsm-pm-v3-metric-value {
  font-size:22px;
  font-weight:700;
  margin-top:5px;
}

.tsm-pm-v3-actions {
  display:grid;
  gap:10px;
}

.tsm-pm-v3-action {
  display:grid;
  grid-template-columns:110px 1fr 110px 110px;
  gap:12px;
  align-items:center;
  padding:12px;
  border-radius:12px;
  background:rgba(255,255,255,.04);
}

.tsm-pm-v3-priority,
.tsm-pm-v3-status {
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
}

.tsm-pm-v3-finding {
  font-size:13px;
}

.tsm-pm-v3-entity {
  font-size:11px;
  opacity:.65;
}

.tsm-pm-v3-loop {
  margin-top:14px;
  font-size:11px;
  opacity:.7;
}

@media (max-width: 900px) {
  .tsm-pm-v3-metrics {
    grid-template-columns:repeat(2,minmax(0,1fr));
  }

  .tsm-pm-v3-action {
    grid-template-columns:1fr;
  }
}
</style>
'''

anchor = '<div id="tsm-pm-intelligence-v2"></div>'

if anchor not in s:
    raise SystemExit("ERROR: V2 UI anchor not found")

s = s.replace(anchor, anchor + '\n<div id="tsm-pm-intelligence-v3"></div>')

script = r'''
<script id="tsm-pm-intelligence-v3-script">
(function () {
  'use strict';

  const API = '/api/pm/intelligence-v3';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function money(v) {
    return '$' + Number(v || 0).toLocaleString();
  }

  function readRelay() {
    try {
      const raw =
        sessionStorage.getItem('TSM_PM_RELAY') ||
        localStorage.getItem('TSM_PM_RELAY');

      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn('[TSM PM V3] relay parse failed', err);
      return {};
    }
  }

  async function load() {
    const relay = readRelay();

    const decisionState = window.TSM_PM_DECISIONS || {};
    const intelligence =
      window.TSM_PM_INTELLIGENCE_V2 ||
      {};

    const payload = {
      ...relay,
      ...intelligence,
      decisions:
        intelligence.decisions ||
        decisionState.decisions ||
        []
    };

    const response = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('PM Intelligence V3 HTTP ' + response.status);
    }

    const data = await response.json();
    window.TSM_PM_INTELLIGENCE_V3 = data;

    render(data);
  }

  function render(data) {
    const root = document.getElementById('tsm-pm-intelligence-v3');
    if (!root) return;

    const p = data.portfolio || {};
    const a = data.actionSummary || {};
    const actions = data.actions || [];

    root.innerHTML = `
      <section class="tsm-pm-v3-shell">
        <div class="tsm-pm-v3-header">
          <div>
            <div class="tsm-pm-v3-title">
              PM INTELLIGENCE V3 · ACTION CENTER
            </div>
            <div class="tsm-pm-v3-subtitle">
              Decide → Execute → Verify → Explain
            </div>
          </div>
        </div>

        <div class="tsm-pm-v3-metrics">
          <div class="tsm-pm-v3-metric">
            <div class="tsm-pm-v3-metric-label">Modeled Exposure</div>
            <div class="tsm-pm-v3-metric-value">
              ${money(p.modeledExposure)}
            </div>
          </div>

          <div class="tsm-pm-v3-metric">
            <div class="tsm-pm-v3-metric-label">Exposure At Risk</div>
            <div class="tsm-pm-v3-metric-value">
              ${money(a.exposureAtRisk)}
            </div>
          </div>

          <div class="tsm-pm-v3-metric">
            <div class="tsm-pm-v3-metric-label">Critical Open</div>
            <div class="tsm-pm-v3-metric-value">
              ${esc(p.criticalOpen || 0)}
            </div>
          </div>

          <div class="tsm-pm-v3-metric">
            <div class="tsm-pm-v3-metric-label">Verified Reduction</div>
            <div class="tsm-pm-v3-metric-value">
              ${money(a.verifiedExposureReduction)}
            </div>
          </div>
        </div>

        <div class="tsm-pm-v3-actions">
          ${
            actions.length
              ? actions.map(action => `
                <div class="tsm-pm-v3-action"
                     data-action-id="${esc(action.id)}">
                  <div class="tsm-pm-v3-priority">
                    ${esc(action.priority)}
                  </div>

                  <div>
                    <div class="tsm-pm-v3-finding">
                      ${esc(action.finding)}
                    </div>
                    <div class="tsm-pm-v3-entity">
                      ${esc(action.entityId)} · ${esc(action.owner)}
                    </div>
                  </div>

                  <div class="tsm-pm-v3-status">
                    ${esc(action.status)}
                  </div>

                  <div>
                    ${money(action.exposure)}
                  </div>
                </div>
              `).join('')
              : '<div>No active PM actions.</div>'
          }
        </div>

        <div class="tsm-pm-v3-loop">
          Deterministic intelligence · Human approval required ·
          No source-system write-back · Verification required for closure
        </div>
      </section>
    `;
  }

  window.TSM_PM_INTELLIGENCE_V3_LOAD = load;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
</script>
'''

s = s + '\n' + script

p.write_text(s)
print("Patched:", p)
PY

###############################################################################
# 7. VALIDATION
###############################################################################

echo
echo "=== SERVER SYNTAX ==="
node --check server.js
echo "exit=$?"

echo
echo "=== PM MODULE SYNTAX ==="
node --check server/pm/action-engine.js
node --check server/pm/verification-engine.js
node --check server/pm/intelligence-v3.js
echo "exit=$?"

echo
echo "=== V3 UNIT TEST ==="
NODE_PATH="$ROOT/node_modules" node scripts/test-pm-intelligence-v3.js

echo
echo "=== ROUTES ==="
grep -n -B3 -A22 \
  "app.post('/api/pm/intelligence-v3'" \
  server.js

echo
echo "=== VERIFICATION ROUTE ==="
grep -n -B3 -A18 \
  "app.post('/api/pm/actions/verify'" \
  server.js

echo
echo "=== UI MARKERS ==="
grep -n \
  "tsm-pm-intelligence-v3\|TSM_PM_INTELLIGENCE_V3\|/api/pm/intelligence-v3" \
  "$FILE"

echo
echo "============================================================"
echo " PM INTELLIGENCE V3 BUILD: PASS"
echo "============================================================"
echo
echo "Next:"
echo "  1. Restart server"
echo "  2. Run V3 API acceptance"
echo "  3. Run Executive Portal live relay acceptance"
echo "  4. Review git diff before staging"
