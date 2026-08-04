#!/usr/bin/env python3
"""
Applies the "NULL RISK" / literal-null KPI fix to
html/war-rooms/re-war/re-exec-portal.html.


Run from repo root:
    python3 apply-null-kpi-fix.py

Safe to re-run: it's a no-op (with a clear message) if already applied.
"""
import re
import sys
from pathlib import Path

TARGET = Path("html/war-rooms/re-war/re-exec-portal.html")

if not TARGET.exists():
    sys.exit(f"ERROR: {TARGET} not found. Run this from the repo root.")

src = TARGET.read_text()

if "function sanitizeAIKpi" in src:
    print("Already applied — sanitizeAIKpi() found in file. No changes made.")
    sys.exit(0)

# --- Edit 1: wrap wp.kpis in loadWarPayload() ---
old1 = "      const wp = state.warPayload;\n      const k = wp.kpis || {};"
new1 = "      const wp = state.warPayload;\n      const k = sanitizeAIKpi(wp.kpis || {});"
if old1 not in src:
    sys.exit("ERROR: edit 1 anchor not found — file may have changed since this script was written. Aborting, no changes made.")
src = src.replace(old1, new1, 1)

# --- Edit 2: insert sanitizeAIKpi() function + wrap JSON.parse in extractRelayIntelligence() ---
old2 = "  } catch(e) {}\n}\n\nasync function extractRelayIntelligence() {"
new2 = '''  } catch(e) {}
}

// AI JSON responses sometimes return the literal string "null" (or "n/a" /
// "none" / "undefined") instead of a real JSON null when the model can't
// derive a field — e.g. {"riskLevel":"null"} instead of {"riskLevel":null}.
// That string is truthy and not === null/undefined, so every existing
// falsy/nullish guard in this file let it straight through to the DOM,
// producing literal "NULL RISK" badges and "null" KPI tiles. This
// normalizes those stringified-nullish values back to real null right
// after parsing, before anything reads them.
function sanitizeAIKpi(obj) {
  const NULLISH = new Set(['null', 'n/a', 'na', 'none', 'undefined', '--', '\u2014']);
  if (!obj || typeof obj !== 'object') return obj;
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if (typeof v === 'string' && NULLISH.has(v.trim().toLowerCase())) obj[k] = null;
  });
  return obj;
}

async function extractRelayIntelligence() {'''
if old2 not in src:
    sys.exit("ERROR: edit 2 anchor not found — file may have changed since this script was written. Aborting, no changes made.")
src = src.replace(old2, new2, 1)

# --- Edit 3: wrap JSON.parse(raw) in extractRelayIntelligence() ---
old3 = "    const raw = (data.answer || data.response || '').replace(/```json|```/g, '').trim();\n    const kpi = JSON.parse(raw);\n    state.relayKPI = kpi;"
new3 = "    const raw = (data.answer || data.response || '').replace(/```json|```/g, '').trim();\n    const kpi = sanitizeAIKpi(JSON.parse(raw));\n    state.relayKPI = kpi;"
if old3 not in src:
    sys.exit("ERROR: edit 3 anchor not found — file may have changed since this script was written. Aborting, no changes made.")
src = src.replace(old3, new3, 1)

TARGET.write_text(src)
print(f"Applied. {TARGET} updated with sanitizeAIKpi() and 2 call-site wraps.")
print("Run: node --check", end=" ")
print("(or your usual inline-script syntax check) before committing.")
