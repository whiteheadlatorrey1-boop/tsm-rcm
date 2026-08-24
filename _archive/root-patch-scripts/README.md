# Archived root patch scripts — presentation-hub.html

These 14 scripts lived at the repo root and were one-off, already-applied
patches to `presentation-hub.html` / `html/demo/presentation-hub.html`
(deck counts, PM Copilot card insertion, HotelOps slide renames, preview
thumbnails, etc.). Each is a run-once Codespaces script with no ongoing
role — the changes they made are already committed in the target HTML
files, and none of the 14 is referenced anywhere else in the codebase
(no `require`/`source`/exec reference, no CI workflow, no npm script).

Archived rather than deleted so the exact commands used for each historical
fix stay recoverable. Moved 2026-08-24, `git mv` (full history preserved —
`git log --follow <path>` on any file here still shows its original history
at the repo root).

| File | Last touched | Target |
|---|---|---|
| add_career_deck.py | 2026-08-10 | presentation-hub.html |
| add_modal_home_button.sh | 2026-08-23 | presentation-hub.html |
| add_pm_copilot.sh | 2026-08-23 | html/demo/presentation-hub.html |
| apply_hotelops_fix_and_rcmos_slides.sh | 2026-08-23 | html/demo/presentation-hub.html |
| apply_pitch_deck_thumbnails.sh | 2026-08-23 | presentation-hub.html |
| fix_all.sh | 2026-08-23 | demo/hotelops-demo.json + preview-slides |
| fix_apply_hub_updates_source.sh | 2026-08-23 | html/demo/presentation-hub.html |
| fix_career_training_deck.py | 2026-08-10 | presentation-hub.html |
| fix_presentation_hub.sh | 2026-08-23 | html/demo/presentation-hub.html |
| fix_presentation_paths.py | 2026-08-10 | presentation-hub.html |
| fix_preview_slides.sh | 2026-08-23 | html/demo/preview-slides |
| fix_slide_counts.sh | 2026-08-23 | presentation-hub.html data-slides counts |
| insert_pm_copilot_card.sh | 2026-08-23 | html/demo/presentation-hub.html |
| rename_hotelops_slides.sh | 2026-08-23 | html/demo/preview-slides/hotelops |

Note: `presentation-hub.html` (repo root) and `html/demo/presentation-hub.html`
are two separate files, not duplicates — the `html/demo/` copy is the actively
maintained one (recent "Apply hub updates" PR chain, #96-#101); the root copy
has been comparatively static since "Fix hotelops-demo slide count..." Not
touched in this pass since only the scripts were in scope, not the target
files themselves.
