import re

path = "html/war-rooms/re-war/re-exec-portal.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# CSS snippet to suppress fixed banner overlay & restore header layout
banner_css = """
<style id="fix-header-overlay">
  /* Hide intrusive overlay banners across the top bar */
  .top-banner, .alert-bar, .ticker-bar, .tsm-ticker-overlay, 
  [id*="ticker"], [id*="banner"], [class*="ticker"], [class*="alert-overlay"] {
    display: none !important;
  }

  /* Ensure top nav bar retains z-index priority and stays unblocked */
  header, nav, .header, .top-nav, .nav-bar {
    position: relative !important;
    z-index: 9999 !important;
    pointer-events: auto !important;
  }
</style>
"""

if "fix-header-overlay" not in content:
    content = content.replace("</head>", banner_css + "\n</head>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Header banner fix applied.")