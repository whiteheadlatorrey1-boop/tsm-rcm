#!/usr/bin/env python3
import re, shutil, pathlib, os, sys, subprocess

if len(sys.argv) != 4:
    print('Usage: python3 clone_suite.py "Facility Name" "Manager Name" "slug"')
    sys.exit(1)

FACILITY = sys.argv[1]
MANAGER  = sys.argv[2]
SLUG     = sys.argv[3].lower().replace(' ', '-')

print(f"Cloning for: {FACILITY} / {MANAGER} / {SLUG}")

base = pathlib.Path('html')

clones = [
    ('hc-presentation', f'{SLUG}-presentation'),
    ('hc-strategist',   f'{SLUG}-strategist'),
    ('healthcare',      f'{SLUG}'),
    ('honor-portal',    f'{SLUG}-portal'),
]

replacements = [
    ('Sample Health System Scottsdale-Shea', FACILITY),
    ('Scottsdale-Shea',             FACILITY),
    ('Scottsdale - Shea',           FACILITY),
    ('Scottsdale\u2013Shea',        FACILITY),
    ('Sample Health System',                 FACILITY),
    ('General Health System',       FACILITY),
    ('samplehealthsystem-dee',             SLUG),
    ('hc-presentation',             f'{SLUG}-presentation'),
    ('hc-strategist',               f'{SLUG}-strategist'),
    ('ghs-presentation',            f'{SLUG}-presentation'),
    ('ghs-strategist',              f'{SLUG}-strategist'),
    ('/html/healthcare/',            f'/html/{SLUG}/'),
    ('/html/honor-portal/',          f'/html/{SLUG}-portal/'),
    ('/html/ghs/',                   f'/html/{SLUG}/'),
    ('/html/general-portal/',        f'/html/{SLUG}-portal/'),
    ('HC STRATEGIST',               f'{SLUG.upper()} STRATEGIST'),
    ('HC Strategist',               f'{SLUG.title()} Strategist'),
    ('GHS STRATEGIST',              f'{SLUG.upper()} STRATEGIST'),
    ('GHS Strategist',              f'{SLUG.title()} Strategist'),
    ('Dee Montee',                  MANAGER),
    ('Alex Johnson',                MANAGER),
    ('Dee\u2019s',                  f'{MANAGER}\u2019s'),
    ('Alex\u2019s',                 f'{MANAGER}\u2019s'),
    (' Dee ',                       f' {MANAGER} '),
    (' Alex ',                      f' {MANAGER} '),
    ('Dee,',                        f'{MANAGER},'),
    ('Alex,',                       f'{MANAGER},'),
    ('Dee.',                        f'{MANAGER}.'),
    ('Alex.',                       f'{MANAGER}.'),
    ('DEE BNCA CONSOLE',            f'{MANAGER.upper()} BNCA CONSOLE'),
    ('DEE EXECUTIVE BNCA SURFACE',  f'{MANAGER.upper()} EXECUTIVE BNCA SURFACE'),
    ('Dee Mode',                    f'{MANAGER} Mode'),
    ('Alex Mode',                   f'{MANAGER} Mode'),
    ('United Healthcare',           '[Payer]'),
    ('your top payer auth backlog', 'your top payer auth backlog'),
]

extensions = {'.html', '.js', '.css', '.json', '.md'}

for src_name, dst_name in clones:
    src = base / src_name
    if not src.exists():
        print(f'SKIP — not found: {src}')
        continue
    dst = base / dst_name
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    print(f'Cloned {src.name} -> {dst.name}')
    for fpath in dst.rglob('*'):
        if fpath.is_file() and fpath.suffix in extensions:
            text = fpath.read_text(encoding='utf-8', errors='ignore')
            orig = text
            for old, new in replacements:
                text = text.replace(old, new)
            if text != orig:
                fpath.write_text(text, encoding='utf-8')
                print(f'  Fixed: {fpath.name}')

# Fix span quotes in JS strings
pres_fix = base / f'{SLUG}-presentation' / 'index.html'
if pres_fix.exists():
    t = pres_fix.read_text(encoding='utf-8')
    t = t.replace('<span class="money">', '<span class=\\"money\\">')
    t = t.replace('</span>', '<\\/span>')
    pres_fix.write_text(t, encoding='utf-8')

print('\nVerifying JS...')
pres = base / f'{SLUG}-presentation' / 'index.html'
if pres.exists():
    s = pres.read_text(encoding='utf-8')
    scripts = re.findall(r'<script>(.*?)</script>', s, re.DOTALL)
    if scripts:
        open('/tmp/_check.js', 'w').write(scripts[0])
        r = subprocess.run(['node', '--check', '/tmp/_check.js'], capture_output=True, text=True)
        print('JS: PASS' if r.returncode == 0 else f'JS ERROR: {r.stderr}')

# Auto-register routes in server.js and clean up stale ones
print("Registering routes in server.js...")
import re as re2
server = pathlib.Path('server.js')
sv = server.read_text(encoding='utf-8')
anchor = "app.use('/html/hc-strategist', express.static(path.join(__dirname, 'html', 'hc-strategist')));"
def route_for(d):
    return f"app.use('/html/{d}', express.static(path.join(__dirname, 'html', '{d}')));"
keep = {'suite','healthcare','hc-strategist','main-strategist'}
all_dirs = re2.findall(r"app\.use\('/html/([^']+)'", sv)
for d in all_dirs:
    if not (base / d).exists() and d not in keep:
        sv = sv.replace(route_for(d) + '\n', '')
        print(f'  Removed stale route: /html/{d}')
new_routes = []
for d in [f'{SLUG}-presentation', f'{SLUG}-strategist', SLUG, f'{SLUG}-portal']:
    route = route_for(d)
    if route not in sv:
        new_routes.append(route)
if new_routes:
    insertion = anchor + '\n' + '\n'.join(new_routes)
    sv = sv.replace(anchor, insertion)
    print(f'  Added {len(new_routes)} routes to server.js')
else:
    print('  Routes already registered.')
server.write_text(sv, encoding='utf-8')

print(f"""
Done! Run: fly deploy

URLs:
  https://tsm-shell.fly.dev/html/{SLUG}-presentation/
  https://tsm-shell.fly.dev/html/{SLUG}-strategist/
  https://tsm-shell.fly.dev/html/{SLUG}/
  https://tsm-shell.fly.dev/html/{SLUG}-portal/
""")
