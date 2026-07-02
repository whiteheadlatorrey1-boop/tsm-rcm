#!/usr/bin/env python3
"""
fix_finops_ai.py
─────────────────────────────────────────────────────────────────────
Applies 3 fixes to every HTML file under html/finops-suite/:

  1. getVaultPrompt  — adds try/catch + fallback so vault failures
                       don't crash the engine run
  2. callGroq        — replaces callClaude / any old callGroq with
                       correct Groq OpenAI-compat format
  3. TSM_UI dedupe   — removes the second copy of window.TSM_UI = {…}
                       that overwrites the first

Run from the repo root:
    python3 fix_finops_ai.py
"""

import os, re, sys

SUITE_DIR = os.path.join("html", "finops-suite")

# ── colour helpers ────────────────────────────────────────────────────
def green(s):  return f"\033[92m{s}\033[0m"
def yellow(s): return f"\033[93m{s}\033[0m"
def red(s):    return f"\033[91m{s}\033[0m"
def bold(s):   return f"\033[1m{s}\033[0m"

# ═════════════════════════════════════════════════════════════════════
# REPLACEMENT BLOCKS
# ═════════════════════════════════════════════════════════════════════

VAULT_FIXED = """\
async function getVaultPrompt(key) {
  try {
    const r = await fetch('/api/prompt', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ key })
    });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    return d.system || d.prompt || '';
  } catch(e) {
    console.warn(`[Vault] "${key}" failed — continuing without system prompt.`);
    return '';
  }
}"""

CALLGROQ_FIXED = """\
async function callGroq(prompt) {
  try {
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.7
      })
    });
    if (!res.ok) return `⚠ Server ${res.status}`;
    const data = await res.json();
    if (data.error) return `⚠ ${data.error.message || JSON.stringify(data.error)}`;
    return data.choices?.[0]?.message?.content || '⚠ No response.';
  } catch(err) {
    return `⚠ Connection error: ${err.message}`;
  }
}"""

# ═════════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════════

def find_html_files(root):
    found = []
    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            if f.endswith(".html"):
                found.append(os.path.join(dirpath, f))
    return sorted(found)


def apply_fixes(path, src):
    changes = []
    out = src

    # ── 1. FIX getVaultPrompt ─────────────────────────────────────────
    # Match the old bare version (no try/catch) — flexible whitespace
    vault_pattern = re.compile(
        r'async\s+function\s+getVaultPrompt\s*\(\s*key\s*\)\s*\{[^}]*\}',
        re.DOTALL
    )
    m = vault_pattern.search(out)
    if m:
        old_block = m.group(0)
        # Only replace if it doesn't already have try/catch
        if 'try {' not in old_block and "try{" not in old_block:
            out = out[:m.start()] + VAULT_FIXED + out[m.end():]
            changes.append("getVaultPrompt — added try/catch + fallback")

    # ── 2. FIX callClaude / callGroq ─────────────────────────────────
    # Match any async function named callClaude OR callGroq
    call_pattern = re.compile(
        r'async\s+function\s+(callClaude|callGroq)\s*\([^)]*\)\s*\{.*?\n\}',
        re.DOTALL
    )
    m = call_pattern.search(out)
    if m:
        old_name = m.group(1)
        old_block = m.group(0)
        # Only replace if it doesn't already use choices[0]
        if "choices" not in old_block:
            out = out[:m.start()] + CALLGROQ_FIXED + out[m.end():]
            changes.append(f"{old_name} → callGroq (Groq OpenAI-compat format)")

    # Rename any remaining callClaude( calls to callGroq(
    if 'callClaude(' in out:
        out = out.replace('callClaude(', 'callGroq(')
        if "callClaude → callGroq" not in str(changes):
            changes.append("callClaude() calls → callGroq()")

    # ── 3. FIX async buildPrompts (await in non-async function) ───────
    # If buildPrompts exists without async keyword, add it
    build_pattern = re.compile(
        r'(?<!\basync\s)(?<!\basync )function\s+buildPrompts\s*\(',
    )
    if build_pattern.search(out):
        out = re.sub(r'\bfunction\s+buildPrompts\s*\(', 'async function buildPrompts(', out)
        changes.append("buildPrompts — added missing async keyword")

    # ── 4. DEDUPE window.TSM_UI ───────────────────────────────────────
    # Find all occurrences of the TSM_UI assignment block
    tsm_pattern = re.compile(
        r'(window\.TSM_UI\s*=\s*\{.*?\};)',
        re.DOTALL
    )
    all_matches = list(tsm_pattern.finditer(out))
    if len(all_matches) > 1:
        # Walk backwards through duplicates (2nd onward) and remove their
        # enclosing <script>…</script> block if it only contains that block
        for m in reversed(all_matches[1:]):
            # Try to remove the whole <script> tag wrapping it
            script_pattern = re.compile(
                r'<script>\s*' + re.escape(m.group(0)) +
                r'.*?</script>',
                re.DOTALL
            )
            sm = script_pattern.search(out)
            if sm:
                out = out[:sm.start()] + out[sm.end():]
                changes.append("Removed duplicate window.TSM_UI <script> block")
            else:
                # Just remove the raw TSM_UI = {…} assignment
                out = out[:m.start()] + out[m.end():]
                changes.append("Removed duplicate window.TSM_UI assignment")

    return out, changes


# ═════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════

def main():
    if not os.path.isdir(SUITE_DIR):
        print(red(f"ERROR: '{SUITE_DIR}' not found. Run this from the repo root."))
        sys.exit(1)

    files = find_html_files(SUITE_DIR)
    if not files:
        print(yellow("No HTML files found in " + SUITE_DIR))
        sys.exit(0)

    print(bold(f"\n{'─'*60}"))
    print(bold(f" TSM FinOps AI Wiring Fix — {len(files)} files"))
    print(bold(f"{'─'*60}\n"))

    total_changes = 0

    for path in files:
        with open(path, 'r', encoding='utf-8') as f:
            src = f.read()

        fixed, changes = apply_fixes(path, src)

        rel = os.path.relpath(path, SUITE_DIR)
        if changes:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed)
            print(green(f"  ✓ {rel}"))
            for c in changes:
                print(f"      · {c}")
            total_changes += len(changes)
        else:
            print(f"  — {rel}  {yellow('(no changes needed)')}")

    print(bold(f"\n{'─'*60}"))
    print(green(f" Done. {total_changes} fix(es) applied across {len(files)} file(s)."))
    print(bold(f"{'─'*60}\n"))
    print(" Next: fly deploy --strategy immediate --app tsm-shell\n")


if __name__ == "__main__":
    main()
