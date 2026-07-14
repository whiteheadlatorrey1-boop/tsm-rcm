#!/usr/bin/env bash
# fix-replay-infinite-loop.sh
#
# Fixes the ACTUAL root cause of the "Page crashed" failure on
# bpo-strategist-v2.html (previously misattributed to /dev/shm sizing —
# that theory was tested and disproven; see PR discussion).
#
# Root cause (confirmed via trace.zip network/console capture + source
# inspection): html/js/core/tsm-kernel-upgrade.js patches TSMEventBus.emit
# so every emitted event is also logged to a TSMReplayEngine cache, which
# is persisted to localStorage on every single log() call. On page load,
# TSMReplayEngine.replay() iterates that cache via `for (const e of events)`
# where `events` was a LIVE REFERENCE to the same array being mutated
# (`const events = this._cache`, not a copy). Replaying a MISSION_UPDATED
# event calls bus.emit() again, which is the patched emit, which appends a
# new event to that same array — which the still-running for...of loop
# then also picks up and processes, forever. Each iteration also does a
# full JSON.stringify + localStorage.setItem on an ever-growing array, so
# it's not just an infinite loop but one that gets slower and more
# memory-hungry every cycle — matching the observed ~14s runway before the
# tab died with no thrown error and no console output.
#
# This is a platform-wide bug, not BPO-specific or test-specific: the file
# is loaded by 264 pages across every vertical (confirmed via repo-wide
# grep). Any real user session that accumulates a MISSION_UPDATED event in
# localStorage and then loads a page that calls .replay() would hit the
# same crash in production, not just in CI.
#
# Fix: (1) guard log() so replay never generates new history while
# replaying, and (2) snapshot the events array before iterating, as
# defense in depth regardless of (1).
#
# NOT touched: two other physical copies of this file (repo root
# tsm-kernel-upgrade.js, html/tsm-insurance/js/tsm-kernel-upgrade.js) are
# confirmed orphaned — no page on disk references them — left alone to
# avoid unnecessary scope. Also not touched: html/legal-pro/legal-compliance.html
# and legal-scenarios.html reference a relative ./tsm-kernel-upgrade.js that
# doesn't exist at that path — a separate, pre-existing 404 unrelated to
# this bug (likely part of the known legal-pro issue #160 cleanup).
#
# Usage:
#   bash fix-replay-infinite-loop.sh
#
# Run this from the repo root (/workspaces/TSM-Consultz-).

set -euo pipefail

TARGET="html/js/core/tsm-kernel-upgrade.js"

if [ ! -f "$TARGET" ]; then
  echo "ERROR: $TARGET not found." >&2
  echo "Run this script from the repo root (/workspaces/TSM-Consultz-)." >&2
  exit 1
fi

echo "== Backing up $TARGET =="
cp "$TARGET" "$TARGET.bak"
echo "  backup written as $TARGET.bak"

echo "== Applying fix =="
if grep -q "_replaying" "$TARGET"; then
  echo "  already present — skipping"
else
  python3 - <<'PYEOF'
path = "html/js/core/tsm-kernel-upgrade.js"
with open(path, "r") as f:
    content = f.read()

old = '''    constructor() {
      this.key = "TSM_EVENT_LOG_V2";
      this._cache = this.load();
    }

    load() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || [];
      } catch {
        return [];
      }
    }

    save() {
      localStorage.setItem(this.key, JSON.stringify(this._cache));
    }

    log(event) {
      this._cache.push(event);
      this.save();
    }

    replay(store, bus) {

      console.log("[TSM-REPLAY] Rebuilding system from event log...");

      const events = this._cache;

      if (!store || !bus) {
        console.warn("[TSM-REPLAY] Missing store or bus");
        return;
      }

      // reset state
      store.state.missions = [];
      store.state.history = [];

      for (const e of events) {
        this.apply(e, store, bus);
      }

      store.save();

      console.log("[TSM-REPLAY] Replay complete:", events.length, "events");
    }'''

new = '''    constructor() {
      this.key = "TSM_EVENT_LOG_V2";
      this._cache = this.load();
      this._replaying = false;
    }

    load() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || [];
      } catch {
        return [];
      }
    }

    save() {
      localStorage.setItem(this.key, JSON.stringify(this._cache));
    }

    log(event) {
      // Replaying history must never generate new history. Without this
      // guard, apply()'s MISSION_UPDATED case calls bus.emit() again, the
      // patched emit logs it here, and that new entry is picked up by the
      // still-running replay() loop below (for...of is live over arrays) —
      // an infinite, ever-growing loop that pegs the main thread and
      // eventually crashes the tab.
      if (this._replaying) return;
      this._cache.push(event);
      this.save();
    }

    replay(store, bus) {

      console.log("[TSM-REPLAY] Rebuilding system from event log...");

      // Snapshot, not a live reference — defensive even with the log()
      // guard above, so this loop always has a fixed length.
      const events = [...this._cache];

      if (!store || !bus) {
        console.warn("[TSM-REPLAY] Missing store or bus");
        return;
      }

      // reset state
      store.state.missions = [];
      store.state.history = [];

      this._replaying = true;
      try {
        for (const e of events) {
          this.apply(e, store, bus);
        }
      } finally {
        this._replaying = false;
      }

      store.save();

      console.log("[TSM-REPLAY] Replay complete:", events.length, "events");
    }'''

if old not in content:
    raise SystemExit("Expected block not found — file may have changed. Aborting without writing.")

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("  applied")
PYEOF
fi

echo
echo "== Syntax check =="
node -c "$TARGET" && echo "  OK"

echo
echo "== Done =="
echo "Review the diff with:"
echo "  git diff $TARGET"
echo
echo "Suggested commit flow (own branch — this is a platform bug fix, unrelated"
echo "to the Playwright devshm change, keep them separate):"
echo "  git checkout main"
echo "  git pull origin main"
echo "  git checkout -b fix/replay-engine-infinite-loop"
echo "  git add $TARGET"
echo "  git commit -m 'Fix infinite loop in TSMReplayEngine.replay() during event replay'"
echo "  git push -u origin fix/replay-engine-infinite-loop"
echo
echo "  cat > /tmp/pr-body-replay.txt << 'EOF'"
echo "Fixes a platform-wide infinite loop in TSMReplayEngine (html/js/core/"
echo "tsm-kernel-upgrade.js), loaded by 264 pages across every vertical."
echo
echo "Root cause: bus.emit is patched so every emitted event is logged to"
echo "TSMReplayEngine's cache and persisted to localStorage. replay() iterated"
echo "that cache via a live array reference (const events = this._cache, not"
echo "a copy). Replaying a MISSION_UPDATED event re-emits it, the patched emit"
echo "logs a new entry onto the same array, and the still-running for...of"
echo "loop picks that up too -- an infinite, ever-growing loop, each iteration"
echo "also doing a full JSON.stringify + localStorage.setItem. This crashed"
echo "the tab after ~14s with no thrown error, which is what surfaced as an"
echo "unexplained Playwright \"Page crashed\" failure on bpo-strategist-v2.html"
echo "-- confirmed via trace.zip network/console capture, not a /dev/shm sizing"
echo "issue as originally suspected."
echo
echo "This is a real production risk, not just a test artifact: any user"
echo "session that accumulates a MISSION_UPDATED event in localStorage and"
echo "then loads a page that calls .replay() would hit the same crash."
echo
echo "Fix: guard log() so replay never generates new history while replaying,"
echo "and snapshot the events array before iterating as defense in depth."
echo
echo "Not touched: two orphaned duplicate copies of this file (repo root,"
echo "html/tsm-insurance/js/) are unreferenced by any page and left alone."
echo "html/legal-pro/legal-compliance.html and legal-scenarios.html reference"
echo "a relative ./tsm-kernel-upgrade.js that doesn't exist at that path --"
echo "a separate, pre-existing 404 unrelated to this bug."
echo "EOF"
echo
echo "  gh pr create --base main --title 'Fix infinite loop in TSMReplayEngine.replay()' --body-file /tmp/pr-body-replay.txt"
echo
echo "Once confirmed, delete the backup:"
echo "  rm $TARGET.bak"