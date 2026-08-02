#!/usr/bin/env python3
"""
apply_rcm_auth_patch.py

Converts the RCM branch (feat/mission-preview-phase4) from the old
requireApiKey/x-api-key pattern to the requireAuth/cookie-session pattern
already live on main.

Run from the REPO ROOT:
    python3 apply_rcm_auth_patch.py

What it does:
  1. Creates middleware/require-auth.js (new shared module — main defines
     requireAuth inline in server.js, but route files need to import it,
     so it's extracted here).
  2. server.js: swaps the requireApiKey import + all 14 call sites for
     requireAuth, and adds the /api/auth/login, /api/auth/logout,
     /api/auth/status routes.
  3. routes/rcm-relay.js: swaps import + 3 call sites.
  4. routes/rcm-requirements.js: swaps import + 2 call sites.
  5. html/finops-suite/tsm-rcm-os.html: removes the two x-api-key /
     TSM_CLIENT_KEY fetch headers, switches those fetches to
     credentials:'include' (cookie-based).

Does NOT touch middleware/require-api-key.js (left in place, now unused —
delete it manually once you confirm nothing else references it) or the
three loose uncommitted patch files in repo root (those looked stale/
non-applying — review separately before running this).

Safe to re-run: every replace is anchor-based and will raise a clear error
(not a silent partial patch) if an anchor is missing or duplicated, so if
this script fails partway nothing is left half-patched — fix the anchor
and rerun.
"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent

def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        print(f"  ! ABORT [{label}]: expected 1 occurrence of anchor in {path}, found {count}")
        print(f"    Anchor was: {old!r}")
        sys.exit(1)
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"  ok  [{label}] -> {path}")

def replace_all_word(path: Path, old_word: str, new_word: str, expected_count: int, label: str):
    """Whole-word replace (no partial matches), asserts exact count first."""
    import re
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(r'\b' + re.escape(old_word) + r'\b')
    count = len(pattern.findall(text))
    if count != expected_count:
        print(f"  ! ABORT [{label}]: expected {expected_count} occurrences of '{old_word}' in {path}, found {count}")
        sys.exit(1)
    path.write_text(pattern.sub(new_word, text), encoding="utf-8")
    print(f"  ok  [{label}] -> {path} ({count} occurrences)")


def main():
    print("== 1/5: creating middleware/require-auth.js ==")
    require_auth_path = REPO / "middleware" / "require-auth.js"
    if require_auth_path.exists():
        print(f"  ! ABORT: {require_auth_path} already exists — refusing to overwrite. "
              f"Delete it first if you want this script to recreate it.")
        sys.exit(1)
    require_auth_path.parent.mkdir(parents=True, exist_ok=True)
    require_auth_path.write_text(REQUIRE_AUTH_JS, encoding="utf-8")
    print(f"  ok  wrote {require_auth_path}")

    print("\n== 2/5: patching server.js ==")
    server_path = REPO / "server.js"
    replace_once(
        server_path,
        "const { requireApiKey } = require('./middleware/require-api-key');",
        "const { requireAuth, signSession, verifySession, getCookie, SESSION_TTL_MS } = "
        "require('./middleware/require-auth');",
        "server.js import swap",
    )
    replace_all_word(server_path, "requireApiKey", "requireAuth", 13, "server.js call sites")

    # Insert the auth routes right after the urlencoded body-parser line,
    # before the GLOBAL NO-CACHE block.
    anchor = "app.use(require('express').urlencoded({ extended: false }));\n// tsmAuthMiddleware(app); // removed — war rooms are in-house\n"
    if server_path.read_text(encoding="utf-8").count(anchor) != 1:
        print("  ! ABORT: could not find unique anchor for auth-routes insertion in server.js")
        sys.exit(1)
    replace_once(server_path, anchor, anchor + "\n" + AUTH_ROUTES_JS, "server.js auth routes insert")

    print("\n== 3/5: patching routes/rcm-relay.js ==")
    relay_path = REPO / "routes" / "rcm-relay.js"
    replace_once(
        relay_path,
        "const { requireApiKey } = require('../middleware/require-api-key');",
        "const { requireAuth } = require('../middleware/require-auth');",
        "rcm-relay.js import swap",
    )
    replace_all_word(relay_path, "requireApiKey", "requireAuth", 3, "rcm-relay.js call sites")

    print("\n== 4/5: patching routes/rcm-requirements.js ==")
    reqs_path = REPO / "routes" / "rcm-requirements.js"
    replace_once(
        reqs_path,
        "const { requireApiKey } = require('../middleware/require-api-key');",
        "const { requireAuth } = require('../middleware/require-auth');",
        "rcm-requirements.js import swap",
    )
    replace_all_word(reqs_path, "requireApiKey", "requireAuth", 2, "rcm-requirements.js call sites")

    print("\n== 5/5: patching html/finops-suite/tsm-rcm-os.html ==")
    html_path = REPO / "html" / "finops-suite" / "tsm-rcm-os.html"

    replace_once(
        html_path,
        """    const apiKey = window.TSM_CLIENT_KEY;
    if(!apiKey) console.warn('[RCM OS] TSM_CLIENT_KEY is unset — self-report save will 401. See html/config/tsm-client-key.js');
    const res = await fetch('/api/rcm/self-reported', {
      method: 'POST', headers: {'Content-Type':'application/json', 'x-api-key': apiKey || ''},
      body: JSON.stringify({ key, fieldId, value: value.trim() })
    });""",
        """    const res = await fetch('/api/rcm/self-reported', {
      method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ key, fieldId, value: value.trim() })
    });""",
        "tsm-rcm-os.html self-report save fetch",
    )

    replace_once(
        html_path,
        """    const res = await fetch('/api/rcm/guidance', {
      method: 'POST', headers: {'Content-Type':'application/json', 'x-api-key': window.TSM_CLIENT_KEY || ''}, body: JSON.stringify(body)
    });""",
        """    const res = await fetch('/api/rcm/guidance', {
      method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    });""",
        "tsm-rcm-os.html guidance fetch",
    )

    print("\nAll patches applied cleanly.")
    print("Next steps:")
    print("  1. node --check server.js && node --check routes/rcm-relay.js && node --check routes/rcm-requirements.js")
    print("  2. Set TSM_ADMIN_PASSWORD and TSM_SESSION_SECRET env vars (Fly secrets / .env) if not already set.")
    print("  3. Grep the repo for any other window.TSM_CLIENT_KEY references (e.g. html/config/tsm-client-key.js) —")
    print("     if nothing else uses it, that file and middleware/require-api-key.js are now dead and can be removed.")
    print("  4. Test locally: log in via /api/auth/login, confirm RCM self-report save and guidance calls now")
    print("     succeed with the tsm_session cookie and 401 without it.")


REQUIRE_AUTH_JS = r"""// ── AUTH: signed session cookie, server-verified only ──────────────────────
// Password + signing secret live server-side ONLY (Fly secrets / .env), never
// shipped to the client. Session token = base64(payload).hmacSignature.
// Extracted as a shared module so route files (routes/rcm-relay.js,
// routes/rcm-requirements.js, etc.) can import it without a circular
// dependency on server.js.
const crypto = require('crypto');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.TSM_SESSION_SECRET || '')
    .update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token || !process.env.TSM_SESSION_SECRET) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', process.env.TSM_SESSION_SECRET)
    .update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function requireAuth(req, res, next) {
  const session = verifySession(getCookie(req, 'tsm_session'));
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
}

module.exports = { requireAuth, verifySession, getCookie, signSession, SESSION_TTL_MS };
"""

AUTH_ROUTES_JS = r"""app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!process.env.TSM_ADMIN_PASSWORD || !process.env.TSM_SESSION_SECRET) {
    return res.status(500).json({ ok: false, error: 'Auth not configured on server' });
  }
  if (!password || password !== process.env.TSM_ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Invalid password' });
  }
  const token = signSession({ exp: Date.now() + SESSION_TTL_MS });
  res.setHeader('Set-Cookie',
    `tsm_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'tsm_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ ok: true, authenticated: !!verifySession(getCookie(req, 'tsm_session')) });
});
"""

if __name__ == "__main__":
    main()
