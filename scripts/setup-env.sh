#!/usr/bin/env bash
# Safely collects TSM_ADMIN_PASSWORD, TSM_SESSION_SECRET, and MONGODB_URI
# and writes them to .env — without ever echoing them to the terminal or
# letting bash reinterpret special characters like & in the middle of typing.
#
# Usage:
#   bash scripts/setup-env.sh
#
# Run this from the repo root (where .env should live).

set -euo pipefail

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%s)"
  echo "Existing .env backed up."
fi

# Remove any prior (possibly broken/duplicated) lines for these three keys
# so re-running this script is safe and idempotent.
if [ -f "$ENV_FILE" ]; then
  sed -i.tmp \
    -e '/^TSM_ADMIN_PASSWORD=/d' \
    -e '/^TSM_SESSION_SECRET=/d' \
    -e '/^MONGODB_URI=/d' \
    "$ENV_FILE"
  rm -f "${ENV_FILE}.tmp"
fi

prompt_secret() {
  local var_name="$1"
  local label="$2"
  local value=""
  # -s suppresses echo entirely; -r prevents backslash escaping surprises.
  read -r -s -p "Enter $label (input hidden): " value
  echo
  if [ -z "$value" ]; then
    echo "  (skipped — no value entered for $var_name)"
    return
  fi
  # printf '%s\n' with single-quoted format writes the literal value —
  # bash does not re-parse $value for &, quotes, etc. when used this way.
  printf '%s=%s\n' "$var_name" "$value" >> "$ENV_FILE"
  echo "  $var_name written to $ENV_FILE."
}

echo "This will prompt for three values. Nothing you type will be shown"
echo "on screen or written anywhere except $ENV_FILE."
echo

prompt_secret "TSM_ADMIN_PASSWORD" "a NEW admin password (do not reuse an old one)"
prompt_secret "TSM_SESSION_SECRET" "a NEW long random session secret"
prompt_secret "MONGODB_URI" "the full Firestore MongoDB connection string (mongodb://user:pass@host:443/tsm-consultz?...)"

echo
echo "Done. Verifying keys are present (values are not printed):"
grep -c "^TSM_ADMIN_PASSWORD=" "$ENV_FILE" | xargs -I{} echo "  TSM_ADMIN_PASSWORD lines: {}"
grep -c "^TSM_SESSION_SECRET=" "$ENV_FILE" | xargs -I{} echo "  TSM_SESSION_SECRET lines: {}"
grep -c "^MONGODB_URI=" "$ENV_FILE" | xargs -I{} echo "  MONGODB_URI lines: {}"
echo
echo "Each should read 1. If any read 0, re-run this script and enter that value."
echo "Restart the server with: node server.js"
