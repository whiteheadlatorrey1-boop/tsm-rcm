#!/usr/bin/env bash
set -euo pipefail

# ── TSM Consultz: RE War Room → Strategist → Executive Portal ──────────────
# End-to-end server-side test for a distressed REO disposition scenario.
#
# Synthetic scenario: 14-unit multi-family REO asset, Phoenix MSA.
# Hits /api/re/query three times in the same shape the browser relay does:
#   1. War Room    → generateSituationPack()-style call
#   2. Strategist  → runFullBrief()-style call (mode: payer → disposition)
#   3. Exec Portal → runStratEngine()-style call (mode: board)
#
# Usage:
#   ./test-re-war-room-chain.sh [base_url]
#   (defaults to https://app.tsmatter.com)

BASE_URL="${1:-https://app.tsmatter.com}"
ENDPOINT="$BASE_URL/api/re/query"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

post_json() {
  local body_file="$1"
  local out_file="$2"
  local attempts=0
  local max_attempts=3

  while [ "$attempts" -lt "$max_attempts" ]; do
    attempts=$((attempts+1))
    echo "  Attempt $attempts/$max_attempts (90s timeout)..."
    if curl -sS --max-time 90 -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        --data-binary "@$body_file" -o "$out_file"; then
      if [ -s "$out_file" ]; then
        return 0
      fi
    fi
    echo "  Empty/failed response, retrying in 3s..."
    sleep 3
  done
  echo "FAIL: no usable response from $ENDPOINT after $max_attempts attempts." >&2
  return 1
}

extract_output() {
  python3 - "$1" <<'PYEOF'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    raw = fh.read()
try:
    d = json.loads(raw)
except Exception as e:
    print(f"[PARSE ERROR: {e}]", file=sys.stderr)
    sys.exit(1)
if d.get("error"):
    print(f"[SERVER ERROR: {d['error']}]", file=sys.stderr)
    sys.exit(1)
out = d.get("output") or d.get("answer") or d.get("reply") or ""
print(out)
PYEOF
}

# ── Synthetic REO scenario ─────────────────────────────────────────────────
# 14-unit multi-family in Phoenix MSA, bank-owned post-foreclosure.
# Mirrors the kind of distressed asset the RE Pro War Room is designed for.
RE_WAR_ROOM_BRIEF="TSM RE Pro War Room — Distressed Asset Disposition Brief
ASSET: PHX-REO-0447 | 14-unit multi-family | Phoenix MSA (Central Corridor) | Bank-owned (post-foreclosure)
ACQUISITION COST (bank book): \$1,850,000 | Current BPO: \$1,620,000 | Estimated ARV (stabilized): \$2,100,000
OCCUPANCY: 6 of 14 units occupied (43%) | 8 units vacant — 3 need rehab, 5 rent-ready
STATUS: 90 days in REO inventory | Disposition deadline flagged by asset manager: 45 days
DEFERRED MAINTENANCE ESTIMATE: \$112,000 (roof, HVAC units 3 and 7, plumbing stack B, exterior paint)
CASH FLOW (current): -\$4,200/mo negative carry (taxes + insurance + minimal PM)
MARKET DATA: Phoenix Central Corridor avg cap rate 5.8% | Stabilized NOI at market rents (\$1,100/unit avg): \$79,200/yr | Implied stabilized value at 5.8% cap: \$1,365,517 (below BPO — compression risk)
COMPARABLE SALES: 3 comps in 90 days — 12-unit sold at \$1.44M (\$120K/door), 16-unit at \$1.78M (\$111K/door), 10-unit at \$1.21M (\$121K/door)
TITLE STATUS: Clear — title search completed, no liens beyond the foreclosing mortgage
INVESTOR PIPELINE: 2 LOIs received — LOI-A: \$1,550,000 cash, 21-day close, AS-IS | LOI-B: \$1,625,000, 45-day close, inspection contingency, financing subject-to
HOLDING COST BURN RATE: \$4,200/mo negative carry + \$1,400/mo opportunity cost = \$5,600/mo total
PORTFOLIO CONTEXT: This is 1 of 3 distressed multi-family assets in the Phoenix MSA book; the other two are performing at 88% and 91% occupancy. Combined Phoenix book exposure: \$5.1M."

mkdir -p "$WORKDIR"

# ════════════════════════════════════════════════════════════════════
# STAGE 1 — RE WAR ROOM: generateSituationPack()
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 1 — RE War Room: Situation Pack Generation"
echo "════════════════════════════════════════════════"

WR_PROMPT_FILE="$WORKDIR/wr_prompt.txt"
cat > "$WR_PROMPT_FILE" <<EOF
Based on this RE war room data, produce a structured disposition situation pack.

WAR ROOM DATA:
$RE_WAR_ROOM_BRIEF

Output in this exact format (no markdown, plain text, label each section in ALL CAPS):

ASSET SUMMARY: [asset id, type, location, book value, BPO, ARV]
DISPOSITION RISK: [primary risk flags with dollar exposure]
HOLDING COST ANALYSIS: [monthly burn, days remaining, total exposure at deadline]
LOI COMPARISON:
LOI-A: [price, terms, risk, net to bank]
LOI-B: [price, terms, risk, net to bank]
RECOMMENDED DISPOSITION PATH: [which LOI and why, or third option]
MARKET RISK ASSESSMENT: [cap rate compression analysis, comp-derived value vs BPO]
PRIORITY ACTIONS:
1. [action] — [owner] — [timeline] — [dollar impact]
2. [action] — [owner] — [timeline] — [dollar impact]
3. [action] — [owner] — [timeline] — [dollar impact]
NEGOTIATION LEVERS:
1. [lever]
2. [lever]
3. [lever]
EOF

WR_BODY_FILE="$WORKDIR/wr_body.json"
python3 - "$WR_PROMPT_FILE" "$WR_BODY_FILE" <<'PYEOF'
import json, sys
prompt_path, out_path = sys.argv[1], sys.argv[2]
with open(prompt_path, "r", encoding="utf-8") as fh:
    message = fh.read()
body = {
    "system": "You are a distressed real estate disposition analyst for TSM RE Pro. Follow the output format exactly. No markdown, plain text only. Be specific with dollar amounts and timelines from the data provided.",
    "message": message
}
with open(out_path, "w", encoding="utf-8") as fh:
    json.dump(body, fh)
PYEOF

WR_RESPONSE_FILE="$WORKDIR/wr_response.json"
post_json "$WR_BODY_FILE" "$WR_RESPONSE_FILE"

WR_OUTPUT_FILE="$WORKDIR/wr_output.txt"
extract_output "$WR_RESPONSE_FILE" > "$WR_OUTPUT_FILE"
echo
cat "$WR_OUTPUT_FILE"
echo

# ════════════════════════════════════════════════════════════════════
# STAGE 2 — RE STRATEGIST: runFullBrief() (mode: disposition)
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 2 — RE Strategist: Disposition Strategy Analysis"
echo "════════════════════════════════════════════════"

RE_CONTEXT_FILE="$WORKDIR/re_context.txt"
cat > "$RE_CONTEXT_FILE" <<'EOF'
You are RE-Strategist for TSM RE Pro.
Persona: asset_disposition_manager
Approved sources: RE-only nodes — REO asset registry, Phoenix MSA market data, comparable sales, LOI pipeline, cap rate intelligence.
DO NOT reference non-RE sectors (healthcare, legal, insurance, BPO, construction, FinOps).
Prioritize: distressed asset disposition, LOI analysis, holding cost optimization, cap rate risk, multi-family valuation, investor negotiation strategy.
EOF

STRAT_PROMPT_FILE="$WORKDIR/strat_prompt.txt"
{
  echo "Mode: Disposition Strategy — evaluate LOIs, holding cost burn, and recommend optimal exit path for this distressed Phoenix MSA multi-family REO."
  echo
  echo "Asset context: $RE_WAR_ROOM_BRIEF"
  echo
  echo "Situation pack already generated by War Room stage:"
  cat "$WR_OUTPUT_FILE"
  echo
  cat <<'PROMPTEOF'
Pull TSM RE Pro mesh. Run cap rate compression analysis. Compare LOI-A vs LOI-B on net present value basis accounting for holding costs. Provide scoped RE-only analysis.

Return EXACTLY this format:

===BRIEF===
EXECUTIVE SUMMARY
[2-3 sentences with net disposition outcome and recommended path]

CRITICAL FINDINGS
[Top 3-5 findings with $ amounts and timelines]

LOI ANALYSIS
[Net-to-bank for each LOI after holding costs, fees, and risk adjustments]

RECOMMENDED STRATEGY
[Numbered actions with owner roles and 24/48/72hr deadlines]

RISK ASSESSMENT
[High/Med/Low risks with dollar exposure]

===JSON===
{
  "confidence": 85,
  "recommendedActions": [
    {"text": "Action description", "owner": "Asset Manager"},
    {"text": "Action description", "owner": "Disposition Team"}
  ],
  "dataSources": [
    {"name": "Phoenix MSA comp sales (90-day)", "weight": "HIGH"},
    {"name": "LOI pipeline registry", "weight": "HIGH"}
  ],
  "reasoning": [
    {"key": "Threshold", "val": "..."},
    {"key": "Evidence", "val": "..."}
  ],
  "escalationTriggers": ["..."],
  "noActionRevLoss": "$0",
  "actionRevLoss": "$0",
  "recoveryTime": "0 Days"
}
PROMPTEOF
} > "$STRAT_PROMPT_FILE"

STRAT_BODY_FILE="$WORKDIR/strat_body.json"
python3 - "$RE_CONTEXT_FILE" "$STRAT_PROMPT_FILE" "$STRAT_BODY_FILE" <<'PYEOF'
import json, sys
ctx_path, prompt_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(ctx_path, "r", encoding="utf-8") as fh:
    system = fh.read()
with open(prompt_path, "r", encoding="utf-8") as fh:
    message = fh.read()
body = {"system": system, "message": message}
with open(out_path, "w", encoding="utf-8") as fh:
    json.dump(body, fh)
PYEOF

STRAT_RESPONSE_FILE="$WORKDIR/strat_response.json"
post_json "$STRAT_BODY_FILE" "$STRAT_RESPONSE_FILE"

STRAT_OUTPUT_FILE="$WORKDIR/strat_output.txt"
extract_output "$STRAT_RESPONSE_FILE" > "$STRAT_OUTPUT_FILE"
echo
cat "$STRAT_OUTPUT_FILE"
echo

# Pull ===BRIEF=== forward for stage 3
STRAT_BRIEF_FILE="$WORKDIR/strat_brief.txt"
python3 - "$STRAT_OUTPUT_FILE" "$STRAT_BRIEF_FILE" <<'PYEOF'
import re, sys
in_path, out_path = sys.argv[1], sys.argv[2]
with open(in_path, "r", encoding="utf-8") as fh:
    raw = fh.read()
m = re.search(r"===BRIEF===\s*(.*?)(?:===JSON===|$)", raw, re.DOTALL)
brief = m.group(1).strip() if m else raw
with open(out_path, "w", encoding="utf-8") as fh:
    fh.write(brief)
PYEOF

# Pull JSON block for KPI validation
STRAT_JSON_FILE="$WORKDIR/strat_json.txt"
python3 - "$STRAT_OUTPUT_FILE" "$STRAT_JSON_FILE" <<'PYEOF'
import re, sys, json
in_path, out_path = sys.argv[1], sys.argv[2]
with open(in_path, "r", encoding="utf-8") as fh:
    raw = fh.read()
m = re.search(r"===JSON===\s*(\{.*?\})\s*$", raw, re.DOTALL)
if m:
    try:
        parsed = json.loads(m.group(1))
        # Validate KPI fields present
        kpi_fields = ["noActionRevLoss", "actionRevLoss", "recoveryTime", "confidence"]
        missing = [f for f in kpi_fields if f not in parsed]
        if missing:
            print(f"[KPI VALIDATION] MISSING FIELDS: {missing}", file=sys.stderr)
        else:
            print(f"[KPI VALIDATION] ✅ All KPI fields present:", file=sys.stderr)
            for f in kpi_fields:
                print(f"  {f}: {parsed[f]}", file=sys.stderr)
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(parsed, fh, indent=2)
    except json.JSONDecodeError as e:
        print(f"[KPI VALIDATION] JSON parse error: {e}", file=sys.stderr)
else:
    print("[KPI VALIDATION] No ===JSON=== block found", file=sys.stderr)
PYEOF

# ════════════════════════════════════════════════════════════════════
# STAGE 3 — RE EXECUTIVE PORTAL: runStratEngine() (mode: board)
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 3 — RE Executive Portal: Board Brief Synthesis"
echo "════════════════════════════════════════════════"

EXEC_PROMPT_FILE="$WORKDIR/exec_prompt.txt"
{
  echo "WAR ROOM RELAY DATA:"
  echo "$RE_WAR_ROOM_BRIEF"
  echo
  echo "STRATEGIST BRIEF:"
  cat "$STRAT_BRIEF_FILE"
  echo
  echo "STRATEGIST KPI DATA (for tile population):"
  cat "$STRAT_JSON_FILE" 2>/dev/null || echo "(unavailable)"
  echo
  cat <<'EXECEOF'
ANALYSIS MODE: Write an executive board brief for this distressed REO disposition decision.

Structure your response with these exact sections:
FINANCIAL POSITION: Current book vs BPO vs stabilized value, holding cost burn rate and total exposure at deadline.
TOP RISKS: 3 specific risks with dollar exposure each.
RECOMMENDED EXECUTIVE DECISIONS: 3 numbered decisions with specific dollar thresholds, timelines, and owner roles.
KPI SUMMARY: Surface these four values explicitly on their own lines —
  NO-ACTION LOSS: [value from noActionRevLoss]
  ACTION LOSS: [value from actionRevLoss]
  RECOVERY TIME: [value from recoveryTime]
  CONFIDENCE: [value from confidence]%

Be specific. Use actual asset numbers. Use ** for bold key points. Under 450 words.
EXECEOF
} > "$EXEC_PROMPT_FILE"

EXEC_BODY_FILE="$WORKDIR/exec_body.json"
python3 - "$EXEC_PROMPT_FILE" "$EXEC_BODY_FILE" <<'PYEOF'
import json, sys
prompt_path, out_path = sys.argv[1], sys.argv[2]
with open(prompt_path, "r", encoding="utf-8") as fh:
    message = fh.read()
body = {
    "system": "You are the TSM RE Pro Strategist Neural Core — an AI disposition strategist for distressed real estate assets. Surface all four KPI values explicitly in the KPI SUMMARY section as labeled.",
    "message": message
}
with open(out_path, "w", encoding="utf-8") as fh:
    json.dump(body, fh)
PYEOF

EXEC_RESPONSE_FILE="$WORKDIR/exec_response.json"
post_json "$EXEC_BODY_FILE" "$EXEC_RESPONSE_FILE"

EXEC_OUTPUT_FILE="$WORKDIR/exec_output.txt"
extract_output "$EXEC_RESPONSE_FILE" > "$EXEC_OUTPUT_FILE"
echo
cat "$EXEC_OUTPUT_FILE"
echo

# ── Post-run KPI surface validation ─────────────────────────────
echo "════════════════════════════════════════════════"
echo "KPI SURFACE VALIDATION"
echo "════════════════════════════════════════════════"
python3 - "$EXEC_OUTPUT_FILE" "$STRAT_JSON_FILE" <<'PYEOF'
import json, sys, re

exec_path, kpi_path = sys.argv[1], sys.argv[2]
with open(exec_path, "r", encoding="utf-8") as fh:
    exec_text = fh.read()

try:
    with open(kpi_path, "r", encoding="utf-8") as fh:
        kpi = json.load(fh)
except Exception:
    print("⚠️  KPI JSON unavailable — skipping surface check.")
    sys.exit(0)

checks = {
    "noActionRevLoss": kpi.get("noActionRevLoss", ""),
    "actionRevLoss":   kpi.get("actionRevLoss", ""),
    "recoveryTime":    kpi.get("recoveryTime", ""),
    "confidence":      str(kpi.get("confidence", "")),
}

all_pass = True
for field, value in checks.items():
    # Strip $ and % for looser match
    needle = re.sub(r'[$%,]', '', str(value)).strip()
    if needle and needle in re.sub(r'[$%,]', '', exec_text):
        print(f"  ✅ {field}: '{value}' surfaced in exec portal output")
    else:
        print(f"  ❌ {field}: '{value}' NOT found in exec portal output")
        all_pass = False

print()
if all_pass:
    print("✅ All KPI values surfaced correctly in exec portal output.")
else:
    print("⚠️  Some KPI values missing from exec portal output.")
    print("   Check exec portal HTML tile selectors match patch-hc-exec-kpi.py targets.")
PYEOF

echo
echo "════════════════════════════════════════════════"
echo "✅ Full chain complete: RE War Room → Strategist → Executive Portal"
echo "════════════════════════════════════════════════"