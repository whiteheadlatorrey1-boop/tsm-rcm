import re

path = "html/plant-incident.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

# 1. Insert PART 1/PART 2 structure right after the header, before "Generate executive decision package"
old = 'ENGINE 06 — EXECUTIVE DISPATCH\\nGenerate executive decision package:'
new = ('ENGINE 06 — EXECUTIVE DISPATCH\\n'
       'Respond in exactly two parts, in this order:\\n\\n'
       'PART 1 — On its own line, output exactly:\\n'
       'KPI_JSON: {"riskScore": <0-100 integer>, "downtimeEstimate": "<short string>"}\\n\\n'
       'PART 2 — Executive decision package:')
if 'PART 1 — On its own line' in content:
    print("SKIP: PART 1/2 header already inserted")
elif old in content:
    content = content.replace(old, new, 1)
    changed = True
    print("OK: inserted PART 1/PART 2 structure")
else:
    print("FAIL: header anchor not found")

# 2. Remove the old trailing IMPORTANT/KPI_JSON block (now redundant since it's moved to front)
old_tail = ('\\n\\nIMPORTANT: On its own final line, output a machine-readable summary '
            'in this exact format so downstream tools can parse it reliably:\\n'
            'KPI_JSON: {"riskScore": <0-100 integer>, "downtimeEstimate": "<short string>"}`')
new_tail = '`'
if content.count('KPI_JSON:') >= 2:
    if old_tail in content:
        content = content.replace(old_tail, new_tail, 1)
        changed = True
        print("OK: removed duplicate trailing KPI_JSON block")
    else:
        print("WARN: trailing block not found in expected exact form — check manually, may need to trim duplicate KPI_JSON by hand")
else:
    print("SKIP: only one KPI_JSON present, trailing block already gone")

# 3. Fix missing space typo
if '▸FINANCIAL IMPACT' in content:
    content = content.replace('▸FINANCIAL IMPACT', '▸ FINANCIAL IMPACT')
    changed = True
    print("OK: fixed '▸FINANCIAL' spacing")
else:
    print("SKIP: '▸FINANCIAL' typo already fixed or not present")

# 4. Fix "wouldrequire" typo
if 'wouldrequire' in content:
    content = content.replace('wouldrequire', 'would require')
    changed = True
    print("OK: fixed 'wouldrequire' spacing")
else:
    print("SKIP: 'wouldrequire' typo already fixed or not present")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("\nFile written.")
else:
    print("\nNo changes written.")
