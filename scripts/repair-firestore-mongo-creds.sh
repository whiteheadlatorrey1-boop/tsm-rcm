#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="backups/firestore-mongo-auth-${STAMP}"
mkdir -p "$BACKUP"

echo
echo "============================================================"
echo " TSM / FIRESTORE MONGODB AUTH REPAIR"
echo "============================================================"
echo

redact() {
  sed -E \
    -e 's#(mongodb(\+srv)?://[^:]+:)[^@]+@#\1<REDACTED>@#g' \
    -e 's#(MONGODB_URI=).*#\1<REDACTED>#g' \
    -e 's#(PASSWORD|PASS|SECRET|TOKEN)=.*#\1=<REDACTED>#Ig'
}

echo "[1/7] Backing up environment..."

for f in .env .env.local .env.production; do
  if [[ -f "$f" ]]; then
    cp -p "$f" "$BACKUP/$(basename "$f").bak"
  fi
done

echo "      Backup: $BACKUP"

echo
echo "[2/7] Current MONGODB_URI source..."

grep -R -n \
  "MONGODB_URI" \
  . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude='*.patch' \
  2>/dev/null \
  | redact \
  | head -100 || true

echo
echo "[3/7] Firestore / Google configuration..."

grep -R -n -Ei \
  "firestore\.goog|firestore|gcloud|google.*cloud|google.*credentials|service.?account|tsm-ledger-service" \
  .env* server.js routes scripts package.json 2>/dev/null \
  | redact \
  | head -200 || true

echo
echo "[4/7] Current credential metadata..."

URI="${MONGODB_URI:-}"

if [[ -z "$URI" && -f .env ]]; then
  URI="$(grep '^MONGODB_URI=' .env | head -1 | cut -d= -f2-)"
fi

if [[ -z "$URI" ]]; then
  echo "ERROR: MONGODB_URI not found."
  exit 1
fi

USER_NAME="$(printf '%s' "$URI" | sed -n 's#mongodb://\([^:]*\):.*#\1#p')"
HOST="$(printf '%s' "$URI" | sed -n 's#mongodb://[^@]*@\([^:/]*\).*#\1#p')"
DB="$(printf '%s' "$URI" | sed -n 's#mongodb://[^/]*/\([^?]*\).*#\1#p')"

echo "      Provider : Firestore MongoDB compatibility"
echo "      Host     : $HOST"
echo "      User     : $USER_NAME"
echo "      Database : $DB"

if [[ "$HOST" != *"firestore.goog" ]]; then
  echo
  echo "WARNING: Endpoint is not a firestore.goog endpoint."
  echo "Review configuration before proceeding."
fi

echo
echo "[5/7] Checking Google Cloud CLI..."

if command -v gcloud >/dev/null 2>&1; then
  echo "      gcloud: available"

  echo
  echo "      Active account:"
  gcloud auth list --filter=status:ACTIVE \
    --format='value(account)' 2>/dev/null || true

  echo
  echo "      Active project:"
  gcloud config get-value project 2>/dev/null || true
else
  echo "      gcloud: NOT INSTALLED"
fi

echo
echo "[6/7] Checking whether the application is using the stale URI..."

echo
echo "      Current application URI:"
printf '%s\n' "$URI" | redact

echo
echo "      IMPORTANT:"
echo "      This endpoint is Google Firestore MongoDB compatibility."
echo "      The password cannot be repaired by restarting MongoDB locally."
echo

echo "[7/7] Generating credential-repair instructions..."

cat > "$BACKUP/NEXT-STEPS.txt" <<EOF
TSM FIRESTORE MONGODB AUTH

The TSM application is connecting to:

Provider:
  Google Cloud Firestore MongoDB compatibility

Host:
  $HOST

User:
  $USER_NAME

Database:
  $DB

The server responds:

  MongoServerError: Invalid password. Please verify the UserCreds.

This means the password embedded in MONGODB_URI is invalid/stale.

DO NOT:
  - docker compose down -v
  - delete Mongo volumes
  - reset local Mongo
  - change PostgreSQL credentials
  - create a new arbitrary Mongo password

NEXT ACTION:

Obtain the current MongoDB connection credentials for the
Firestore database from Google Cloud Console / Firestore
MongoDB compatibility configuration.

Then update:

  .env

MONGODB_URI=...

Preserve:

  tls=true
  authMechanism=SCRAM-SHA-256
  retryWrites=false
  loadBalanced=true

After replacing the password, test:

  node -e "const {MongoClient}=require('mongodb'); const u=process.env.MONGODB_URI; const c=new MongoClient(u); c.connect().then(()=>c.db().command({ping:1})).then(()=>console.log('FIRESTORE MONGO AUTH OK')).catch(e=>{console.error(e.message);process.exit(1)}).finally(()=>c.close())"

Then start TSM and verify that the HITL gates hydrate.
EOF

echo
echo "============================================================"
echo " DONE"
echo "============================================================"
echo
echo "Diagnostic/backup directory:"
echo "  $BACKUP"
echo
echo "Next steps:"
echo "  $BACKUP/NEXT-STEPS.txt"
echo
echo "No credentials were changed automatically."
echo "No database data was deleted."
echo
