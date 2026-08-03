import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Strip exposure engine and memory dynamic script tags
scripts_to_remove = [
    r'<script\s+src="[^"]*tsm-bnca-exposure-engine\.js"[^>]*></script>',
    r'<script\s+src="[^"]*tsm-operational-memory\.js"[^>]*></script>',
    r'<script\s+src="[^"]*memory-engine\.js"[^>]*></script>'
]

for pattern in scripts_to_remove:
    content = re.sub(pattern, '', content)

# 2. Add nuclear CSS targeting the exact active classes (.memory-card, .memory-btn, #memory-panel)
nuke_css = """
<style id="nuke-memory-target">
  .memory-card,
  .memory-btn,
  .memory-panel,
  #memory-card,
  #memory-panel,
  #opMemoryPanel,
  div[class*="memory"],
  div[id*="memory"],
  button[class*="memory"],
  button[id*="memory"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    width: 0 !important;
    position: absolute !important;
    top: -9999px !important;
    left: -9999px !important;
  }
</style>
"""

if "nuke-memory-target" not in content:
    content = content.replace("<head>", "<head>\n" + nuke_css)

# 3. Add an aggressive interval remover that deletes the node as soon as JS appends it
nuke_js = """
<script>
(function() {
  function removeMemoryElements() {
    const targets = document.querySelectorAll('.memory-card, .memory-btn, .memory-panel, #memory-card, #memory-panel, #opMemoryPanel, [class*="memory-card"]');
    targets.forEach(el => el.remove());
  }
  removeMemoryElements();
  document.addEventListener('DOMContentLoaded', removeMemoryElements);
  window.addEventListener('load', removeMemoryElements);
  setInterval(removeMemoryElements, 100);
})();
</script>
"""

if "removeMemoryElements" not in content:
    content = content.replace("</body>", nuke_js + "\n</body>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Targeted nuke script applied to re-exec-portal.html")