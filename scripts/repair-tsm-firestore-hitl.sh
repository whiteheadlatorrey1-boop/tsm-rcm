#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="tsm-rcm-prod"
DATABASE="tsm-consultz"
USER_CREDS="tsm-ledger-service-1786151838"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="backups/tsm-firestore-hitl-${STAMP}"
mkdir -p "$BACKUP_DIR"

echo
echo "============================================================"
echo " TSM FIRESTORE HITL CREDENTIAL REPAIR"
echo "============================================================"
echo
echo "Project : $PROJECT"
echo "Database: $DATABASE"
echo "User    : $USER_CREDS"
echo

command -v gcloud >/dev/null 2>&1 || {
  echo "ERROR: gcloud CLI is required."
  exit 1
}

command -v node >/dev/null 2>&1 || {
  echo "ERROR: node is required."
  exit 1
}

[[ -f .env ]] || {
  echo "ERROR: .env not found."
  exit 1
}

cp -p .env "$BACKUP_DIR/.env.before"

echo "[1/8] Setting Google Cloud project..."
gcloud config set project "$PROJECT" >/dev/null
echo "      OK"

echo
echo "[2/8] Reading Firestore database metadata..."

DB_INFO="$(
  gcloud firestore databases describe \
    --database="$DATABASE" \
    --project="$PROJECT" \
    --format='value(locationId,uid)'
)"

DB_LOCATION="$(printf '%s\n' "$DB_INFO" | awk '{print $1}')"
DB_UID="$(printf '%s\n' "$DB_INFO" | awk '{print $2}')"

if [[ -z "$DB_LOCATION" || -z "$DB_UID" ]]; then
  echo "ERROR: Could not determine database location/UID."
  echo "Raw response:"
  printf '%s\n' "$DB_INFO"
  exit 1
fi

HOST="${DB_UID}.${DB_LOCATION}.firestore.goog"

echo "      Location: $DB_LOCATION"
echo "      UID     : $DB_UID"
echo "      Host    : $HOST"

echo
echo "[3/8] Verifying existing Firestore user credential..."

if ! gcloud firestore user-creds describe "$USER_CREDS" \
    --database="$DATABASE" \
    --project="$PROJECT" \
    --format='yaml(name,resourceIdentity)' 2>/dev/null; then

  echo
  echo "ERROR: Credential $USER_CREDS was not found."
  echo
  echo "Available credentials:"
  echo

  gcloud firestore user-creds list \
    --database="$DATABASE" \
    --project="$PROJECT" \
    --format='table(name,resourceIdentity)' \
    2>/dev/null || true

  exit 1
fi

echo
echo "[4/8] Locating password-reset command..."

RESET_CMD=""

if gcloud firestore user-creds reset-password --help >/dev/null 2>&1; then
  RESET_CMD="gcloud firestore user-creds reset-password"
elif gcloud beta firestore user-creds reset-password --help >/dev/null 2>&1; then
  RESET_CMD="gcloud beta firestore user-creds reset-password"
else
  echo
  echo "ERROR: This gcloud installation does not expose"
  echo "       firestore user-creds reset-password."
  echo
  echo "Available user-creds commands:"
  gcloud firestore user-creds --help 2>&1 || true
  echo
  echo "Try:"
  echo "  gcloud components update"
  echo
  exit 1
fi

echo "      Using: $RESET_CMD"

echo
echo "[5/8] Resetting password for existing credential..."

echo
echo "      Google will return the new password ONCE."
echo "      It will be captured automatically and NOT printed."
echo

PASSWORD="$(
  $RESET_CMD "$USER_CREDS" \
    --database="$DATABASE" \
    --project="$PROJECT" \
    --format='value(securePassword)'
)"

if [[ -z "$PASSWORD" ]]; then
  echo
  echo "ERROR: Password reset did not return securePassword."
  echo
  echo "Returned metadata:"
  printf '%s\n' "$CREDS_OUTPUT" |
    sed -E 's/(securePassword:).*/\1 <REDACTED>/'
  exit 1
fi

echo "      Password reset: OK"

echo
echo "[6/8] Building Firestore MongoDB connection string..."

ENCODED_PASSWORD="$(
  node -e '
    console.log(encodeURIComponent(process.argv[1]));
  ' "$PASSWORD"
)"

NEW_URI="mongodb://${USER_CREDS}:${ENCODED_PASSWORD}@${HOST}:443/${DATABASE}?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false"

echo "      Host     : $HOST"
echo "      User     : $USER_CREDS"
echo "      Database : $DATABASE"
echo "      Password : <REDACTED>"

echo
echo "[7/8] Updating .env..."

python3 - "$NEW_URI" <<'PY'
import sys
from pathlib import Path

new_uri = sys.argv[1]
p = Path(".env")

lines = p.read_text().splitlines()
out = []
found = False

for line in lines:
    if line.startswith("MONGODB_URI="):
        out.append("MONGODB_URI=" + new_uri)
        found = True
    else:
        out.append(line)

if not found:
    out.append("MONGODB_URI=" + new_uri)

p.write_text("\n".join(out) + "\n")
PY

echo "      .env updated."

echo
echo "[8/8] Testing Firestore MongoDB authentication..."

MONGODB_URI="$NEW_URI" node <<'NODE'
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI missing");
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000
  });

  try {
    await client.connect();

    const db = client.db("tsm-consultz");
    const result = await db.command({ ping: 1 });

    console.log("      FIRESTORE MONGO AUTH: PASS");
    console.log("      ping:", result.ok);
  } catch (err) {
    console.error("      FIRESTORE MONGO AUTH: FAILED");
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
})();
NODE

cat > "$BACKUP_DIR/README.txt" <<EOF
TSM Firestore HITL credential repair

Project:
  $PROJECT

Database:
  $DATABASE

Credential:
  $USER_CREDS

Host:
  $HOST

Original .env:
  .env.before

No Firestore data was deleted.
No database was recreated.

The Firestore user credential password was reset and the
new connection string was written to .env.
EOF

echo
echo "============================================================"
echo " FIRESTORE AUTH REPAIR COMPLETE"
echo "============================================================"
echo
echo "Credential : $USER_CREDS"
echo "Database   : $DATABASE"
echo "Host       : $HOST"
echo
echo "Backup:"
echo "  $BACKUP_DIR"
echo
echo "If authentication passed, start TSM with:"
echo
echo "  node server.js"
echo
echo "Then verify the HITL hydration messages."
echo
