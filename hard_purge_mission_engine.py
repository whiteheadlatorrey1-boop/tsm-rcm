import os
import re

files = [
    "html/war-rooms/re-war/re-war-room.html",
    "html/war-rooms/re-war/re-strategist.html",
    "html/war-rooms/re-war/re-exec-portal.html"
]

# 1. CSS to obliterate all assistant & robot elements unconditionally
HARD_CSS = """
<style id="tsm-killswitch-css">
  #tsm-mission-guide-panel,
  .assistant-launcher,
  .chat-widget-container,
  .bot-avatar-btn,
  #tsm-assistant-root,
  div[class*="assistant"],
  div[id*="assistant"],
  iframe[src*="mission"],
  .robot-icon,
  img[src*="robot"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    position: absolute !important;
    left: -9999px !important;
  }
</style>
"""

# 2. Aggressive DOM Nuclear Purge Script
HARD_JS = """
<script>
(function() {
  function nukeAssistant() {
    const selectors = [
      '#tsm-mission-guide-panel',
      '.assistant-launcher',
      '.chat-widget-container',
      '.bot-avatar-btn',
      '#tsm-assistant-root',
      '[class*="assistant-panel"]',
      '[id*="assistant-panel"]',
      'iframe[src*="mission"]'
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  }
  
  // Nuke immediately and on loop
  nukeAssistant();
  document.addEventListener('DOMContentLoaded', nukeAssistant);
  window.addEventListener('load', nukeAssistant);
  setInterval(nukeAssistant, 250);
})();
</script>
"""

# 3. Guide Widget Markup & CSS for pages missing it
GUIDE_WIDGET_COMPLETE = """
<!-- ═══ GUIDE WIDGET ═══ -->
<style>
  .guide-widget {
    position: fixed;
    bottom: 42px;
    right: 20px;
    z-index: 999999;
    font-family: monospace;
  }
  .gw-toggle {
    background: #0d1117;
    border: 1px solid #30363d;
    color: #58a6ff;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  .gw-panel {
    display: none;
    position: absolute;
    bottom: 35px;
    right: 0;
    width: 320px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.7);
  }
  .gw-panel.open { display: block; }
  .gw-step { font-size: 11px; color: #8b949e; margin-bottom: 8px; display: flex; gap: 6px; }
  .gw-step.active { color: #58a6ff; font-weight: bold; }
  .gw-step.done { color: #238636; text-decoration: line-through; }
  .gw-next { font-size: 11px; color: #f0883e; margin-top: 10px; border-top: 1px solid #21262d; padding-top: 8px; }
</style>

<div class="guide-widget" id="guideWidget">
  <div class="gw-toggle" onclick="document.getElementById('gwPanel').classList.toggle('open')">
    <span style="width:6px;height:6px;border-radius:50%;background:#58a6ff;"></span>
    <span id="gwToggleText">GUIDE · STRATEGIST ACTIVE</span>
  </div>
  <div class="gw-panel" id="gwPanel">
    <div class="gw-step active" id="gwStep1"><span>1. Review strategy modules and risk matrix</span></div>
    <div class="gw-step" id="gwStep2"><span>2. Select a module to output execution plan</span></div>
    <div class="gw-step" id="gwStep3"><span>3. Click Escalate → Exec Portal for final review</span></div>
    <div class="gw-next" id="gwNext">Next: Click any strategy card to generate outputs.</div>
  </div>
</div>
"""

for path in files:
    if not os.path.exists(path):
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Completely remove the script tag referencing tsm-mission-engine.js
    content = re.sub(r'<script\s+src="[^"]*tsm-mission-engine\.js"[^>]*></script>', '', content)

    # Inject Killswitch CSS & JS at the top of <head>
    if "tsm-killswitch-css" not in content:
        content = content.replace("<head>", "<head>\n" + HARD_CSS + "\n" + HARD_JS)

    # Ensure Guide Widget is present
    if 'id="guideWidget"' not in content:
        content = content.replace("</body>", GUIDE_WIDGET_COMPLETE + "\n</body>")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Purged and updated: {path}")