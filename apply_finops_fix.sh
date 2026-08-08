#!/usr/bin/env bash
# apply_finops_fix.sh
#
# Fixes two bugs found while debugging Branch Operations (finops-operations.html):
#   1. 32 files under html/finops-suite/ load tsm-runtime-lock.js,
#      tsm-event-contract.js, tsm-autonomy-layer.js via a relative path
#      (./html/js/...) that 404s because these pages live one directory
#      deep. Fix: make the path absolute (/html/js/...).
#   2. finops-operations.html's getVaultPrompt() posts {key} to /api/chat,
#      which never accepted that shape (no server-side vault endpoint
#      ever existed). Fix: replace with static inline prompts, no network
#      call.
#
# Usage: run from the repo root (where html/ lives).
#   bash apply_finops_fix.sh
#
# Idempotent — safe to re-run.

set -euo pipefail

if [ ! -d "html/finops-suite" ]; then
  echo "ERROR: run this from the repo root (html/finops-suite not found here)." >&2
  exit 1
fi

echo "== Step 1: fixing relative script paths in html/finops-suite/ =="
FILES=$(grep -rl 'src="\./html/js/tsm-runtime-lock\.js"\|src="\./html/js/tsm-event-contract\.js"\|src="\./html/js/tsm-autonomy-layer\.js"' html/finops-suite/ 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "  no files need this fix (already applied?)"
else
  COUNT=0
  while IFS= read -r f; do
    sed -i \
      -e 's#src="\./html/js/tsm-runtime-lock\.js"#src="/html/js/tsm-runtime-lock.js"#g' \
      -e 's#src="\./html/js/tsm-event-contract\.js"#src="/html/js/tsm-event-contract.js"#g' \
      -e 's#src="\./html/js/tsm-autonomy-layer\.js"#src="/html/js/tsm-autonomy-layer.js"#g' \
      "$f"
    COUNT=$((COUNT+1))
  done <<< "$FILES"
  echo "  fixed $COUNT file(s)"
fi

echo "== Step 2: replacing dead Vault call in finops-operations.html =="
TARGET="html/finops-suite/finops-operations.html"

if [ ! -f "$TARGET" ]; then
  echo "  WARNING: $TARGET not found, skipping step 2"
else
  python3 - "$TARGET" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''async function getVaultPrompt(key) {
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ key })
    });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    return d.system || d.prompt || '';
  } catch(e) {
    console.warn(`[Vault] "${key}" failed \u2014 continuing without system prompt.`);
    return '';
  }
}'''

new = '''// Static context prompts \u2014 there was never a server-side vault endpoint
// backing these (/api/chat only accepts {query,...} or {message,...}), so
// every getVaultPrompt() call unconditionally 400'd on every page load.
// Since these are fixed instruction text, not per-user data, they belong
// inline rather than behind a network round-trip.
const VAULT_PROMPTS = {
  ops_general: 'You are the FinOps Branch Operations assistant. Help staff with day-to-day branch cash, AP/AR, client, and compliance questions. Be concise and specific to the Operations Suite (Cashiering, Service Requests, Client Inbox, Client Records, Portfolio Prep, Compliance).',
  ops_cashiering: 'You are assisting with branch cashiering: daily cash drawer counts, teller transactions, and exception handling. Flag any variance or unresolved exception clearly and suggest the next reconciliation step.',
  ops_requests: 'You are assisting with open service requests from clients and internal teams. Help triage by urgency/SLA, and suggest a clear next action or owner for each request.',
  ops_inbox: 'You are assisting with the client inbox. Help draft professional, warm, concise client-service responses and flag any SLA-breach risk.',
  ops_clients: 'You are assisting with client records: account details, relationship history, and required documentation. Be precise about which client fields are missing or need verification.',
  ops_portfolio: 'You are assisting with portfolio prep: preparing account and relationship summaries ahead of client or management review. Keep responses structured and reference-ready.',
  ops_compliance: 'You are assisting with branch compliance: policy exceptions, audit findings, and required remediation. Be precise about compliance status and cite the specific rule or control at issue.'
};

async function getVaultPrompt(key) {
  return VAULT_PROMPTS[key] || '';
}'''

if old not in content:
    if 'const VAULT_PROMPTS' in content:
        print("  already applied, skipping")
        sys.exit(0)
    print("  ERROR: expected old getVaultPrompt block not found verbatim.")
    print("  File may have changed since this script was written \u2014 check manually.")
    sys.exit(1)

content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("  applied")
PYEOF
fi

echo "== Done =="
echo "Verify with: node --check is N/A for .html; reload finops-operations.html"
echo "and confirm no /api/chat 400s or tsm-*.js 404s in the console."