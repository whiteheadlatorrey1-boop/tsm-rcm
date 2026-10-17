#!/usr/bin/env bash
set -euo pipefail

BASE="/workspaces/tsm-shell"

# Map: fly-app-name -> html-file
declare -A APPS=(
  [tsm-az-ins]="az-ins.tsmatter.html"
  [tsm-bpo-legal]="bpo-legal.tsmatter.html"
  [tsm-bpo-realty]="bpo-realty.tsmatter.html"
  [tsm-bpo-tax]="bpo-tax.tsmatter.html"
  [tsm-construction-command]="construction-command.tsmatter.html"
  [tsm-sample-credit-union]="sample-credit-union.tsmatter.html"
  [tsm-financial-command]="financial-command.tsmatter.html"
  [tsm-hc-billing]="hc-billing.tsmatter.html"
  [tsm-hc-compliance]="hc-compliance.tsmatter.html"
  [tsm-hc-financial]="hc-financial.tsmatter.html"
  [tsm-hc-grants]="hc-grants.tsmatter.html"
  [tsm-hc-insurance]="hc-insurance.tsmatter.html"
  [tsm-hc-legal]="hc-legal.tsmatter.html"
  [tsm-hc-pharmacy]="hc-pharmacy.tsmatter.html"
  [tsm-hc-strategist]="hc-strategist.tsmatter.html"
  [tsm-hc-taxprep]="hc-taxprep.tsmatter.html"
  [tsm-hc-vendors]="hc-vendors.tsmatter.html"
  [tsm-samplehealthsystem]="samplehealthsystem.tsmatter.html"
  [tsm-samplehealthsystem-dee]="samplehealthsystem-dee.html"
  [tsm-pc-command]="pc-command.tsmatter.html"
  [tsm-reo-pro]="reo-pro.tsmatter.html"
  [tsm-rrd-command]="rrd-command.tsmatter.html"
  [tsm-strategist]="strategist.tsmatter.html"
  [tsm-dme]="dme.html"
  [tsm-shell]="auditops-pro.html"
)

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

deploy_app() {
  local app="$1"
  local html="$2"
  local src="$BASE/$html"

  if [ ! -f "$src" ]; then
    echo "SKIP $app — $html not found"
    return
  fi

  local dir="$TMPDIR/$app"
  mkdir -p "$dir"

  # Patch endpoints to tsm-core
  python3 - "$src" "$dir/index.html" << 'PY'
import sys, re
from pathlib import Path
txt = Path(sys.argv[1]).read_text(encoding='utf-8', errors='ignore')
for old, new in [
    ('https://ai.tsmatter.com/ask',        'https://tsm-core.fly.dev/ask'),
    ('https://ai.tsmatter.com/strategize', 'https://tsm-core.fly.dev/strategize'),
    ('https://strategist.tsmatter.com/ask','https://tsm-core.fly.dev/ask'),
    ('ai.tsmatter.com',                    'tsm-core.fly.dev'),
    ('localhost:3200',                     'tsm-core.fly.dev'),
]:
    txt = txt.replace(old, new)
Path(sys.argv[2]).write_text(txt, encoding='utf-8')
print(f'Patched {sys.argv[1]} -> {sys.argv[2]}')
PY

  cat > "$dir/Dockerfile" << 'DOCKER'
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
DOCKER

  cat > "$dir/nginx.conf" << 'NGINX'
server {
  listen 8080;
  root /usr/share/nginx/html;
  index index.html;
  location /health { return 200 "ok\n"; add_header Content-Type text/plain; }
  location / { try_files $uri $uri/ /index.html; }
}
NGINX

  cat > "$dir/fly.toml" << TOML
app = "$app"
primary_region = "ord"

[http_service]
  internal_port = 8080
  force_https = true
  auto_start_machines = true
  auto_stop_machines = true
  min_machines_running = 0
TOML

  echo ""
  echo "=== Deploying $app ($html) ==="
  cd "$dir"
  flyctl deploy -a "$app" --ha=false
  cd "$BASE"
}

echo "=== TSM One-Shot Deploy ==="
echo "Apps to deploy: ${#APPS[@]}"

for app in "${!APPS[@]}"; do
  deploy_app "$app" "${APPS[$app]}"
done

echo ""
echo "=== ALL DONE ==="
flyctl apps list | grep tsm
