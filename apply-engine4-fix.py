path = "html/plant-incident.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

# 1. Insert PART 1/PART 2 structure after the header
old = 'ENGINE 04 — FINANCIAL EXPOSURE CALCULATION\\nCalculate and structure:'
new = ('ENGINE 04 — FINANCIAL EXPOSURE CALCULATION\\n'
       'Respond in exactly two parts, in this order:\\n\\n'
       'PART 1 — On its own line, output exactly:\\n'
       'KPI_JSON: {"totalExposureLow": <number>, "totalExposureHigh": <number>}\\n\\n'
       'PART 2 — Calculate and structure:')
if 'PART 1 — On its own line' in content and 'totalExposureLow' in content.split('PART 1 — On its own line')[1][:200]:
    print("SKIP: engine 4 PART 1/2 header already inserted")
elif old in content:
    content = content.replace(old, new, 1)
    changed = True
    print("OK: inserted PART 1/PART 2 structure into engine 4")
else:
    print("FAIL step 1: header anchor not found")

# 2. Remove the old trailing IMPORTANT/KPI_JSON block for engine 4
old_tail = ('\\n\\nIMPORTANT: On its own final line, output a machine-readable summary '
            'in this exact format so downstream tools can parse it reliably:\\n'
            'KPI_JSON: {"totalExposureLow": <number>, "totalExposureHigh": <number>}`,')
new_tail = '`,'
if old_tail in content:
    content = content.replace(old_tail, new_tail, 1)
    changed = True
    print("OK: removed trailing duplicate KPI_JSON block from engine 4")
else:
    print("WARN step 2: trailing block not found in exact form — checking alt encoding")

# 3. Fix missing-space typos
if 'lostproduction' in content:
    content = content.replace('lostproduction', 'lost production')
    changed = True
    print("OK: fixed 'lostproduction' spacing")
if 'contractorcosts' in content:
    content = content.replace('contractorcosts', 'contractor costs')
    changed = True
    print("OK: fixed 'contractorcosts' spacing")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("\nFile written.")
else:
    print("\nNo changes written.")
