#!/usr/bin/env bash
# scripts/rotate-mongo-cred.sh
#
# Deletes the old tsm-ledger-service SCRAM credential (if present), creates a
# fresh one with a unique id, and writes MONGODB_URI into .env directly —
# the password is never printed to the terminal or returned by this script.
#
# Usage: bash scripts/rotate-mongo-cred.sh

set -euo pipefail

PROJECT="tsm-rcm-prod"
DATABASE="tsm-consultz"
HOST="89da3c40-cf0e-4a06-ae72-e98579dc55cd.nam5.firestore.goog"
OLD_CRED_IDS=("tsm-ledger-service" "tsm-ledger-service-v2")
NEW_CRED_ID="tsm-ledger-service-$(date +%s)"
ENV_FILE=".env"

echo "== Deleting any old credentials =="
for id in "${OLD_CRED_IDS[@]}"; do
  echo "  attempting delete: $id"
  curl -s -X DELETE \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    "https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DATABASE}/userCreds/${id}" \
    > /dev/null || true
done

echo "== Creating new credential: ${NEW_CRED_ID} =="
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DATABASE}/userCreds?userCredsId=${NEW_CRED_ID}" \
  -d '{}')

# Parse with python3 so we never echo the raw JSON (which contains the password).
python3 - "$ENV_FILE" "$NEW_CRED_ID" "$HOST" "$DATABASE" << 'PYEOF'
import json, sys, urllib.parse

env_file, cred_id, host, database = sys.argv[1:5]
response = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else None
PYEOF

echo "$RESPONSE" | python3 - "$ENV_FILE" "$NEW_CRED_ID" "$HOST" "$DATABASE" << 'PYEOF'
import json, sys, urllib.parse

env_file, cred_id, host, database = sys.argv[1:5]
data = json.loads(sys.stdin.read())

if data.get("state") != "ENABLED":
    print("ERROR: credential was not created successfully. Full response state:", data.get("state"))
    print(json.dumps({k: v for k, v in data.items() if k != "securePassword"}, indent=2))
    sys.exit(1)

password = data["securePassword"]
user_enc = urllib.parse.quote(cred_id, safe='')
pass_enc = urllib.parse.quote(password, safe='')

uri = (
    f"mongodb://{user_enc}:{pass_enc}@{host}:443/{database}"
    f"?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false"
)

# Read existing .env, strip any old MONGODB_URI lines, append the new one.
try:
    with open(env_file) as f:
        lines = [l for l in f.readlines() if not l.startswith("MONGODB_URI=")]
except FileNotFoundError:
    lines = []

lines.append(f"MONGODB_URI={uri}\n")

with open(env_file, "w") as f:
    f.writelines(lines)

print(f"OK: credential '{cred_id}' created and MONGODB_URI written to {env_file}")
print(f"Password length: {len(password)} chars (not shown)")
PYEOF

echo "== Verifying =="
grep -c MONGODB_URI "$ENV_FILE" || echo "0"
