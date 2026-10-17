#!/usr/bin/env python3
"""
TSM Health Checker
Tests every tsmatter.com URL, detects blank/dead pages,
then overwrites tsm-core-real with the best available local file.
"""
import urllib.request, urllib.error, pathlib, shutil, sys

BASE_SHELL = pathlib.Path('/workspaces/tsm-shell')
BASE_HTML  = BASE_SHELL / 'html'
BASE_CORE  = pathlib.Path('/workspaces/tsm-core-real')

# Map: subdomain slug -> best local file candidates (in priority order)
SLUG_MAP = {
    'abrazo':               ['html/ghs-presentation/index.html'],
    'valleywise':           ['html/ghs-presentation/index.html'],
    'bpo-healthcare':       ['html/ghs/index.html'],
    'financial':            ['financial.html'],
    'compliance':           ['compliance.html', 'html/hc-compliance/index.html'],
    'tax':                  ['tax-prep.html'],
    'zero-trust':           ['zero-trust.html'],
    'mortgage-command':     ['html/financial-command/index.html'],
    'real-estate-command':  ['html/reo-pro/index.html'],
    'mortgage':             ['financial.html'],
    'bpo-realty':           ['html/bpo-realty/index.html'],
    'construction':         ['html/construction-command/index.html'],
    'bpo-construction':     ['html/bpo-legal/index.html'],
    'samplegc-construction':  ['html/samplegc-construction/index.html'],
    'legal-analyst-pro':    ['html/legal-analyst-pro/index.html'],
    'schools-command':      ['html/ghs/index.html'],
    'schools':              ['html/ghs/index.html'],
    'hotelops':             ['html/ghs/index.html'],
    'concierge-command':    ['html/ghs/index.html'],
    'bpo-hotelops':         ['html/bpo-legal/index.html'],
    'docpro':               ['html/rrd-command/index.html'],
    'appointments':         ['html/ghs/index.html'],
    'auditops':             ['html/agents-ins/index.html'],
}

URLS = [
    ('abrazo',              'https://abrazo.tsmatter.com'),
    ('valleywise',          'https://valleywise.tsmatter.com'),
    ('bpo-healthcare',      'https://bpo-healthcare.tsmatter.com'),
    ('financial',           'https://financial.tsmatter.com'),
    ('compliance',          'https://compliance.tsmatter.com'),
    ('tax',                 'https://tax.tsmatter.com'),
    ('zero-trust',          'https://zero-trust.tsmatter.com'),
    ('mortgage-command',    'https://mortgage-command.tsmatter.com'),
    ('real-estate-command', 'https://real-estate-command.tsmatter.com'),
    ('mortgage',            'https://mortgage.tsmatter.com'),
    ('bpo-realty',          'https://bpo-realty.tsmatter.com'),
    ('construction',        'https://construction.tsmatter.com'),
    ('bpo-construction',    'https://bpo-construction.tsmatter.com'),
    ('samplegc-construction', 'https://samplegc-construction.tsmatter.com'),
    ('legal-analyst-pro',   'https://legal-analyst-pro.tsmatter.com'),
    ('schools-command',     'https://schools-command.tsmatter.com'),
    ('schools',             'https://schools.tsmatter.com'),
    ('hotelops',            'https://hotelops.tsmatter.com'),
    ('concierge-command',   'https://concierge-command.tsmatter.com'),
    ('bpo-hotelops',        'https://bpo-hotelops.tsmatter.com'),
    ('docpro',              'https://docpro.tsmatter.com'),
    ('appointments',        'https://appointments.tsmatter.com'),
    ('auditops',            'https://auditops.tsmatter.com'),
]

def is_blank(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            body = r.read(4000).decode('utf-8', errors='ignore')
            # Blank if body has no meaningful content
            stripped = body.replace('\n','').replace(' ','').replace('\r','')
            if len(stripped) < 200:
                return True
            if '<body>' in body and '</body>' in body:
                content = body[body.find('<body>')+6:body.find('</body>')]
                if len(content.strip()) < 100:
                    return True
            return False
    except Exception as e:
        return True  # dead = treat as blank

def find_local(slug):
    candidates = SLUG_MAP.get(slug, [])
    for c in candidates:
        p = BASE_SHELL / c
        if p.exists():
            return p
    return None

def fix(slug, url):
    local = find_local(slug)
    if not local:
        print(f'  ⚠ No local file mapped for {slug}')
        return
    # Derive output filename from subdomain
    out_name = slug + '.html'
    dest = BASE_CORE / out_name
    shutil.copy(local, dest)
    print(f'  ✅ Copied {local.relative_to(BASE_SHELL)} → tsm-core-real/{out_name}')

print('TSM Health Check\n' + '='*50)
dead = []
for slug, url in URLS:
    sys.stdout.write(f'Checking {url} ... ')
    sys.stdout.flush()
    if is_blank(url):
        print('BLANK/DEAD')
        dead.append((slug, url))
    else:
        print('OK')

print(f'\n{len(dead)} dead URLs found.')
if dead:
    print('\nFixing...')
    for slug, url in dead:
        print(f'  {url}')
        fix(slug, url)
    print(f'\nDone. Now run:')
    print(f'  cd /workspaces/tsm-core-real && fly deploy')
else:
    print('All URLs live — nothing to fix.')

