import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add a dummy TSMAssistant global object to head so any legacy callers fail silently
assistant_stub = """
<script id="tsm-assistant-stub">
  window.TSMAssistant = {
    init: function() {},
    render: function() {},
    open: function() {},
    close: function() {},
    update: function() {}
  };
</script>
"""

if "tsm-assistant-stub" not in content:
    content = content.replace("<head>", "<head>\n" + assistant_stub)

# 2. Comment out or remove direct instantiations in script tags around lines 2140-2160
content = re.sub(r'TSMAssistant\.\w+\([^)]*\);?', '// stripped TSMAssistant call', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("TSMAssistant references stubbed and cleaned in re-exec-portal.html")