import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add CSS killswitch rule to immediately hide memory panels/buttons
kill_css = """
<style id="tsm-kill-memory-css">
  [id*="memory"], [class*="memory"],
  [id*="op-memory"], [class*="op-memory"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
  }
</style>
"""

if "tsm-kill-memory-css" not in content:
    content = content.replace("<head>", "<head>\n" + kill_css)

# 2. Remove script references that load operational memory
content = re.sub(r'<script\s+src="[^"]*tsm-operational-memory\.js"[^>]*></script>', '', content)
content = re.sub(r'<script\s+src="[^"]*memory-engine\.js"[^>]*></script>', '', content)

# 3. Strip any hardcoded operational memory DOM containers
content = re.sub(r'<div[^>]*id="[^"]*op-memory[^"]*"[^>]*>[\s\S]*?</div>', '', content, flags=re.IGNORECASE)
content = re.sub(r'<div[^>]*class="[^"]*memory-card[^"]*"[^>]*>[\s\S]*?</div>', '', content, flags=re.IGNORECASE)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("TSM Operational Memory widget stripped from re-exec-portal.html")