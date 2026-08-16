#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="tsm-rcm-prod"
DATABASE="tsm-consultz"
USER_CREDS="tsm-ledger-service-1786151838"

echo
echo "============================================================"
echo " FIRESTORE HITL AUTH DIAGNOSTIC"
echo "============================================================"

gcloud config set project "$PROJECT" >/dev/null

DB_INFO="$(
  gcloud firestore databases describe \
    --database="$DATABASE" \
    --project="$PROJECT" \
    --format='value(locationId,uid)'
)"

DB_LOCATION="$(awk '{print $1}' <<< "$DB_INFO")"
DB_UID="$(awk '{print $2}' <<< "$DB_INFO")"
HOST="${DB_UID}.${DB_LOCATION}.firestore.goog"

echo
echo "Database : $DATABASE"
echo "User     : $USER_CREDS"
echo "Host     : $HOST"

echo
echo "[1/4] Resetting credential..."

CREDS_OUTPUT="$(
  gcloud firestore user-creds reset-password "$USER_CREDS" \
    --database="$DATABASE" \
    --project="$PROJECT" \
    --format='yaml(name,resourceIdentity,securePassword)'
)"

PASSWORD="$(
  printf '%s\n' "$CREDS_OUTPUT" |
  sed -n 's/^securePassword:[[:space:]]*//p'
)"

[[ -n "$PASSWORD" ]] || {
  echo "ERROR: No password returned."
  exit 1
}

echo "      Password received."

echo
echo "[2/4] Testing RAW password..."

RAW_URI="mongodb://${USER_CREDS}:${PASSWORD}@${HOST}:443/${DATABASE}?loadBalanced=true&authMechanism=SCRAM-SHA-256&tls=true&retryWrites=false"

MONGODB_URI="$RAW_URI" node <<'NODE'
const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000
  });

  try {
    await client.connect();
    const result = await client.db("tsm-consultz").command({ping: 1});
    console.log("      RAW PASSWORD: PASS");
    console.log("      ping:", result.ok);
  } catch (e) {
    console.log("      RAW PASSWORD: FAIL");
    console.log("      " + e.message);
    process.exitCode = 10;
  } finally {
    await client.close().catch(() => {});
  }
})();
NODE

RAW_RESULT=$?

echo
echo "[3/4] Testing URL-encoded password..."

ENCODED_PASSWORD="$(
  node -e 'console.log(encodeURIComponent(process.argv[1]))' "$PASSWORD"
)"

ENCODED_URI="mongodb://${USER_CREDS}:${ENCODED_PASSWORD}@${HOST}:443/${DATABASE}?loadBalanced=true&authMechanism=SCRAM-SHA-256&tls=true&retryWrites=false"

MONGODB_URI="$ENCODED_URI" node <<'NODE'
const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000
  });

  try {
    await client.connect();
    const result = await client.db("tsm-consultz").command({ping: 1});
    console.log("      ENCODED PASSWORD: PASS");
    console.log("      ping:", result.ok);
  } catch (e) {
    console.log("      ENCODED PASSWORD: FAIL");
    console.log("      " + e.message);
    process.exitCode = 11;
  } finally {
    await client.close().catch(() => {});
  }
})();
NODE

ENCODED_RESULT=$?

echo
echo "[4/4] Result"

if [[ "$RAW_RESULT" -eq 0 ]]; then
  echo
  echo "============================================================"
  echo " RAW PASSWORD AUTHENTICATES"
  echo "============================================================"
  echo
  echo "The previous repair encoded the generated password."
  echo "The correct .env URI should use the RAW generated password."
  echo
  echo "Updating .env now..."

  python3 - "$RAW_URI" <<'PY'
import sys
from pathlib import Path

uri = sys.argv[1]
p = Path(".env")

lines = p.read_text().splitlines()
out = []
found = False

for line in lines:
    if line.startswith("MONGODB_URI="):
        out.append("MONGODB_URI=" + uri)
        found = True
    else:
        out.append(line)

if not found:
    out.append("MONGODB_URI=" + uri)

p.write_text("\n".join(out) + "\n")
PY

  echo "      .env updated with RAW password."
  echo
  echo "      FIRESTORE HITL AUTH: FIXED"
  exit 0
fi

echo
echo "============================================================"
echo " RAW PASSWORD DID NOT AUTHENTICATE"
echo "============================================================"

if [[ "$ENCODED_RESULT" -eq 0 ]]; then
  echo
  echo "Interesting: encoded form authenticated."
  echo "The existing .env should use the encoded form."
  exit 0
fi

echo
echo "Both forms failed."
echo
echo "DO NOT reset the credential again yet."
echo
echo "At this point we need to inspect:"
echo "  1. Firestore user credential state"
echo "  2. IAM binding for the user credential"
echo "  3. Database UID/location"
echo "  4. MongoDB Node driver version"
echo "  5. Whether another MONGODB_URI is overriding .env"
echo

exit 20
