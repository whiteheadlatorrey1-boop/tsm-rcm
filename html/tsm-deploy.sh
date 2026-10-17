#!/bin/bash
export FLY_CONFIG_DIR="/workspaces/tsm-shell/.fly_config"
# ══════════════════════════════════════════════════════════════════
#  TSM DEPLOY — migrate HTML apps to Fly.io + sync to droplet
#  Usage: bash tsm-deploy.sh [--fly] [--server] [--audit] [--all]
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

# ── CONFIG ──────────────────────────────────────────────────────
REMOTE_HOST="root@tsm-construction-s-1vcpu-2gb-nyc3-01"
REMOTE_PATH="~/"
AUDIT_DIR="./tmp_root/onclick-audit"
OUTPUT_DIR="/mnt/user-data/outputs"   # where Claude writes files
LOCAL_DEPLOY_DIR="./tmp_root/tsm-deploy"   # staging dir for fly apps

# Fly.io org (set your org slug here, or leave blank for personal)
FLY_ORG=""
FLY_REGION="ord"   # Chicago — closest to Phoenix; change to lax if preferred

# Color helpers
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'
BLU='\033[0;34m'; CYN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GRN}✓${NC}  $*"; }
warn() { echo -e "${YLW}⚠${NC}  $*"; }
info() { echo -e "${BLU}→${NC}  $*"; }
fail() { echo -e "${RED}✗${NC}  $*"; exit 1; }
hdr()  { echo -e "\n${CYN}══ $* ══${NC}"; }

# ── DOMAIN → APP NAME MAP ────────────────────────────────────────
# Maps each subdomain to its Fly app name (tsm- prefix + slug)
declare -A APPS=(
  ["financial-command"]="tsm-financial-command"
  ["hc-billing"]="tsm-hc-billing"
  ["hc-compliance"]="tsm-hc-compliance"
  ["hc-grants"]="tsm-hc-grants"
  ["hc-legal"]="tsm-hc-legal"
  ["hc-medical"]="tsm-hc-medical"
  ["hc-pharmacy"]="tsm-hc-pharmacy"
  ["hc-strategist"]="tsm-hc-strategist"
  ["hc-taxprep"]="tsm-hc-taxprep"
  ["hc-vendors"]="tsm-hc-vendors"
  ["hc-financial"]="tsm-hc-financial"
  ["hc-insurance"]="tsm-hc-insurance"
  ["hc-command"]="tsm-hc-command"
  ["az-ins"]="tsm-az-ins"
  ["construction-command"]="tsm-construction-command"
  ["bpo-legal"]="tsm-bpo-legal"
  ["bpo-realty"]="tsm-bpo-realty"
  ["bpo-tax"]="tsm-bpo-tax"
  ["sample-credit-union"]="tsm-sample-credit-union"
  ["reo-pro"]="tsm-reo-pro"
  ["pc-command"]="tsm-pc-command"
  ["rrd-command"]="tsm-rrd-command"
  ["strategist"]="tsm-strategist"
  ["samplehealthsystem"]="tsm-samplehealthsystem"
)

# ── HTML FILES TO DEPLOY ─────────────────────────────────────────
# Maps fly-app-name → local html file
declare -A HTML_FILES=(
  ["tsm-samplehealthsystem"]="${OUTPUT_DIR}/tsm-samplehealthsystem-dee.html"
  # Add more as they're created:
  # ["tsm-hc-strategist"]="${OUTPUT_DIR}/tsm-hc-strategist.html"
  # ["tsm-construction-command"]="${OUTPUT_DIR}/tsm-samplegc-construction.html"
)

# ════════════════════════════════════════════════════════════════
# FUNCTION: check prerequisites
# ════════════════════════════════════════════════════════════════
check_deps() {
  hdr "Checking prerequisites"
  command -v flyctl &>/dev/null || fail "flyctl not installed. Run: curl -L https://fly.io/install.sh | sh"
  command -v rsync  &>/dev/null || warn "rsync not found — will fall back to scp"
  command -v ssh    &>/dev/null || fail "ssh not found"
  flyctl auth whoami &>/dev/null || fail "Not logged into Fly.io. Run: flyctl auth login"
  ok "All prerequisites met"
  info "Fly.io user: $(flyctl auth whoami 2>/dev/null)"
}

# ════════════════════════════════════════════════════════════════
# FUNCTION: build static-site Dockerfile + fly.toml for one app
# ════════════════════════════════════════════════════════════════
scaffold_app() {
  local SLUG="$1"        # e.g. hc-billing
  local APP_NAME="$2"    # e.g. tsm-hc-billing
  local HTML_SRC="$3"    # full path to the html file
  local APP_DIR="${LOCAL_DEPLOY_DIR}/${APP_NAME}"

  info "Scaffolding ${APP_NAME}…"
  mkdir -p "${APP_DIR}/public"

  # Copy html → index.html
  if [[ -f "$HTML_SRC" ]]; then
    cp "$HTML_SRC" "${APP_DIR}/public/index.html"
    ok "Copied $(basename $HTML_SRC) → ${APP_NAME}/public/index.html"
  else
    warn "No HTML file found for ${APP_NAME} at ${HTML_SRC} — creating placeholder"
    cat > "${APP_DIR}/public/index.html" << PLACEHOLDER
<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${APP_NAME}</title></head>
<body style="font-family:sans-serif;padding:40px;background:#090E19;color:#E8EDF5">
  <h2 style="color:#F47C20">TSM · ${SLUG}.tsmatter.com</h2>
  <p>Deployment in progress. Check back soon.</p>
</body></html>
PLACEHOLDER
  fi

  # Minimal Nginx Dockerfile (no build step — pure static serve)
  cat > "${APP_DIR}/Dockerfile" << 'DOCKER'
FROM nginx:alpine
COPY public /usr/share/nginx/html
EXPOSE 8080
RUN sed -i 's/listen\s*80;/listen 8080;/g' /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
DOCKER

  # fly.toml
  local ORG_LINE=""
  [[ -n "$FLY_ORG" ]] && ORG_LINE="org = \"${FLY_ORG}\""

  cat > "${APP_DIR}/fly.toml" << FLYTOML
app = "${APP_NAME}"
primary_region = "${FLY_REGION}"
${ORG_LINE}

[build]

[http_service]
  internal_port = 8080
  force_https   = true
  auto_stop_machines  = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
FLYTOML

  ok "Scaffolded ${APP_NAME}"
}

# ════════════════════════════════════════════════════════════════
# FUNCTION: deploy one app to fly
# ════════════════════════════════════════════════════════════════
deploy_app() {
  local APP_NAME="$1"
  local APP_DIR="${LOCAL_DEPLOY_DIR}/${APP_NAME}"

  info "Deploying ${APP_NAME} to Fly.io…"
  cd "${APP_DIR}"

  # Create app if it doesn't exist yet
  if ! flyctl apps list 2>/dev/null | grep -q "^${APP_NAME}"; then
    info "Creating new Fly app: ${APP_NAME}"
    local CREATE_FLAGS=" ${APP_NAME}  --machines"
    [[ -n "$FLY_ORG" ]] && CREATE_FLAGS+=" --org ${FLY_ORG}"
    flyctl apps create --org personal  ${CREATE_FLAGS} || warn "App may already exist — continuing deploy"
  fi

  flyctl deploy --app "${APP_NAME}" --ha=false 2>&1 | tail -20
  ok "Deployed ${APP_NAME} → https://${APP_NAME}.fly.dev"
  cd - > /dev/null
}

# ════════════════════════════════════════════════════════════════
# FUNCTION: set custom domain on fly app
# ════════════════════════════════════════════════════════════════
set_custom_domain() {
  local SLUG="$1"        # e.g. hc-billing
  local APP_NAME="$2"    # e.g. tsm-hc-billing
  local DOMAIN="${SLUG}.tsmatter.com"

  info "Attaching custom domain ${DOMAIN} to ${APP_NAME}…"
  flyctl certs add "${DOMAIN}" --app "${APP_NAME}" 2>&1 | tail -5 || warn "Cert may already exist for ${DOMAIN}"
  ok "Domain attached: ${DOMAIN}"
}

# ════════════════════════════════════════════════════════════════
# FUNCTION: copy all output files to remote droplet
# ════════════════════════════════════════════════════════════════
sync_to_server() {
  hdr "Syncing files to ${REMOTE_HOST}"

  # Test SSH connectivity first
  info "Testing SSH connection to ${REMOTE_HOST}…"
  ssh -o ConnectTimeout=8 -o BatchMode=yes "${REMOTE_HOST}" "echo ok" &>/dev/null \
    || fail "Cannot reach ${REMOTE_HOST}. Check SSH key is added and host is reachable."
  ok "SSH connection OK"

  # Sync the full deploy staging dir
  if command -v rsync &>/dev/null; then
    rsync -avz --progress \
      "${LOCAL_DEPLOY_DIR}/" \
      "${REMOTE_HOST}:${REMOTE_PATH}/tsm-deploy/" \
      2>&1
  else
    warn "rsync not available — using scp"
    scp -r "${LOCAL_DEPLOY_DIR}/" "${REMOTE_HOST}:${REMOTE_PATH}/tsm-deploy/"
  fi

  # Also copy the raw output HTML files
  if [[ -d "$OUTPUT_DIR" ]]; then
    info "Copying HTML outputs…"
    scp "${OUTPUT_DIR}"/*.html "${REMOTE_HOST}:${REMOTE_PATH}/tsm-html/" 2>/dev/null || warn "No html files found or remote dir missing — creating it"
    ssh "${REMOTE_HOST}" "mkdir -p ${REMOTE_PATH}/tsm-html"
    scp "${OUTPUT_DIR}"/*.html "${REMOTE_HOST}:${REMOTE_PATH}/tsm-html/" 2>/dev/null || true
  fi

  # Copy the onclick audit dir if it exists
  if [[ -d "$AUDIT_DIR" ]]; then
    info "Copying onclick audit dir…"
    rsync -avz "${AUDIT_DIR}/" "${REMOTE_HOST}:${REMOTE_PATH}/onclick-audit/" 2>/dev/null \
      || scp -r "${AUDIT_DIR}/" "${REMOTE_HOST}:${REMOTE_PATH}/onclick-audit/"
  fi

  ok "Sync complete → ${REMOTE_HOST}:${REMOTE_PATH}"
}

# ════════════════════════════════════════════════════════════════
# FUNCTION: run onclick/syntax audit against all target domains
# ════════════════════════════════════════════════════════════════
run_audit() {
  hdr "Running onclick syntax audit"
  mkdir -p "${AUDIT_DIR}"

  cat > "${AUDIT_DIR}/syntax-targets.txt" << 'TARGETS'
https://financial-command.tsmatter.com
https://hc-billing.tsmatter.com
https://hc-compliance.tsmatter.com
https://hc-grants.tsmatter.com
https://hc-legal.tsmatter.com
https://hc-medical.tsmatter.com
https://hc-pharmacy.tsmatter.com
https://hc-strategist.tsmatter.com
https://hc-taxprep.tsmatter.com
https://hc-vendors.tsmatter.com
https://hc-financial.tsmatter.com
https://hc-insurance.tsmatter.com
https://hc-command.tsmatter.com
https://az-ins.tsmatter.com
https://construction-command.tsmatter.com
https://bpo-legal.tsmatter.com
https://bpo-realty.tsmatter.com
https://bpo-tax.tsmatter.com
https://sample-credit-union.tsmatter.com
https://reo-pro.tsmatter.com
https://pc-command.tsmatter.com
https://rrd-command.tsmatter.com
https://strategist.tsmatter.com
TARGETS

  ok "Target list written to ${AUDIT_DIR}/syntax-targets.txt"

  if [[ -f "./tmp_root/pinpoint_syntax_breaks.sh" ]]; then
    info "Running pinpoint_syntax_breaks.sh…"
    bash ./tmp_root/pinpoint_syntax_breaks.sh 2>&1 | tee "${AUDIT_DIR}/syntax_report.txt"

    echo ""
    hdr "Audit Summary — Errors Only"
    grep -A5 "INLINE SCRIPT\|FAILED\|ERROR" "${AUDIT_DIR}/syntax_report.txt" | head -100 || ok "No errors found in report"
  else
    warn "pinpoint_syntax_breaks.sh not found at ./tmp_root/ — skipping live audit"
    info "Place the audit script at ./tmp_root/pinpoint_syntax_breaks.sh and rerun with --audit"
  fi
}

# ════════════════════════════════════════════════════════════════
# FUNCTION: print DNS instructions
# ════════════════════════════════════════════════════════════════
print_dns_guide() {
  hdr "DNS Setup Required"
  echo ""
  echo "For each domain to resolve, add a CNAME record in your DNS provider"
  echo "(Cloudflare, Namecheap, etc.):"
  echo ""
  printf "  %-35s  %-45s\n" "CNAME Host" "Points to"
  printf "  %-35s  %-45s\n" "─────────────────────────────────" "─────────────────────────────────────────────"
  for SLUG in "${!APPS[@]}"; do
    APP_NAME="${APPS[$SLUG]}"
    printf "  %-35s  %-45s\n" "${SLUG}.tsmatter.com" "${APP_NAME}.fly.dev"
  done | sort
  echo ""
  warn "Fly.io also needs the cert attached: flyctl certs add <domain> --app <app-name>"
}

# ════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════
main() {
  echo -e "${CYN}"
  echo "  ████████╗███████╗███╗   ███╗"
  echo "     ██╔══╝██╔════╝████╗ ████║"
  echo "     ██║   ███████╗██╔████╔██║"
  echo "     ██║        ██╗██║╚██╔╝██║"
  echo "     ██║   ███████║██║ ╚═╝ ██║"
  echo "     ╚═╝   ╚══════╝╚═╝     ╚═╝"
  echo -e "  Deploy · tsmatter.com network${NC}"
  echo ""

  local DO_FLY=false DO_SERVER=false DO_AUDIT=false

  [[ $# -eq 0 ]] && { warn "No flags given. Usage: bash tsm-deploy.sh [--fly] [--server] [--audit] [--all] [--dns]"; exit 1; }

  for arg in "$@"; do
    case "$arg" in
      --fly)    DO_FLY=true ;;
      --server) DO_SERVER=true ;;
      --audit)  DO_AUDIT=true ;;
      --dns)    print_dns_guide; exit 0 ;;
      --all)    DO_FLY=true; DO_SERVER=true; DO_AUDIT=true ;;
      *) warn "Unknown flag: $arg" ;;
    esac
  done

  check_deps

  # ── RUN AUDIT ──
  if $DO_AUDIT; then
    run_audit
  fi

  # ── DEPLOY TO FLY ──
  if $DO_FLY; then
    hdr "Fly.io Deployment"
    mkdir -p "${LOCAL_DEPLOY_DIR}"

    for SLUG in "${!APPS[@]}"; do
      APP_NAME="${APPS[$SLUG]}"
      HTML_SRC="${HTML_FILES[$APP_NAME]:-}"

      scaffold_app "$SLUG" "$APP_NAME" "$HTML_SRC"
      deploy_app "$APP_NAME"
      set_custom_domain "$SLUG" "$APP_NAME"
      echo ""
    done

    ok "All apps deployed to Fly.io"
    print_dns_guide
  fi

  # ── SYNC TO DROPLET ──
  if $DO_SERVER; then
    sync_to_server
  fi

  hdr "Done"
  ok "TSM deploy complete"
}

main "$@"

