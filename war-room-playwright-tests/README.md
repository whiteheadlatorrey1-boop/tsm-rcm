# TSM War Room — Playwright Test Suite

Covers every chain listed in `war-room-prep.html`: 7 sector war rooms, 10
enterprise phase war rooms, the two Honeywell BPO scenarios, the doc-search
"upload" entry point, and a regression suite for the checklist page itself.

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

## Running against your live TSM instance

```bash
BASE_URL=https://your-tsm-host.example.com npm test
```

`BASE_URL` defaults to `http://localhost:8080` (see `playwright.config.js`).

## Running just the checklist regression suite (no live server needed)

```bash
npm run test:checklist
```

This points at `war-room-prep__2__patched.html` by default (one directory
up from this project). Override with `CHECKLIST_PATH=file:///abs/path.html`.

## Files

| File | Covers |
|---|---|
| `tests/demo-chains.spec.js` | All 7 sector + 10 phase war-room → strategist → executive-portal chains |
| `tests/entry-point.spec.js` | The `launchDocSearch()` bridge / doc-search "upload" entry point for every sector |
| `tests/honeywell.spec.js` | BPO checklist steps 11–12: Supplier Shutdown, Plant Incident Command Center, Cyber Incident War Room |
| `tests/checklist.spec.js` | Regression test proving the `STEPS` off-by-one fix in `war-room-prep.html` |
| `tests/helpers.js` | Shared navigation/paste/escalate helpers |

## Important caveats — read before trusting a green run

1. **Selectors are best-effort, not verified against live DOM.** I only had
   `war-room-prep.html` (the QA checklist) to work from — not the actual
   `hc-denial-war-room.html`, `bpo-war-room.html`, etc. Button/tab text
   (`"Escalate"`, `"Run all engines"`, `"Plant Incident Command Center"`)
   was pulled from the checklist's own descriptions. If the real pages use
   different copy or `data-testid`s, swap the locators in `helpers.js` and
   `honeywell.spec.js` accordingly — that's the highest-value first pass
   once you run this against the real site.
2. **This sandbox has no network access**, so these specs could only be
   syntax-checked (`node --check`), not executed against a live TSM
   instance or a real Chromium install. Run `npm test` yourself before
   trusting results.
3. **`tests/checklist.spec.js` is the one suite I could reason about with
   full confidence**, since I have the actual source for
   `war-room-prep__2__patched.html` and its exact element IDs/behavior.
4. Where a locator can't find its target, tests log a `note` annotation
   instead of hard-failing immediately, so one missing selector doesn't
   mask everything else that *does* work. Tighten these to hard assertions
   once you've confirmed real selectors.
