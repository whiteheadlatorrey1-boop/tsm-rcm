import os

files = [
    "html/war-rooms/re-war/re-war-room.html",
    "html/war-rooms/re-war/re-strategist.html",
    "html/war-rooms/re-war/re-exec-portal.html"
]

# 1. Global JS override to disarm the mission engine assistant creator before scripts run
RUNTIME_NEUTRALIZER = """
<script>
  // Neutralize TSM Mission Engine dynamic overlay injection
  window.__TSM_DISABLE_MISSION_ASSISTANT__ = true;
  window.tsmInitMissionGuide = function() { return false; };
  
  // Intercept and destroy the assistant DOM node as soon as it mounts
  const killAssistantObserver = new MutationObserver((mutations) => {
    const targets = [
      'tsm-mission-guide-panel',
      'mission-guide-panel',
      'tsm-assistant-root',
      'ai-assistant-container'
    ];
    targets.forEach(id => {
      const el = document.getElementById(id) || document.querySelector('.' + id);
      if (el) el.remove();
    });
    // Remove launcher buttons or avatars created by mission-engine
    document.querySelectorAll('.bot-avatar-btn, [class*="assistant-launcher"], [id*="assistant-launcher"]').forEach(el => el.remove());
  });
  killAssistantObserver.observe(document.documentElement, { childList: true, subtree: true });
</script>
"""

# 2. Extract exact Guide Widget markup & JS from re-war-room.html
EXACT_GUIDE_WIDGET = """
<!-- ═══ GUIDE WIDGET — deterministic "what to click next" hints ═══ -->
<div class="guide-widget" id="guideWidget">
  <div class="gw-toggle" onclick="toggleGWPanel()">
    <span style="width:5px;height:5px;border-radius:50%;background:var(--acc);animation:pulse 2s infinite;flex-shrink:0"></span>
    <span id="gwToggleText">GUIDE · LOAD A DOCUMENT</span>
  </div>
  <div class="gw-panel" id="gwPanel">
    <div class="gw-step" id="gwStep1"><span class="dot"></span><span>Load a document — paste text, or open one from Doc Search</span></div>
    <div class="gw-step" id="gwStep2"><span class="dot"></span><span>Run an analysis module (click any READY card) or the Deal Rescue Pack</span></div>
    <div class="gw-step" id="gwStep3"><span class="dot"></span><span>Save the output(s) you want to keep</span></div>
    <div class="gw-step" id="gwStep4"><span class="dot"></span><span>Escalate → RE Strategist to build the full strategic brief</span></div>
    <div class="gw-next" id="gwNext">Next: load a document to get started.</div>
  </div>
</div>
<script>
(function () {
  function computeState() {
    var docRelayBlock = document.getElementById('docRelayBlock');
    var docPaste = document.getElementById('docPaste');
    var rpPasteInput = document.getElementById('rpPasteInput');
    var docLoaded = !!(
      window.__pastedDocFull ||
      (docRelayBlock && docRelayBlock.style.display !== 'none') ||
      (docPaste && docPaste.value.trim().length > 0) ||
      (rpPasteInput && rpPasteInput.value.trim().length > 0)
    );

    var statusEls = document.querySelectorAll('.nc-status');
    var modulesComplete = 0;
    for (var i = 0; i < statusEls.length; i++) {
      if (statusEls[i].textContent.trim() === '✓ COMPLETE') modulesComplete++;
    }

    var savedEl = document.getElementById('statSaved');
    var savedCount = savedEl ? (parseInt(savedEl.textContent, 10) || 0) : 0;

    var rescueResultsEl = document.getElementById('rescueResults');
    var rescueRun = !!(rescueResultsEl && /RESCUE PACK COMPLETE/i.test(rescueResultsEl.innerHTML || ''));

    return { docLoaded: docLoaded, modulesComplete: modulesComplete, savedCount: savedCount, rescueRun: rescueRun };
  }

  function render() {
    var s = computeState();
    var steps = [
      { id: 'gwStep1', done: s.docLoaded },
      { id: 'gwStep2', done: s.modulesComplete > 0 || s.rescueRun },
      { id: 'gwStep3', done: s.savedCount > 0 },
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
    if (!s.docLoaded) {
      next = 'Next: paste a document (or open one from Doc Search), then click LOAD DOC INTO SESSION.';
    } else if (s.modulesComplete === 0 && !s.rescueRun) {
      next = 'Next: run an analysis module — click any READY card, e.g. RESPA/TRID Audit.';
    } else if (s.savedCount === 0) {
      next = 'Next: save an output using + SAVE OUTPUT so it carries into your report.';
    } else {
      next = 'Ready: click ESCALATE → RE STRATEGIST to build the full strategic brief.';
    }
    var nextEl = document.getElementById('gwNext');
    if (nextEl) nextEl.textContent = next;

    var toggleText = document.getElementById('gwToggleText');
    if (toggleText) {
      toggleText.textContent = 'GUIDE · ' + (s.docLoaded
        ? (s.modulesComplete + ' MODULE' + (s.modulesComplete === 1 ? '' : 'S') + ' RUN')
        : 'LOAD A DOCUMENT');
    }
  }

  window.toggleGWPanel = function () {
    var p = document.getElementById('gwPanel');
    if (p) p.classList.toggle('open');
  };

  setInterval(render, 1000);
})();
</script>
"""

for path in files:
    if not os.path.exists(path):
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject Runtime Neutralizer as early as possible in <head>
    if "window.__TSM_DISABLE_MISSION_ASSISTANT__" not in content:
        content = content.replace("<head>", "<head>\n" + RUNTIME_NEUTRALIZER)

    # For re-strategist and re-exec-portal, ensure exact guide widget is injected
    if "re-war-room.html" not in path:
        # Strip old injected guide widgets if any
        if '<div class="guide-widget" id="guideWidget">' not in content:
            content = content.replace("</body>", EXACT_GUIDE_WIDGET + "\n</body>")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated and neutralized: {path}")