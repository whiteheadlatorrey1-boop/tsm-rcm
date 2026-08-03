import os
import re

# 1. Clean re-exec-portal.html directly
portal_path = "html/war-rooms/re-war/re-exec-portal.html"
with open(portal_path, "r", encoding="utf-8") as f:
    portal_content = f.read()

# Strip lines 991-994 (the DOMContentLoaded listener calling TSMMemory)
portal_content = re.sub(
    r'<script>\s*window\.addEventListener\("DOMContentLoaded",\s*function\(\)\{\s*if\s*\(window\.TSMMemory\).*?\n\s*\}\);\s*</script>',
    '<!-- stripped inline memory listener -->',
    portal_content,
    flags=re.DOTALL
)

# Strip tsm-runtime-lock.js script tag
portal_content = portal_content.replace('<script src="/js/tsm-runtime-lock.js"></script>', '<!-- stripped tsm-runtime-lock -->')

with open(portal_path, "w", encoding="utf-8") as f:
    f.write(portal_content)

print("Scrubbed inline memory listener and runtime-lock tag from re-exec-portal.html")

# 2. Stub tsm-runtime-lock.js across the workspace so it can't execute anywhere
for root, dirs, files in os.walk("."):
    if "tsm-runtime-lock.js" in files:
        lock_path = os.path.join(root, "tsm-runtime-lock.js")
        print(f"Stubbing runtime lock: {lock_path}")
        with open(lock_path, "w", encoding="utf-8") as f:
            f.write("// tsm-runtime-lock disabled\nwindow.TSMRuntimeLock = {};\n")

print("Runtime lock neutralization complete.")