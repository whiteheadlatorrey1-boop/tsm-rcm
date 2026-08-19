#!/usr/bin/env bash
set -euo pipefail

# ── TSM Consultz: Insurance War Room (6-engine) → Strategist → Exec Portal ──
# End-to-end server-side test for a DME denial + compliance flag scenario.
#
# Mirrors the exact 6-engine PROMPTS chain in insurance-war-room.html,
# feeding each engine's output as context to the next, then relaying to
# Strategist and Executive Portal.
#
# Endpoint: /api/insurance/query (body: {message, maxTokens})
#
# Usage:
#   ./test-insurance-chain.sh [base_url]
#   (defaults to https://app.tsmatter.com)

BASE_URL="${1:-https://app.tsmatter.com}"
ENDPOINT="$BASE_URL/api/insurance/query"
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
out = d.get("answer") or d.get("output") or d.get("reply") or ""
print(out)
PYEOF
}

build_body() {
  # $1 = message string, $2 = output file
  python3 - "$2" <<PYEOF
import json, sys
body = {"message": """$1""", "maxTokens": 550}
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump(body, fh)
PYEOF
}

# ── Synthetic DME denial + AZ compliance scenario ─────────────────────────
# DME supplier, Arizona — HCPCS E0601 (CPAP), CO-4 denial (modifier issue),
# AZ DOI producer license renewal lapsed, CMN missing.
DOC_TYPE="DME Claim / EOB"
DOC_TEXT="EXPLANATION OF BENEFITS — Desert Sun Medical Supply, LLC
NPI: 1234567890 | Tax ID: 86-0012345 | Arizona DME Supplier License: AZ-DME-4421
CLAIM: CLM-INS-0881 | Date of Service: 05/12/2026 | Date Billed: 05/19/2026
PATIENT: John R. Morales | DOB: 03/14/1958 | Medicare ID: 1EG4-TE5-MK72
HCPCS: E0601 (CPAP Device, any type) | Modifier: RR (rental) | Units: 1
BILLED AMOUNT: \$842.00 | ALLOWED: \$0.00 | PAID: \$0.00
DENIAL CODE: CO-4 — The service is inconsistent with the modifier(s)
SECONDARY DENIAL: CO-97 — The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated
CLAIM NOTE: CMN (Certificate of Medical Necessity) not on file at time of adjudication. Supplier attestation form incomplete — section 3B unsigned by ordering physician.
PAYER: Noridian Healthcare Solutions (Medicare MAC — Jurisdiction F, Arizona)
APPEAL DEADLINE: 120 days from denial date (denial date: 05/22/2026 — deadline: 09/19/2026)
AGENT OF RECORD: Patricia Wentz | NPN: 3301882 | AZ DOI License: AZ-L-089321
LICENSE STATUS FLAG: AZ producer license AZ-L-089321 renewal due 06/01/2026 — currently 29 days past due as of 06/30/2026. CE hours: 18 of 24 required completed.
BILLING HISTORY: 3 prior CPAP claims this calendar year — CLM-0712 paid \$821, CLM-0788 paid \$821, CLM-0831 denied (same CO-4 pattern — not resolved).
PORTFOLIO CONTEXT: DME denial rate this quarter: 22% (vs 8% target). Open DME appeals: 14 claims, \$11,840 total exposure. Average DME appeal win rate: 58%. Noridian MAC has a 45-day redetermination turnaround."

mkdir -p "$WORKDIR"

echo "════════════════════════════════════════════════"
echo "INSURANCE WAR ROOM — 6-ENGINE CHAIN"
echo "Scenario: DME CPAP Denial + AZ License Compliance Flag"
echo "Endpoint: $ENDPOINT"
echo "════════════════════════════════════════════════"
echo

# ── ENGINE 01: Claim Intelligence ────────────────────────────────────────
echo "── ENGINE 01 — Claim Intelligence ──────────────────"
E01_BODY="$WORKDIR/e01_body.json"
E01_RESP="$WORKDIR/e01_resp.json"
E01_OUT="$WORKDIR/e01_out.txt"

python3 - "$E01_BODY" <<PYEOF
import json, sys
doc = """$DOC_TEXT"""
doc_type = "$DOC_TYPE"
message = f"""You are a TSM Insurance Claim Intelligence AI.
DOC TYPE: {doc_type}
DOCUMENT: {doc[:1200]}

ENGINE 01 — CLAIM INTELLIGENCE
Extract key facts. Format exactly:
DOC TYPE: [type]
CLAIM/POLICY ID: [identifier]
TOTAL AMOUNT: [primary dollar figure]
KEY PARTIES: [insurer, insured, providers]
DENIAL CODES: [codes found or "None"]
CRITICAL ITEMS: [top 3-5 flagged items with amounts]
APPEAL ELIGIBLE: [Yes/No — reason]
RISK SCORE: [1-100]
KEY FACTS:
1. [fact]
2. [fact]
3. [fact]"""
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 550}, fh)
PYEOF

post_json "$E01_BODY" "$E01_RESP"
extract_output "$E01_RESP" > "$E01_OUT"
echo; cat "$E01_OUT"; echo
E1=$(cat "$E01_OUT")

# ── ENGINE 02: Risk & Denial Analysis ────────────────────────────────────
echo "── ENGINE 02 — Risk & Denial Analysis ──────────────"
E02_BODY="$WORKDIR/e02_body.json"
E02_RESP="$WORKDIR/e02_resp.json"
E02_OUT="$WORKDIR/e02_out.txt"

python3 - "$E02_BODY" "$E01_OUT" <<'PYEOF'
import json, sys
with open(sys.argv[2], "r") as fh:
    e1 = fh.read()
message = f"""You are a TSM Insurance Risk & Denial Analyst.
ENGINE 01 FACTS:
{e1}

ENGINE 02 — RISK & DENIAL ANALYSIS
DENIAL CODES IDENTIFIED: [list each with meaning and dollar amount]
APPEAL WINDOWS: [deadlines for each appealable denial]
COVERAGE GAPS: [missing coverage items]
FRAUD INDICATORS: [any red flags or "None"]
DOCUMENTATION GAPS: [missing CMN, auth, W-9, etc.]
EXCEPTION COUNT: [number]
RISK LEVEL: [Low/Medium/High/Critical] — [rationale]"""
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 550}, fh)
PYEOF

post_json "$E02_BODY" "$E02_RESP"
extract_output "$E02_RESP" > "$E02_OUT"
echo; cat "$E02_OUT"; echo
E2=$(cat "$E02_OUT")

# ── ENGINE 03: Financial Exposure ─────────────────────────────────────────
echo "── ENGINE 03 — Financial Exposure ──────────────────"
E03_BODY="$WORKDIR/e03_body.json"
E03_RESP="$WORKDIR/e03_resp.json"
E03_OUT="$WORKDIR/e03_out.txt"

python3 - "$E03_BODY" "$E01_OUT" "$E02_OUT" <<'PYEOF'
import json, sys
with open(sys.argv[2], "r") as fh:
    e1 = fh.read(400)
with open(sys.argv[3], "r") as fh:
    e2 = fh.read()
message = f"""You are a TSM Insurance Financial Exposure Analyst.
ENGINE 01 FACTS: {e1}
ENGINE 02 RISK: {e2}

ENGINE 03 — FINANCIAL EXPOSURE
TOTAL EXPOSURE: [dollar range]
RECOVERABLE AMOUNT: [what can be appealed/recovered]
WRITE-OFF RISK: [amount at permanent loss risk]
APPEAL ROI: [cost to appeal vs. recovery potential]
PREMIUM OPPORTUNITY: [cross-sell/upsell dollar potential if applicable]
FINANCIAL RISK SCORE: [1-100] — [rationale]
EXECUTIVE ESCALATION: [Yes/No] — [reason]"""
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 550}, fh)
PYEOF

post_json "$E03_BODY" "$E03_RESP"
extract_output "$E03_RESP" > "$E03_OUT"
echo; cat "$E03_OUT"; echo
E3=$(cat "$E03_OUT")

# ── ENGINE 04: Compliance & Regulatory ───────────────────────────────────
echo "── ENGINE 04 — Compliance & Regulatory ─────────────"
E04_BODY="$WORKDIR/e04_body.json"
E04_RESP="$WORKDIR/e04_resp.json"
E04_OUT="$WORKDIR/e04_out.txt"

python3 - "$E04_BODY" "$E01_OUT" "$E02_OUT" <<'PYEOF'
import json, sys
with open(sys.argv[2], "r") as fh:
    e1 = fh.read(300)
with open(sys.argv[3], "r") as fh:
    e2 = fh.read()
message = f"""You are a TSM Insurance Compliance Officer.
ENGINE 01 FACTS: {e1}
ENGINE 02 RISK FLAGS: {e2}

ENGINE 04 — COMPLIANCE & REGULATORY
CMS/MEDICARE EXPOSURE: [risk level and reason]
AZ DOI FLAGS: [state regulatory issues]
HIPAA RISK: [any PHI/documentation concerns]
CE/LICENSING FLAGS: [agent renewal issues or "None"]
OIG EXPOSURE: [fraud/abuse risk level]
SELF-DISCLOSURE RISK: [Yes/No] — [reason]
COMPLIANCE RISK LEVEL: [Low/Medium/High/Critical]
IMMEDIATE COMPLIANCE ACTIONS:
1. [action]
2. [action]
3. [action]"""
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 550}, fh)
PYEOF

post_json "$E04_BODY" "$E04_RESP"
extract_output "$E04_RESP" > "$E04_OUT"
echo; cat "$E04_OUT"; echo
E4=$(cat "$E04_OUT")

# ── ENGINE 05: Recovery & Appeal Plan ────────────────────────────────────
echo "── ENGINE 05 — Recovery & Appeal Plan ──────────────"
E05_BODY="$WORKDIR/e05_body.json"
E05_RESP="$WORKDIR/e05_resp.json"
E05_OUT="$WORKDIR/e05_out.txt"

python3 - "$E05_BODY" "$E03_OUT" "$E04_OUT" <<'PYEOF'
import json, sys
with open(sys.argv[2], "r") as fh:
    e3 = fh.read()
with open(sys.argv[3], "r") as fh:
    e4 = fh.read()
message = f"""You are a TSM Insurance Recovery Strategist.
ENGINE 03 IMPACT: {e3}
ENGINE 04 COMPLIANCE: {e4}

ENGINE 05 — RECOVERY & APPEAL PLAN
APPEAL STRATEGY: [specific approach for each appealable denial]
PRIORITY ACTIONS (dollar-quantified):
1. [Action] — $[amount] — [Owner] — [Deadline]
2. [Action] — $[amount] — [Owner] — [Deadline]
3. [Action] — $[amount] — [Owner] — [Deadline]
4. [Action] — $[amount] — [Owner] — [Deadline]
RECOVERY TIMELINE: [days]
QUICK WINS (48 hrs): [immediate steps]
DOCUMENTATION NEEDED: [list]
ESCALATE TO PRINCIPAL: [Yes/No] — [reason]"""
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 550}, fh)
PYEOF

post_json "$E05_BODY" "$E05_RESP"
extract_output "$E05_RESP" > "$E05_OUT"
echo; cat "$E05_OUT"; echo
E5=$(cat "$E05_OUT")

# ── ENGINE 06: App Dispatch ───────────────────────────────────────────────
echo "── ENGINE 06 — App Dispatch ─────────────────────────"
E06_BODY="$WORKDIR/e06_body.json"
E06_RESP="$WORKDIR/e06_resp.json"
E06_OUT="$WORKDIR/e06_out.txt"

python3 - "$E06_BODY" "$E03_OUT" "$E05_OUT" <<'PYEOF'
import json, sys
with open(sys.argv[2], "r") as fh:
    e3 = fh.read(300)
with open(sys.argv[3], "r") as fh:
    e5 = fh.read()
message = f"""You are the TSM Insurance App Dispatch Engine.
ENGINE 03 RISK: {e3}
ENGINE 05 ACTIONS: {e5}

ENGINE 06 — APP DISPATCH
Recommend exactly 5 Insurance apps ranked by relevance. Available: Claims Triage, DME Billing Module, P&C Command, CE Study Prep, Agent Onboarding, AZ Insurance Command, Insurance Intel, BNCA Chain, PC Command, DME Benefits Page, AHIP Certification Prep

Repeat 5 times:
APP: [name]
RANK: [#1-5]
IS_TOP: [YES for #1 only, else NO]
HOW_TO_USE: [3 sentences — exact tab to open, specific data to enter, specific output to produce for THIS document's issues]
TAGS: [TAG1], [TAG2], [TAG3]

DISPATCH_INTRO: [1-2 sentences on why these 5 apps address the specific issues found]"""
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 550}, fh)
PYEOF

post_json "$E06_BODY" "$E06_RESP"
extract_output "$E06_RESP" > "$E06_OUT"
echo; cat "$E06_OUT"; echo

echo "════════════════════════════════════════════════"
echo "WAR ROOM COMPLETE — 6/6 Engines fired"
echo "════════════════════════════════════════════════"
echo

# ════════════════════════════════════════════════════════════════════
# STAGE 2 — INSURANCE STRATEGIST
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 2 — Insurance Strategist: Recovery Strategy"
echo "════════════════════════════════════════════════"

STRAT_BODY="$WORKDIR/strat_body.json"
STRAT_RESP="$WORKDIR/strat_resp.json"
STRAT_OUT="$WORKDIR/strat_out.txt"
STRAT_BRIEF="$WORKDIR/strat_brief.txt"
STRAT_JSON="$WORKDIR/strat_json.json"

python3 - "$STRAT_BODY" "$E01_OUT" "$E03_OUT" "$E05_OUT" <<'PYEOF'
import json, sys
with open(sys.argv[2], "r") as fh: e1 = fh.read()
with open(sys.argv[3], "r") as fh: e3 = fh.read()
with open(sys.argv[4], "r") as fh: e5 = fh.read()

system = """You are Insurance-Strategist for TSM Insurance Command.
Persona: insurance_recovery_manager
Approved sources: Insurance-only nodes — DME billing, AZ DOI compliance, Medicare MAC data, denial registry, CE/licensing tracker.
DO NOT reference non-insurance sectors.
Prioritize: DME denial recovery, AZ compliance risk, Medicare appeal windows, agent licensing remediation."""

message = f"""Mode: Recovery Strategy — evaluate 6-engine war room output and produce scoped appeal + compliance remediation plan.

ENGINE 01 (Claim Intelligence):
{e1}

ENGINE 03 (Financial Exposure):
{e3}

ENGINE 05 (Recovery Plan):
{e5}

Return EXACTLY this format:

===BRIEF===
EXECUTIVE SUMMARY
[2-3 sentences with total dollar exposure and recovery probability]

CRITICAL FINDINGS
[Top 3-5 findings with $ amounts and deadlines]

COMPLIANCE ALERT
[AZ DOI / CE / licensing flags with specific remediation steps and deadlines]

RECOMMENDED STRATEGY
[Numbered actions with owner roles and 24/48/72hr deadlines]

RISK ASSESSMENT
[High/Med/Low risks with dollar exposure]

===JSON===
{{
  "confidence": 82,
  "recommendedActions": [
    {{"text": "Action description", "owner": "Billing Manager"}},
    {{"text": "Action description", "owner": "Compliance Officer"}}
  ],
  "dataSources": [
    {{"name": "DME denial registry (CO-4/CO-97)", "weight": "HIGH"}},
    {{"name": "AZ DOI licensing tracker", "weight": "HIGH"}}
  ],
  "reasoning": [
    {{"key": "Threshold", "val": "..."}},
    {{"key": "Evidence", "val": "..."}}
  ],
  "escalationTriggers": ["..."],
  "noActionRevLoss": "$0",
  "actionRevLoss": "$0",
  "recoveryTime": "0 Days"
}}"""

with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 900}, fh)
PYEOF

post_json "$STRAT_BODY" "$STRAT_RESP"
extract_output "$STRAT_RESP" > "$STRAT_OUT"
echo; cat "$STRAT_OUT"; echo

# Extract BRIEF and JSON blocks
python3 - "$STRAT_OUT" "$STRAT_BRIEF" "$STRAT_JSON" <<'PYEOF'
import re, sys, json
in_path, brief_path, json_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(in_path, "r") as fh:
    raw = fh.read()

m = re.search(r"===BRIEF===\s*(.*?)(?:===JSON===|$)", raw, re.DOTALL)
brief = m.group(1).strip() if m else raw
with open(brief_path, "w") as fh:
    fh.write(brief)

m2 = re.search(r"===JSON===\s*(\{.*?\})\s*$", raw, re.DOTALL)
if m2:
    try:
        parsed = json.loads(m2.group(1))
        kpi_fields = ["noActionRevLoss", "actionRevLoss", "recoveryTime", "confidence"]
        missing = [f for f in kpi_fields if f not in parsed]
        if missing:
            print(f"[KPI VALIDATION] ❌ MISSING: {missing}", file=sys.stderr)
        else:
            print("[KPI VALIDATION] ✅ All KPI fields present:", file=sys.stderr)
            for f in kpi_fields:
                print(f"  {f}: {parsed[f]}", file=sys.stderr)
        with open(json_path, "w") as fh:
            json.dump(parsed, fh, indent=2)
    except json.JSONDecodeError as e:
        print(f"[KPI VALIDATION] JSON parse error: {e}", file=sys.stderr)
else:
    print("[KPI VALIDATION] ❌ No ===JSON=== block found", file=sys.stderr)
PYEOF

# ════════════════════════════════════════════════════════════════════
# STAGE 3 — INSURANCE EXECUTIVE PORTAL
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════"
echo "STAGE 3 — Insurance Executive Portal: Board Brief"
echo "════════════════════════════════════════════════"

EXEC_BODY="$WORKDIR/exec_body.json"
EXEC_RESP="$WORKDIR/exec_resp.json"
EXEC_OUT="$WORKDIR/exec_out.txt"

python3 - "$EXEC_BODY" "$STRAT_BRIEF" "$STRAT_JSON" <<'PYEOF'
import json, sys
with open(sys.argv[2], "r") as fh: brief = fh.read()
try:
    with open(sys.argv[3], "r") as fh: kpi = json.load(fh)
except Exception: kpi = {}

message = f"""WAR ROOM RELAY — Insurance Claim CLM-INS-0881
DME CPAP Denial (CO-4 + CO-97) | Noridian MAC | $842 claim | AZ license compliance flag

STRATEGIST BRIEF:
{brief}

KPI DATA:
{json.dumps(kpi, indent=2)}

ANALYSIS MODE: Executive board brief for this insurance denial + compliance situation.

Structure your response with these exact sections:
FINANCIAL POSITION: Total exposure, recoverable amount, write-off risk, portfolio DME denial context.
COMPLIANCE ALERT: AZ DOI license status, CE hours gap, remediation deadline and consequence.
TOP RISKS: 3 specific risks with dollar exposure each.
RECOMMENDED EXECUTIVE DECISIONS: 3 numbered decisions with dollar thresholds, timelines, owner roles.
KPI SUMMARY:
  NO-ACTION LOSS: [value from noActionRevLoss]
  ACTION LOSS: [value from actionRevLoss]
  RECOVERY TIME: [value from recoveryTime]
  CONFIDENCE: [value from confidence]%

Use ** for bold key points. Under 450 words. Use actual numbers from the data."""

with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump({"message": message, "maxTokens": 900}, fh)
PYEOF

post_json "$EXEC_BODY" "$EXEC_RESP"
extract_output "$EXEC_RESP" > "$EXEC_OUT"
echo; cat "$EXEC_OUT"; echo

# ── KPI Surface Validation ────────────────────────────────────────
echo "════════════════════════════════════════════════"
echo "KPI SURFACE VALIDATION"
echo "════════════════════════════════════════════════"
python3 - "$EXEC_OUT" "$STRAT_JSON" <<'PYEOF'
import json, sys, re

exec_path, kpi_path = sys.argv[1], sys.argv[2]
with open(exec_path, "r") as fh: exec_text = fh.read()
try:
    with open(kpi_path, "r") as fh: kpi = json.load(fh)
except Exception:
    print("⚠️  KPI JSON unavailable — skipping.")
    sys.exit(0)

checks = {
    "noActionRevLoss": kpi.get("noActionRevLoss", ""),
    "actionRevLoss":   kpi.get("actionRevLoss", ""),
    "recoveryTime":    kpi.get("recoveryTime", ""),
    "confidence":      str(kpi.get("confidence", "")),
}
all_pass = True
for field, value in checks.items():
    needle = re.sub(r'[$%,]', '', str(value)).strip()
    if needle and needle in re.sub(r'[$%,]', '', exec_text):
        print(f"  ✅ {field}: '{value}' surfaced in exec output")
    else:
        print(f"  ❌ {field}: '{value}' NOT found in exec output")
        all_pass = False
print()
if all_pass:
    print("✅ All KPI values surfaced correctly.")
else:
    print("⚠️  Some KPI values missing from exec output.")
PYEOF

echo
echo "════════════════════════════════════════════════"
echo "✅ Full chain complete: Insurance War Room (6 engines) → Strategist → Executive Portal"
echo "════════════════════════════════════════════════"