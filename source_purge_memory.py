import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Strip all runtime scripts responsible for loading memory/bnca engines
scripts_to_strip = [
    r'<script\s+src="[^"]*tsm-bnca-exposure-engine\.js"[^>]*></script>',
    r'<script\s+src="[^"]*tsm-auto-pipeline\.js"[^>]*></script>',
    r'<script\s+src="[^"]*relay\.core\.js"[^>]*></script>'
]

for script in scripts_to_strip:
    content = re.sub(script, '', content)

# 2. Universal element purge in DOM
universal_nuke = """
<script>
(function() {
  function hardClean() {
    // Find any container holding 'TSM Operational Memory' or 'PERSISTENT OPERATIONAL MEMORY'
    const allEls = document.querySelectorAll('div, section, aside, article');
    allEls.forEach(el => {
      if (el.textContent && (
        el.textContent.includes('TSM Operational Memory') ||
        el.textContent.includes('PERSISTENT OPERATIONAL MEMORY') ||
        el.textContent.includes('CROSS-UPLOAD INTELLIGENCE')
      )) {
        // If it's a floating card/panel container, remove it
        if (el.offsetWidth < 500 || window.getComputedStyle(el).position === 'fixed' || window.getComputedStyle(el).position === 'absolute') {
          el.remove();
        }
      }
    });

    // Remove fixed bottom-right triggers
    document.querySelectorAll('[id*="memory"], [class*="memory"], .memory-btn, #memory-btn').forEach(btn => {
      if (btn.id !== 'guideWidget' && !btn.classList.contains('guide-widget')) {
        btn.remove();
      }
    });
  }

  hardClean();
  document.addEventListener('DOMContentLoaded', hardClean);
  window.addEventListener('load', hardClean);
  setInterval(hardClean, 100);
})();
</script>
"""

if "hardClean" not in content:
    content = content.replace("</body>", universal_nuke + "\n</body>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Universal content-based memory purge applied to re-exec-portal.html")