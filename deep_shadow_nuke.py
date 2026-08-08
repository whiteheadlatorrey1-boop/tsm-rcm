import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

deep_nuke_js = """
<script>
(function() {
  function nukeDeep(root) {
    if (!root) return;
    
    // 1. Remove parent injection containers directly
    const directContainers = root.querySelectorAll('#tsm-bnca-exposure-engine, [id*="bnca"], .bnca-container, #opMemoryPanel');
    directContainers.forEach(el => el.remove());

    // 2. Scan all elements for matching memory text
    const all = root.querySelectorAll('*');
    all.forEach(el => {
      // Check shadow root if present
      if (el.shadowRoot) {
        nukeDeep(el.shadowRoot);
      }
      
      // Check if this element contains the target text directly
      if (el.children.length === 0 && el.textContent) {
        if (
          el.textContent.includes('TSM Operational Memory') ||
          el.textContent.includes('PERSISTENT OPERATIONAL MEMORY') ||
          el.textContent.includes('CROSS-UPLOAD INTELLIGENCE')
        ) {
          // Travel up to find the outer floating container and obliterate it
          let target = el;
          while (target && target !== root && target.tagName !== 'BODY') {
            if (
              target.classList.contains('memory-card') ||
              target.id.includes('memory') ||
              target.id.includes('bnca') ||
              window.getComputedStyle(target).position === 'fixed' ||
              window.getComputedStyle(target).position === 'absolute'
            ) {
              target.remove();
              break;
            }
            target = target.parentElement;
          }
        }
      }
    });

    // 3. Scan inside iframes
    const iframes = root.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument) {
          nukeDeep(iframe.contentDocument);
        }
      } catch (e) {
        // Cross-origin iframe fallback: strip iframe if it's the memory host
        if (iframe.src && iframe.src.includes('memory')) {
          iframe.remove();
        }
      }
    });
  }

  function runNuke() {
    nukeDeep(document);
  }

  runNuke();
  document.addEventListener('DOMContentLoaded', runNuke);
  window.addEventListener('load', runNuke);
  setInterval(runNuke, 50);
})();
</script>
"""

if "nukeDeep" not in content:
    content = content.replace("</body>", deep_nuke_js + "\n</body>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Deep shadow/iframe DOM nuke applied to re-exec-portal.html")