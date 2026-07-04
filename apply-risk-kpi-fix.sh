#!/usr/bin/env bash
set -e

FILE="html/plant-incident.html"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from repo root."
  exit 1
fi

python3 << 'PYEOF'
import re

path = "html/plant-incident.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

# --- Edit 1: Engine 6 prompt restructure ---
old_prompt = '''base + `ENGINE 06 — EXECUTIVE DISPATCH\\nGenerate executive decision package:\\n▸ INCIDENT SUMMARY — 2 sentences for C-suite\\n▸FINANCIAL IMPACT — total exposure in dollars\\n▸ DECISIONS REQUIRED — ranked list with AUTHORIZE/ESCALATE/REVIEW labels\\n  1. [Decision] · Owner: [role] · Deadline: [timeframe] · Cost: $[amount]\\n  2. [Decision] · Owner: [role] · Deadline: [timeframe]\\n  3. [Decision]· Owner: [role] · Deadline: [timeframe]\\n▸ BNCA — Best Next Course of Action in one clear sentence\\n▸ ESCALATION TRIGGER — what wouldrequire CEO/Board notification\\nThis goes directly to the executive team. Be decisive.\\n\\nIMPORTANT: On its own final line, output a machine-readable summary in this exact format so downstream tools can parse it reliably:\\nKPI_JSON: {"riskScore": <0-100 integer>, "downtimeEstimate": "<short string>"}`'''

new_prompt = '''base + `ENGINE 06 — EXECUTIVE DISPATCH\\nRespond in exactly two parts, in this order:\\n\\nPART 1 — On its own line, output exactly:\\nKPI_JSON: {"riskScore": <0-100 integer>, "downtimeEstimate": "<short string>"}\\n\\nPART 2 — Executive decision package:\\n▸ INCIDENT SUMMARY — 2 sentences for C-suite\\n▸ FINANCIAL IMPACT — total exposure in dollars\\n▸ DECISIONS REQUIRED — ranked list with AUTHORIZE/ESCALATE/REVIEW labels\\n  1. [Decision] · Owner: [role] · Deadline: [timeframe] · Cost: $[amount]\\n  2. [Decision] · Owner: [role] · Deadline: [timeframe]\\n  3. [Decision] · Owner: [role] · Deadline: [timeframe]\\n▸ BNCA — Best Next Course of Action in one clear sentence\\n▸ ESCALATION TRIGGER — what would require CEO/Board notification\\n\\nPART 1 is mandatory and must appear first, exactly as formatted. This goes directly to the executive team. Be decisive.`'''

if new_prompt in content:
    print("SKIP: Engine 6 prompt already restructured")
elif old_prompt in content:
    content = content.replace(old_prompt, new_prompt)
    changed = True
    print("OK: Engine 6 prompt restructured")
else:
    print("WARN: Engine 6 prompt not found in expected form — check manually")

# --- Edit 2: parseKpiJson regex ---
old_regex = 'const m = text.match(/KPI_JSON:\\s*(\\{.*\\})\\s*$/);'
new_regex = 'const m = text.match(/KPI_JSON:\\s*(\\{[^\\n]*\\})/);'

if new_regex in content:
    print("SKIP: parseKpiJson regex already updated")
elif old_regex in content:
    content = content.replace(old_regex, new_regex)
    changed = True
    print("OK: parseKpiJson regex updated")
else:
    print("WARN: parseKpiJson regex not found in expected form — check manually")

# --- Edit 3: buildRiskKPI function ---
old_fn = '''function buildRiskKPI(text) {
  const json = parseKpiJson(text);
  if (json && typeof json.riskScore === 'number') {
    document.getElementById('kpiRisk').textContent = json.riskScore + '/100';
    sessionData.kpis.risk = json;
    return;
  }
  const m = text.match(/(\\d{2,3})\\/100|RISK[:\\s]+(\\d{2,3})/i);
  document.getElementById('kpiRisk').textContent = m ? (m[1]||m[2]) + '/100' : 'N/A';
}'''

new_fn = '''function buildRiskKPI(text) {
  const json = parseKpiJson(text);
  if (json && typeof json.riskScore === 'number') {
    document.getElementById('kpiRisk').textContent = json.riskScore + '/100';
    sessionData.kpis.risk = json;
    return;
  }
  const m = text.match(/(\\d{2,3})\\/100|RISK[:\\s]+(\\d{2,3})/i);
  if (m) {
    const val = (m[1] || m[2]) + '/100';
    document.getElementById('kpiRisk').textContent = val;
    sessionData.kpis.risk = { scraped: val };
    return;
  }
  const band = /critical|severe/i.test(text) ? 'CRITICAL'
    : /high|elevated|significant/i.test(text) ? 'ELEVATED'
    : /moderate|medium/i.test(text) ? 'MODERATE'
    : /low|minimal/i.test(text) ? 'LOW' : 'N/A';
  document.getElementById('kpiRisk').textContent = band;
  sessionData.kpis.risk = { scraped: band, source: 'qualitative-fallback' };
}'''

if new_fn in content:
    print("SKIP: buildRiskKPI already updated")
elif old_fn in content:
    content = content.replace(old_fn, new_fn)
    changed = True
    print("OK: buildRiskKPI updated")
else:
    print("WARN: buildRiskKPI not found in expected form — check manually")

# --- Edit 4: call site ---
old_calls = '''      if (i === 3) extractFinancialKPI(text);
      if (i === 1) extractDowntimeKPI(text);'''

new_calls = '''      if (i === 3) extractFinancialKPI(text);
      if (i === 1) extractDowntimeKPI(text);
      if (i === 5) buildRiskKPI(text);'''

if 'if (i === 5) buildRiskKPI(text);' in content:
    print("SKIP: buildRiskKPI call site already present")
elif old_calls in content:
    content = content.replace(old_calls, new_calls)
    changed = True
    print("OK: buildRiskKPI call site added")
else:
    print("WARN: call site anchor not found — check manually")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("\\nFile written.")
else:
    print("\\nNo changes written (all skipped or all warned).")
PYEOF

echo ""
echo "=== Verifying syntax ==="
node -e "
const fs = require('fs');
const html = fs.readFileSync('$FILE', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) { console.log('NO SCRIPT FOUND'); process.exit(1); }
try {
  new Function(scriptMatch[1]);
  console.log('JS syntax OK');
} catch(e) {
  console.log('SYNTAX ERROR:', e.message);
  process.exit(1);
}
"

echo ""
echo "=== Confirming presence ==="
grep -c "PART 1 is mandatory" "$FILE" || true
grep -c "qualitative-fallback" "$FILE" || true
grep -c "if (i === 5) buildRiskKPI(text);" "$FILE" || true
