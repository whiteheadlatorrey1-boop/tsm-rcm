#!/usr/bin/env python3
# Patches LOCAL_APPS names in hub_index_v3.html using exact string replacement
# Handles special characters that break sed

import re

HUB = "/workspaces/tsm-shell/hub_index_v3.html"

# key → correct title (only the ones sed failed on)
PATCHES = {
    "samplehealthsystem":         "TSM · Sample Health System — Executive Briefing for Dee",
    "agents-ins":          "TSM Insurance Intelligence — AI for Insurance Professionals",
    "financial-command":   "TSM | Financial Command",
    "construction-command":"TSM | Construction Command",
    "strategist":          "Sovereign Strategist | The Ultimate Business Consultant",
}

with open(HUB, "r", encoding="utf-8") as f:
    content = f.read()

for key, title in PATCHES.items():
    # Match: name:'anything', key:'KEY'  or  name:"anything", key:"KEY"
    pattern = r"(name:)['\"]([^'\"]*)['\"](\s*,\s*key:['\"]" + re.escape(key) + r"['\"])"
    replacement = r"name:'" + title + r"'\3"
    new_content, count = re.subn(pattern, replacement, content)
    if count:
        print(f"✅ {key} → {title}")
        content = new_content
    else:
        print(f"⚠️  NOT FOUND: {key}")

with open(HUB, "w", encoding="utf-8") as f:
    f.write(content)

print("\nDone. Run: bash predeploy_titles.sh && fly deploy")
