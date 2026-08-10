#!/usr/bin/env bash
# groq-quota-check.sh
# Checks current Groq rate-limit/quota status by making a minimal
# (1-token) chat completion request and reading the rate-limit headers
# Groq returns on every response (same header set OpenAI uses):
#   x-ratelimit-limit-requests / x-ratelimit-remaining-requests
#   x-ratelimit-limit-tokens    / x-ratelimit-remaining-tokens
#   x-ratelimit-reset-requests  / x-ratelimit-reset-tokens
#
# This does NOT require waiting for a 429 to know where you stand --
# it costs ~1 request and a handful of tokens, not the full budget of
# a real war-room/strategist call.
#
# Usage:
#   ./scripts/groq-quota-check.sh                # uses default model
#   GROQ_MODEL=llama-3.1-8b-instant ./scripts/groq-quota-check.sh
#
# Exit codes:
#   0  quota looks fine
#   1  rate-limited right now (429)
#   2  no API key found / request failed for another reason

set -uo pipefail

# Same precedence order as server.js (GROQ_API_KEY over GROQ_KEY),
# falling back to reading .env directly since this script may run
# outside the node process that normally loads dotenv.
if [ -z "${GROQ_API_KEY:-}" ] && [ -f .env ]; then
  # shellcheck disable=SC1091
  export "$(grep -E '^GROQ_API_KEY=' .env | xargs)" 2>/dev/null
fi
GROQ_KEY="${GROQ_API_KEY:-${GROQ_KEY:-}}"
MODEL="${GROQ_MODEL:-openai/gpt-oss-120b}"

if [ -z "$GROQ_KEY" ]; then
  echo "No GROQ_API_KEY found in environment or .env. Set it and re-run." >&2
  exit 2
fi

TMP_HEADERS="$(mktemp)"
TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_HEADERS" "$TMP_BODY"' EXIT

HTTP_STATUS=$(curl -s -o "$TMP_BODY" -D "$TMP_HEADERS" -w '%{http_code}' \
  https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}")

get_header() {
  grep -i "^$1:" "$TMP_HEADERS" | tail -1 | sed -E "s/^$1: ?//I" | tr -d '\r'
}

echo "=========================================="
echo "Groq quota check — model: $MODEL"
echo "=========================================="
echo "HTTP status: $HTTP_STATUS"

REQ_LIMIT=$(get_header "x-ratelimit-limit-requests")
REQ_REMAIN=$(get_header "x-ratelimit-remaining-requests")
REQ_RESET=$(get_header "x-ratelimit-reset-requests")
TOK_LIMIT=$(get_header "x-ratelimit-limit-tokens")
TOK_REMAIN=$(get_header "x-ratelimit-remaining-tokens")
TOK_RESET=$(get_header "x-ratelimit-reset-tokens")

if [ -n "$TOK_LIMIT" ] || [ -n "$REQ_LIMIT" ]; then
  echo ""
  echo "Requests: ${REQ_REMAIN:-?} / ${REQ_LIMIT:-?} remaining (resets in ${REQ_RESET:-unknown})"
  echo "Tokens:   ${TOK_REMAIN:-?} / ${TOK_LIMIT:-?} remaining (resets in ${TOK_RESET:-unknown})"
else
  echo ""
  echo "No rate-limit headers in response — printing raw body instead:"
  cat "$TMP_BODY"
fi

echo ""
if [ "$HTTP_STATUS" = "429" ]; then
  echo "STATUS: RATE LIMITED right now."
  RETRY_AFTER=$(get_header "retry-after")
  [ -n "$RETRY_AFTER" ] && echo "Retry-After header: ${RETRY_AFTER}s"
  ERR_MSG=$(python3 -c "import json,sys; d=json.load(open('$TMP_BODY')); print(d.get('error',{}).get('message','')) " 2>/dev/null)
  [ -n "$ERR_MSG" ] && echo "Groq message: $ERR_MSG"
  exit 1
elif [ "$HTTP_STATUS" = "200" ]; then
  echo "STATUS: OK — quota available."
  exit 0
else
  echo "STATUS: Request failed (not a rate limit). Raw body:"
  cat "$TMP_BODY"
  exit 2
fi
