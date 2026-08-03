#!/usr/bin/env bash
set -euo pipefail

# Define paths
STRATEGIST_FILE="html/war-rooms/re-war/re-strategist.html"
EXEC_PORTAL_FILE="html/war-rooms/re-war/re-exec-portal.html"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Base CSS shared across both widgets
COMMON_CSS=$(cat <<'EOF'
    /* GUIDE WIDGET — rule-based "what to click next" hint */
    .guide-widget {
      position: fixed;
      bottom: calc(32px + 1rem); /* Clears fixed 32px #tsm-chain-bar */
      right: 1rem;
      z-index: 9998;
      width: 300px;
      font-family: var(--mono, monospace);
    }
    .gw-toggle {
      background: var(--s1, #0a1118);
      border: 1px solid rgba(30, 232, 182, .35);
      padding: .4rem .75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .48rem;
      color: var(--acc, #00e5cc);
      letter-spacing: .1rem;
    }
    .gw-panel {
      display: none;
      flex-direction: column;
      background: var(--s1, #0a1118);
      border: 1px solid rgba(30, 232, 182, .2);
      margin-top: 3px;
      overflow: hidden;
      padding: .65rem;
      font-size: .5rem;
      line-height: 1.6;
      color: var(--text, #c0c0c0);
    }
    .gw-panel.open { display: flex; }
    .gw-step {
      display: flex;
      gap: .45rem;
      align-items: flex-start;
      padding: .25rem 0;
    }
    .gw-step .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 3px;
      background: rgba(255, 255, 255, .15);
    }
    .gw-step.done .dot { background: var(--green, #00ff88); }
    .gw-step.done span:last-child { color: var(--muted, #666); text-decoration: line-through; }
    .gw-step.active .dot { background: var(--acc, #00e5cc); animation: pulse 2s infinite; }
    .gw-step.active span:last-child { color: var(--white, #fff); }
    .gw-next {
      margin-top: .5rem;
      padding-top: .5rem;
      border-top: 1px solid rgba(30, 232, 182, .15);
      color: var(--acc, #00e5cc);
    }
EOF
)

# HTML/JS payload for re-strategist.html
STRATEGIST_BODY=$(cat <<'EOF'
<!-- ═══ GUIDE WIDGET — STRATEGIST EDITION ═══ -->
<div class="guide-widget" id="guideWidget">
  <div class="gw-toggle" onclick="toggleGWPanel()">
    <span style="width:5px;height:5px;border-radius:50%;background:var(--acc, #00e5cc);animation:pulse 2s infinite;flex-shrink:0"></span>
    <span id="gwToggleText">GUIDE · INITIALIZING</span>
  </div>
  <div class="gw-panel" id="gwPanel">
    <div class="gw-step" id="gwStep1"><span class="dot"></span><span>Verify Session Data or Paste Case Input</span></div>
    <div class="gw-step" id="gwStep2"><span class="dot"></span><span>Configure Strategy & Risk Parameters</span></div>
    <div class="gw-step" id="gwStep3"><span class="dot"></span><span>Generate Strategic Brief</span></div>
    <div class="gw-step" id="gwStep4"><span class="dot"></span><span>Export Brief or Escalate to Exec Portal</span></div>
    <div class="gw-next" id="gwNext">Next: loading...</div>
  </div>
</div>

<script>
(function () {
  function computeState() {
    var rawInput = document.getElementById('stratInput') || document.getElementById('caseData') || document.getElementById('docPaste');
    var inputLoaded = !!(
      (window.__sessionData && Object.keys(window.__sessionData).length > 0) ||
      (rawInput && rawInput.value.trim().length > 0)
    );

    var stratOutput = document.getElementById('stratOutput') || document.getElementById('briefResults');
    var briefGenerated = !!(stratOutput && (stratOutput.textContent.trim().length > 100 || stratOutput.children.length > 0));

    var paramsConfigured = !!(
      document.querySelector('select.strat-param') || 
      document.querySelector('input[type="checkbox"]:checked') || 
      inputLoaded
    );

    return { inputLoaded: inputLoaded, paramsConfigured: paramsConfigured, briefGenerated: briefGenerated };
  }

  function render() {
    var s = computeState();
    var steps = [
      { id: 'gwStep1', done: s.inputLoaded },
      { id: 'gwStep2', done: s.paramsConfigured && s.inputLoaded },
      { id: 'gwStep3', done: s.briefGenerated },
      { id: 'gwStep4', done: false }
    ];

    var activeAssigned = false;
    steps.forEach(function (st) {
      var el = document.getElementById(st.id);
      if (!el) return;
      el.classList.remove('done', 'active');
      if (st.done) {
        el.classList.add('done');
      } else if (!activeAssigned) {
        el.classList.add('active');
        activeAssigned = true;
      }
    });

    var next = '';
    if (!s.inputLoaded) {
      next = 'Next: paste strategic input or load session data from the War Room.';
    } else if (!s.briefGenerated) {
      next = 'Next: review strategic options and click GENERATE BRIEF.';
    } else {
      next = 'Ready: export the strategic brief or escalate to Exec Portal.';
    }

    var nextEl = document.getElementById('gwNext');
    if (nextEl) nextEl.textContent = next;

    var toggleText = document.getElementById('gwToggleText');
    if (toggleText) {
      toggleText.textContent = 'GUIDE · ' + (s.briefGenerated ? 'BRIEF GENERATED' : (s.inputLoaded ? 'INPUT READY' : 'LOAD INPUT'));
    }
  }

  window.toggleGWPanel = function () {
    var p = document.getElementById('gwPanel');
    if (p) p.classList.toggle('open');
  };

  setInterval(render, 1000);
  document.addEventListener('DOMContentLoaded', render);
})();
</script>
EOF
)

# HTML/JS payload for re-exec-portal.html
EXEC_BODY=$(cat <<'EOF'
<!-- ═══ GUIDE WIDGET — EXEC PORTAL EDITION ═══ -->
<div class="guide-widget" id="guideWidget">
  <div class="gw-toggle" onclick="toggleGWPanel()">
    <span style="width:5px;height:5px;border-radius:50%;background:var(--acc, #00e5cc);animation:pulse 2s infinite;flex-shrink:0"></span>
    <span id="gwToggleText">GUIDE · EXEC OVERVIEW</span>
  </div>
  <div class="gw-panel" id="gwPanel">
    <div class="gw-step" id="gwStep1"><span class="dot"></span><span>Select Deal Portfolio or Active Case</span></div>
    <div class="gw-step" id="gwStep2"><span class="dot"></span><span>Review Strategic Brief & Executive Metrics</span></div>
    <div class="gw-step" id="gwStep3"><span class="dot"></span><span>Execute Sign-off, Action Override, or Delegation</span></div>
    <div class="gw-next" id="gwNext">Next: loading...</div>
  </div>
</div>

<script>
(function () {
  function computeState() {
    var portfolioSelect = document.getElementById('portfolioSelect') || document.getElementById('caseSelector');
    var activeDealLoaded = !!(
      (portfolioSelect && portfolioSelect.value) ||
      document.querySelector('.deal-card.active') ||
      window.__activeExecDeal
    );

    var metricsViewed = !!(
      document.querySelector('.exec-metric-card') || 
      document.getElementById('execBriefView')
    );

    var actionTaken = !!(
      window.__execApproved || 
      document.querySelector('.action-executed')
    );

    return { activeDealLoaded: activeDealLoaded, metricsViewed: metricsViewed, actionTaken: actionTaken };
  }

  function render() {
    var s = computeState();
    var steps = [
      { id: 'gwStep1', done: s.activeDealLoaded },
      { id: 'gwStep2', done: s.activeDealLoaded && s.metricsViewed },
      { id: 'gwStep3', done: s.actionTaken }
    ];

    var activeAssigned = false;
    steps.forEach(function (st) {
      var el = document.getElementById(st.id);
      if (!el) return;
      el.classList.remove('done', 'active');
      if (st.done) {
        el.classList.add('done');
      } else if (!activeAssigned) {
        el.classList.add('active');
        activeAssigned = true;
      }
    });

    var next = '';
    if (!s.activeDealLoaded) {
      next = 'Next: select a deal or session brief from the active queue.';
    } else if (!s.actionTaken) {
      next = 'Next: review risk matrices and authorize approval or escalation.';
    } else {
      next = 'Complete: decision recorded in TSM Chain ledger.';
    }

    var nextEl = document.getElementById('gwNext');
    if (nextEl) nextEl.textContent = next;

    var toggleText = document.getElementById('gwToggleText');
    if (toggleText) {
      toggleText.textContent = 'GUIDE · ' + (s.actionTaken ? 'DECISION RECORDED' : (s.activeDealLoaded ? 'REVIEWING DEAL' : 'SELECT DEAL'));
    }
  }

  window.toggleGWPanel = function () {
    var p = document.getElementById('gwPanel');
    if (p) p.classList.toggle('open');
  };

  setInterval(render, 1000);
  document.addEventListener('DOMContentLoaded', render);
})();
</script>
EOF
)

apply_widget() {
  local target_file="$1"
  local body_payload="$2"

  if [ ! -f "$target_file" ]; then
    echo "❌ Error: File not found: $target_file"
    return 1
  fi

  # 1. Idempotency Check
  if grep -q 'id="guideWidget"' "$target_file"; then
    echo "⚠️ Skipping $target_file: Guide Widget already present."
    return 0
  fi

  echo "🛠️ Processing: $target_file"

  # 2. Create Backup
  cp "$target_file" "${target_file}.bak.${TIMESTAMP}"
  echo "  └─ Backup created: ${target_file}.bak.${TIMESTAMP}"

  # 3. Inject CSS into </head>
  if grep -q "</head>" "$target_file"; then
    python3 -c "
with open('$target_file', 'r', encoding='utf-8') as f:
    content = f.read()

style_tag = '<style>\n' + '''$COMMON_CSS''' + '\n</style>\n</head>'
content = content.replace('</head>', style_tag, 1)

with open('$target_file', 'w', encoding='utf-8') as f:
    f.write(content)
"
    echo "  └─ Injected CSS into <head>"
  else
    echo "  └─ ⚠️ Warning: No </head> tag found, skipped CSS block insertion."
  fi

  # 4. Inject HTML + JS before </body>
  if grep -q "</body>" "$target_file"; then
    python3 -c "
with open('$target_file', 'r', encoding='utf-8') as f:
    content = f.read()

body_block = '''$body_payload''' + '\n</body>'
content = content.replace('</body>', body_block, 1)

with open('$target_file', 'w', encoding='utf-8') as f:
    f.write(content)
"
    echo "  └─ Injected Widget markup & JS before </body>"
  else
    echo "  └─ ❌ Error: No </body> tag found in $target_file."
    return 1
  fi

  echo "  └─ ✅ Successfully updated $target_file"
}

# Run updates
apply_widget "$STRATEGIST_FILE" "$STRATEGIST_BODY"
apply_widget "$EXEC_PORTAL_FILE" "$EXEC_BODY"

echo ""
echo "🎉 Update completed safely."