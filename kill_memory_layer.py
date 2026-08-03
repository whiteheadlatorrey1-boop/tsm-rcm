import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Direct CSS override targeting exact IDs from console output
exact_css = """
<style id="kill-tsm-memory-layer">
  #tsmMemoryLayer,
  #tsmMemoryNarrative,
  .tsm-memory-layer,
  .tsm-memory-layer.open {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0) !important;
    top: -9999px !important;
    left: -9999px !important;
  }
</style>
"""

if "kill-tsm-memory-layer" not in content:
    content = content.replace("<head>", "<head>\n" + exact_css)

# 2. Hard removal script targeting #tsmMemoryLayer specifically
exact_js = """
<script>
(function() {
  function purgeLayer() {
    const layer = document.getElementById('tsmMemoryLayer');
    if (layer) layer.remove();
    
    const narrative = document.getElementById('tsmMemoryNarrative');
    if (narrative) narrative.remove();
    
    document.querySelectorAll('.tsm-memory-layer, .tsm-memory-layer.open').forEach(el => el.remove());
  }

  purgeLayer();
  document.addEventListener('DOMContentLoaded', purgeLayer);
  window.addEventListener('load', purgeLayer);
  setInterval(purgeLayer, 30);
})();
</script>
"""

if "purgeLayer" not in content:
    content = content.replace("</body>", exact_js + "\n</body>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Targeted kill script for #tsmMemoryLayer applied to re-exec-portal.html")