#!/usr/bin/env bash
set -euo pipefail

EXPORT="/workspaces/tsm-fly-export"
SHELL="/workspaces/tsm-shell"
HTML="$SHELL/html"
HUB="$HTML/hub"

mkdir -p "$HTML" "$HUB"

echo "== 1. Rebuild html app folders from tsm-fly-export =="

# clear old app folders but keep hub/default if present
find "$HTML" -mindepth 1 -maxdepth 1 -type d ! -name hub ! -name default -exec rm -rf {} +

# copy structured tsm-* apps
cd "$EXPORT"
for dir in tsm-*/; do
  [ -d "$dir" ] || continue
  name="${dir%/}"
  short="${name#tsm-}"
  mkdir -p "$HTML/$short"

  if [ -f "$dir/index.html" ]; then
    cp "$dir/index.html" "$HTML/$short/index.html"
  fi

  if [ -d "$dir/public" ]; then
    cp -R "$dir/public/." "$HTML/$short/" 2>/dev/null || true
  fi

  echo "✓ copied structured app: $short"
done

# also copy clean portals as named apps
mkdir -p "$HTML/honor-portal" "$HTML/samplegc-portal" "$HTML/case-tech" "$HTML/esd-portal"
cp "$EXPORT/portals/tsm-honor-portal.html" "$HTML/honor-portal/index.html" 2>/dev/null || true
cp "$EXPORT/portals/tsm-samplegc-portal.html" "$HTML/samplegc-portal/index.html" 2>/dev/null || true
cp "$EXPORT/portals/case-tech-portal.html" "$HTML/case-tech/index.html" 2>/dev/null || true
cp "$EXPORT/portals/esd-portal.html" "$HTML/esd-portal/index.html" 2>/dev/null || true

# copy client bundles if useful
for c in healthcare honorhealth samplegc-construction; do
  if [ -d "$EXPORT/clients/$c" ]; then
    mkdir -p "$HTML/$c"
    cp -R "$EXPORT/clients/$c/." "$HTML/$c/" 2>/dev/null || true
    echo "✓ copied client bundle: $c"
  fi
done

echo
echo "== 2. Repoint broken legacy backend refs =="
find "$HTML" -type f \( -name "*.html" -o -name "*.js" -o -name "*.cjs" \) -print0 | while IFS= read -r -d '' f; do
  sed -i 's|https://ai.tsmatter.com/ask|https://tsm-core.fly.dev/ask|g' "$f"
  sed -i 's|https://ai.tsmatter.com/strategize|https://tsm-core.fly.dev/strategize|g' "$f"
  sed -i 's|https://ai.tsmatter.com/api/node/|https://tsm-core.fly.dev/api/node/|g' "$f"
  sed -i 's|https://strategist.tsmatter.com/ask|https://tsm-core.fly.dev/ask|g' "$f"
  sed -i 's|https://strategist.tsmatter.com/strategize|https://tsm-core.fly.dev/strategize|g' "$f"
  sed -i 's|ai.tsmatter.com|tsm-core.fly.dev|g' "$f"
  sed -i 's|localhost:3200|tsm-core.fly.dev|g' "$f"
done

echo
echo "== 3. Write clean path-based nginx.conf =="

cat > "$SHELL/nginx.conf" <<'NGINX'
worker_processes auto;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    server {
        listen 8080;
        server_name _;

        root /usr/share/nginx/html;
        index index.html;

        location = / {
            try_files /hub/index.html =404;
        }

        location /hub/ {
            alias /usr/share/nginx/html/hub/;
            index index.html;
            try_files $uri $uri/ /hub/index.html;
        }

        location /apps/ {
            alias /usr/share/nginx/html/;
            index index.html;
            try_files $uri $uri/ $uri/index.html =404;
        }

        location / {
            try_files $uri $uri/ =404;
        }
    }
}
NGINX

echo
echo "== 4. Rebuild hub index with app path routing =="

APPS_JS=$(find "$HTML" -mindepth 1 -maxdepth 1 -type d ! -name hub ! -name default -printf "%f\n" | sort | sed "s/.*/'&'/" | paste -sd, -)

cat > "$HUB/index.html" <<HTMLEOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TSM Hub</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0b1120;color:#e5e7eb;display:grid;grid-template-columns:260px 1fr;height:100vh;overflow:hidden}
.sidebar{background:#111827;border-right:1px solid #1f2937;display:flex;flex-direction:column;overflow:hidden}
.header{padding:14px 16px;border-bottom:1px solid #1f2937;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
.search{padding:10px 12px;border-bottom:1px solid #1f2937}
.search input{width:100%;font-size:13px;padding:8px 10px;border:1px solid #374151;border-radius:8px;outline:none;background:#0f172a;color:#e5e7eb}
.count{font-size:11px;color:#9ca3af;padding:8px 16px;border-bottom:1px solid #1f2937}
.list{overflow-y:auto;flex:1}
.item{padding:10px 16px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;color:#d1d5db;border-bottom:1px solid #172033}
.item:hover{background:#0f172a}
.item.active{background:#1f2937;color:#a78bfa;border-left:3px solid #8b5cf6}
.dot{width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0}
.main{display:flex;flex-direction:column;background:#020617}
.bar{padding:10px 16px;border-bottom:1px solid #1f2937;display:flex;align-items:center;gap:8px;background:#0b1220}
.url{flex:1;font-size:12px;padding:8px 10px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#94a3b8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
button{font-size:12px;padding:8px 12px;border:1px solid #334155;border-radius:8px;background:#111827;color:#e5e7eb;cursor:pointer}
button:hover{background:#1f2937}
iframe{flex:1;border:none;background:#fff}
.foot{padding:8px 16px;border-top:1px solid #1f2937;font-size:11px;color:#94a3b8;background:#0b1220;display:flex;gap:16px}
.live{color:#22c55e;font-weight:700}
</style>
</head>
<body>
<div class="sidebar">
  <div class="header">TSM Hub</div>
  <div class="search"><input id="q" placeholder="Search apps..." oninput="filterApps(this.value)"></div>
  <div class="count" id="count"></div>
  <div class="list" id="list"></div>
</div>
<div class="main">
  <div class="bar">
    <div class="url" id="url">select an app</div>
    <button onclick="reloadFrame()">⟳ Reload</button>
    <button onclick="openTab()">↗ Open</button>
  </div>
  <iframe id="frame" src="about:blank"></iframe>
  <div class="foot"><span class="live">● live</span><span id="active">none selected</span><span>tsm-shell hub</span></div>
</div>
<script>
const apps = [${APPS_JS}];

function render(list){
  document.getElementById('count').textContent = list.length + ' apps';
  document.getElementById('list').innerHTML = list.map(a =>
    '<div class="item" data-app="'+a+'" onclick="loadApp(\\''+a+'\\')"><span class="dot"></span>'+a+'</div>'
  ).join('');
}

function loadApp(name){
  document.querySelectorAll('.item').forEach(e=>e.classList.toggle('active',e.dataset.app===name));
  const url='/apps/'+name+'/';
  document.getElementById('url').textContent=url;
  document.getElementById('frame').src=url;
  document.getElementById('active').textContent=name;
}

function reloadFrame(){
  const f=document.getElementById('frame');
  if (f.src) f.src = f.src;
}

function openTab(){
  const f=document.getElementById('frame').src;
  if (f && f !== 'about:blank') window.open(f,'_blank');
}

function filterApps(q){
  const needle = (q || '').toLowerCase();
  render(apps.filter(a => a.toLowerCase().includes(needle)));
}

render(apps);
if (apps.length) loadApp(apps[0]);
</script>
</body>
</html>
HTMLEOF

echo
echo "== 5. Validate nginx locally in container =="

docker run --rm \
  -v "$SHELL/nginx.conf:/etc/nginx/nginx.conf:ro" \
  nginx:alpine nginx -t

echo
echo "== 6. Ensure Dockerfile serves html + hub =="

cat > "$SHELL/Dockerfile" <<'DOCKER'
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY html /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
DOCKER

echo
echo "== 7. Deploy fixed hub =="
cd "$SHELL"
fly deploy --app tsm-shell --remote-only --ha=false

echo
echo "DONE"
echo "Open: https://tsm-shell.fly.dev/hub/"
