#!/usr/bin/env python3
# Replaces all dead API endpoints with live Groq endpoints
# Targets: tsm-core.fly.dev, /api/v1/bridge, old bridge URLs

import os, re

ROOT = '/workspaces/tsm-shell'
HTML = os.path.join(ROOT, 'html')

# Dead endpoints to replace
DEAD = [
    'tsm-core.fly.dev:3000/ask',
    'tsm-core.fly.dev:3000',
    '/api/v1/bridge',
    'glowing-journey',  # old codespace bridge
    'ai.tsmatter.com',
]

# File → correct live API
FILE_API_MAP = {
    # Root files
    'mortgage-command.html':     '/api/mortgage/query',
    'concierge-command.html':    '/api/ai/query',
    'financial.html':            '/api/financial/query',
    'strategist-index.html':     '/api/strategist/query',
    'construction.html':         '/api/construction/query',
    'construction-center.html':  '/api/construction/query',
    'reo-command.html':          '/api/mortgage/query',
    'reo-pro.tsmatter.html':     '/api/mortgage/query',
    'agents-ins.html':           '/api/insurance/query',
    'az-life.html':              '/api/insurance/query',
    'az-ins.tsmatter.html':      '/api/insurance/query',
    'pc-command.tsmatter.html':  '/api/insurance/query',
    'financial-command.tsmatter.html': '/api/financial/query',
    'sample-credit-union.tsmatter.html':  '/api/financial/query',
    'bpo-legal.tsmatter.html':   '/api/legal/query',
    'bpo-realty.tsmatter.html':  '/api/mortgage/query',
    'bpo-tax.tsmatter.html':     '/api/financial/query',
    'sample-fulfillment.tsmatter.html':   '/api/strategist/query',
    'rrd-command.tsmatter.html': '/api/strategist/query',
    'strategist00.tsmatter.html':'/api/strategist/query',
    'construction-command.tsmatter.html': '/api/construction/query',
    'schools-command.html':      '/api/schools/query',
    'auditops-pro.html':         '/api/financial/query',
    'suite-builder.html':        '/api/strategist/query',
    'zero-trust.html':           '/api/ai/query',
    'index.html':                '/api/ai/query',
    'access.html':               '/api/ai/query',
    'client-access.html':        '/api/ai/query',
    'samplehealthsystem-dee.html':      '/api/hc/query',
    'tsm-samplehealthsystem-dee.tsmatter.html': '/api/hc/query',
    'dme.html':                  '/api/hc/query',
    # HC files
    'hc-billing.tsmatter.html':  '/api/hc/query',
    'hc-compliance.tsmatter.html': '/api/hc/query',
    'hc-financial.tsmatter.html':  '/api/hc/query',
    'hc-grants.tsmatter.html':     '/api/hc/query',
    'hc-insurance.tsmatter.html':  '/api/hc/query',
    'hc-legal.tsmatter.html':      '/api/hc/query',
    'hc-medical.tsmatter.html':    '/api/hc/query',
    'hc-pharmacy.tsmatter.html':   '/api/hc/query',
    'hc-strategist.tsmatter.html': '/api/hc/query',
    'hc-taxprep.tsmatter.html':    '/api/hc/query',
    'hc-vendors.tsmatter.html':    '/api/hc/query',
    'healthcare-command.html':     '/api/hc/query',
}

# html/ subdirectory index.html files → correct API
HTML_DIR_MAP = {
    'hc-billing':      '/api/hc/query',
    'hc-command':      '/api/hc/query',
    'hc-compliance':   '/api/hc/query',
    'hc-financial':    '/api/hc/query',
    'hc-grants':       '/api/hc/query',
    'hc-insurance':    '/api/hc/query',
    'hc-legal':        '/api/hc/query',
    'hc-medical':      '/api/hc/query',
    'hc-pharmacy':     '/api/hc/query',
    'hc-strategist':   '/api/hc/query',
    'hc-taxprep':      '/api/hc/query',
    'hc-vendors':      '/api/hc/query',
    'hc-presentation': '/api/hc/query',
    'healthcare':      '/api/hc/query',
    'honor-portal':    '/api/hc/query',
    'samplehealthsystem':     '/api/hc/query',
    'samplehealthsystem-dee': '/api/hc/query',
    'bpo-healthcare':  '/api/hc/query',
    'music-command':   '/api/music/chain',
    'financial-command': '/api/financial/query',
    'sample-credit-union':  '/api/financial/query',
    'construction':      '/api/construction/query',
    'construction-command': '/api/construction/query',
    'samplegc-construction':  '/api/construction/query',
    'samplegc-portal':        '/api/construction/query',
    'concierge-command':    '/api/ai/query',
    'bpo-legal':            '/api/legal/query',
    'bpo-realty':           '/api/mortgage/query',
    'bpo-tax':              '/api/financial/query',
    'bpo-construction':     '/api/construction/query',
    'bpo-hotelops':         '/api/ai/query',
    'az-ins':               '/api/insurance/query',
    'az-life':              '/api/insurance/query',
    'sample-fulfillment':            '/api/strategist/query',
    'reo-pro':              '/api/mortgage/query',
    'agents-ins':           '/api/insurance/query',
    'rrd-command':          '/api/strategist/query',
}

def has_dead_endpoint(content):
    for d in DEAD:
        if d in content:
            return True
    return False

def fix_content(content, live_api):
    # Replace all dead fetch URLs with the live API
    # Pattern: fetch('https://tsm-core.fly.dev:3000/ask', ...)
    content = re.sub(
        r"fetch\s*\(\s*['\"]https://tsm-core\.fly\.dev[^'\"]*['\"]",
        f"fetch('{live_api}'",
        content
    )
    # Pattern: fetch('/api/v1/bridge', ...)
    content = re.sub(
        r"fetch\s*\(\s*['\"][^'\"]*?/api/v1/bridge[^'\"]*['\"]",
        f"fetch('{live_api}'",
        content
    )
    # Pattern: url: '/api/v1/bridge'
    content = re.sub(
        r"url\s*:\s*['\"][^'\"]*?/api/v1/bridge[^'\"]*['\"]",
        f"url: '{live_api}'",
        content
    )
    # Pattern: fetch('https://glowing-journey...', ...)
    content = re.sub(
        r"fetch\s*\(\s*['\"]https://glowing-journey[^'\"]*['\"]",
        f"fetch('{live_api}'",
        content
    )
    # Pattern: fetch('https://ai.tsmatter.com...', ...)
    content = re.sub(
        r"fetch\s*\(\s*['\"]https://ai\.tsmatter\.com[^'\"]*['\"]",
        f"fetch('{live_api}'",
        content
    )
    # CONFIG.bridgeUrl
    content = re.sub(
        r"CONFIG\.bridgeUrl",
        f"'{live_api}'",
        content
    )
    # TSM_BRIDGE variable references
    content = re.sub(
        r"const TSM_BRIDGE\s*=\s*['\"][^'\"]*['\"]",
        f"const TSM_BRIDGE = '{live_api}'",
        content
    )
    content = re.sub(
        r"fetch\s*\(\s*TSM_BRIDGE",
        f"fetch('{live_api}'",
        content
    )
    return content

patched = 0
already_ok = 0

# Fix root files
for fname, api in FILE_API_MAP.items():
    fpath = os.path.join(ROOT, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if not has_dead_endpoint(content) and 'CONFIG.bridgeUrl' not in content and 'TSM_BRIDGE' not in content:
        already_ok += 1
        continue
    fixed = fix_content(content, api)
    if fixed != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'✅ {fname} → {api}')
        patched += 1
    else:
        already_ok += 1

# Fix html/ subdirectory index.html files
for dirname, api in HTML_DIR_MAP.items():
    for idx in ['index.html', 'index.htm']:
        fpath = os.path.join(HTML, dirname, idx)
        if not os.path.exists(fpath):
            continue
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        if not has_dead_endpoint(content) and 'CONFIG.bridgeUrl' not in content and 'TSM_BRIDGE' not in content:
            already_ok += 1
            continue
        fixed = fix_content(content, api)
        if fixed != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            print(f'✅ html/{dirname}/{idx} → {api}')
            patched += 1
        else:
            already_ok += 1

print(f'\n=== {patched} patched · {already_ok} already clean ===')
print('Run: node --check /workspaces/tsm-shell/server.js && fly deploy')
