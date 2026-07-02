#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
#  tsm-fly-migrate.sh
#  Migrates TSM / CASE-TECH portal files to fly.dev Codespaces
#  Usage: bash tsm-fly-migrate.sh [--dry-run] [--push]
#  Author: TSM Platform · Director Whitehead
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

# ── CONFIG — edit these ──────────────────────────────────────────
FLY_APP="case-tech-portal"            # fly.toml [app] name
FLY_REGION="dfw"                      # Dallas — closest to PHX
SOURCE_DIR="${SOURCE_DIR:-/var/www}"  # where your files live now
PORTAL_HTML="case-tech-portal.html"
AI_BRIDGE_DIR="/var/www/tsm-ai"       # ai.tsmatter.com bridge dir
EXPORT_DIR="${EXPORT_DIR:-/workspaces/tsm-fly-export}"

# ── COLOR OUTPUT ─────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'
CYN='\033[0;36m'; BLD='\033[1m'; RST='\033[0m'

info()  { echo -e "${CYN}[INFO]${RST}  $*"; }
ok()    { echo -e "${GRN}[OK]${RST}    $*"; }
warn()  { echo -e "${YLW}[WARN]${RST}  $*"; }
err()   { echo -e "${RED}[ERR]${RST}   $*"; }
hdr()   { echo -e "\n${BLD}${CYN}══ $* ══${RST}"; }

DRY=false; PUSH=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY=true
  [[ "$arg" == "--push" ]]    && PUSH=true
done

$DRY && warn "DRY RUN — no files will be written or deployed"

# ── DEPENDENCY CHECK ─────────────────────────────────────────────
hdr "CHECKING DEPENDENCIES"
need_cmd() { command -v "$1" >/dev/null 2>&1 || { err "Missing: $1"; exit 1; }; }
need_cmd fly
need_cmd node
need_cmd npm
need_cmd rsync
ok "All dependencies present"

# ── EXPORT DIRECTORY ─────────────────────────────────────────────
hdr "PREPARING EXPORT DIRECTORY"
if ! $DRY; then
  mkdir -p "$EXPORT_DIR"
  ok "Export dir: $EXPORT_DIR"
fi

# ── COPY PORTAL HTML ─────────────────────────────────────────────
hdr "COPYING PORTAL FILES"

copy_file() {
  local src="$1" dst="$2" label="$3"
  if [[ -f "$src" ]]; then
    if ! $DRY; then mkdir -p "$(dirname "$dst")"; cp "$src" "$dst"; fi
    ok "$label → $dst"
  else
    warn "$label not found at $src — skipping"
  fi
}

# Portal HTML
copy_file "$SOURCE_DIR/$PORTAL_HTML"            "$EXPORT_DIR/public/$PORTAL_HTML"        "Portal HTML"
copy_file "$SOURCE_DIR/index.html"              "$EXPORT_DIR/public/index.html"           "index.html"
copy_file "$SOURCE_DIR/tsm-ai/ai-bridge.js"    "$EXPORT_DIR/bridge/ai-bridge.js"         "AI bridge (JS)"
copy_file "$SOURCE_DIR/tsm-ai/server.js"        "$EXPORT_DIR/bridge/server.js"            "Bridge server"
copy_file "$SOURCE_DIR/tsm-ai/package.json"     "$EXPORT_DIR/bridge/package.json"         "Bridge package.json"
copy_file "$SOURCE_DIR/tsm-ai/.env.example"     "$EXPORT_DIR/bridge/.env.example"         ".env example"

# Try alternate bridge paths
for alt in "$AI_BRIDGE_DIR/index.js" "$AI_BRIDGE_DIR/app.js"; do
  [[ -f "$alt" ]] && copy_file "$alt" "$EXPORT_DIR/bridge/$(basename $alt)" "Bridge alt ($(basename $alt))"
done

# ── GENERATE fly.toml IF MISSING ─────────────────────────────────
hdr "FLY.TOML"
FLY_TOML="$EXPORT_DIR/fly.toml"
if [[ -f "$FLY_TOML" ]]; then
  ok "fly.toml already exists — not overwriting"
else
  if ! $DRY; then
cat > "$FLY_TOML" << 'TOML'
app = "case-tech-portal"
primary_region = "dfw"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
TOML
  fi
  ok "fly.toml written"
fi

# ── GENERATE Dockerfile IF MISSING ───────────────────────────────
hdr "DOCKERFILE"
DOCKERFILE="$EXPORT_DIR/Dockerfile"
if [[ -f "$DOCKERFILE" ]]; then
  ok "Dockerfile already exists — not overwriting"
else
  if ! $DRY; then
cat > "$DOCKERFILE" << 'DOCKER'
FROM node:20-alpine

WORKDIR /app

# Install bridge dependencies
COPY bridge/package*.json ./bridge/
RUN cd bridge && npm install --production 2>/dev/null || true

# Copy bridge server
COPY bridge/ ./bridge/

# Copy static portal files
COPY public/ ./public/

# Simple static + bridge server wrapper
# If you have a dedicated server.js, it will be used.
# Otherwise this inline fallback serves public/ and proxies /v1/chat
RUN if [ ! -f bridge/server.js ]; then \
cat > bridge/server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── TSM NEURAL BRIDGE ──────────────────────────────────────────
// Routes /v1/chat to Groq Llama 3.3-70B-Versatile
// Set GROQ_API_KEY in fly secrets (never in code)
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.options('/v1/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.sendStatus(204);
});

app.post('/v1/chat', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { system, message, stream = true, max_tokens = 900 } = req.body;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const payload = {
    model: GROQ_MODEL,
    max_tokens,
    stream,
    messages: [
      { role: 'system', content: system || 'You are TSM Neural, a sovereign intelligence engine.' },
      { role: 'user',   content: message }
    ]
  };

  try {
    const upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: err });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
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
      const content = data.choices?.[0]?.message?.content || '';
      res.json({ response: content });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok', engine: 'TSM Neural' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('TSM Neural bridge running on :' + PORT));
EOF
fi

# Install express if not in package.json
if [ ! -f bridge/package.json ]; then
cat > bridge/package.json << 'EOF'
{ "name": "tsm-neural-bridge", "version": "1.0.0", "main": "server.js", "dependencies": { "express": "^4.18.2" } }
EOF
fi
RUN cd bridge && npm install --production

EXPOSE 3000
CMD ["node", "bridge/server.js"]
DOCKER
  fi
  ok "Dockerfile written"
fi

# ── .env REMINDER ────────────────────────────────────────────────
hdr "SECRETS REMINDER"
echo -e "${YLW}Never commit GROQ_API_KEY to git.${RST}"
echo -e "Set it in fly secrets after deploy:\n"
echo -e "  ${CYN}fly secrets set GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx --app $FLY_APP${RST}\n"

# ── FLY DEPLOY ───────────────────────────────────────────────────
hdr "FLY DEPLOY"
if $PUSH && ! $DRY; then
  info "Checking fly auth…"
  fly auth whoami || { err "Not logged in to fly. Run: fly auth login"; exit 1; }

  info "Deploying $FLY_APP to fly.dev ($FLY_REGION)…"
  cd "$EXPORT_DIR"

  # Create app if it doesn't exist
  fly apps list | grep -q "$FLY_APP" \
    || fly apps create "$FLY_APP" --org personal

  fly deploy --app "$FLY_APP" --region "$FLY_REGION" --ha=false
  ok "Deployed! → https://$FLY_APP.fly.dev"
else
  info "Skipping deploy. Run with --push to deploy, or manually:"
  echo -e "  ${CYN}cd $EXPORT_DIR && fly deploy --app $FLY_APP${RST}"
fi

# ── SUMMARY ──────────────────────────────────────────────────────
hdr "MIGRATION SUMMARY"
echo -e "  Export dir : ${CYN}$EXPORT_DIR${RST}"
echo -e "  Portal HTML: ${CYN}$EXPORT_DIR/public/$PORTAL_HTML${RST}"
echo -e "  Bridge     : ${CYN}$EXPORT_DIR/bridge/server.js${RST}"
echo -e "  fly.toml   : ${CYN}$EXPORT_DIR/fly.toml${RST}"
echo -e "  Dockerfile : ${CYN}$EXPORT_DIR/Dockerfile${RST}"
echo ""
echo -e "${BLD}Next steps:${RST}"
echo -e "  1. ${CYN}fly auth login${RST}"
echo -e "  2. ${CYN}fly secrets set GROQ_API_KEY=gsk_xxx --app $FLY_APP${RST}"
echo -e "  3. ${CYN}bash tsm-fly-migrate.sh --push${RST}"
echo -e "  4. ${CYN}fly logs --app $FLY_APP${RST}  (watch startup)"
echo -e "  5. Verify: ${CYN}https://$FLY_APP.fly.dev/health${RST}"
echo ""
ok "Done."
