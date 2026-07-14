#!/usr/bin/env bash
#
# apply-process-mining-wiring.sh
#
# Applies the #5 Process Mining / MDM wiring changes discussed tonight:
#   1. html/shared/relay.core.js       — add caseId/stage support to write()
#   2. html/war-rooms/mdm/mdm-war-room.html        — generate caseId, pass stage:'war-room'
#   3. html/war-rooms/mdm/mdm-strategist.html      — log stage:'strategist' (deduped)
#   4. html/war-rooms/mdm/mdm-executive-portal.html — log stage:'exec-portal' (deduped)
#
# SAFETY MODEL:
#   - Every file is backed up to *.bak-<timestamp> before editing.
#   - Every edit is an EXACT string match-and-replace. If the anchor string
#     isn't found verbatim in the file (e.g. because the file has drifted
#     since the snippets pasted into chat), that file is SKIPPED and reported
#     — never partially or fuzzily patched.
#   - Run with --dry-run first to see what would change without touching anything.
#   - Run with --check to verify current state (which patches are already
#     applied / already match / are missing) without writing anything.
#
# USAGE:
#   ./apply-process-mining-wiring.sh --dry-run     # show what would happen
#   ./apply-process-mining-wiring.sh                # apply for real
#   ./apply-process-mining-wiring.sh --check         # just report status
#
# Run from the repo root (same place you run `gh pr` / `git` commands from).

set -euo pipefail

DRY_RUN=0
CHECK_ONLY=0
for arg in "${@:-}"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --check) CHECK_ONLY=1 ;;
    "") ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

TS="$(date +%Y%m%d-%H%M%S)"
FAIL=0

REPO_ROOT="$(pwd)"
RELAY_CORE="html/war-rooms/_relay_control_plane/relay.core.js"
WAR_ROOM="html/war-rooms/mdm/mdm-war-room.html"
STRATEGIST="html/war-rooms/mdm/mdm-strategist.html"
EXEC_PORTAL="html/war-rooms/mdm/mdm-executive-portal.html"

for f in "$RELAY_CORE" "$WAR_ROOM" "$STRATEGIST" "$EXEC_PORTAL"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: expected file not found: $f (are you running this from the repo root?)" >&2
    FAIL=1
  fi
done
if [[ "$FAIL" -eq 1 ]]; then
  exit 1
fi

python3_patch() {
  python3 "$@"
}

# ---------------------------------------------------------------------------
# Patch runner: given a file, an "old" anchor (exact, must be unique), and
# "new" replacement text, verify the anchor's occurrence count and apply.
# Modes:
#   apply     -> backup + write
#   dry-run   -> report only, no write
#   check     -> report whether OLD is present (not yet patched), NEW is
#                present (already patched), or neither matches (drifted)
# ---------------------------------------------------------------------------
run_patch() {
  local file="$1" label="$2" old_marker="$3" new_marker="$4" mode="$5"
  python3_patch - "$file" "$old_marker" "$new_marker" "$mode" "$label" "$TS" <<'PYEOF'
import sys, shutil, pathlib

file_path, old_marker_path, new_marker_path, mode, label, ts = sys.argv[1:7]
path = pathlib.Path(file_path)
old = pathlib.Path(old_marker_path).read_text()
new = pathlib.Path(new_marker_path).read_text()

text = path.read_text()
old_count = text.count(old)
new_count = text.count(new)

# NOTE: for some patches the OLD anchor is a strict substring of the NEW
# anchor (we're inserting lines around/after the original code rather than
# replacing it outright), so old_count can stay >0 even after the patch has
# already been applied. "Already applied" must therefore be checked FIRST,
# based on new_count alone, before old_count is used to decide anything else.

if mode == "check":
    if new_count > 0:
        print(f"[ALREADY APPLIED] {label} ({file_path})")
    elif old_count == 1:
        print(f"[PENDING]         {label} ({file_path})")
    elif old_count > 1:
        print(f"[AMBIGUOUS]       {label} ({file_path}) — anchor appears {old_count} times, refusing to guess")
    else:
        print(f"[DRIFTED]         {label} ({file_path}) — anchor not found, file may have changed since this script was written")
    sys.exit(0)

if new_count > 0:
    print(f"[SKIP] {label}: already applied ({file_path})")
    sys.exit(0)

if old_count == 0:
    print(f"[SKIP] {label}: anchor not found — file has drifted, patch NOT applied ({file_path})")
    sys.exit(3)

if old_count > 1:
    print(f"[SKIP] {label}: anchor appears {old_count} times — ambiguous, patch NOT applied ({file_path})")
    sys.exit(3)

patched = text.replace(old, new, 1)

if mode == "dry-run":
    print(f"[DRY-RUN] {label}: would patch {file_path} (anchor matched exactly once)")
    sys.exit(0)

backup_path = path.with_suffix(path.suffix + f".bak-{ts}")
shutil.copy2(path, backup_path)
path.write_text(patched)
print(f"[APPLIED] {label}: {file_path} (backup: {backup_path.name})")
PYEOF
}

mktemp_marker() {
  local content="$1"
  local f
  f="$(mktemp)"
  printf '%s' "$content" > "$f"
  echo "$f"
}

# ---------------------------------------------------------------------------
# 1. relay.core.js — add caseId/stage support
# ---------------------------------------------------------------------------
RELAY_OLD=$(mktemp_marker '  function appendEvent(domain, key, payload) {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]"); } catch (e) { log = []; }
    log.push({ ts: now(), domain, key, id: payload.id || null });
    if (log.length > EVENT_LOG_MAX) log = log.slice(log.length - EVENT_LOG_MAX);
    try { localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log)); } catch (e) {}
  }

  function write(domain, payload) {
    const key = RELAY_REGISTRY[domain];
    if (!key) throw new Error("Unknown relay domain: " + domain);
    if (!payload) throw new Error("Relay payload missing for " + domain);

    payload.timestamp = payload.timestamp || now();
    payload.id = payload.id || Math.random().toString(36).slice(2);

    const json = JSON.stringify(payload);
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
    appendEvent(domain, key, payload);

    try {
      global.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", { detail: { domain, payload } }));
    } catch (e) {}

    return payload;
  }')

RELAY_NEW=$(mktemp_marker '  function appendEvent(domain, caseId, stage) {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]"); } catch (e) { log = []; }
    log.push({ ts: now(), domain, key: stage, id: caseId });
    if (log.length > EVENT_LOG_MAX) log = log.slice(log.length - EVENT_LOG_MAX);
    try { localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log)); } catch (e) {}
  }

  function write(domain, payload, options) {
    const storageKey = RELAY_REGISTRY[domain];
    if (!storageKey) throw new Error("Unknown relay domain: " + domain);
    if (!payload) throw new Error("Relay payload missing for " + domain);

    options = options || {};
    payload.timestamp = payload.timestamp || now();
    payload.id = payload.id || Math.random().toString(36).slice(2);

    const json = JSON.stringify(payload);
    localStorage.setItem(storageKey, json);
    sessionStorage.setItem(storageKey, json);

    // Process-mining event log: real hops only exist if the caller supplies a
    // stable caseId that persists across a case'"'"'s stages, plus a stage label
    // distinct from the domain'"'"'s fixed storage key. Callers that omit options
    // keep today'"'"'s behavior (random id, key=storageKey) — no hops, no change.
    const caseId = options.caseId || payload.id;
    const stage = options.stage || storageKey;
    appendEvent(domain, caseId, stage);

    try {
      global.dispatchEvent(new CustomEvent("TSM_RELAY_EVENT", { detail: { domain, payload } }));
    } catch (e) {}

    return payload;
  }')

# ---------------------------------------------------------------------------
# 2. mdm-war-room.html — generate caseId, pass stage:'war-room'
# ---------------------------------------------------------------------------
WARROOM_OLD=$(mktemp_marker '    try{ TSM.relay.write("MDM",{vertical:'"'"'mdm'"'"',records,duplicates,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('"'"'aiOutput'"'"').textContent,timestamp:new Date().toISOString()}); } catch(e){}')

WARROOM_NEW=$(mktemp_marker '    try{
      const caseId = '"'"'MDM-'"'"' + new Date().toISOString().slice(0,10) + '"'"'-'"'"' + Math.random().toString(36).slice(2,8);
      TSM.relay.write("MDM",{vertical:'"'"'mdm'"'"',records,duplicates,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('"'"'aiOutput'"'"').textContent,timestamp:new Date().toISOString(),caseId},{caseId, stage:'"'"'war-room'"'"'});
    } catch(e){}')

# ---------------------------------------------------------------------------
# 3. mdm-strategist.html — log stage:'strategist' with dedupe guard
# ---------------------------------------------------------------------------
STRAT_OLD=$(mktemp_marker '  let relay = null;

  function loadRelay(){
    relay = (window.TSMAutoPipeline && window.TSMAutoPipeline.readRelay)
      ? window.TSMAutoPipeline.readRelay('"'"'mdm'"'"')
      : null;
    if(!relay){
      // Fallback read in case auto-pipeline hasn'"'"'t attached yet
      try{
        const raw = sessionStorage.getItem('"'"'TSM_MDM_RELAY'"'"') || localStorage.getItem('"'"'TSM_MDM_RELAY'"'"');
        relay = raw ? JSON.parse(raw) : null;
      }catch(e){ relay = null; }
    }
    render();
  }')

STRAT_NEW=$(mktemp_marker '  let relay = null;
  let lastLoggedCaseId = null;

  function loadRelay(){
    relay = (window.TSMAutoPipeline && window.TSMAutoPipeline.readRelay)
      ? window.TSMAutoPipeline.readRelay('"'"'mdm'"'"')
      : null;
    if(!relay){
      // Fallback read in case auto-pipeline hasn'"'"'t attached yet
      try{
        const raw = sessionStorage.getItem('"'"'TSM_MDM_RELAY'"'"') || localStorage.getItem('"'"'TSM_MDM_RELAY'"'"');
        relay = raw ? JSON.parse(raw) : null;
      }catch(e){ relay = null; }
    }
    if(relay && relay.caseId && relay.caseId !== lastLoggedCaseId){
      try{ TSM.relay.write("MDM", relay, {caseId: relay.caseId, stage:'"'"'strategist'"'"'}); }catch(e){}
      lastLoggedCaseId = relay.caseId;
    }
    render();
  }')

# ---------------------------------------------------------------------------
# 4. mdm-executive-portal.html — log stage:'exec-portal' with dedupe guard
# ---------------------------------------------------------------------------
EXEC_OLD=$(mktemp_marker '    if(window.TSM && window.TSM.relay && window.TSM.relay.read){
      const d = window.TSM.relay.read(CFG.domain);')

EXEC_NEW=$(mktemp_marker '    if(window.TSM && window.TSM.relay && window.TSM.relay.read){
      const d = window.TSM.relay.read(CFG.domain);
      if(d && d.caseId && d.caseId !== (window.__mdmLastLoggedCaseId || null)){
        try{ TSM.relay.write("MDM", d, {caseId: d.caseId, stage:'"'"'exec-portal'"'"'}); }catch(e){}
        window.__mdmLastLoggedCaseId = d.caseId;
      }')

MODE="apply"
if [[ "$CHECK_ONLY" -eq 1 ]]; then
  MODE="check"
elif [[ "$DRY_RUN" -eq 1 ]]; then
  MODE="dry-run"
fi

echo "== Process Mining / MDM wiring patch — mode: $MODE =="
echo

STATUS=0
run_patch "$RELAY_CORE"  "relay.core.js: caseId/stage support"        "$RELAY_OLD"    "$RELAY_NEW"    "$MODE" || STATUS=$?
run_patch "$WAR_ROOM"    "mdm-war-room.html: caseId + stage:war-room"  "$WARROOM_OLD"  "$WARROOM_NEW"  "$MODE" || STATUS=$?
run_patch "$STRATEGIST"  "mdm-strategist.html: stage:strategist"       "$STRAT_OLD"    "$STRAT_NEW"    "$MODE" || STATUS=$?
run_patch "$EXEC_PORTAL" "mdm-executive-portal.html: stage:exec-portal" "$EXEC_OLD"    "$EXEC_NEW"     "$MODE" || STATUS=$?

echo
if [[ "$MODE" == "apply" ]]; then
  if [[ "$STATUS" -eq 0 ]]; then
    echo "All patches applied (or already present). Review with:"
    echo "  git diff -- $RELAY_CORE $WAR_ROOM $STRATEGIST $EXEC_PORTAL"
    echo
    echo "Backups written alongside each changed file as *.bak-$TS"
    echo "If everything looks right:"
    echo "  git add $RELAY_CORE $WAR_ROOM $STRATEGIST $EXEC_PORTAL"
    echo "  git commit -m 'feat: wire MDM war-room/strategist/exec-portal into Process Mining event log (#5)'"
  else
    echo "One or more files were SKIPPED because their content has drifted from what"
    echo "this script expects (anchor text not found or ambiguous). No partial edits"
    echo "were made to those files. Re-paste the current content of the skipped"
    echo "file(s) so the anchors can be updated, or hand-apply just those diffs."
  fi
else
  echo "No files were modified ($MODE mode). Re-run without flags to apply for real."
fi

exit 0