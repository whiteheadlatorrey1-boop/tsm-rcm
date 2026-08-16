#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="tsm-rcm-prod"

echo
echo "============================================================"
echo " TSM FIRESTORE MONGODB AUTH RESOLUTION"
echo "============================================================"
echo

command -v gcloud >/dev/null 2>&1 || {
  echo "ERROR: gcloud CLI is required."
  exit 1
}

gcloud config set project "$PROJECT" >/dev/null

echo "[1/6] Active Google Cloud project"
echo
gcloud config get-value project
echo

echo "[2/6] Checking Firestore databases"
echo

gcloud firestore databases list \
  --project="$PROJECT" \
  --format="table(name,locationId,type,concurrencyMode,deleteProtectionState)" \
  2>&1 || true

echo
echo "[3/6] Checking Firestore database details"
echo

gcloud firestore databases describe "(default)" \
  --project="$PROJECT" \
  --format="yaml(name,locationId,type,appEngineIntegrationMode,deleteProtectionState,etag)" \
  2>&1 || true

echo
echo "[4/6] Checking available Firestore/Mongo-related gcloud commands"
echo

gcloud firestore --help 2>/dev/null \
  | grep -Ei "mongo|database|user|credential|connection" \
  || true

echo
echo "[5/6] Checking Google APIs/services enabled"
echo

gcloud services list \
  --enabled \
  --project="$PROJECT" \
  --format="value(config.name)" \
  | grep -Ei "firestore|datastore|sql|secret|iam" \
  || true

echo
echo "[6/6] Looking for Secret Manager credentials"
echo

if gcloud secrets list \
    --project="$PROJECT" \
    --format="value(name)" 2>/dev/null \
    | grep -Ei "mongo|firestore|tsm|ledger|database|mongo"; then
  echo
  echo "Potential database secrets found above."
  echo "Their values were NOT displayed."
else
  echo "No obviously named Mongo/Firestore/TSM database secrets found."
fi

echo
echo "============================================================"
echo " NEXT"
echo "============================================================"
echo
echo "If the Mongo credential is managed by Firestore, the next"
echo "output should identify the Firestore MongoDB connection/user"
echo "configuration or point us to the credential source."
echo
echo "No database changes were made."
echo
