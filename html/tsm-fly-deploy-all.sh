#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  tsm-fly-deploy-all.sh
#  Migrates all TSM tsmatter.com portal files → fly.dev apps
#  Handles 23 domains, syntax audit, JS validation, and deployment
#
#  Usage:
#    bash tsm-fly-deploy-all.sh [OPTIONS]
#
#  Options:
#    --dry-run          Show what would happen, write nothing
#    --audit-only       Run JS syntax audit only, no deploy
#    --push             Actually deploy to fly.dev after staging
#    --app NAME         Deploy only one specific app (e.g. --app hc-billing)
#    --fix-onclick      Auto-patch common onclick syntax errors before deploy
#    --org ORG          Fly.io org slug (default: personal)
#    --region REGION    Fly.io region (default: dfw)
#
#  Examples:
#    bash tsm-fly-deploy-all.sh --dry-run
#    bash tsm-fly-deploy-all.sh --audit-only
#    bash tsm-fly-deploy-all.sh --fix-onclick --push
#    bash tsm-fly-deploy-all.sh --app hc-billing --push
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── CONFIGURATION ─────────────────────────────────────────────────────────────
FLY_ORG="${FLY_ORG:-personal}"
FLY_REGION="${FLY_REGION:-dfw}"
EXPORT_BASE="${EXPORT_BASE:-/workspaces/tsm-fly-export}"
SOURCE_BASE="${SOURCE_BASE:-/var/www}"
AUDIT_DIR="${AUDIT_DIR:-/workspaces/tsm-shell/onclick-audit}"
AUDIT_REPORT="$AUDIT_DIR/syntax_report.txt"
NODE_PORT=3000

# ── DOMAIN → FLY APP MAPPING ──────────────────────────────────────────────────
# Format: "subdomain|fly-app-name|source-subdir"
DOMAINS=(
  "financial-command.tsmatter.com|tsm-financial-command|financial-command"
  "hc-billing.tsmatter.com|tsm-hc-billing|hc-billing"
  "hc-compliance.tsmatter.com|tsm-hc-compliance|hc-compliance"
  "hc-grants.tsmatter.com|tsm-hc-grants|hc-grants"
  "hc-legal.tsmatter.com|tsm-hc-legal|hc-legal"
  "hc-medical.tsmatter.com|tsm-hc-medical|hc-medical"
  "hc-pharmacy.tsmatter.com|tsm-hc-pharmacy|hc-pharmacy"
  "hc-strategist.tsmatter.com|tsm-hc-strategist|hc-strategist"
  "hc-taxprep.tsmatter.com|tsm-hc-taxprep|hc-taxprep"
  "hc-vendors.tsmatter.com|tsm-hc-vendors|hc-vendors"
  "hc-financial.tsmatter.com|tsm-hc-financial|hc-financial"
  "hc-insurance.tsmatter.com|tsm-hc-insurance|hc-insurance"
  "hc-command.tsmatter.com|tsm-hc-command|hc-command"
  "az-ins.tsmatter.com|tsm-az-ins|az-ins"
  "construction-command.tsmatter.com|tsm-construction-command|construction-command"
  "bpo-legal.tsmatter.com|tsm-bpo-legal|bpo-legal"
  "bpo-realty.tsmatter.com|tsm-bpo-realty|bpo-realty"
  "bpo-tax.tsmatter.com|tsm-bpo-tax|bpo-tax"
  "desert-financial.tsmatter.com|tsm-desert-financial|desert-financial"
  "reo-pro.tsmatter.com|tsm-reo-pro|reo-pro"
  "pc-command.tsmatter.com|tsm-pc-command|pc-command"
  "rrd-command.tsmatter.com|tsm-rrd-command|rrd-command"
  "strategist.tsmatter.com|tsm-strategist|strategist"
)

# ── COLOR OUTPUT ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'
CYN='\033[0;36m'; PRP='\033[0;35m'; BLD='\033[1m'; RST='\033[0m'

info()  { echo -e "${CYN}[INFO]${RST}   $*"; }
ok()    { echo -e "${GRN}[OK]${RST}     $*"; }
warn()  { echo -e "${YLW}[WARN]${RST}   $*"; }
err()   { echo -e "${RED}[ERR]${RST}    $*"; }
skip()  { echo -e "${PRP}[SKIP]${RST}   $*"; }
hdr()   { echo -e "\n${BLD}${CYN}══════ $* ══════${RST}"; }
sep()   { echo -e "${CYN}──────────────────────────────────────────────────${RST}"; }

# ── PARSE ARGS ────────────────────────────────────────────────────────────────
DRY=false; PUSH=false; AUDIT_ONLY=false; FIX_ONCLICK=false; TARGET_APP=""
for arg in "$@"; do
  case "$arg" in
    --dry-run)      DRY=true ;;
    --push)         PUSH=true ;;
    --audit-only)   AUDIT_ONLY=true ;;
    --fix-onclick)  FIX_ONCLICK=true ;;
    --org)          shift; FLY_ORG="$1" ;;
    --region)       shift; FLY_REGION="$1" ;;
    --app)          shift; TARGET_APP="$1" ;;
  esac
done

$DRY        && warn "DRY RUN — no files written, no deployments"
$AUDIT_ONLY && info "AUDIT ONLY mode — no staging or deployment"
$FIX_ONCLICK && info "Auto-fix onclick syntax enabled"
[[ -n "$TARGET_APP" ]] && info "Single app target: $TARGET_APP"

# ── DEPENDENCY CHECK ──────────────────────────────────────────────────────────
hdr "DEPENDENCY CHECK"
MISSING=()
for cmd in fly node npm rsync; do
  if command -v "$cmd" >/dev/null 2>&1; then ok "$cmd found"; else MISSING+=("$cmd"); warn "$cmd NOT FOUND"; fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  err "Missing: ${MISSING[*]}"
  echo -e "Install:\n  fly:  curl -L https://fly.io/install.sh | sh\n  node: https://nodejs.org"
  exit 1
fi

# ── JS SYNTAX AUDIT ───────────────────────────────────────────────────────────
hdr "JS SYNTAX AUDIT"

AUDIT_PASS=0; AUDIT_FAIL=0; AUDIT_SKIP=0
FAILED_FILES=""

mkdir -p "$AUDIT_DIR"

audit_html_file() {
  local html_file="$1"
  local app_name="$2"
  local fail=0

  [[ ! -f "$html_file" ]] && { skip "No HTML at $html_file"; ((AUDIT_SKIP++)) || true; return 0; }

  # Extract all <script> blocks and validate with node
  local script_count=0
  local tmp_dir
  tmp_dir=$(mktemp -d)

  # Use node to parse and validate all inline scripts
  node - "$html_file" <<'NODEEOF' 2>/dev/null
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(process.argv[2], 'utf8');

// Extract inline scripts
const scriptRe = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match, idx = 0, errors = [];

while ((match = scriptRe.exec(src)) !== null) {
  idx++;
  const code = match[1].trim();
  if (!code) continue;
  try {
    new Function(code);
  } catch(e) {
    // Get line context
    const startChar = match.index;
    const linesBefore = src.slice(0, startChar).split('\n').length;
    errors.push({ script: idx, line: linesBefore, error: e.message });
  }
}

if (errors.length > 0) {
  errors.forEach(e => {
    console.log('SYNTAX_ERROR|script=' + e.script + '|htmlline=' + e.line + '|' + e.error);
  });
  process.exit(1);
} else {
  console.log('SYNTAX_OK|scripts=' + idx);
  process.exit(0);
}
NODEEOF
  local node_exit=$?

  rm -rf "$tmp_dir"

  if [[ $node_exit -ne 0 ]]; then
    ((AUDIT_FAIL++)) || true
    FAILED_FILES:-""["$app_name"]="$html_file"
    return 1
  else
    ((AUDIT_PASS++)) || true
    return 0
  fi
}

# ── AUTO-FIX ONCLICK SYNTAX ───────────────────────────────────────────────────
fix_onclick_syntax() {
  local file="$1"
  local backup="${file}.bak"
  cp "$file" "$backup"

  # Common onclick/inline handler syntax breaks and their fixes:
  python3 - "$file" << 'PYEOF'
import re, sys

with open(sys.argv[1], 'r') as f:
    src = f.read()

orig = src
fixes = 0

# Fix 1: onclick="foo('it's broken')" — unescaped single quotes inside double-quoted attrs
# Convert to onclick="foo(&apos;value&apos;)" or use escaped version
def fix_unescaped_sq_in_dq_attr(m):
    global fixes
    attr = m.group(0)
    # Check if inner content has unescaped single quotes
    inner = re.search(r'onclick="([^"]*)"', attr)
    if inner:
        val = inner.group(1)
        # If the JS inside has unescaped apostrophes in strings
        fixed_val = re.sub(r"(?<=[a-zA-Z])'(?=[a-zA-Z])", "\\'", val)
        if fixed_val != val:
            fixes += 1
            return attr.replace(val, fixed_val)
    return attr

# Fix 2: onclick with broken template literals in HTML attrs
# e.g. onclick="fn(`${var}`)" — backticks in HTML attrs cause issues in some browsers
# Convert to onclick="fn(''+var+'')" — safest form
def fix_backtick_in_attr(m):
    global fixes
    full = m.group(0)
    if '`' in full:
        # Replace backtick template with string concat
        inner = re.sub(r'`([^`]*)`', lambda t: "'" + re.sub(r'\$\{([^}]+)\}', r"'+\1+'", t.group(1)) + "'", full)
        if inner != full:
            fixes += 1
            return inner
    return full

# Fix 3: Double-encoded onclick: onclick="foo(&quot;bar&quot;)"
# These are fine as-is but flag them
# Fix 4: Trailing commas in function calls within onclick
src = re.sub(r'onclick="([^"]*)"', lambda m: m.group(0).replace(',)', ')'), src)

# Fix 5: onclick events missing semicolons between statements
src = re.sub(r'(onclick|onchange|onkeydown)="([^"]*)"',
    lambda m: m.group(1) + '="' + re.sub(r'\}\s*([a-zA-Z])', lambda s: '}; ' + s.group(1), m.group(2)) + '"',
    src)

# Fix 6: Mismatched quotes in href/onclick combos
# e.g. href="javascript:fn('x")" -- quote leak
src = re.sub(r'onclick="([^"\']*)(\'[^\']*)"([^>]*>)',
    lambda m: 'onclick="' + m.group(1) + m.group(2).replace('"', '&quot;') + '"' + m.group(3),
    src)

if src != orig:
    with open(sys.argv[1], 'w') as f:
        f.write(src)
    print(f'FIXED: {fixes} issues patched in {sys.argv[1]}')
else:
    print(f'CLEAN: No auto-fixable issues found in {sys.argv[1]}')
PYEOF
}

# ── STAGE APP ─────────────────────────────────────────────────────────────────
stage_app() {
  local domain="$1"
  local app_name="$2"
  local src_subdir="$3"
  local app_dir="$EXPORT_BASE/$app_name"

  sep
  echo -e "${BLD}Staging: ${CYN}$app_name${RST} ← $domain"

  # Find source HTML — try multiple common locations
  local src_html=""
  for candidate in \
    "$SOURCE_BASE/$src_subdir/index.html" \
    "$SOURCE_BASE/$src_subdir/${src_subdir}.html" \
    "$SOURCE_BASE/html/$src_subdir/index.html" \
    "/var/www/html/$src_subdir/index.html" \
    "/srv/$src_subdir/index.html" \
    "/root/$src_subdir/index.html" \
    "/workspaces/tsm-shell/$src_subdir/index.html" \
    "/workspaces/tsm-shell/portals/$src_subdir/index.html"
  do
    if [[ -f "$candidate" ]]; then
      src_html="$candidate"
      break
    fi
  done

  if [[ -z "$src_html" ]]; then
    warn "$app_name: No source HTML found — will create placeholder"
    src_html="__placeholder__"
  else
    ok "Source: $src_html"
  fi

  # Audit before staging
  if [[ "$src_html" != "__placeholder__" ]]; then
    local audit_out
    audit_out=$(node - "$src_html" 2>&1 <<'NODEEOF' || true
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const scriptRe = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match, idx=0, errors=[];
while((match=scriptRe.exec(src))!==null){
  idx++; const code=match[1].trim(); if(!code)continue;
  try{new Function(code)}catch(e){
    const line=src.slice(0,match.index).split('\n').length;
    errors.push('  Script #'+idx+' (near HTML line '+line+'): '+e.message);
  }
}
if(errors.length){console.log('FAIL\n'+errors.join('\n'));process.exit(1);}
else{console.log('PASS ('+idx+' scripts checked)');process.exit(0);}
NODEEOF
    )
    if echo "$audit_out" | grep -q "^FAIL"; then
      warn "Syntax issues in $app_name:"
      echo "$audit_out" | grep -v "^FAIL" | sed 's/^/    /'
      FAILED_FILES:-""["$app_name"]="$src_html"
      if $FIX_ONCLICK && [[ ! "$DRY" == "true" ]]; then
        info "Attempting auto-fix on $src_html…"
        fix_onclick_syntax "$src_html"
      else
        warn "Staging anyway — fix before --push or use --fix-onclick"
      fi
      ((AUDIT_FAIL++)) || true
    else
      ok "Syntax: $audit_out"
      ((AUDIT_PASS++)) || true
    fi
  fi

  $AUDIT_ONLY && return 0
  $DRY && { info "[DRY] Would stage $app_name to $app_dir"; return 0; }

  # Create directory structure
  mkdir -p "$app_dir/public" "$app_dir/bridge"

  # Copy or create HTML
  if [[ "$src_html" != "__placeholder__" ]]; then
    rsync -a "$(dirname "$src_html")/" "$app_dir/public/" --exclude='*.sh' --exclude='.git'
    ok "Files synced → $app_dir/public/"
  else
    # Generate minimal placeholder that shows the app is being migrated
    cat > "$app_dir/public/index.html" << PLACEHOLDER
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>$app_name · TSM Platform</title>
  <style>
    body{background:#050c14;color:#c2d8ec;font-family:'Share Tech Mono',monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px;}
    h1{color:#06b6d4;font-size:1.4rem;letter-spacing:.12em;}
    p{color:#607a94;font-size:.85rem;letter-spacing:.08em;}
    .dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;animation:pulse 1.5s infinite;}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  </style>
</head>
<body>
  <div class="dot"></div>
  <h1>${app_name^^}</h1>
  <p>MIGRATING TO FLY.DEV · TSM PLATFORM</p>
  <p style="color:#3a5a6a;">$domain</p>
</body>
</html>
PLACEHOLDER
    warn "Placeholder written for $app_name (source not found)"
  fi

  # Write fly.toml
  cat > "$app_dir/fly.toml" << FLYTOML
app = "$app_name"
primary_region = "$FLY_REGION"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = $NODE_PORT
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
FLYTOML

  # Write shared Dockerfile (static + TSM Neural bridge)
  cat > "$app_dir/Dockerfile" << 'DOCKERFILE'
FROM node:20-alpine
WORKDIR /app
RUN npm install --save express 2>/dev/null
COPY public/ ./public/
COPY bridge/ ./bridge/
EXPOSE 3000
CMD ["node", "bridge/server.js"]
DOCKERFILE

  # Write TSM Neural bridge server (shared across all apps)
  cat > "$app_dir/bridge/server.js" << 'BRIDGEJS'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── CORS for all TSM subdomains ──
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!origin || origin.includes('tsmatter.com') || origin.includes('fly.dev') || origin.includes('localhost')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── TSM Neural Bridge ──────────────────────────────────────────────
// Routes /v1/chat → Groq Llama 3.3-70B-Versatile
// Set GROQ_API_KEY via: fly secrets set GROQ_API_KEY=gsk_xxx --app APP_NAME
const GROQ_KEY   = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/v1/chat', async (req, res) => {
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured. Run: fly secrets set GROQ_API_KEY=gsk_xxx' });
  }
  const { system, message, stream = true, max_tokens = 900 } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message is required' });

  const payload = {
    model: GROQ_MODEL,
    max_tokens: Math.min(Number(max_tokens) || 900, 4096),
    stream: Boolean(stream),
    messages: [
      { role: 'system', content: system || 'You are TSM Neural, a sovereign intelligence engine.' },
      { role: 'user',   content: message }
    ]
  };

  try {
    const upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({ error: 'Groq API error: ' + errText.slice(0, 300) });
    }

    if (payload.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
          try {
            const p = JSON.parse(json);
            const delta = p.choices?.[0]?.delta?.content || '';
            if (delta) res.write('data: ' + JSON.stringify({ delta }) + '\n\n');
          } catch(e) {}
        }
      }
      res.end();
    } else {
      const data = await upstream.json();
      res.json({ response: data.choices?.[0]?.message?.content || '' });
    }
  } catch(e) {
    res.status(500).json({ error: 'Bridge error: ' + e.message });
  }
});

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  engine: 'TSM Neural',
  app: process.env.FLY_APP_NAME || 'local',
  region: process.env.FLY_REGION || 'local'
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[TSM Neural] ${process.env.FLY_APP_NAME || 'local'} running on :${PORT}`));
BRIDGEJS

  # Write package.json for bridge
  cat > "$app_dir/bridge/package.json" << PKGJSON
{
  "name": "tsm-neural-bridge",
  "version": "1.0.0",
  "description": "TSM Neural AI bridge for $app_name",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2"
  }
}
PKGJSON

  ok "Staged: $app_dir"
}

# ── DEPLOY APP ────────────────────────────────────────────────────────────────
deploy_app() {
  local app_name="$1"
  local app_dir="$EXPORT_BASE/$app_name"

  sep
  echo -e "${BLD}Deploying: ${CYN}$app_name${RST}"

  if [[ ! -d "$app_dir" ]]; then
    err "$app_name not staged — run without --push first"
    return 1
  fi

  # Check if failed syntax audit
  if [[ -n "${FAILED_FILES:-""[$app_name]+x}" ]]; then
    warn "$app_name had syntax errors — deploying anyway (check logs)"
  fi

  # Create fly app if it doesn't exist
  if ! fly apps list --org "$FLY_ORG" 2>/dev/null | grep -q "^$app_name "; then
    info "Creating fly app: $app_name"
    fly apps create "$app_name" --org "$FLY_ORG" 2>/dev/null || warn "App may already exist"
  else
    info "App exists: $app_name"
  fi

  # Set GROQ key if env var provided
  if [[ -n "${GROQ_API_KEY:-}" ]]; then
    fly secrets set GROQ_API_KEY="$GROQ_API_KEY" --app "$app_name" --stage 2>/dev/null
    ok "GROQ_API_KEY staged"
  else
    warn "GROQ_API_KEY not set — bridge will return 500 until you run:"
    warn "  fly secrets set GROQ_API_KEY=gsk_xxx --app $app_name"
  fi

  cd "$app_dir"
  fly deploy --app "$app_name" --region "$FLY_REGION" --ha=false --yes 2>&1 | tail -20
  ok "Deployed: https://$app_name.fly.dev"
  cd - >/dev/null
}

# ── MAIN LOOP ─────────────────────────────────────────────────────────────────
hdr "TSM FLY MIGRATION — ${#DOMAINS[@]} DOMAINS"
echo -e "  Source base : $SOURCE_BASE"
echo -e "  Export base : $EXPORT_BASE"
echo -e "  Fly org     : $FLY_ORG"
echo -e "  Region      : $FLY_REGION"
$DRY && echo -e "  Mode        : ${YLW}DRY RUN${RST}"
$PUSH && echo -e "  Mode        : ${GRN}DEPLOY${RST}"

$DRY || mkdir -p "$EXPORT_BASE" "$AUDIT_DIR"

STAGED=(); DEPLOYED=(); SKIPPED=(); DEPLOY_FAILED=()

for entry in "${DOMAINS[@]}"; do
  IFS='|' read -r domain app_name src_subdir <<< "$entry"

  # Filter to target app if specified
  if [[ -n "$TARGET_APP" ]] && [[ "$app_name" != "$TARGET_APP" ]] && [[ "$src_subdir" != "$TARGET_APP" ]]; then
    continue
  fi

  stage_app "$domain" "$app_name" "$src_subdir"
  STAGED+=("$app_name")

  if $PUSH && ! $DRY && ! $AUDIT_ONLY; then
    if deploy_app "$app_name"; then
      DEPLOYED+=("$app_name")
    else
      DEPLOY_FAILED+=("$app_name")
    fi
  fi
done

# ── SUMMARY ───────────────────────────────────────────────────────────────────
hdr "SUMMARY"

echo -e "\n${BLD}JS Syntax Audit:${RST}"
echo -e "  ${GRN}PASS${RST}: $AUDIT_PASS apps"
echo -e "  ${RED}FAIL${RST}: $AUDIT_FAIL apps"
echo -e "  ${PRP}SKIP${RST}: $AUDIT_SKIP apps (no source found)"

if [[ ${#FAILED_FILES:-""[@]} -gt 0 ]]; then
  echo -e "\n${BLD}${RED}Apps with syntax errors:${RST}"
  for app in "${!FAILED_FILES:-""[@]}"; do
    echo -e "  ${RED}✗${RST} $app → ${FAILED_FILES:-""[$app]}"
  done
  echo -e "\n  Fix: ${CYN}bash tsm-fly-deploy-all.sh --fix-onclick --app APP_NAME${RST}"
  echo -e "  Re-audit: ${CYN}bash tsm-fly-deploy-all.sh --audit-only${RST}"
fi

echo -e "\n${BLD}Staging:${RST}"
for a in "${STAGED[@]}"; do echo -e "  ${GRN}✓${RST} $a → $EXPORT_BASE/$a"; done

if $PUSH; then
  echo -e "\n${BLD}Deployment:${RST}"
  for a in "${DEPLOYED[@]}"; do echo -e "  ${GRN}✓${RST} https://$a.fly.dev"; done
  for a in "${DEPLOY_FAILED[@]}"; do echo -e "  ${RED}✗${RST} $a — check: fly logs --app $a"; done
fi

echo -e "\n${BLD}Next steps:${RST}"
if ! $PUSH; then
  echo -e "  1. Review staged files in ${CYN}$EXPORT_BASE${RST}"
  echo -e "  2. ${CYN}export GROQ_API_KEY=gsk_xxxxxxxxx${RST}"
  echo -e "  3. ${CYN}bash tsm-fly-deploy-all.sh --push${RST}"
  echo -e "     or single app: ${CYN}bash tsm-fly-deploy-all.sh --app tsm-hc-billing --push${RST}"
fi
echo -e "  After deploy: verify each with"
echo -e "  ${CYN}for app in tsm-hc-billing tsm-hc-compliance; do"
echo -e "    curl -s https://\$app.fly.dev/health; echo; done${RST}"
echo -e ""
ok "Done."
