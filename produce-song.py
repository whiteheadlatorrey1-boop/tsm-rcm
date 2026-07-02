#!/usr/bin/env python3
"""
TSM Music Command — Song Producer Script
Produces a complete song from seed lyrics via Groq API
Run from /workspaces/tsm-shell:  python3 produce-song.py
"""
import os, json, textwrap
from pathlib import Path

try:
    import requests
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests', '-q'])
    import requests

# ── LOAD KEY ─────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()
KEY = os.environ.get('GROQ_API_KEY', '')
if not KEY or len(KEY) < 10:
    print('✗ No GROQ_API_KEY found. Set it with: fly secrets set GROQ_API_KEY=gsk_...')
    exit(1)

MODEL  = os.environ.get('TSM_MODEL', 'openai/gpt-oss-120b')
URL    = 'https://api.groq.com/openai/v1/chat/completions'
HEADERS = {'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

SEED_LYRICS = """Grindin' n Slavin' while Misbavin'!
Feelin' so Fresh n So Clean even Missed on Shavin'!
Some look at the Hustle! n Cant Stand the Struggle,
Those Real in the Field see A Time for Muscle!
I Plan for Greatest! Rule 1: No Fakeness!
Real is What You FEEL! That's Pill! So Take This!"""

def groq(system, user, max_tokens=1200):
    r = requests.post(URL, headers=HEADERS, json={
        'model': MODEL,
        'max_tokens': max_tokens,
        'temperature': 0.78,
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user',   'content': user},
        ]
    }, timeout=60)
    d = r.json()
    return d['choices'][0]['message']['content']

def section(title):
    bar = '─' * (56 - len(title))
    print(f'\n┌── {title} {bar}')

def out(text):
    for line in text.strip().splitlines():
        print(f'│  {line}')

# ── SYSTEM PERSONA ────────────────────────────────────────────────
PRODUCER_SYS = """You are ZAY, an elite Hip-Hop producer and songwriter for TSM Music Command.
You create authentic, hard-hitting Hip-Hop/motivational music with sharp wordplay, internal rhymes, vivid imagery, and real street/hustle credibility.
Every line must feel lived-in and intentional. No filler. No generic bars.
Format output cleanly with section labels in [BRACKETS]."""

print('═' * 60)
print('  TSM MUSIC COMMAND · ZAY PRODUCER ENGINE')
print('  Producing: "Real Is What You Feel"')
print('═' * 60)
print()
print('SEED LYRICS:')
for line in SEED_LYRICS.strip().splitlines():
    print(f'  {line}')

# ── STEP 1: ANALYZE & TITLE ───────────────────────────────────────
section('STEP 1 · ANALYZING SEED LYRICS')
print('│  Running concept analysis…')

analysis = groq(PRODUCER_SYS, f"""Analyze these seed lyrics and return:
1. TITLE: A hard-hitting song title (3-5 words max)
2. THEME: 2-sentence theme summary
3. GENRE: Specific sub-genre (e.g. Motivational Trap, Street Gospel, Hustler Anthem)
4. BPM: Suggested BPM range
5. KEY: Musical key
6. VIBE: 3 production words (e.g. "Gritty · Triumphant · Raw")
7. HOOK DIRECTION: What the hook should feel/say

Seed lyrics:
{SEED_LYRICS}

Return ONLY the numbered list, nothing else.""", 400)

out(analysis)

# Parse title from analysis
title_line = [l for l in analysis.splitlines() if '1.' in l or 'TITLE' in l.upper()]
song_title = title_line[0].split(':', 1)[-1].strip().strip('"') if title_line else 'Real Is What You Feel'

# ── STEP 2: GENERATE HOOK ─────────────────────────────────────────
section('STEP 2 · GENERATING HOOK')
print('│  Building the hook…')

hook_raw = groq(PRODUCER_SYS, f"""Write the HOOK for this song. 8 bars total (4 + repeat/variation).
Must be catchy, anthemic, and tie into the theme of grinding, authenticity, hustle, and being real.
Reference the energy of: "Real is What You FEEL" — that's the anchor line.
Include ad-libs in (parentheses) naturally placed.

Seed lyrics for context:
{SEED_LYRICS}

Format:
[HOOK]
(all 8 bars)
[END HOOK]""", 400)

out(hook_raw)
hook_text = hook_raw

# ── STEP 3: BUILD FULL SONG ───────────────────────────────────────
section('STEP 3 · WRITING FULL SONG')
print('│  ZAY is writing the complete song…')

full_song = groq(PRODUCER_SYS, f"""Write a COMPLETE Hip-Hop song using these exact seed lyrics as VERSE 1.
DO NOT change the seed lyrics — use them verbatim as [VERSE 1].
Build everything around them.

SONG TITLE: {song_title}

SEED LYRICS (use as VERSE 1 verbatim):
{SEED_LYRICS}

HOOK (use exactly as written):
{hook_raw}

Write:
[INTRO] - 4-8 bars setting the scene, atmospheric, builds anticipation
[VERSE 1] - USE SEED LYRICS VERBATIM
[PRE-HOOK] - 4 bars building to the hook
[HOOK] - USE THE HOOK PROVIDED
[VERSE 2] - 16 NEW bars, same energy, deeper story — talk about sacrifice, doubters proving wrong, the journey
[PRE-HOOK]
[HOOK]
[BRIDGE] - 8 bars, reflective, spiritual, ties it all together — the WHY behind the grind
[OUTRO/HOOK] - final hook variation, triumphant close

Add ad-libs in (parentheses) throughout — hype words, emotional reactions, producer tags.
Keep it raw, real, and earned. Every bar should feel like it cost something.""", 1400)

out(full_song)

# ── STEP 4: AD-LIB LAYER ─────────────────────────────────────────
section('STEP 4 · AD-LIB PRODUCTION LAYER')
print('│  Adding production ad-libs and delivery notes…')

adlib_layer = groq(PRODUCER_SYS, f"""Take this song and add a PRODUCTION & DELIVERY GUIDE layered on top.
For each section add:
- DELIVERY: How to perform it (energy level, tone, pace)
- KEY AD-LIBS: Additional ad-libs not already in the lyrics
- PRODUCER NOTE: What the beat should do at this moment

Song:
{full_song[:1500]}

Return as a compact guide:
SECTION NAME | DELIVERY | KEY AD-LIBS | BEAT NOTE""", 600)

out(adlib_layer)

# ── STEP 5: RELEASE STRATEGY ──────────────────────────────────────
section('STEP 5 · RELEASE STRATEGY')
print('│  Building release plan…')

strategy = groq(PRODUCER_SYS, f"""Create a release strategy for:
Title: {song_title}
Genre: Motivational Hip-Hop / Hustler Anthem
Theme: Grind, authenticity, real over fake, muscle through struggle

Return:
1. RELEASE DATE STRATEGY (when to drop and why)
2. DSP PRIORITY (Spotify, Apple Music, TIDAL — which playlists to target)
3. SOCIAL ROLLOUT (TikTok, IG Reels, Twitter — content angles)
4. SYNC OPPORTUNITIES (ads, film, TV genres this fits)
5. VISUAL CONCEPT (music video concept in 2 sentences)
6. TARGET AUDIENCE (who this hits hardest)
7. FIRST 30 DAYS PLAN (weekly action items)""", 700)

out(strategy)

# ── STEP 6: SAVE OUTPUT ───────────────────────────────────────────
section('STEP 6 · SAVING SONG PACKAGE')

safe_title = song_title.replace(' ', '-').replace('/', '-').lower()
output_dir = Path('/workspaces/tsm-shell/html/music-command/songs')
output_dir.mkdir(exist_ok=True)
output_file = output_dir / f'{safe_title}.txt'

package = f"""TSM MUSIC COMMAND · ZAY PRODUCER ENGINE
Song Package — Generated {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}
{'='*60}

TITLE: {song_title}

SEED LYRICS (VERSE 1 — verbatim):
{SEED_LYRICS}

{'='*60}
ANALYSIS:
{analysis}

{'='*60}
FULL SONG:
{full_song}

{'='*60}
PRODUCTION & AD-LIB GUIDE:
{adlib_layer}

{'='*60}
RELEASE STRATEGY:
{strategy}

{'='*60}
TSM Music Command · tsm-shell.fly.dev/music
"""

output_file.write_text(package)
print(f'│  ✔ Saved to: {output_file}')

# Also save JSON for the web app to pick up
json_file = output_dir / f'{safe_title}.json'
json_file.write_text(json.dumps({
    'title': song_title,
    'seed': SEED_LYRICS,
    'hook': hook_text,
    'full_song': full_song,
    'adlib_guide': adlib_layer,
    'strategy': strategy,
    'analysis': analysis,
    'generated': __import__('datetime').datetime.now().isoformat(),
}, indent=2))
print(f'│  ✔ JSON saved: {json_file}')

print()
print('═' * 60)
print(f'  ✔ SONG PACKAGE COMPLETE: {song_title}')
print(f'  Files in: html/music-command/songs/')
print('═' * 60)
