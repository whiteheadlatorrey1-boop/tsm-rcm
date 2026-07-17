#!/usr/bin/env python3
"""
Fixes /api/collective/bnca swallowing Groq's real error. Previously any
non-OK Groq response just returned a generic {"error":"Groq error"} with
no way to tell if it was an auth failure, bad model string, rate limit, etc.

Now: logs the full Groq response body server-side, and returns a truncated
version of it in the JSON response so callers (including the CLI test
script) can see the real cause without needing to check server logs.
Also adds an explicit check for a missing/empty GROQ_API_KEY, which is a
common Codespace-restart gotcha (env var not persisted across sessions).
"""
import shutil

path = "html/../server.js" if False else "server.js"

OLD = """    if (!groqRes.ok) return res.status(502).json({ ok: false, error: 'Groq error' });
    const data = await groqRes.json();
    const parsed = JSON.parse(data.choices[0].message.content);"""

NEW = """    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error(`[collective/bnca] Groq HTTP ${groqRes.status}:`, errBody);
      return res.status(502).json({
        ok: false,
        error: `Groq error (HTTP ${groqRes.status})`,
        detail: errBody.slice(0, 500)
      });
    }
    const data = await groqRes.json();
    const parsed = JSON.parse(data.choices[0].message.content);"""

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

assert "GROQ_API_KEY_CHECK_INSERTED" not in content, "already patched"
count = content.count(OLD)
assert count == 1, f"FAIL: expected 1 match, found {count}"

shutil.copy(path, path + ".bak")
content = content.replace(OLD, NEW, 1)

# Also add an upfront check for a missing API key, right after the signals-empty check.
OLD2 = "    if (!COLLECTIVE_SIGNALS.length) return res.status(400).json({ ok: false, error: 'No signals to synthesize' });"
NEW2 = """    if (!COLLECTIVE_SIGNALS.length) return res.status(400).json({ ok: false, error: 'No signals to synthesize' });
    // GROQ_API_KEY_CHECK_INSERTED
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ ok: false, error: 'GROQ_API_KEY is not set in this environment' });"""

count2 = content.count(OLD2)
assert count2 == 1, f"FAIL: expected 1 match for API key check anchor, found {count2}"
content = content.replace(OLD2, NEW2, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: server.js -- Groq error logging + missing-key check added, backup at {path}.bak")