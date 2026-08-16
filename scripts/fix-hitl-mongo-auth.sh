#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="backups/hitl-auth-${STAMP}"
mkdir -p "$BACKUP_DIR"

echo
echo "============================================================"
echo " TSM HITL GATE / MONGO AUTH REPAIR"
echo "============================================================"
echo "Root: $ROOT"
echo "Backup: $BACKUP_DIR"
echo

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

redact() {
  sed -E \
    -e 's#(mongodb(\+srv)?://[^:]+:)[^@]+@#\1<REDACTED>@#g' \
    -e 's#((PASSWORD|PASS|SECRET|TOKEN)[[:space:]]*=[[:space:]]*)[^[:space:]]+#\1<REDACTED>#Ig' \
    -e 's#((password|passwd|pwd)[[:space:]]*[:=][[:space:]]*)[^,;[:space:]}]+#\1<REDACTED>#Ig'
}

fail() {
  echo
  echo "ERROR: $*"
  echo
  echo "No destructive database operation was performed."
  exit 1
}

# ------------------------------------------------------------
# Backup relevant files
# ------------------------------------------------------------

echo "[1/10] Backing up HITL configuration..."

for f in \
  "html/shared/tsm-hitl-gate.js" \
  "server.js" \
  "routes/enterprise-capability-bridge.js" \
  ".env" \
  ".env.local" \
  ".env.production" \
  "docker-compose.yml" \
  "docker-compose.yaml"
do
  if [[ -f "$f" ]]; then
    cp -p "$f" "$BACKUP_DIR/$(basename "$f").bak"
  fi
done

echo "      Backup complete."

# ------------------------------------------------------------
# Locate HITL persistence
# ------------------------------------------------------------

echo
echo "[2/10] Locating TSMHitlGate persistence..."

HITL_FILE="html/shared/tsm-hitl-gate.js"

[[ -f "$HITL_FILE" ]] || fail "$HITL_FILE not found."

echo
grep -n -E \
  "function hydrate|hydrate|UserCreds|mongodb|MongoClient|mongoose|persist|MONGO" \
  "$HITL_FILE" | head -120 || true

echo
echo "Shared HITL gate confirmed:"
echo "  $HITL_FILE"

# ------------------------------------------------------------
# Locate Mongo/UserCreds references
# ------------------------------------------------------------

echo
echo "[3/10] Searching for shared Mongo/UserCreds configuration..."

SEARCH_OUT="$BACKUP_DIR/mongo-config-search.txt"

grep -R -n -E \
  "UserCreds|MongoClient|mongoose|mongodb|MONGO_URI|MONGODB_URI|MONGO_URL|MONGO_USER|MONGO_PASSWORD|MONGO_DB" \
  server.js routes html/shared scripts . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude='*.patch' \
  > "$SEARCH_OUT" 2>/dev/null || true

echo "      Search saved to:"
echo "      $SEARCH_OUT"

echo
head -150 "$SEARCH_OUT" | redact || true

# ------------------------------------------------------------
# Environment discovery
# ------------------------------------------------------------

echo
echo "[4/10] Inspecting application environment..."

ENV_FILES=()

for f in .env .env.local .env.production; do
  [[ -f "$f" ]] && ENV_FILES+=("$f")
done

if [[ ${#ENV_FILES[@]} -eq 0 ]]; then
  echo "      No .env files found."
else
  for f in "${ENV_FILES[@]}"; do
    echo
    echo "----- $f -----"
    grep -E \
      "^(MONGO|MONGODB|DATABASE|DB_|USERCREDS|TSM_)" \
      "$f" 2>/dev/null | redact || true
  done
fi

echo
echo "----- process environment -----"

env | grep -Ei \
  '^(MONGO|MONGODB|DATABASE|DB_|USERCREDS|TSM_)' \
  | redact || true

# ------------------------------------------------------------
# Docker discovery
# ------------------------------------------------------------

echo
echo "[5/10] Inspecting Docker..."

if ! command -v docker >/dev/null 2>&1; then
  echo "      Docker not installed/available."
else
  docker compose ps 2>/dev/null || true

  echo
  echo "Mongo-related containers:"
  docker ps -a \
    --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' \
    | grep -Ei 'mongo|mongodb' || true
fi

# ------------------------------------------------------------
# Discover Mongo URI
# ------------------------------------------------------------

echo
echo "[6/10] Determining Mongo connection configuration..."

MONGO_URI=""

# Prefer explicit process environment.
for key in MONGO_URI MONGODB_URI MONGO_URL DATABASE_URL; do
  value="${!key:-}"
  if [[ "$value" == mongodb://* || "$value" == mongodb+srv://* ]]; then
    MONGO_URI="$value"
    echo "      Found $key in process environment."
    break
  fi
done

# Then .env files.
if [[ -z "$MONGO_URI" ]]; then
  for f in .env .env.local .env.production; do
    [[ -f "$f" ]] || continue

    while IFS='=' read -r key value; do
      case "$key" in
        MONGO_URI|MONGODB_URI|MONGO_URL|DATABASE_URL)
          value="${value%$'\r'}"
          value="${value#\"}"
          value="${value%\"}"

          if [[ "$value" == mongodb://* || "$value" == mongodb+srv://* ]]; then
            MONGO_URI="$value"
            echo "      Found $key in $f."
            break 2
          fi
          ;;
      esac
    done < "$f"
  done
fi

if [[ -z "$MONGO_URI" ]]; then
  echo
  echo "      No Mongo URI automatically detected."
  echo
  echo "      The HITL implementation appears to use Mongo persistence,"
  echo "      but the connection string is not exposed through the"
  echo "      standard environment names."
  echo
  echo "      Inspect:"
  echo "        $SEARCH_OUT"
  echo
  fail "Unable to safely determine the shared Mongo connection."
fi

echo
echo "      Mongo URI:"
echo "      $(printf '%s' "$MONGO_URI" | redact)"

# ------------------------------------------------------------
# Test Mongo authentication
# ------------------------------------------------------------

echo
echo "[7/10] Testing Mongo authentication..."

MONGO_TEST_OK=0

if command -v mongosh >/dev/null 2>&1; then
  if mongosh "$MONGO_URI" \
      --quiet \
      --eval 'db.adminCommand({ping:1})' \
      >/tmp/tsm-mongo-auth-test-${STAMP}.log 2>&1; then

    MONGO_TEST_OK=1
    echo "      Mongo authentication: PASS"
  else
    echo "      Mongo authentication: FAILED"
    cat /tmp/tsm-mongo-auth-test-${STAMP}.log | redact || true
  fi
else
  echo "      mongosh not installed on host."

  MONGO_CONTAINER="$(docker ps \
    --format '{{.Names}} {{.Image}}' 2>/dev/null \
    | awk 'BEGIN{IGNORECASE=1} /mongo|mongodb/ {print $1; exit}')"

  if [[ -n "${MONGO_CONTAINER:-}" ]]; then
    echo "      Mongo container detected: $MONGO_CONTAINER"
    echo "      Host mongosh unavailable; using container for inspection."

    if docker exec "$MONGO_CONTAINER" mongosh \
        --quiet \
        --eval 'db.adminCommand({ping:1})' \
        >/tmp/tsm-mongo-container-test-${STAMP}.log 2>&1; then

      echo "      Mongo container responds."
    else
      echo "      Mongo container did not accept unauthenticated ping."
      cat /tmp/tsm-mongo-container-test-${STAMP}.log | redact || true
    fi
  fi
fi

# ------------------------------------------------------------
# Check docker compose credential declarations
# ------------------------------------------------------------

echo
echo "[8/10] Checking Docker Mongo credentials..."

COMPOSE_FILE=""

if [[ -f docker-compose.yml ]]; then
  COMPOSE_FILE="docker-compose.yml"
elif [[ -f docker-compose.yaml ]]; then
  COMPOSE_FILE="docker-compose.yaml"
fi

if [[ -n "$COMPOSE_FILE" ]]; then
  echo "      Compose file: $COMPOSE_FILE"

  grep -n -A30 -B5 -Ei \
    "mongo|mongodb|MONGO_INITDB|MONGO_URI|MONGODB_URI" \
    "$COMPOSE_FILE" \
    | redact \
    | head -200 || true
else
  echo "      No docker-compose.yml/yaml found."
fi

# ------------------------------------------------------------
# Important safety rule:
# never reset Mongo credentials blindly
# ------------------------------------------------------------

echo
echo "[9/10] Applying safe runtime repair..."

# We deliberately DO NOT:
#   - drop Mongo databases
#   - remove Docker volumes
#   - reset Mongo passwords blindly
#   - invent a password
#
# Instead, if the Mongo connection works, restart the application.
# If it doesn't, preserve the evidence for exact credential repair.

if [[ "$MONGO_TEST_OK" -eq 1 ]]; then
  echo "      Mongo credentials are valid from this environment."
  echo "      This points to a runtime/environment mismatch."
else
  echo "      Mongo authentication could not be confirmed."
  echo "      No destructive credential reset will be attempted."
fi

# ------------------------------------------------------------
# Restart application
# ------------------------------------------------------------

echo
echo "[10/10] Restarting TSM runtime..."

if command -v docker >/dev/null 2>&1 && [[ -n "$COMPOSE_FILE" ]]; then
  echo "      Restarting compose application..."

  docker compose restart 2>/dev/null || \
    docker compose up -d 2>/dev/null || true
else
  echo "      Docker compose restart unavailable."
  echo "      Start the TSM server normally after reviewing diagnostics."
fi

sleep 3

echo
echo "============================================================"
echo " HITL AUTH REPAIR SUMMARY"
echo "============================================================"

echo
echo "Backup:"
echo "  $BACKUP_DIR"

echo
echo "Mongo URI:"
printf '  %s\n' "$(printf '%s' "$MONGO_URI" | redact)"

echo
echo "HITL persistence source:"
echo "  $HITL_FILE"

echo
echo "Mongo authentication test:"
if [[ "$MONGO_TEST_OK" -eq 1 ]]; then
  echo "  PASS"
else
  echo "  NOT CONFIRMED"
fi

echo
echo "Next diagnostic artifact:"
echo "  $SEARCH_OUT"

echo
echo "============================================================"
echo " IMPORTANT"
echo "============================================================"
echo
echo "If the server still reports:"
echo
echo "  [TSMHitlGate:*] hydrate failed: Invalid password"
echo
echo "then the remaining problem is the Mongo credential itself"
echo "or a credential mismatch between the running Mongo instance"
echo "and the application."
echo
echo "This script intentionally did NOT destroy the Mongo volume"
echo "or blindly reset the database password."
echo
echo "The backup/diagnostic artifacts above contain everything"
echo "needed for the final credential correction."
echo
