/**
 * TSM Shell — Auth Middleware
 * ───────────────────────────
 * Gates all /html/* routes (and vertical shortcut routes) behind an
 * 8-hour session token stored in a signed HttpOnly cookie.
 *
 * PUBLIC routes (no auth required):
 *   /                          — portfolio landing page
 *   /html/tsm-doc-search-multi.html
 *   /html/tsm-career-training-platform.html
 *   /login                     — login page
 *   /api/auth/login            — login POST endpoint
 *   /health                    — Fly.io health check
 *
 * PROTECTED routes (session token required):
 *   /html/*                    — all war rooms, strategists, exec portals
 *   /healthcare/*
 *   /finops/*
 *   /bpo/*
 *   /insurance/*
 *   /construction/*
 *   /legal-pro/*
 *   /reo-pro/*
 *   /music/*
 *
 * Setup:
 *   1. Set TSM_ACCESS_CODE in your Fly.io secrets (fly secrets set TSM_ACCESS_CODE=yourpassword)
 *   2. Set TSM_SESSION_SECRET in your Fly.io secrets (fly secrets set TSM_SESSION_SECRET=32charrandombytes)
 *   3. npm install cookie-parser  (already in dependencies below)
 *
 * Usage in server.js (already wired):
 *   const { tsmAuthMiddleware } = require('./tsm-auth');
 *   tsmAuthMiddleware(app);
 */

'use strict';

const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const COOKIE_NAME         = 'tsm_session';
const ACCESS_CODE         = process.env.TSM_ACCESS_CODE  || 'tsm-access-2025';  // override via Fly secret
const SESSION_SECRET      = process.env.TSM_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// ── PUBLIC ROUTES (no auth) ───────────────────────────────────────────────────
const PUBLIC_EXACT = new Set([
  '/',
  '/login',
  '/health',
  '/api/auth/login',
  '/api/auth/logout',
  '/html/tsm-doc-search-multi.html',
  '/html/tsm-career-training-platform.html',
  '/html/war-rooms/war-room-prep.html',
  '/html/war-rooms/construct-war/construction-war-room.html',
  '/html/war-rooms/construct-war/construction-strategist.html',
  '/html/war-rooms/construct-war/construction-executive-portal.html',
  '/html/tsm-doc-search-multi.html',
]);

const PUBLIC_PREFIXES = [
  '/favicon',
  '/assets/',
  '/css/',
  '/fonts/',
  '/api/',
  '/html/js/',
  '/html/shared/',
  '/html/tsm-mission-orchestrator.js',
];

function isPublic(url) {
  const clean = url.split('?')[0];
  if (PUBLIC_EXACT.has(clean)) return true;
  return PUBLIC_PREFIXES.some(p => clean.startsWith(p));
}

// ── TOKEN HELPERS ─────────────────────────────────────────────────────────────
function generateToken() {
  const payload = {
    ts:  Date.now(),
    exp: Date.now() + SESSION_DURATION_MS,
    id:  crypto.randomBytes(8).toString('hex'),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig  = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [data, sig] = token.split('.');
  if (!data || !sig) return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    if (k) out[k.trim()] = decodeURIComponent(v.join('='));
  });
  return out;
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TSM Shell — Access</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root { --black:#020408; --deep:#060c14; --panel:#0a1220; --border:#1a2a3a; --cyan:#00c8ff; --cyan2:#0096cc; --dim:#3a5068; --muted:#7a98b8; --text:#c8dff0; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:var(--black); color:var(--text); font-family:'JetBrains Mono',monospace; min-height:100vh; display:flex; align-items:center; justify-content:center; }
    .box { background:var(--deep); border:1px solid var(--border); border-radius:8px; padding:2.5rem 2rem; width:100%; max-width:380px; }
    .logo { font-family:'Orbitron',sans-serif; font-size:1.1rem; font-weight:900; color:#fff; letter-spacing:.15em; text-align:center; margin-bottom:.3rem; }
    .sub { font-size:.65rem; color:var(--cyan); letter-spacing:.25em; text-align:center; margin-bottom:2rem; text-transform:uppercase; }
    label { display:block; font-size:.62rem; letter-spacing:.15em; color:var(--muted); margin-bottom:.4rem; text-transform:uppercase; }
    input { width:100%; background:var(--panel); border:1px solid var(--border); color:var(--text); font-family:'JetBrains Mono',monospace; font-size:.82rem; padding:.65rem .9rem; border-radius:4px; outline:none; transition:border .2s; margin-bottom:1.2rem; }
    input:focus { border-color:var(--cyan); }
    button { width:100%; background:linear-gradient(135deg,var(--cyan2),#0066aa); color:#fff; border:none; font-family:'JetBrains Mono',monospace; font-size:.72rem; letter-spacing:.2em; text-transform:uppercase; padding:.8rem; border-radius:4px; cursor:pointer; transition:opacity .2s; }
    button:hover { opacity:.85; }
    .err { display:none; background:rgba(255,80,80,.1); border:1px solid rgba(255,80,80,.3); color:#ff6b6b; font-size:.68rem; padding:.6rem .9rem; border-radius:4px; margin-bottom:1rem; letter-spacing:.05em; }
    .err.show { display:block; }
    .lock { text-align:center; font-size:1.5rem; margin-bottom:1.5rem; opacity:.4; }
  </style>
</head>
<body>
  <div class="box">
    <div class="lock">⬡</div>
    <div class="logo">TSM SHELL</div>
    <div class="sub">Secure Access Portal</div>
    <div class="err" id="err">ACCESS DENIED — INVALID CODE</div>
    <form id="f">
      <label>Access Code</label>
      <input type="password" id="code" placeholder="Enter access code" autocomplete="current-password">
      <button type="submit">AUTHENTICATE →</button>
    </form>
  </div>
  <script>
    document.getElementById('f').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button');
      btn.textContent = 'AUTHENTICATING...';
      btn.disabled = true;
      const res = await fetch('/api/auth/login' + window.location.search, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: document.getElementById('code').value })
      });
      if (res.ok) {
        const { redirect } = await res.json();
        window.location.href = redirect || '/html/tsm-doc-search-multi.html';
      } else {
        document.getElementById('err').classList.add('show');
        btn.textContent = 'AUTHENTICATE →';
        btn.disabled = false;
        document.getElementById('code').value = '';
      }
    });
  </script>
</body>
</html>`;

// ── MIDDLEWARE FACTORY ────────────────────────────────────────────────────────
function tsmAuthMiddleware(app) {

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { code } = req.body || {};
    if (!code || code.trim() !== ACCESS_CODE) {
      return res.status(401).json({ error: 'Invalid access code' });
    }
    const token    = generateToken();
    const redirect = req.query.redirect || '/html/tsm-doc-search-multi.html';
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}`
    );
    return res.json({ ok: true, redirect });
  });

  // GET /api/auth/logout
  app.get('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
    res.redirect('/login');
  });

  // GET /login
  app.get('/login', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(LOGIN_HTML);
  });

  // ── AUTH GATE — runs before static file middleware ────────────────────────
  app.use((req, res, next) => {
    if (isPublic(req.path)) return next();

    // Only gate HTML-serving paths — pass API calls through (they have their own guards)
    const isProtectedPath =
      req.path.startsWith('/html/') ||
      req.path.startsWith('/healthcare/') ||
      req.path.startsWith('/finops/') ||
      req.path.startsWith('/bpo/') ||
      req.path.startsWith('/insurance/') ||
      req.path.startsWith('/construction/') ||
      req.path.startsWith('/legal-pro/') ||
      req.path.startsWith('/reo-pro/') ||
      req.path.startsWith('/music/');

    if (!isProtectedPath) return next();

    const cookies = parseCookies(req.headers.cookie);
    const token   = cookies[COOKIE_NAME];

    if (verifyToken(token)) {
      // Refresh cookie on valid session (sliding window)
      const newToken = generateToken();
      res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${encodeURIComponent(newToken)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}`
      );
      return next();
    }

    // Not authenticated — redirect to login with return URL
    const returnTo = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?redirect=${returnTo}`);
  });

  console.log('[tsm-auth] Auth middleware active — protected routes gated behind session token');
  console.log('[tsm-auth] Access code source:', process.env.TSM_ACCESS_CODE ? 'ENV (TSM_ACCESS_CODE)' : 'DEFAULT (set TSM_ACCESS_CODE in Fly secrets!)');
}

module.exports = { tsmAuthMiddleware };
