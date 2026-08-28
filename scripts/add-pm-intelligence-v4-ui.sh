#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FILE="html/war-rooms/pm-copilot/pm-exec-portal.html"

echo "============================================================"
echo " TSM PM — EXECUTIVE PREDICTIVE CONTROL V4 UI"
echo " Current Exposure → Predicted Exposure → Intervention"
echo "============================================================"

python3 - "$FILE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
html = path.read_text()

if 'tsm-pm-intelligence-v4' in html:
    print("V4 UI already present; no changes needed.")
    raise SystemExit(0)

marker = '<div id="tsm-pm-intelligence-v3"></div>'

if marker not in html:
    raise SystemExit(
        "ERROR: V3 UI mount not found. Refusing to patch unknown location."
    )

css = r'''
<style id="tsm-pm-intelligence-v4-css">
#tsm-pm-intelligence-v4 {
  margin: 20px 0;
}

.tsm-pm-v4-card {
  border: 1px solid rgba(127,127,127,.25);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 14px;
}

.tsm-pm-v4-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.tsm-pm-v4-title {
  font-size: 18px;
  font-weight: 700;
}

.tsm-pm-v4-subtitle {
  opacity: .72;
  font-size: 12px;
  margin-top: 4px;
}

.tsm-pm-v4-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.tsm-pm-v4-metric {
  border: 1px solid rgba(127,127,127,.18);
  border-radius: 10px;
  padding: 12px;
}

.tsm-pm-v4-metric-label {
  font-size: 11px;
  opacity: .65;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.tsm-pm-v4-metric-value {
  font-size: 21px;
  font-weight: 700;
  margin-top: 5px;
}

.tsm-pm-v4-predictions {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.tsm-pm-v4-prediction {
  border: 1px solid rgba(127,127,127,.18);
  border-radius: 10px;
  padding: 13px;
}

.tsm-pm-v4-prediction-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.tsm-pm-v4-entity {
  font-weight: 700;
}

.tsm-pm-v4-signal {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.tsm-pm-v4-details {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 12px;
  opacity: .78;
}

.tsm-pm-v4-recommendation {
  margin-top: 9px;
  font-size: 13px;
}

.tsm-pm-v4-governance {
  margin-top: 14px;
  font-size: 11px;
  opacity: .62;
}

@media (max-width: 800px) {
  .tsm-pm-v4-metrics {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}
</style>
'''

mount = r'''
<div id="tsm-pm-intelligence-v4"></div>
'''

script = r'''
<script id="tsm-pm-intelligence-v4-script">
(function () {
  'use strict';

  const API = '/api/pm/predictive-control';

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return '$' + Number(value || 0).toLocaleString('en-US');
  }

  function render(data) {
    const root = document.getElementById('tsm-pm-intelligence-v4');

    if (!root) return;

    const summary = data.predictionSummary || {};
    const predictions = Array.isArray(data.predictions)
      ? data.predictions
      : [];

    const recommendations = Array.isArray(data.controlRecommendations)
      ? data.controlRecommendations
      : [];

    root.innerHTML = `
      <section class="tsm-pm-v4-card">
        <div class="tsm-pm-v4-header">
          <div>
            <div class="tsm-pm-v4-title">
              Portfolio Risk Outlook
            </div>
            <div class="tsm-pm-v4-subtitle">
              Predictive control based on governed PM actions
            </div>
          </div>

          <div class="tsm-pm-v4-subtitle">
            ${esc(data.engine || 'pm-predictive-control-v1')}
          </div>
        </div>

        <div class="tsm-pm-v4-metrics">
          <div class="tsm-pm-v4-metric">
            <div class="tsm-pm-v4-metric-label">
              Predicted Exposure
            </div>
            <div class="tsm-pm-v4-metric-value">
              ${money(summary.predictedExposure)}
            </div>
          </div>

          <div class="tsm-pm-v4-metric">
            <div class="tsm-pm-v4-metric-label">
              Conditions
            </div>
            <div class="tsm-pm-v4-metric-value">
              ${summary.total || 0}
            </div>
          </div>

          <div class="tsm-pm-v4-metric">
            <div class="tsm-pm-v4-metric-label">
              Elevated
            </div>
            <div class="tsm-pm-v4-metric-value">
              ${summary.elevated || 0}
            </div>
          </div>

          <div class="tsm-pm-v4-metric">
            <div class="tsm-pm-v4-metric-label">
              Management Actions
            </div>
            <div class="tsm-pm-v4-metric-value">
              ${recommendations.length}
            </div>
          </div>
        </div>

        <div class="tsm-pm-v4-predictions">
          ${predictions.map(item => `
            <div class="tsm-pm-v4-prediction">
              <div class="tsm-pm-v4-prediction-top">
                <div class="tsm-pm-v4-entity">
                  ${esc(item.entityId)}
                </div>

                <div class="tsm-pm-v4-signal">
                  ${esc(item.signal)}
                </div>
              </div>

              <div class="tsm-pm-v4-details">
                <span>
                  ${Math.round(Number(item.probability || 0) * 100)}%
                  modeled likelihood
                </span>

                <span>
                  Horizon: ${esc(item.horizon)}
                </span>

                <span>
                  Current: ${money(item.currentExposure)}
                </span>

                <span>
                  Expected: ${money(item.expectedExposure)}
                </span>
              </div>

              <div class="tsm-pm-v4-recommendation">
                ${esc(item.rationale)}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="tsm-pm-v4-governance">
          Deterministic model · Predictive values are modeled ·
          Human approval required · No source-system writeback
        </div>
      </section>
    `;

    window.TSM_PM_INTELLIGENCE_V4 = data;
  }

  async function load() {
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'PM-EXECUTIVE-V4',
          vertical: 'PM'
        })
      });

      if (!response.ok) {
        throw new Error('V4 API returned ' + response.status);
      }

      const data = await response.json();
      render(data);

    } catch (error) {
      console.error('[TSM PM V4]', error);
    }
  }

  window.TSM_PM_INTELLIGENCE_V4_LOAD = load;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
</script>
'''

html = html.replace(
    '<style id="tsm-pm-intelligence-v2-css">',
    css + '\n<style id="tsm-pm-intelligence-v2-css">',
    1
)

html = html.replace(
    marker,
    marker + '\n' + mount,
    1
)

# Put the script immediately before the first V3 script block.
script_marker = '<script id="tsm-pm-intelligence-v3-script">'

if script_marker in html:
    html = html.replace(
        script_marker,
        script + '\n' + script_marker,
        1
    )
else:
    html += '\n' + script

path.write_text(html)
print(f"Patched: {path}")
PY

echo
echo "=== HTML SYNTAX MARKERS ==="
grep -n -E \
  'tsm-pm-intelligence-v4|/api/pm/predictive-control|TSM_PM_INTELLIGENCE_V4' \
  "$FILE"

echo
echo "=== SERVER SYNTAX ==="
node --check server.js
echo "exit=$?"

echo
echo "=== V4 UNIT TEST ==="
node scripts/test-pm-predictive-control.js

echo
echo "============================================================"
echo " PM EXECUTIVE PREDICTIVE CONTROL V4 UI: PASS"
echo "============================================================"
