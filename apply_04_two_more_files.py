import re

# ===== File 1: tsm-career-training-platform.html =====
path1 = "html/tsm-career-training-platform.html"
with open(path1, encoding="utf-8") as f:
    c1 = f.read()

pattern1 = r'    <a class="app-card" href="/html/war-rooms/bpo/tsm-bpo-competitive-playbook\.html".*?</a>\n'
replacement1 = '    <!-- BPO Competitive Playbook removed: file does not exist -->\n'

result1 = re.sub(pattern1, replacement1, c1, flags=re.DOTALL)
if result1 != c1:
    with open(path1, "w", encoding="utf-8") as f:
        f.write(result1)
    print(f"✓ Patched {path1}")
else:
    print(f"⚠ Card not found in {path1}")

# ===== File 2: tsm-enterprise-operating-system.html =====
path2 = "html/tsm-enterprise-operating-system.html"
with open(path2, encoding="utf-8") as f:
    c2 = f.read()

pattern2a = r'                    \{ name: "Workforce Intelligence Ops", path: "/html/bpo/tsm-bpo-competitive-playbook" \},'
replacement2a = '                    // Workforce Intelligence Ops removed: tsm-bpo-competitive-playbook.html does not exist'

result2 = re.sub(pattern2a, replacement2a, c2)

pattern2b = r'                    \{ name: "BPO Suite Hub", path: "/html/bpo/suite-hub\.html" \},\n                    \{ name: "BPO Command Center", path: "/html/bpo/bpo-command-center\.html" \},\n                    \{ name: "Internal Operations Panel 1", path: "/html/bpo/bpo-internal1\.html" \},\n                    \{ name: "Personal BPO Manual", path: "/html/bpo/tsm-bpo-personal-manual\.html" \},\n                    \{ name: "BPO Scenario Prep Demos", path: "/html/war-rooms/bpo/bpo-scenarios-demo\.html" \}'

replacement2b = '''                    // Old paths /html/bpo/ and /html/war-rooms/bpo/ don't exist.
                    // Real files: html/bpo-files/ (suite-hub, bpo-internal1, bpo-scenarios-demo).
                    // Removed: BPO Command Center, Personal BPO Manual (don't exist anywhere).
                    { name: "BPO Suite Hub", path: "/html/bpo-files/suite-hub.html" },
                    { name: "Internal Operations Panel 1", path: "/html/bpo-files/bpo-internal1.html" },
                    { name: "BPO Scenario Prep Demos", path: "/html/bpo-files/bpo-scenarios-demo.html" }'''

result2 = re.sub(pattern2b, replacement2b, result2, flags=re.DOTALL)

if result2 != c2:
    with open(path2, "w", encoding="utf-8") as f:
        f.write(result2)
    print(f"✓ Patched {path2}")
else:
    print(f"⚠ Patterns not found in {path2}")
