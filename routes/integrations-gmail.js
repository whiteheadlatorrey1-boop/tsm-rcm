'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GMAIL INTEGRATION — sandbox-first (your own test inbox), read-only
// ═══════════════════════════════════════════════════════════════════════════
// Same scope discipline as routes/integrations-quickbooks.js:
//   1. OAuth2 authorization-code connect flow (Google's standard flow)
//   2. Token storage + silent refresh
//   3. ONE read endpoint — recent messages matching a query — nothing else
// No send, no draft, no label mutation, no delete anywhere in this file.
// gmail.readonly is the only scope requested; there is no code path here
// that could write to the connected inbox even if asked to.
//
// Requires (see .env.example):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
// Optional:
//   GMAIL_QUERY — Gmail search syntax, defaults to 'is:unread newer_than:30d'
//
// Recommend testing this against a throwaway/test Gmail account first, not
// a real production inbox — same reasoning as QuickBooks sandbox: prove the
// pattern somewhere low-stakes before pointing it at anything that matters.
//
// NOT LIVE-TESTED: this sandbox's network allowlist can't reach
// accounts.google.com, oauth2.googleapis.com, or gmail.googleapis.com, so
// this has been reviewed against Google's documented OAuth2 + Gmail API v1
// contracts but not executed end-to-end. Verify from an environment with
// real network access before treating this as working.

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireRole } = require('../middleware/require-auth');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const TOKEN_FILE = path.join(DATA_DIR, 'integrations-gmail-tokens.json');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

// Same access boundary reasoning as QuickBooks: connecting/disconnecting an
// inbox and reading what's flagged from it is a manager/admin action, not
// something every staff role should be able to trigger.
const GMAIL_MANAGE_ROLES = ['admin', 'manager'];

function readTokens() {
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); }
  catch { return null; }
}
function writeTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}
function clearTokens() {
  try { fs.unlinkSync(TOKEN_FILE); } catch { /* already gone */ }
}

const pendingStates = new Map();

// ── STATUS ──────────────────────────────────────────────────────────────
router.get('/api/integrations/gmail/status', requireRole(GMAIL_MANAGE_ROLES), (req, res) => {
  const tokens = readTokens();
  res.json({
    ok: true,
    connected: !!(tokens && tokens.access_token),
    email: tokens?.email || null,
    connectedAt: tokens?.connectedAt || null,
  });
});

// ── CONNECT: redirect to Google's consent screen ───────────────────────
router.get('/api/integrations/gmail/connect', requireRole(GMAIL_MANAGE_ROLES), (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ ok: false, error: 'GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI not configured — see .env.example' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, { createdAt: Date.now() });
  for (const [s, v] of pendingStates) if (Date.now() - v.createdAt > 10 * 60 * 1000) pendingStates.delete(s);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',   // required to get a refresh_token back
    prompt: 'consent',        // force Google to re-issue a refresh_token even on repeat connects
    state,
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// ── CALLBACK: exchange code for tokens ─────────────────────────────────
router.get('/api/integrations/gmail/callback', requireRole(GMAIL_MANAGE_ROLES), async (req, res) => {
  const { code, state, error: googleError } = req.query;
  if (googleError) return res.status(400).send(`Google authorization failed: ${googleError}`);
  if (!state || !pendingStates.has(state)) return res.status(400).send('Invalid or expired OAuth state — start the connect flow again.');
  pendingStates.delete(state);
  if (!code) return res.status(400).send('Missing code from Google callback.');

  try {
    const tokenResp = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const tokens = {
      access_token: tokenResp.data.access_token,
      refresh_token: tokenResp.data.refresh_token, // only present on first consent (or with prompt=consent)
      expires_at: Date.now() + (tokenResp.data.expires_in * 1000),
      connectedAt: new Date().toISOString(),
    };

    if (!tokens.refresh_token) {
      const existing = readTokens();
      if (existing?.refresh_token) tokens.refresh_token = existing.refresh_token;
    }

    // Best-effort: fetch the connected address for display. Not required
    // for the integration to function, so failure here doesn't block connect.
    try {
      const profile = await axios.get(`${GMAIL_API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      tokens.email = profile.data.emailAddress || null;
    } catch { tokens.email = null; }

    writeTokens(tokens);
    res.redirect('/integrations/gmail-financial-inbox.html?connected=1');
  } catch (e) {
    const detail = e.response?.data || e.message;
    res.status(502).json({ ok: false, error: 'Token exchange with Google failed', detail });
  }
});

// ── DISCONNECT ──────────────────────────────────────────────────────────
router.post('/api/integrations/gmail/disconnect', requireRole(GMAIL_MANAGE_ROLES), (req, res) => {
  clearTokens();
  res.json({ ok: true });
});

// ── TOKEN REFRESH (internal helper, not a route) ───────────────────────
async function getValidAccessToken() {
  const tokens = readTokens();
  if (!tokens || !tokens.refresh_token) return null;

  if (tokens.access_token && Date.now() < tokens.expires_at - 60000) {
    return tokens;
  }

  const resp = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const updated = {
    ...tokens,
    access_token: resp.data.access_token,
    expires_at: Date.now() + (resp.data.expires_in * 1000),
    // Google generally does NOT rotate the refresh token on refresh
    // (unlike Intuit) — keep the original unless a new one is issued.
    refresh_token: resp.data.refresh_token || tokens.refresh_token,
  };
  writeTokens(updated);
  return updated;
}

function decodeHeader(headers, name) {
  const h = (headers || []).find(x => x.name === name);
  return h ? h.value : null;
}

// ── MESSAGES (read-only) ────────────────────────────────────────────────
// Pulls message metadata (Subject/From/Date) for messages matching a
// query. No body content is fetched or stored — metadata only, kept
// deliberately minimal for a first pass. No mock/sample fallback: if
// Gmail isn't connected or the call fails, returns an explicit error.
router.get('/api/integrations/gmail/messages', requireRole(GMAIL_MANAGE_ROLES), async (req, res) => {
  try {
    const tokens = await getValidAccessToken();
    if (!tokens) return res.status(409).json({ ok: false, error: 'Gmail is not connected. Visit /api/integrations/gmail/connect first.' });

    const query = process.env.GMAIL_QUERY || 'is:unread newer_than:30d';
    const listResp = await axios.get(`${GMAIL_API_BASE}/messages`, {
      params: { q: query, maxResults: 25 },
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const ids = (listResp.data.messages || []).map(m => m.id);
    const messages = [];
    // Gmail's batch endpoint adds real complexity (multipart HTTP) for a
    // first pass — sequential metadata GETs, capped at 25/request, is the
    // simpler and still-reasonable choice for this scope.
    for (const id of ids) {
      const m = await axios.get(`${GMAIL_API_BASE}/messages/${id}`, {
        params: { format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] },
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      messages.push({
        id,
        threadId: m.data.threadId,
        subject: decodeHeader(m.data.payload?.headers, 'Subject') || '(no subject)',
        from: decodeHeader(m.data.payload?.headers, 'From') || 'Unknown',
        date: decodeHeader(m.data.payload?.headers, 'Date') || null,
        snippet: m.data.snippet || '',
      });
    }

    res.json({ ok: true, query, count: messages.length, messages });
  } catch (e) {
    const detail = e.response?.data || e.message;
    res.status(502).json({ ok: false, error: 'Failed to fetch messages from Gmail', detail });
  }
});

module.exports = router;
