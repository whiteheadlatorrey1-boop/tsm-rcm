# Demo capture and certification

Seven flagship experiences are registered in `demo-readiness.json`. Each has a Playwright spec that captures per-state frames, a manifest that drives the video render, and the rendered outputs.

## Status

All seven use `engineOutput: "scripted"`: engine responses are canned via `tests/e2e/helpers/stub-war-room.js`, not live model output. `visualReview` must be set to `true` only after a human has looked at the frames. Until then none of them are presentation-ready.

| id | spec | manifest |
|---|---|---|
| aerospace | `tests/e2e/aerospace-flagship.spec.js` | `manifests/aerospace.json` |
| detection | `tests/e2e/detection-flagship.spec.js` | `manifests/detection.json` |
| bess | `tests/e2e/bess-flagship.spec.js` | `manifests/bess.json` |
| capital | `tests/e2e/capital-flagship.spec.js` | `manifests/capital.json` |
| cascade | `tests/e2e/cascade-flagship.spec.js` | `manifests/cascade.json` |
| healthcare | `tests/e2e/healthcare-thermal-flagship.spec.js` | `manifests/healthcare.json` |
| lifesciences | `tests/e2e/lifesciences-flagship.spec.js` | `manifests/lifesciences.json` |

`manifests/l1.json` also exists but is not in the readiness registry.

## Regenerate

Run from the repo root.

1. Capture frames (the spec starts its own server):

```bash
   export TSM_SESSION_SECRET="$(openssl rand -hex 32)"
   npx playwright test tests/e2e/<id>-flagship.spec.js --reporter=line
```

   Frames land in `tests/e2e/demo/screenshots/<id>-flagship/`.

2. Render the video:

```bash
   node tests/e2e/demo/render-from-manifest.js <id> flagship [--burn]
```

   Writes `videos/<id>-flagship.mp4`, `.vtt` and a poster `.png`. Fails on a missing frame, an empty caption, consecutive byte-identical frames, or duration drift.

3. Check the registry:

```bash
   node tests/e2e/demo/verify-demo-readiness.js
```

   Prints `ok` or `FAIL` per experience and exits non-zero if any file is missing. `[visual review pending]` means `visualReview` is still `false`.

## Not documented here

- How the `*-flagship-demo.gif` files are built.
- Tiers other than `flagship` (the manifests carry `promoCaption` for them).
- `scripts/demo/demo-certify.sh`, which writes `reports/demo-readiness.txt` (uploaded by `.github/workflows/demo-certify.yml`). Do not commit that report from a local run.

## Certifying an experience

1. Open every frame in `screenshots/<id>-flagship/`.
2. Only if they hold up, set `"visualReview": true` for that id in `demo-readiness.json` and commit.
