#!/usr/bin/env python3
"""
TSM — TWO-TASK PATCHER
======================
Task 1: Wire OPEN APP buttons in html/ghs/index.html to actual HC node index.html pages
Task 2: Copy slides from html/samplehealthsystem (or similar) into html/ghs-presentation/index.html

Run from repo root:
    python3 patch_nodes_and_slides.py
"""

import re
import shutil
from pathlib import Path
from bs4 import BeautifulSoup

REPO = Path(__file__).parent

# ── TASK 1: NODE LINK MAP ────────────────────────────────────────────────────
# Maps the node label text shown in ghs/index.html → the actual URL path
NODE_URL_MAP = {
    'OPERATIONS':  '/html/hc-command/',
    'MEDICAL':     '/html/hc-medical/',
    'PHARMACY':    '/html/hc-pharmacy/',
    'INSURANCE':   '/html/hc-insurance/',
    'FINANCIAL':   '/html/hc-financial/',
    'LEGAL':       '/html/hc-legal/',
    'VENDORS':     '/html/hc-vendors/',
    'COMPLIANCE':  '/html/hc-compliance/',
    'BILLING':     '/html/hc-billing/',
    'TAX PREP':    '/html/hc-taxprep/',
    'TAXPREP':     '/html/hc-taxprep/',
    'GRANTS':      '/html/hc-grants/',
}

GHS_INDEX = REPO / 'html/ghs/index.html'


def backup(path: Path):
    bak = path.with_suffix(path.suffix + '.nodes-patch.bak')
    if not bak.exists():
        shutil.copy2(path, bak)
        print(f'  [BAK] {bak.name}')


def patch_node_links():
    if not GHS_INDEX.exists():
        print(f'[SKIP] {GHS_INDEX} not found')
        return

    text = GHS_INDEX.read_text(encoding='utf-8', errors='replace')
    original = text
    changes = 0

    # Strategy A — fix onclick="window.open(...)" or href patterns
    # Pattern: finds OPEN APP buttons that have a port-based URL or placeholder
    # We look for the node title nearby to pick the right URL

    # Strategy B — regex: find each node card block and patch its OPEN APP link
    # Node card pattern (as seen in screenshot): node name in h2/h3/div + OPEN APP button
    
    for node_name, node_url in NODE_URL_MAP.items():
        # Match a block containing the node name followed (within 600 chars) by OPEN APP
        # Handles: onclick="window.location='...'" or href="..." or window.open(...)
        
        # Pattern 1: window.open('PORT_URL') near node name
        pattern_open = re.compile(
            r"((?:" + re.escape(node_name) + r")[^<]{0,800}?)"
            r"(OPEN\s*APP[^<]{0,200}?)(window\.open\(['\"])[^'\"]*(['\"])",
            re.DOTALL | re.IGNORECASE
        )
        def make_replacer(url):
            def replacer(m):
                return m.group(1) + m.group(2) + m.group(3) + url + m.group(4)
            return replacer
        
        new_text, n = pattern_open.subn(make_replacer(node_url), text, count=1)
        if n:
            text = new_text
            changes += n
            print(f'  [LINK] {node_name} → {node_url} (window.open)')
            continue

        # Pattern 2: href="..." on OPEN APP anchor
        pattern_href = re.compile(
            r"((?:" + re.escape(node_name) + r")[^<]{0,800}?)"
            r"(OPEN\s*APP[^<]{0,200}?href=['\"])[^'\"]*(['\"])",
            re.DOTALL | re.IGNORECASE
        )
        new_text, n = pattern_href.subn(
            lambda m: m.group(1) + m.group(2) + node_url + m.group(3), text, count=1)
        if n:
            text = new_text
            changes += n
            print(f'  [LINK] {node_name} → {node_url} (href)')
            continue

        # Pattern 3: onclick="location.href=..." or window.location
        pattern_loc = re.compile(
            r"((?:" + re.escape(node_name) + r")[^<]{0,800}?)"
            r"(OPEN\s*APP[^<]{0,200}?(?:location\.href|window\.location)\s*=\s*['\"])[^'\"]*(['\"])",
            re.DOTALL | re.IGNORECASE
        )
        new_text, n = pattern_loc.subn(
            lambda m: m.group(1) + m.group(2) + node_url + m.group(3), text, count=1)
        if n:
            text = new_text
            changes += n
            print(f'  [LINK] {node_name} → {node_url} (location)')
            continue

        # Pattern 4 — OPEN APP button has no URL yet; inject one
        # Find button text "OPEN APP" near this node name and add onclick
        pattern_btn = re.compile(
            r"((?:" + re.escape(node_name) + r")[^<]{0,800}?)"
            r"(<(?:button|a)[^>]*>)\s*(OPEN\s*APP)\s*(<)",
            re.DOTALL | re.IGNORECASE
        )
        def btn_replacer(url):
            def replacer(m):
                tag = m.group(2)
                # Add onclick if button, or href if anchor
                if tag.lower().startswith('<a'):
                    tag = re.sub(r'href=["\'][^"\']*["\']', '', tag)
                    tag = tag.rstrip('>') + f' href="{url}">'
                else:
                    tag = tag.rstrip('>') + f' onclick="window.open(\'{url}\',\'_blank\')">'
                return m.group(1) + tag + m.group(3) + m.group(4)
            return replacer

        new_text, n = pattern_btn.subn(btn_replacer(node_url), text, count=1)
        if n:
            text = new_text
            changes += n
            print(f'  [BTN]  {node_name} → {node_url} (injected onclick)')

    if text != original:
        backup(GHS_INDEX)
        GHS_INDEX.write_text(text, encoding='utf-8')
        print(f'\n  [SAVED] html/ghs/index.html — {changes} node link(s) updated')
    else:
        print(f'\n  [NOTE] No auto-patch matched. Trying BeautifulSoup fallback...')
        _bs4_patch_links()


def _bs4_patch_links():
    """BeautifulSoup fallback: find all buttons with OPEN APP text and wire by position."""
    text = GHS_INDEX.read_text(encoding='utf-8', errors='replace')
    soup = BeautifulSoup(text, 'html.parser')
    changes = 0

    # Find all elements containing OPEN APP
    open_app_els = soup.find_all(
        lambda tag: tag.string and 'OPEN APP' in tag.string.upper()
    )

    for el in open_app_els:
        # Walk up to find the node card container
        card = el
        for _ in range(8):
            card = card.parent
            if card is None:
                break
            card_text = card.get_text(separator=' ').upper()
            matched_node = None
            for node_name, node_url in NODE_URL_MAP.items():
                if node_name in card_text:
                    matched_node = (node_name, node_url)
                    break
            if matched_node:
                node_name, node_url = matched_node
                # Patch the button
                if el.name == 'a':
                    el['href'] = node_url
                else:
                    el['onclick'] = f"window.open('{node_url}','_blank')"
                print(f'  [BS4]  {node_name} → {node_url}')
                changes += 1
                break

    if changes:
        backup(GHS_INDEX)
        GHS_INDEX.write_text(str(soup), encoding='utf-8')
        print(f'  [SAVED] {changes} node link(s) updated via BeautifulSoup')
    else:
        print('  [MANUAL] Could not auto-detect OPEN APP pattern.')
        print('  Run: python3 patch_nodes_and_slides.py --dump-ghs')
        print('  to print the OPEN APP button HTML so we can target it precisely.')


# ── TASK 2: COPY SAMPLE HEALTH SYSTEM SLIDES INTO GHS-PRESENTATION ───────────────────

PRESENTATION_FILE = REPO / 'html/ghs-presentation/index.html'

# Candidate source files for Sample Health System slides (in priority order)
SAMPLE_HEALTH_SYSTEM_CANDIDATES = [
    REPO / 'html/samplehealthsystem/index.html',
    REPO / 'html/samplehealthsystem/healthcare-command-center.html',
    REPO / 'samplehealthsystem-dee.html',
    REPO / 'html/sample-health-system-b/healthcare-command-center.html',  # fallback — similar structure
]

# Slide container selectors (tries each until one finds slides)
SLIDE_SELECTORS = [
    {'class': re.compile(r'slide', re.I)},
    {'class': re.compile(r'section', re.I)},
    {'data-slide': True},
]

SLIDE_INSERT_MARKER = re.compile(
    r'(<!--\s*END\s*SLIDES?\s*-->|</(?:section|div)[^>]*slides?[^>]*>)',
    re.I
)


def find_samplehealthsystem_source():
    for candidate in SAMPLE_HEALTH_SYSTEM_CANDIDATES:
        if candidate.exists():
            print(f'  [SOURCE] {candidate.relative_to(REPO)}')
            return candidate
    return None


def copy_slides():
    if not PRESENTATION_FILE.exists():
        print(f'[SKIP] {PRESENTATION_FILE} not found')
        return

    src = find_samplehealthsystem_source()
    if not src:
        print('[SKIP] No Sample Health System source file found. Checked:')
        for c in SAMPLE_HEALTH_SYSTEM_CANDIDATES:
            print(f'  {c}')
        print('\nTip: run with --list-html to see all HTML files in the repo.')
        return

    src_text = src.read_text(encoding='utf-8', errors='replace')
    src_soup = BeautifulSoup(src_text, 'html.parser')

    # Find slides in source
    slides = []
    for selector in SLIDE_SELECTORS:
        slides = src_soup.find_all(True, selector)
        if len(slides) > 1:
            print(f'  [SLIDES] Found {len(slides)} slide elements in source')
            break

    if not slides:
        # Fallback: grab all top-level section/article tags
        slides = src_soup.find_all(['section', 'article'])
        if slides:
            print(f'  [SLIDES] Found {len(slides)} section/article elements')

    if not slides:
        print('  [NOTE] Could not identify slide elements automatically.')
        print('  Share the source HTML structure and I will target it precisely.')
        return

    # Insert slides into presentation
    dest_text = PRESENTATION_FILE.read_text(encoding='utf-8', errors='replace')
    slides_html = '\n\n'.join(str(s) for s in slides)
    slides_block = f'\n\n<!-- ═══ SAMPLE HEALTH SYSTEM SLIDES (auto-imported) ═══ -->\n{slides_html}\n<!-- ═══ END SAMPLE HEALTH SYSTEM SLIDES ═══ -->\n\n'

    # Try to insert before closing body or after last slide
    if '</body>' in dest_text:
        dest_text = dest_text.replace('</body>', slides_block + '</body>', 1)
        inserted = True
    else:
        dest_text += slides_block
        inserted = True

    if inserted:
        backup(PRESENTATION_FILE)
        PRESENTATION_FILE.write_text(dest_text, encoding='utf-8')
        print(f'  [SAVED] {len(slides)} slide(s) added to ghs-presentation/index.html')


# ── UTILITY ──────────────────────────────────────────────────────────────────

def dump_ghs_open_app():
    """Print the raw HTML around OPEN APP buttons for manual targeting."""
    if not GHS_INDEX.exists():
        print('File not found'); return
    text = GHS_INDEX.read_text()
    for m in re.finditer(r'.{0,300}OPEN\s*APP.{0,300}', text, re.DOTALL | re.IGNORECASE):
        print('─' * 60)
        print(m.group())

def list_html():
    for f in sorted(REPO.rglob('*.html')):
        if 'groq' not in f.name and '.bak' not in f.name:
            print(f.relative_to(REPO))


# ── MAIN ──────────────────────────────────────────────────────────────────────

import sys

if __name__ == '__main__':
    if '--dump-ghs' in sys.argv:
        dump_ghs_open_app()
    elif '--list-html' in sys.argv:
        list_html()
    else:
        print('\n══ TASK 1: Wire HC node OPEN APP links ══')
        patch_node_links()

        print('\n══ TASK 2: Copy Sample Health System slides → GHS Presentation ══')
        copy_slides()

        print('\n══ DONE ══')
        print('git add -A && git commit -m "feat: wire node links + merge samplehealthsystem slides"')
        print('fly deploy')
