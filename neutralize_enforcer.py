import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Strip tsm-enforcer.js imports
content = re.sub(r'<script\s+src="[^"]*tsm-enforcer\.js"[^>]*></script>', '', content)

# 2. Add high-priority script execution block to kill enforcer objects early
enforcer_override = """
<script>
// Override TSM Autonomy Enforcer before tsm-enforcer.js initializes
window.TSMEnforcer = { init: function() {}, checkHealth: function() {}, enforce: function() {} };
window.tsmEnforcer = window.TSMEnforcer;

(function() {
  function disableEnforcerElements() {
    // Neutralize elements enforced by tsm-enforcer.js
    const selectors = [
      '[id*="memory"]', '[class*="memory"]',
      '[id*="enforcer"]', '[class*="enforcer"]',
      '#opMemoryPanel', '.memory-card'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
  }

  disableEnforcerElements();
  document.addEventListener('DOMContentLoaded', disableEnforcerElements);
  window.addEventListener('load', disableEnforcerElements);
  setInterval(disableEnforcerElements, 50);
})();
</script>
"""

if "window.TSMEnforcer" not in content:
    content = content.replace("<head>", "<head>\n" + enforcer_override)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("tsm-enforcer.js successfully neutralized in re-exec-portal.html")