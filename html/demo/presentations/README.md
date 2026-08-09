# TSM Demo Presentations

One interactive live-demo deck + one leave-behind PPTX per vertical, built from
the same narrative data. Both use the real screenshots your Playwright specs
already capture in `tests/e2e/demo/screenshots/<vertical>/`.

## What's here

```
demo/presentations/
  data/<vertical>.json          17 narrative data files (talk track, wow flags, captions)
  assets/style.css               shared dark-terminal styling
  assets/engine.js                shared click/arrow-key navigation engine
  <vertical>-presentation.html   17 interactive live-demo decks (open directly, no build step)
  generate_pptx.py               builds the leave-behind .pptx decks from real screenshots
  pptx/<vertical>-leave-behind.pptx   generated output (gitignored — regenerate locally)
```

## 1. Live-demo mode (interactive HTML) — use this in the room

No install, no server required (unless your browser blocks `file://` images —
see below). Just open a vertical's file:

```bash
# from Codespaces, easiest: right-click the file in the Explorer -> "Open with Live Server"
# or serve the repo root so relative image paths resolve:
cd /workspaces/tsm-rcm
python3 -m http.server 8080
# then open http://localhost:8080/demo/presentations/schools-presentation.html
```

**Navigation:** click anywhere on the screenshot, press → / space to advance,
← to go back, or click any dot in the footer to jump to a step. Steps marked
with a gold dot and "✨ WOW MOMENT" badge are the moments to slow down on —
the talk track for those is written to land the point, not just narrate the click.

If a screenshot hasn't been captured yet for a given vertical, that slide shows
which Playwright spec to run instead of a broken image — nothing looks broken
mid-demo, it just tells you what to fix.

**Missing verticals:** every vertical with a `demo/<vertical>-demo.json` story
file has a presentation here (17 total). `l1-platform` has an mp4 in your
screenshots folder but no story JSON yet, so it isn't included — say the word
and I'll build its story + presentation next.

## 2. Leave-behind PPTX — the file you email after the meeting

This has to run in Codespaces (or anywhere with the real screenshots on disk),
since the images get embedded into the file, not linked:

```bash
cd /workspaces/tsm-rcm
pip install python-pptx --break-system-packages   # once, if not already installed
python3 demo/presentations/generate_pptx.py                # builds all 17
python3 demo/presentations/generate_pptx.py schools finops  # or just specific ones
```

Output lands in `demo/presentations/pptx/<vertical>-leave-behind.pptx`. Each deck:
- Title slide with the pain point framed up front
- One slide per step: full screenshot, "wow moment" badge where earned, and
  the talk track both on-slide and in the **speaker notes** (so you can present
  from the deck without cue cards)
- Closing CTA slide

**If a screenshot is missing**, that slide gets a labeled placeholder instead of
crashing the build — rerun the matching spec and regenerate:

```bash
npm run test:e2e -- <vertical>-demo
python3 demo/presentations/generate_pptx.py <vertical>
```

## Editing the narrative

Talk track, captions, and wow flags all live in `demo/presentations/data/<vertical>.json`
— edit directly, or edit `build_data.py`/`build_html.py` and rerun them if you
want to regenerate from source:

```bash
cd demo/presentations
python3 build_data.py    # regenerates data/*.json
python3 build_html.py    # regenerates <vertical>-presentation.html from data/*.json
```

Editing a `data/*.json` file directly does **not** require rerunning `build_html.py`
for the interactive decks — wait, it does, since the JSON is embedded inline in
each HTML file at generation time. Rerun `build_html.py` after any `data/*.json`
edit to pick it up. The PPTX generator reads `data/*.json` directly at run time,
so no rebuild step is needed there.

## Recommended demo flow

1. Open the vertical's `-presentation.html` in a second monitor or projector.
2. Walk it live, step by step, narrating from the talk-track panel.
3. Slow down hard on every gold "wow moment" step — that's the point in the
   flow designed to answer the "so what" a skeptical buyer is thinking.
4. Land on the closing CTA slide.
5. Email the matching `-leave-behind.pptx` the same day, while it's fresh.
