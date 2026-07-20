#!/usr/bin/env bash
# One-shot fix for: stale server process on 8080 + inconsistent/dead Groq key.
# Run from repo root: bash fix-groq-and-restart.sh
set -uo pipefail

REPO="/workspaces/TSM-Consultz"
cd "$REPO" || { echo "Repo not found at $REPO — edit REPO= at top of script"; exit 1; }

echo "════════════════════════════════════════"
echo "1) Killing anything already bound to :8080"
echo "════════════════════════════════════════"
PIDS=$(lsof -ti :8080 || true)
if [ -n "$PIDS" ]; then
  echo "Killing PID(s): $PIDS"
  kill -9 $PIDS
  sleep 1
else
  echo "Nothing listening on :8080 — clean."
fi

echo
echo "════════════════════════════════════════"
echo "2) Checking for .env and current key values"
echo "════════════════════════════════════════"
ENV_FILE=""
for f in .env html/.env; do
  if [ -f "$f" ]; then ENV_FILE="$f"; break; fi
done

if [ -z "$ENV_FILE" ]; then
  echo "No .env found at repo root or html/. Creating one at ./.env"
  ENV_FILE=".env"
  touch "$ENV_FILE"
fi
echo "Using: $ENV_FILE"

CURRENT_KEY=$(grep -E '^GROQ_API_KEY=' "$ENV_FILE" | tail -1 | cut -d= -f2-)
CURRENT_KEY2=$(grep -E '^GROQ_KEY=' "$ENV_FILE" | tail -1 | cut -d= -f2-)

echo "GROQ_API_KEY in file: ${CURRENT_KEY:0:8}...(${#CURRENT_KEY} chars)"
echo "GROQ_KEY in file:     ${CURRENT_KEY2:0:8}...(${#CURRENT_KEY2} chars)"

echo
read -rp "Paste a FRESH Groq key from https://console.groq.com/keys (or press Enter to keep existing): " NEW_KEY

if [ -n "$NEW_KEY" ]; then
  # Remove old lines for both var names, then append fresh ones so both match.
  grep -vE '^GROQ_API_KEY=|^GROQ_KEY=' "$ENV_FILE" > "${ENV_FILE}.tmp" || true
  mv "${ENV_FILE}.tmp" "$ENV_FILE"
  echo "GROQ_API_KEY=$NEW_KEY" >> "$ENV_FILE"
  echo "GROQ_KEY=$NEW_KEY" >> "$ENV_FILE"
  echo "Wrote matching GROQ_API_KEY and GROQ_KEY to $ENV_FILE"
  export GROQ_API_KEY="$NEW_KEY"
  export GROQ_KEY="$NEW_KEY"
else
  export GROQ_API_KEY="$CURRENT_KEY"
  export GROQ_KEY="${CURRENT_KEY2:-$CURRENT_KEY}"
fi

echo
echo "════════════════════════════════════════"
echo "3) Verifying the key against Groq directly (before touching the app)"
echo "════════════════════════════════════════"
RESP=$(curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY")
if echo "$RESP" | grep -q '"error"'; then
  echo "❌ Groq rejected this key:"
  echo "$RESP" | head -c 300
  echo
  echo "STOP — fix the key before restarting the server (get a new one at https://console.groq.com/keys)."
  exit 1
else
  echo "✅ Key is valid — Groq returned a model list."
fi

echo
echo "════════════════════════════════════════"
echo "4) Starting the server fresh in the background, logging to server.log"
echo "════════════════════════════════════════"
nohup npm start > server.log 2>&1 &
NEW_PID=$!
echo "Started npm start as PID $NEW_PID"
sleep 3

if kill -0 "$NEW_PID" 2>/dev/null; then
  echo "✅ Server process is alive."
else
  echo "❌ Server exited immediately — dumping server.log:"
  cat server.log
  exit 1
fi

echo
echo "════════════════════════════════════════"
echo "5) Tailing server.log — watch for 'Invalid API Key' or 'Groq error response'"
echo "   (Ctrl+C to stop tailing; the server keeps running in the background)"
echo "════════════════════════════════════════"
tail -f server.log