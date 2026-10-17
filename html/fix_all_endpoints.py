#!/usr/bin/env python3
# Nuclear endpoint fix — scans ALL html files recursively
# Replaces every dead API pattern with the correct live endpoint

import os, re

ROOT = '/workspaces/tsm-shell'

# Dead patterns (regex)
DEAD_PATTERNS = [
    r"https://tsm-core\.fly\.dev[^'\"]*",
    r"https://glowing-journey[^'\"]*",
    r"https://ai\.tsmatter\.com[^'\"]*",
    r"/api/v1/bridge[^'\"]*",
]

# Directory/filename → API mapping
def get_api(fpath):
    p = fpath.lower()
    if any(x in p for x in ['hc-billing','hc-compliance','hc-financial','hc-grants',
        'hc-insurance','hc-legal','hc-medical','hc-pharmacy','hc-strategist',
        'hc-taxprep','hc-vendors','hc-command','hc-presentation',
        'healthcare','honor','honorhealth','bpo-healthcare','dme']):
        return '/api/hc/query'
    if any(x in p for x in ['music']):
        return '/api/music/chain'
    if any(x in p for x in ['mortgage','reo','realty','bpo-realt']):
        return '/api/mortgage/query'
    if any(x in p for x in ['financial','desert-financial','bpo-tax','auditops','tax-prep']):
        return '/api/financial/query'
    if any(x in p for x in ['construction','samplegc']):
        return '/api/construction/query'
    if any(x in p for x in ['legal','bpo-legal']):
        return '/api/legal/query'
    if any(x in p for x in ['insurance','az-ins','az-life','agents-ins','pc-command']):
        return '/api/insurance/query'
    if any(x in p for x in ['schools']):
        return '/api/schools/query'
    if any(x in p for x in ['strategist','case-tech','rrd','suite']):
        return '/api/strategist/query'
    return '/api/ai/query'

def fix_file(fpath):
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        return False

    original = content
    api = get_api(fpath)

    for pattern in DEAD_PATTERNS:
        content = re.sub(
            r"(fetch\s*\(\s*['\"])" + pattern + r"(['\"])",
            lambda m, a=api: m.group(1) + a + m.group(2)[-1],
            content
        )
        # Also fix bare URL strings in assignments/objects
        content = re.sub(
            r"(['\"])" + pattern + r"(['\"])",
            lambda m, a=api: m.group(1) + a + m.group(2)[-1],
            content
        )

    # Fix CONFIG.bridgeUrl references
    content = re.sub(r'CONFIG\.bridgeUrl', f"'{api}'", content)
    content = re.sub(r'TSM_BRIDGE(?!\s*=)', f"'{api}'", content)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

patched = 0
total = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    # Skip node_modules
    dirnames[:] = [d for d in dirnames if d != 'node_modules']
    for fname in filenames:
        if not fname.endswith(('.html', '.htm')):
            continue
        fpath = os.path.join(dirpath, fname)
        total += 1
        if fix_file(fpath):
            rel = fpath.replace(ROOT + '/', '')
            api = get_api(fpath)
            print(f'✅ {rel} → {api}')
            patched += 1

print(f'\n=== {patched}/{total} files patched ===')

# Verify
remaining = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d != 'node_modules']
    for fname in filenames:
        if not fname.endswith(('.html', '.htm')):
            continue
        fpath = os.path.join(dirpath, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                c = f.read()
            if any(d in c for d in ['tsm-core.fly.dev', 'glowing-journey', '/api/v1/bridge', 'CONFIG.bridgeUrl', 'ai.tsmatter.com']):
                remaining += 1
                print(f'⚠️  Still dead: {fpath.replace(ROOT+"/","")}')
        except:
            pass

print(f'\n=== {remaining} files still have dead endpoints ===')
if remaining == 0:
    print('✅ ALL CLEAN — run: fly deploy')
