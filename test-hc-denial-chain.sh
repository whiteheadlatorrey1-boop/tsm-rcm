#!/usr/bin/env bash
set -euo pipefail

# ── TSM Consultz: HC Denial War Room -> Strategist -> Executive Portal ──
# End-to-end server-side test for a Prior Auth / Missing Modifier sample claim.
#
# Hits the live /api/hc/query endpoint three times, in the same shape and
# order the real browser relay does:
#   1. War Room    -> generateDenialPack()-style call
#   2. Strategist  -> runStrategist()-style call (mode: payer), enriched
#                     with stage 1's output as additional context
#   3. Exec Portal -> runStratEngine()-style call (mode: board), enriched
#                     with everything accumulated so far
#
# Usage:
#   ./test-hc-denial-chain.sh [base_url]
#   (defaults to https://app.tsmatter.com)

BASE_URL="${1:-https://app.tsmatter.com}"
ENDPOINT="$BASE_URL/api/hc/query"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

post_json() {
  # $1 = path to file containing {"system":...,"message":...} JSON
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
  # $1 = response json file -> prints data.output (or .answer/.reply fallback) to stdout
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

# ── Synthetic Prior Auth sample claim (built from the real war room's
#    Prior Auth / Missing Modifier denial bucket: 31% of denials, $58K,
#    15 open appeals, 61% win rate, $1,240 ROI/claim) ──
WAR_ROOM_BRIEF="HonorHealth Revenue Cycle War Room — Prior Auth Denial Sample
CLAIM: CLM-2291 | CPT 27447 (Total Knee Arthroplasty) | Payer: Aetna | Billed: \$24,600 | Status: DENIED
DENIAL CODE: CO-197 — Prior authorization/precertification absent or modifier missing on submitted claim
DENIAL CONTEXT: Surgical case scheduled and performed; prior auth was obtained verbally by the office but the auth number was not appended to the claim, and the required -RT (right side) modifier was omitted on the line item.
PAYER: Aetna — appeal window 60 days from denial date, denial date 14 days ago (46 days remaining)
PORTFOLIO CONTEXT: Prior Auth / Missing Modifier is the #2 denial root cause this cycle — 31% of all denials, \$58K total exposure, 15 claims currently in open appeal status, 61% historical win rate on this denial type, average ROI per successful appeal \$1,240.
AR AGING: Claim is in the 31-60 day bucket. Practice-wide AR aging skews older — 19.7% of total AR is in the 91-120 day bucket (\$135K), 6.3% is over 120 days (\$43K, flagged at-risk).
DSO: Currently 52 days, trending up over the last 2 months (from a 36-44 day baseline).
OFFICE: Scottsdale satellite — currently has 31 prior auths pending, the highest pending-auth volume of the 4 satellite offices."

mkdir -p "$WORKDIR"

# ════════════════════════════════════════════════════════════════════
# STAGE 1 — WAR ROOM: generateDenialPack()
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 1 — HC Denial War Room: Denial Pack Generation"
echo "════════════════════════════════════════════════"

WR_PROMPT_FILE="$WORKDIR/wr_prompt.txt"
cat > "$WR_PROMPT_FILE" <<EOF
Based on this war room data, produce a structured denial pack.

WAR ROOM DATA:
$WAR_ROOM_BRIEF

Output in this exact format (no markdown, plain text, label each section in ALL CAPS):

CLAIM SUMMARY: [claim id, CPT code, payer, amount, issue]
DENIAL CODES: [code] - [what this code means]
ROOT CAUSE: [specific root cause]
APPEAL DEADLINE: [timeframe and consequence]
APPEAL STRATEGY: [specific approach for this payer]
APPEAL LETTER OPENING:
[2-3 sentence opening for the appeal letter]
DOCUMENTATION CHECKLIST:
1. [item]
2. [item]
3. [item]
PRIORITY ACTIONS:
1. [action] — [who] — [timeline] — [dollar amount at stake]
2. [action] — [who] — [timeline] — [dollar amount at stake]
EOF

WR_BODY_FILE="$WORKDIR/wr_body.json"
python3 - "$WR_PROMPT_FILE" "$WR_BODY_FILE" <<'PYEOF'
import json, sys
prompt_path, out_path = sys.argv[1], sys.argv[2]
with open(prompt_path, "r", encoding="utf-8") as fh:
    message = fh.read()
body = {
    "system": "You are an RCM denial pack generator for HonorHealth. Follow the output format exactly. No markdown, plain text only.",
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
# STAGE 2 — STRATEGIST: runStrategist() (mode: payer)
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 2 — HC Strategist: Payer Strategy Analysis"
echo "════════════════════════════════════════════════"

HC_CONTEXT_FILE="$WORKDIR/hc_context.txt"
cat > "$HC_CONTEXT_FILE" <<'EOF'
You are HC-Strategist for HonorHealth.
Persona: revenue_cycle_manager (Dee Montee).
Approved sources: HC-only nodes + HonorHealth satellite office summaries (Scottsdale, Mesa, Tempe, North Mountain).
DO NOT reference non-healthcare sectors (legal, mortgage, schools, construction, REO, HotelOps).
Prioritize: revenue cycle, denial prevention, payer authorization friction, coding documentation gaps, cross-office variance.
EOF

STRAT_PROMPT_FILE="$WORKDIR/strat_prompt.txt"
{
  echo "Mode: Payer Strategy — build appeal tactics specific to this Prior Auth / Missing Modifier denial."
  echo
  echo "Additional context: $WAR_ROOM_BRIEF"
  echo
  echo "Denial pack already generated by War Room stage:"
  cat "$WR_OUTPUT_FILE"
  echo
  cat <<'PROMPTEOF'
Pull HonorHealth healthcare mesh. Compare satellite office summaries. Provide scoped HC-only analysis.

Return EXACTLY this format:

===BRIEF===
EXECUTIVE SUMMARY
[2-3 sentences with dollar impact and recovery probability]

CRITICAL FINDINGS
[Top 3-5 findings with $ amounts and timeframes]

RECOMMENDED STRATEGY
[Numbered actions with owner roles and 24/48/72hr deadlines]

RISK ASSESSMENT
[High/Med/Low risks with exposure amounts]

===JSON===
{
  "confidence": 88,
  "recommendedActions": [
    {"text": "Action description", "owner": "Billing Manager"},
    {"text": "Action description", "owner": "Payer Relations"}
  ],
  "dataSources": [
    {"name": "HC-Billing / EOB data", "weight": "HIGH"},
    {"name": "Denial code registry (CO-197)", "weight": "HIGH"}
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
python3 - "$HC_CONTEXT_FILE" "$STRAT_PROMPT_FILE" "$STRAT_BODY_FILE" <<'PYEOF'
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

# Pull just the ===BRIEF=== section forward as enriched context for stage 3
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

# ════════════════════════════════════════════════════════════════════
# STAGE 3 — EXECUTIVE PORTAL: runStratEngine() (mode: board)
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 3 — Executive Portal: Board Brief Synthesis"
echo "════════════════════════════════════════════════"

EXEC_PROMPT_FILE="$WORKDIR/exec_prompt.txt"
{
  echo "WAR ROOM RELAY DATA:"
  echo "$WAR_ROOM_BRIEF"
  echo
  echo "ADDITIONAL CONTEXT: Strategist brief from prior stage —"
  cat "$STRAT_BRIEF_FILE"
  echo
  echo "ANALYSIS MODE: Write an executive board brief. Summarize financial position, top risks, and 3 recommended executive decisions in plain language."
  echo
  echo "Be specific, use actual numbers from the relay data, name specific claims/codes/payers. Use ** for bold key points. Under 400 words."
} > "$EXEC_PROMPT_FILE"

EXEC_BODY_FILE="$WORKDIR/exec_body.json"
python3 - "$EXEC_PROMPT_FILE" "$EXEC_BODY_FILE" <<'PYEOF'
import json, sys
prompt_path, out_path = sys.argv[1], sys.argv[2]
with open(prompt_path, "r", encoding="utf-8") as fh:
    message = fh.read()
body = {
    "system": "You are the TSM HC Strategist Neural Core — an AI Revenue Cycle strategist for HonorHealth.",
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

echo "════════════════════════════════════════════════"
echo "✅ Full chain complete: War Room → Strategist → Executive Portal"
echo "════════════════════════════════════════════════"