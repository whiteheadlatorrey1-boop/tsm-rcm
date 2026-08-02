// ── AUTH: signed session cookie, server-verified only ──────────────────────
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
