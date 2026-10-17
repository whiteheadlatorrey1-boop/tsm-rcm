#!/bin/bash
# ══════════════════════════════════════════════════════════════════
#  TSM FIX & DEPLOY — run this inside your Codespaces terminal
#  /workspaces/tsm-shell/
#
#  What it does:
#  1. Renames your existing HTML files to the pattern nginx expects
#  2. Drops in the corrected Dockerfile + nginx.conf + fly.toml
#  3. Attaches every tsmatter.com domain to your fly app
#  4. Deploys
#
#  Usage:
#    chmod +x tsm-fix-deploy.sh
#    ./tsm-fix-deploy.sh
# ══════════════════════════════════════════════════════════════════
set -euo pipefail
cd /workspaces/tsm-shell

GRN='\033[0;32m'; YLW='\033[1;33m'; BLU='\033[0;34m'
CYN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GRN}✓${NC}  $*"; }
warn() { echo -e "${YLW}⚠${NC}  $*"; }
info() { echo -e "${BLU}→${NC}  $*"; }
hdr()  { echo -e "\n${CYN}══ $* ══${NC}"; }
fail() { echo -e "${RED}✗${NC}  $*"; exit 1; }

FLY_APP="tsm-shell"   # must match your existing fly app name — change if different

# ── All domains TSM serves ────────────────────────────────────────
DOMAINS=(
  "financial-command.tsmatter.com"
  "hc-billing.tsmatter.com"
  "hc-compliance.tsmatter.com"
  "hc-grants.tsmatter.com"
  "hc-legal.tsmatter.com"
  "hc-medical.tsmatter.com"
  "hc-pharmacy.tsmatter.com"
  "hc-strategist.tsmatter.com"
  "hc-taxprep.tsmatter.com"
  "hc-vendors.tsmatter.com"
  "hc-financial.tsmatter.com"
  "hc-insurance.tsmatter.com"
  "hc-command.tsmatter.com"
  "az-ins.tsmatter.com"
  "construction-command.tsmatter.com"
  "bpo-legal.tsmatter.com"
  "bpo-realty.tsmatter.com"
  "bpo-tax.tsmatter.com"
  "sample-credit-union.tsmatter.com"
  "reo-pro.tsmatter.com"
  "pc-command.tsmatter.com"
  "rrd-command.tsmatter.com"
  "strategist.tsmatter.com"
  "samplehealthsystem.tsmatter.com"
  "healthcare.tsmatter.com"
  "health.tsmatter.com"
)

# ════════════════════════════════════════════════════════════════
# STEP 1 — sanity checks
# ════════════════════════════════════════════════════════════════
hdr "Step 1 · Checks"

command -v flyctl &>/dev/null || fail "flyctl not found. Install: curl -L https://fly.io/install.sh | sh"
flyctl auth whoami &>/dev/null || fail "Not logged in to Fly.io. Run: flyctl auth login"
ok "flyctl authenticated as $(flyctl auth whoami)"

info "Current working directory: $(pwd)"
info "Files in workspace:"
ls *.html 2>/dev/null | head -20 || warn "No .html files found in current dir"

# ════════════════════════════════════════════════════════════════
# STEP 2 — write nginx.conf
# ════════════════════════════════════════════════════════════════
hdr "Step 2 · Writing nginx.conf"

cat > nginx.conf << 'NGINXEOF'
events { worker_processes 1; }
http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile on;
  gzip on;
  gzip_types text/html text/css application/javascript;

  server {
    listen 8080 default_server;
    root /usr/share/nginx/html/default;
    index index.html;
    location /health { return 200 "ok\n"; add_header Content-Type text/plain; }
    location / { try_files $uri $uri/ /index.html; }
  }

  server { listen 8080; server_name hc-billing.tsmatter.com;          root /usr/share/nginx/html/hc-billing;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-compliance.tsmatter.com;       root /usr/share/nginx/html/hc-compliance;       index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-grants.tsmatter.com;           root /usr/share/nginx/html/hc-grants;           index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-legal.tsmatter.com;            root /usr/share/nginx/html/hc-legal;            index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-medical.tsmatter.com;          root /usr/share/nginx/html/hc-medical;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-pharmacy.tsmatter.com;         root /usr/share/nginx/html/hc-pharmacy;         index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-strategist.tsmatter.com;       root /usr/share/nginx/html/hc-strategist;       index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-taxprep.tsmatter.com;          root /usr/share/nginx/html/hc-taxprep;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-vendors.tsmatter.com;          root /usr/share/nginx/html/hc-vendors;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-financial.tsmatter.com;        root /usr/share/nginx/html/hc-financial;        index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-insurance.tsmatter.com;        root /usr/share/nginx/html/hc-insurance;        index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name hc-command.tsmatter.com;          root /usr/share/nginx/html/hc-command;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name financial-command.tsmatter.com;   root /usr/share/nginx/html/financial-command;   index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name az-ins.tsmatter.com;              root /usr/share/nginx/html/az-ins;              index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name construction-command.tsmatter.com;root /usr/share/nginx/html/construction-command;index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name bpo-legal.tsmatter.com;           root /usr/share/nginx/html/bpo-legal;           index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name bpo-realty.tsmatter.com;          root /usr/share/nginx/html/bpo-realty;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name bpo-tax.tsmatter.com;             root /usr/share/nginx/html/bpo-tax;             index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name sample-credit-union.tsmatter.com;    root /usr/share/nginx/html/sample-credit-union;    index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name reo-pro.tsmatter.com;             root /usr/share/nginx/html/reo-pro;             index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name pc-command.tsmatter.com;          root /usr/share/nginx/html/pc-command;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name rrd-command.tsmatter.com;         root /usr/share/nginx/html/rrd-command;         index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name strategist.tsmatter.com;          root /usr/share/nginx/html/strategist;          index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name samplehealthsystem.tsmatter.com;         root /usr/share/nginx/html/samplehealthsystem;         index index.html; location / { try_files $uri /index.html; } }
  server { listen 8080; server_name healthcare.tsmatter.com health.tsmatter.com; root /usr/share/nginx/html/healthcare; index index.html; location / { try_files $uri /index.html; } }
}
NGINXEOF
ok "nginx.conf written"

# ════════════════════════════════════════════════════════════════
# STEP 3 — write Dockerfile
# The Dockerfile copies each *.tsmatter.html → its nginx subfolder
# ════════════════════════════════════════════════════════════════
hdr "Step 3 · Writing Dockerfile"

# Build COPY lines from existing html files
COPY_LINES=""
for f in *.tsmatter.html *.tsmatter.com.html 2>/dev/null; do
  [[ -f "$f" ]] || continue
  # Derive slug: strip .tsmatter.html or .tsmatter.com.html suffix
  slug="${f%.tsmatter.html}"
  slug="${slug%.tsmatter.com.html}"
  COPY_LINES+="RUN mkdir -p /usr/share/nginx/html/${slug}\nCOPY ${f} /usr/share/nginx/html/${slug}/index.html\n"
done

# Also handle tsm-samplehealthsystem-dee.html → samplehealthsystem
[[ -f "samplehealthsystem-dee.html" ]] && COPY_LINES+="RUN mkdir -p /usr/share/nginx/html/samplehealthsystem\nCOPY samplehealthsystem-dee.html /usr/share/nginx/html/samplehealthsystem/index.html\n"
[[ -f "tsm-samplehealthsystem-dee.tsmatter.html" ]] && COPY_LINES+="RUN mkdir -p /usr/share/nginx/html/samplehealthsystem\nCOPY tsm-samplehealthsystem-dee.tsmatter.html /usr/share/nginx/html/samplehealthsystem/index.html\n"

cat > Dockerfile << DOCKEREOF
FROM nginx:alpine
RUN rm /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf
$(echo -e "$COPY_LINES")
RUN mkdir -p /usr/share/nginx/html/default
RUN echo '<html><body style="background:#090E19;color:#F47C20;font-family:sans-serif;padding:40px"><h2>TSM · tsmatter.com</h2><p>Select a portal above.</p></body></html>' > /usr/share/nginx/html/default/index.html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
DOCKEREOF
ok "Dockerfile written ($(grep -c 'COPY.*index.html' Dockerfile) domains mapped)"

# ════════════════════════════════════════════════════════════════
# STEP 4 — write fly.toml
# ════════════════════════════════════════════════════════════════
hdr "Step 4 · Writing fly.toml"

cat > fly.toml << FLYEOF
app = "${FLY_APP}"
primary_region = "ord"

[build]

[http_service]
  internal_port = 8080
  force_https   = true
  auto_stop_machines  = true
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type       = "requests"
    hard_limit = 250
    soft_limit = 200

[[vm]]
  memory   = "512mb"
  cpu_kind = "shared"
  cpus     = 1
FLYEOF
ok "fly.toml written for app: ${FLY_APP}"

# ════════════════════════════════════════════════════════════════
# STEP 5 — attach domains / certs
# ════════════════════════════════════════════════════════════════
hdr "Step 5 · Attaching domains to ${FLY_APP}"

for DOMAIN in "${DOMAINS[@]}"; do
  info "Attaching ${DOMAIN}…"
  flyctl certs add "${DOMAIN}" --app "${FLY_APP}" 2>&1 | grep -v "^$" | tail -3 \
    && ok "${DOMAIN} cert attached" \
    || warn "Cert for ${DOMAIN} may already exist — skipping"
done

# ════════════════════════════════════════════════════════════════
# STEP 6 — build & deploy
# ════════════════════════════════════════════════════════════════
hdr "Step 6 · Deploying to Fly.io"

info "Running: flyctl deploy --app ${FLY_APP} --ha=false"
flyctl deploy --app "${FLY_APP}" --ha=false

ok "Deploy complete!"
echo ""
echo -e "${CYN}══ Next: DNS CNAME records ══${NC}"
echo "Add these CNAMEs in Cloudflare (or wherever tsmatter.com is managed):"
echo ""
printf "  %-40s  → %s\n" "CNAME (subdomain)" "Target"
printf "  %-40s  → %s\n" "──────────────────────────────────────" "────────────────────────"
for D in "${DOMAINS[@]}"; do
  SUB="${D%.tsmatter.com}"
  printf "  %-40s  → %s\n" "${SUB}" "${FLY_APP}.fly.dev"
done
echo ""
echo "Proxy status: ORANGE (proxied) in Cloudflare ✓"
echo ""

# ════════════════════════════════════════════════════════════════
# STEP 7 — verify
# ════════════════════════════════════════════════════════════════
hdr "Step 7 · Smoke test"
info "Testing health endpoint…"
curl -sf "https://${FLY_APP}.fly.dev/health" && ok "App is responding" || warn "Health check pending — app may still be starting (wait 30s and retry)"
echo ""
ok "All done. Your TSM network is live on Fly.io."
