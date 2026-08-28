const crypto = require("crypto");

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SECRET = process.env.TSM_SESSION_SECRET;
if (!SECRET) {
  throw new Error("TSM_SESSION_SECRET environment variable must be set — refusing to start with an insecure default");
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  if (req.cookies && req.cookies[name]) return req.cookies[name];
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map(c => c.trim()).find(c => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function requireAuth(req, res, next) {
  const session = verifySession(getCookie(req, "tsm_session"));
  if (!session) return res.status(401).json({ ok: false, error: "Unauthorized" });
  next();
}

function requireRole(allowedRoles) {
  return function (req, res, next) {
    const session = verifySession(getCookie(req, "tsm_session"));
    if (!session) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const role = session.role || "admin";
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ ok: false, error: `Requires role: ${allowedRoles.join(" or ")}` });
    }
    req.tsmSession = { role, clientId: session.clientId || null, staffId: session.staffId || null, label: session.label || null, tenantId: session.tenantId || null };
    next();
  };
}

function requireAnyAuth(req, res, next) {
  const session = verifySession(getCookie(req, "tsm_session"));
  if (!session) return res.status(401).json({ ok: false, error: "Unauthorized" });
  req.tsmSession = { role: session.role || "admin", clientId: session.clientId || null, staffId: session.staffId || null, label: session.label || null, tenantId: session.tenantId || null };
  next();
}

module.exports = { requireAuth, requireRole, requireAnyAuth, verifySession, getCookie, signSession, SESSION_TTL_MS };
