path = "html/l1-copilot/l1-ticket-copilot.html"
src = open(path, encoding="utf-8").read()

# 1. CSS
css_anchor = ".nav-brand{color:var(--cyan);font-weight:700;font-size:11px;letter-spacing:2px;margin-right:24px}\n"
assert src.count(css_anchor) == 1, "nav-brand CSS anchor not found or not unique"
css_block = (
css_anchor +
".nav-links{display:flex;gap:16px;font-size:10px;letter-spacing:1px}\n"
".nav-links a{color:var(--text-dim);text-decoration:none}\n"
".nav-links a:hover{color:var(--cyan)}\n"
)
assert ".nav-links{" not in src, "nav-links CSS already present — aborting"
src2 = src.replace(css_anchor, css_block, 1)
assert src2 != src, "CSS insertion had no effect"
src = src2

# 2. Markup — insert nav-links div between nav-brand and nav-right
html_anchor = (
'<div class="nav">\n'
'  <div class="nav-brand">TSM SHELL // L1 TICKET COPILOT</div>\n'
'  <div class="nav-right">\n'
)
assert src.count(html_anchor) == 1, "nav markup anchor not found or not unique"
html_block = (
'<div class="nav">\n'
'  <div class="nav-brand">TSM SHELL // L1 TICKET COPILOT</div>\n'
'  <div class="nav-links">\n'
'    <a href="/l1-copilot/enterprise-command-center.html">Command Center</a>\n'
'    <a href="/l1-copilot/vmware-copilot.html">VMware SME</a>\n'
'    <a href="/l1-copilot/noc/noc-war-room.html">NOC Command</a>\n'
'  </div>\n'
'  <div class="nav-right">\n'
)
assert 'class="nav-links"' not in src, "nav-links markup already present — aborting"
src2 = src.replace(html_anchor, html_block, 1)
assert src2 != src, "HTML insertion had no effect"
src = src2

open(path, "w", encoding="utf-8").write(src)
print("Applied: Phase 1 — l1-ticket-copilot.html outbound nav-links")
