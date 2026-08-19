#!/usr/bin/env bash
set -euo pipefail

# ── TSM Consultz: Server-side song generation test ──
#
# Tests the live /api/music/sweet/ai endpoint with the exact prompt shape
# song-builder.html uses, and verifies the newline-delimited-bars fix is
# actually working in production (not just in the repo).
#
# Usage:
#   ./test-song-generation.sh [base_url]
#   (defaults to https://app.tsmatter.com if no arg given)

BASE_URL="${1:-https://app.tsmatter.com}"

PROMPT_FILE="$(mktemp)"
cat > "$PROMPT_FILE" <<'EOF'
You are a professional songwriter and music producer AI. Write a complete song based on:
Genre: Hip-Hop
Mood: Confident / Cocky / Playful
Artists for inspiration (not imitation): Cardi B
Message/Concept: From rags to riches, running circles around doubters and haters. Flexing newfound success and confidence, playful trash talk, comparing a rival's reaction to being outclassed.
Hook direction: A pre-hook with ad-libs leading into a bridge, then verses building the rags-to-riches story
Beat: Unknown BPM, Unknown key
Structure: hook, verse1, bridge, verse2, outro
Style notes: Confident, witty wordplay, playful flex energy, ad-libs in the pre-hook

Return ONLY valid JSON with this exact structure:
{
  "hook": "full hook lyrics, 8 bars, each bar separated by a \n newline character — do not run bars together with commas",
  "verse1": "full verse 1 lyrics, 16 bars, each bar separated by a \n newline character — do not run bars together with commas",
  "bridge": "bridge section (4-8 bars)",
  "verse2": "full verse 2 lyrics, 16 bars, each bar separated by a \n newline character — do not run bars together with commas",
  "outro": "outro lines (4 bars)",
  "producerNotes": "practical producer advice specific to this song",
  "cadenceNotes": "syllable and flow tips for this genre/BPM",
  "commercialScore": "1-10 commercial potential with one-sentence reason"
}
EOF

echo "Hitting $BASE_URL/api/music/sweet/ai ..."
REQUEST_BODY="$(python3 - "$PROMPT_FILE" <<'PYEOF'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    prompt = fh.read()
print(json.dumps({
  "system": "You are a professional songwriter AI. Respond ONLY with valid JSON, no markdown.",
  "prompt": prompt
}))
PYEOF
)"
rm -f "$PROMPT_FILE"

HTTP_STATUS=""
RESPONSE=""
ATTEMPTS=0
MAX_ATTEMPTS=3

while [ "$ATTEMPTS" -lt "$MAX_ATTEMPTS" ]; do
  ATTEMPTS=$((ATTEMPTS+1))
  echo "Attempt $ATTEMPTS/$MAX_ATTEMPTS (90s timeout)..."

  HTTP_RESPONSE=$(curl -sS --max-time 90 -w "\n___HTTP_STATUS___%{http_code}" -X POST "$BASE_URL/api/music/sweet/ai" \
    -H "Content-Type: application/json" \
    --data-raw "$REQUEST_BODY") || {
      echo "curl failed (network error, timeout, or connection refused) on attempt $ATTEMPTS."
      HTTP_RESPONSE=""
    }

  if [ -n "$HTTP_RESPONSE" ]; then
    HTTP_STATUS="${HTTP_RESPONSE##*___HTTP_STATUS___}"
    RESPONSE="${HTTP_RESPONSE%___HTTP_STATUS___*}"
    if [ -n "$RESPONSE" ] && [ "$HTTP_STATUS" != "" ]; then
      break
    fi
  fi

  echo "Empty or incomplete response, retrying in 3s..."
  sleep 3
done

echo "HTTP status: ${HTTP_STATUS:-unknown}"
if [ -z "$RESPONSE" ]; then
  echo "FAIL: no response body after $MAX_ATTEMPTS attempts."
  echo "This points to a server-side issue (timeout, crash, or cold-start failure) rather than a script bug."
  echo "Check: fly logs   (or)   fly status   to see what the app did during these requests."
  exit 1
fi

echo "--- Raw response ---"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo

echo "--- Bar-break check ---"
RESPONSE_FILE="$(mktemp)"
printf '%s' "$RESPONSE" > "$RESPONSE_FILE"
python3 - "$RESPONSE_FILE" <<'PYEOF'
import json, re, sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    raw = fh.read()

try:
    outer = json.loads(raw)
except Exception as e:
    print(f"FAIL: could not parse outer response as JSON: {e}")
    sys.exit(1)

if not outer.get("ok"):
    print(f"FAIL: server returned ok=false: {outer.get('error')}")
    sys.exit(1)

text = outer.get("text", "")
clean = re.sub(r"\`\`\`json|\`\`\`", "", text).strip()

try:
    song = json.loads(clean)
except Exception as e:
    print(f"FAIL: could not parse song JSON: {e}")
    print("Raw text was:")
    print(text)
    sys.exit(1)

def check(field):
    val = song.get(field, "")
    lines = [l for l in val.split("\n") if l.strip()]
    status = "PASS" if len(lines) >= 2 else "FAIL"
    print(f"{status}: {field} has {len(lines)} newline-separated bar(s)")
    if status == "FAIL":
        print(f"  -> raw value: {val[:200]}")
    return status == "PASS"

results = [check("hook"), check("verse1"), check("verse2")]

print()
if all(results):
    print("✅ Newline-delimited bars fix is working in production.")
else:
    print("❌ At least one section came back as a run-on line. The AI may need a stronger prompt constraint, or this was an off-sample generation — try running again to rule out one-off model variance before assuming a regression.")
PYEOF
rm -f "$RESPONSE_FILE"