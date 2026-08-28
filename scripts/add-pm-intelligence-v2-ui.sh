#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FILE="html/war-rooms/pm-copilot/pm-exec-portal.html"

echo "============================================================"
echo " TSM PM — EXECUTIVE INTELLIGENCE V2 UI"
echo "============================================================"

test -f "$FILE" || {
  echo "ERROR: $FILE not found"
  exit 1
}

cp "$FILE" "$FILE.bak-before-intelligence-v2"

python3 - <<'PY'
from pathlib import Path

p = Path("html/war-rooms/pm-copilot/pm-exec-portal.html")
s = p.read_text()

marker = "/* TSM PM INTELLIGENCE V2 */"

css = r"""
<style id="tsm-pm-intelligence-v2-css">
/* TSM PM INTELLIGENCE V2 */

.tsm-pm-intel-grid {
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:14px;
  margin:18px 0;
}

.tsm-pm-intel-card {
  border:1px solid rgba(127,127,127,.25);
  border-radius:14px;
  padding:16px;
  background:rgba(127,127,127,.06);
}

.tsm-pm-intel-label {
  font-size:.72rem;
  letter-spacing:.08em;
  text-transform:uppercase;
  opacity:.7;
}

.tsm-pm-intel-value {
  font-size:1.65rem;
  font-weight:700;
  margin-top:5px;
}

.tsm-pm-intel-sub {
  font-size:.82rem;
  margin-top:5px;
  opacity:.72;
}

.tsm-pm-risk-signal {
  padding:10px 12px;
  border-radius:10px;
  margin:7px 0;
  background:rgba(127,127,127,.08);
}

.tsm-pm-intel-section {
  margin-top:22px;
}

.tsm-pm-intel-title {
  font-size:1rem;
  font-weight:700;
  margin-bottom:10px;
}

.tsm-pm-intel-muted {
  opacity:.68;
  font-size:.82rem;
}

.tsm-pm-risk-critical {
  font-weight:800;
}

@media (max-width:700px) {
  .tsm-pm-intel-grid {
    grid-template-columns:1fr 1fr;
  }
}
</style>
"""

if marker not in s:
    if "</head>" not in s:
        raise SystemExit("ERROR: </head> not found")
    s = s.replace(
        "</head>",
        css + "\n</head>",
        1
    )

html_marker = '<div id="tsm-pm-intelligence-v2"></div>'

if html_marker not in s:
    # Put intelligence immediately before the executive decision area.
    candidates = [
        '<div id="executiveDecisionQueue"',
        'id="executiveDecisionQueue"',
        'Executive Decision Queue'
    ]

    inserted = False

    for candidate in candidates:
        idx = s.find(candidate)
        if idx != -1:
            if candidate.startswith("id="):
                start = s.rfind("<", 0, idx)
            else:
                start = idx

            s = s[:start] + html_marker + "\n" + s[start:]
            inserted = True
            break

    if not inserted:
        # Safe fallback: append to body.
        body = s.rfind("</body>")
        if body == -1:
            raise SystemExit("ERROR: </body> not found")
        s = s[:body] + html_marker + "\n" + s[body:]

js_marker = "// TSM PM INTELLIGENCE V2 SCRIPT"

js = r"""
<script id="tsm-pm-intelligence-v2-script">
/* TSM PM INTELLIGENCE V2 SCRIPT */

(function () {
  'use strict';

  const API = '/api/pm/portfolio-intelligence';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function readRelay() {
    const keys = [
      'TSM_PM_RELAY'
    ];

    for (const key of keys) {
      for (const store of [window.sessionStorage, window.localStorage]) {
        try {
          const raw = store.getItem(key);
          if (!raw) continue;

          const parsed = JSON.parse(raw);

          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        } catch (_) {}
      }
    }

    return null;
  }

  function money(value) {
    const n = Number(value || 0);

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(n);
  }

  function render(data) {
    const root = document.getElementById(
      'tsm-pm-intelligence-v2'
    );

    if (!root || !data || !data.ok) return;

    const twin = data.twin || {};
    const counts = twin.counts || {};
    const risk = data.risk || {};
    const forecast = data.forecast || {};
    const projection = forecast.modeledProjection || {};
    const scenario = forecast.scenario || {};
    const signals = Array.isArray(risk.signals)
      ? risk.signals
      : [];

    root.innerHTML = `
      <section class="tsm-pm-intel-section">

        <div class="tsm-pm-intel-title">
          Portfolio Intelligence
        </div>

        <div class="tsm-pm-intel-grid">

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Portfolio Risk
            </div>
            <div class="tsm-pm-intel-value">
              ${esc(risk.score)} / 100
            </div>
            <div class="tsm-pm-intel-sub">
              ${esc(risk.level || 'UNKNOWN')}
            </div>
          </div>

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Current Exposure
            </div>
            <div class="tsm-pm-intel-value">
              ${money(forecast.currentExposure)}
            </div>
            <div class="tsm-pm-intel-sub">
              Modeled planning figure
            </div>
          </div>

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Projected Exposure
            </div>
            <div class="tsm-pm-intel-value">
              ${money(projection.projectedExposure)}
            </div>
            <div class="tsm-pm-intel-sub">
              If identified risks remain unresolved
            </div>
          </div>

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Incremental Exposure
            </div>
            <div class="tsm-pm-intel-value">
              ${money(projection.incrementalExposure)}
            </div>
            <div class="tsm-pm-intel-sub">
              Modeled additional exposure
            </div>
          </div>

        </div>

        <div class="tsm-pm-intel-grid">

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Digital Twin
            </div>
            <div class="tsm-pm-intel-value">
              ${esc(counts.properties || 0)}
            </div>
            <div class="tsm-pm-intel-sub">
              Properties
            </div>
          </div>

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Units
            </div>
            <div class="tsm-pm-intel-value">
              ${esc(counts.units || 0)}
            </div>
            <div class="tsm-pm-intel-sub">
              Portfolio units modeled
            </div>
          </div>

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Work Orders
            </div>
            <div class="tsm-pm-intel-value">
              ${esc(counts.workOrders || 0)}
            </div>
            <div class="tsm-pm-intel-sub">
              Operational records
            </div>
          </div>

          <div class="tsm-pm-intel-card">
            <div class="tsm-pm-intel-label">
              Vendors
            </div>
            <div class="tsm-pm-intel-value">
              ${esc(counts.vendors || 0)}
            </div>
            <div class="tsm-pm-intel-sub">
              Vendor relationships
            </div>
          </div>

        </div>

        <div class="tsm-pm-intel-section">
          <div class="tsm-pm-intel-title">
            Why Portfolio Risk Is Elevated
          </div>

          ${
            signals.length
              ? signals.map(signal => `
                <div class="tsm-pm-risk-signal">
                  <strong>
                    ${esc(signal.type || 'Risk Signal')}
                  </strong>
                  <br>
                  <span>
                    ${esc(signal.explanation || '')}
                  </span>
                </div>
              `).join('')
              : '<div class="tsm-pm-intel-muted">No elevated risk signals detected.</div>'
          }
        </div>

        <div class="tsm-pm-intel-section">
          <div class="tsm-pm-intel-title">
            What Happens If Nothing Changes?
          </div>

          <div class="tsm-pm-intel-card">
            ${esc(
              scenario.condition ||
              'Current identified risks remain unresolved.'
            )}

            <br><br>

            <strong>
              Modeled incremental exposure:
              ${money(projection.incrementalExposure)}
            </strong>
          </div>
        </div>

        <div class="tsm-pm-intel-muted">
          Deterministic PM Intelligence v2 · Human approval required ·
          No source-system write-back
        </div>

      </section>
    `;
  }

  async function load() {
    const relay = readRelay();

    if (!relay) {
      console.warn(
        '[TSM PM INTELLIGENCE] canonical relay unavailable'
      );
      return;
    }

    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(relay)
      });

      if (!response.ok) {
        console.warn(
          '[TSM PM INTELLIGENCE] API status',
          response.status
        );
        return;
      }

      const data = await response.json();

      render(data);

      window.TSM_PM_INTELLIGENCE_V2 = data;

      console.info(
        '[TSM PM INTELLIGENCE] live snapshot loaded'
      );

    } catch (err) {
      console.error(
        '[TSM PM INTELLIGENCE] load failed',
        err
      );
    }
  }

  window.addEventListener(
    'load',
    load
  );

  window.addEventListener(
    'TSM_RELAY_EVENT',
    function () {
      load();
    }
  );

})();
</script>
"""

if js_marker not in s:
    body = s.rfind("</body>")

    if body == -1:
        raise SystemExit("ERROR: </body> not found")

    s = s[:body] + js + "\n" + s[body:]

p.write_text(s)

print(f"Patched: {p}")
PY

echo
echo "=== HTML EXISTENCE ==="
test -s "$FILE"

echo
echo "=== SCRIPT MARKERS ==="
grep -n \
  -E \
  "tsm-pm-intelligence-v2|TSM_PM_INTELLIGENCE_V2|/api/pm/portfolio-intelligence" \
  "$FILE" | head -30

echo
echo "=== BACKEND SYNTAX ==="
node --check server.js
node --check server/pm/portfolio-intelligence.js
node --check server/pm/risk-engine.js
node --check server/pm/forecast-engine.js

echo
echo "=== V2 UNIT TEST ==="
NODE_PATH="$PWD/node_modules" node scripts/test-pm-intelligence-v2.js

echo
echo "============================================================"
echo " PM EXECUTIVE INTELLIGENCE V2 UI: PASS"
echo "============================================================"
