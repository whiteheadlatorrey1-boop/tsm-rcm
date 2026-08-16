#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="tsm-rcm-prod"
DATABASE="tsm-consultz"
USER_CREDS="tsm-ledger-service-1786151838"

echo
echo "============================================================"
echo " TSM FIRESTORE USERCREDS DIAGNOSTIC"
echo "============================================================"

gcloud config set project "$PROJECT" >/dev/null

echo
echo "[1/7] Firestore database"

gcloud firestore databases describe \
  --database="$DATABASE" \
  --project="$PROJECT" \
  --format='yaml(name,uid,locationId,type,etag)' \
  2>&1 || true

echo
echo "[2/7] Firestore UserCreds"

gcloud firestore user-creds describe "$USER_CREDS" \
  --database="$DATABASE" \
  --project="$PROJECT" \
  --format='yaml(name,resourceIdentity)' \
  2>&1 || true

echo
echo "[3/7] All UserCreds"

gcloud firestore user-creds list \
  --database="$DATABASE" \
  --project="$PROJECT" \
  --format='table(name,resourceIdentity)' \
  2>&1 || true

echo
echo "[4/7] IAM policy for project"

gcloud projects get-iam-policy "$PROJECT" \
  --flatten="bindings[].members" \
  --filter="bindings.members:firestore.googleapis.com" \
  --format="table(bindings.role,bindings.members)" \
  2>&1 || true

echo
echo "[5/7] IAM policy entries mentioning the HITL credential"

gcloud projects get-iam-policy "$PROJECT" \
  --flatten="bindings[].members" \
  --filter="bindings.members:$USER_CREDS" \
  --format="table(bindings.role,bindings.members)" \
  2>&1 || true

echo
echo "[6/7] Firestore database connection-string command"

if gcloud firestore databases connection-string --help >/dev/null 2>&1; then

  echo "      connection-string command: AVAILABLE"

  gcloud firestore databases connection-string \
    --database="$DATABASE" \
    --project="$PROJECT" \
    --auth=scram-sha-256 \
    2>&1 || true

else
  echo "      connection-string command: NOT AVAILABLE"
fi

echo
echo "[7/7] Google Cloud SDK version"

gcloud version

echo
echo "============================================================"
echo " DIAGNOSTIC COMPLETE"
echo "============================================================"
echo
echo "No password was reset."
echo "No .env file was modified."
echo "No Firestore data was changed."
echo
