#!/usr/bin/env bash
# Run from repo root, mid-merge (after merge-main-into-branch.sh stopped at the 5 files).
# Tested end-to-end against a clean clone of the actual branch/main before delivery.
set -e

echo "== routes/rcm-requirements.js: take main's config/rcm path =="
git checkout --theirs routes/rcm-requirements.js
git add routes/rcm-requirements.js

echo "== finance-index.html: take main's ('Financial Intelligence Pro') =="
git checkout --theirs html/finops-suite/finance-index.html
git add html/finops-suite/finance-index.html

echo "== tsm-rcm-os.html: take ours (standalone Working Capital module) =="
git checkout --ours html/finops-suite/tsm-rcm-os.html
git add html/finops-suite/tsm-rcm-os.html

echo "== package.json: write merged content =="
cat > package.json << 'EOF'
{
  "name": "tsm-shell",
  "version": "1.0.0",
  "main": "index.js",
  "engines": { "node": ">=18.0.0" },
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "build": "node build.js",
    "build:dry": "node build.js --dry-run",
    "safety-guard": "node html/js/tsm-runtime-safety-guard.js",
    "validate-patch": "node scripts/validate-patch.js",
    "validate-patch:all": "node scripts/validate-patch.js --all",
    "build:file": "node build.js --file",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "groq-sdk": "^0.3.0",
    "mammoth": "^1.12.0",
    "multer": "^2.2.0",
    "pdf-parse": "^2.4.5",
    "puppeteer": "^25.3.0",
    "xlsx": "file:vendor/xlsx-0.20.3.tgz",
    "mongodb": "^6.10.0"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "javascript-obfuscator": "^4.1.1",
    "playwright": "1.62.1"
  }
}
EOF
python3 -c "import json; json.load(open('package.json'))"
git add package.json

echo "== relay.core.js: merge the registry keys (LOGISTICS/VENDOR + HOTELOPS) =="
python3 - << 'PYEOF'
import re
path = "html/war-rooms/_relay_control_plane/relay.core.js"
with open(path) as f:
    content = f.read()

n = content.count('<<<<<<<')
if n == 0:
    print("relay.core.js: no conflict markers found -- already resolved, skipping")
else:
    assert n == 1, f"expected exactly 1 conflict marker, found {n}"
    m = re.search(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]*\n', content, re.DOTALL)
    assert m, "conflict block not found by pattern"
    ours = m.group(1).rstrip().rstrip(',')
    theirs = m.group(2).rstrip().rstrip(',')
    merged = ours + ',\n' + theirs + '\n'
    content = content[:m.start()] + merged + content[m.end():]
    with open(path, "w") as f:
        f.write(content)
    print("relay.core.js patched")
PYEOF
node --check html/war-rooms/_relay_control_plane/relay.core.js && echo "relay.core.js: syntax OK"
git add html/war-rooms/_relay_control_plane/relay.core.js

echo
echo "== verify nothing left unresolved =="
REMAINING=$(git diff --name-only --diff-filter=U)
if [ -n "$REMAINING" ]; then
  echo "STOP -- still unresolved:"
  echo "$REMAINING"
  exit 1
fi
echo "clean -- all conflicts resolved."

echo
echo "== final syntax sanity pass on every file this script touched =="
for f in demo/demo-engine.js html/finops-suite/js/rcm-relay-client.js \
         html/war-rooms/_relay_control_plane/relay.core.js server.js \
         routes/rcm-requirements.js; do
  node --check "$f" && echo "OK: $f"
done

echo
echo "Now review, then commit:"
echo "  git status"
echo "  git commit"
echo
echo "AFTER committing, don't forget the stashed .gitignore/package-lock changes:"
echo "  git stash list"
echo "  (pop it back if you stashed those before merging, resolve if it conflicts)"