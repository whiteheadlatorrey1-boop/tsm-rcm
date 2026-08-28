'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// QUICKBOOKS ONLINE INTEGRATION (ERP) — sandbox-first, read-only
// ═══════════════════════════════════════════════════════════════════════════
// This is intentionally the smallest useful slice of an ERP integration:
//   1. OAuth2 authorization-code connect flow (Intuit's standard flow)
//   2. Token storage + silent refresh
//   3. ONE read endpoint — open invoices — nothing else
// No write-back to QuickBooks anywhere in this file. That's a deliberate
// scope boundary, not a TODO: adding write access to a real accounting
// system is a materially bigger trust/blast-radius decision than reading
// from it, and should be its own explicit follow-up, not a corner cut here.
//
// Requires (see .env.example):
//   QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI, QBO_ENVIRONMENT
// QBO_ENVIRONMENT should be 'sandbox' until this has been reviewed for a
// production Intuit app + real company data — sandbox uses fake company
// data from an Intuit developer account, so there's no real financial
// data at risk while this is being built out.
//
// NOTE ON VERIFICATION: this file was written and reviewed for correctness
// against Intuit's documented OAuth2 + Accounting API v3 contracts, but
// the sandbox network this was built in cannot reach appcenter.intuit.com
// or quickbooks.api.intuit.com, so the live OAuth exchange and API calls
// have NOT been executed end-to-end. Test against a real Intuit developer
// sandbox app before treating this as verified.

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireRole } = require('../middleware/require-auth');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const TOKEN_FILE = path.join(DATA_DIR, 'integrations-quickbooks-tokens.json');

const QBO_ENV = (process.env.QBO_ENVIRONMENT || 'sandbox').toLowerCase();
const QBO_AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QBO_API_BASE = QBO_ENV === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

// Only staff who can manage financial connections should be able to
// connect/disconnect QuickBooks. Reading the already-fetched invoice list
// is gated the same way for now — tighten to a broader role once there's
// a real need for non-managers to view it read-only.
const QBO_MANAGE_ROLES = ['admin', 'manager'];

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

// In-memory CSRF state store for the OAuth `state` param. A file-backed
// store would survive a server restart mid-flow, but that's a narrow
// window and not worth persisting secrets-adjacent state to disk for.
const pendingStates = new Map();

// ── STATUS ──────────────────────────────────────────────────────────────
router.get('/api/integrations/quickbooks/status', requireRole(QBO_MANAGE_ROLES), (req, res) => {
  const tokens = readTokens();
  res.json({
    ok: true,
    connected: !!(tokens && tokens.access_token),
    environment: QBO_ENV,
    realmId: tokens?.realmId || null,
    connectedAt: tokens?.connectedAt || null,
  });
});

// ── CONNECT: redirect to Intuit's consent screen ───────────────────────
router.get('/api/integrations/quickbooks/connect', requireRole(QBO_MANAGE_ROLES), (req, res) => {
  if (!process.env.QBO_CLIENT_ID || !process.env.QBO_REDIRECT_URI) {
    return res.status(500).json({ ok: false, error: 'QBO_CLIENT_ID / QBO_REDIRECT_URI not configured — see .env.example' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, { createdAt: Date.now() });
  // States older than 10 minutes are considered stale and rejected on callback.
  for (const [s, v] of pendingStates) if (Date.now() - v.createdAt > 10 * 60 * 1000) pendingStates.delete(s);

  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: process.env.QBO_REDIRECT_URI,
    state,
  });
  res.redirect(`${QBO_AUTHORIZE_URL}?${params.toString()}`);
});

// ── CALLBACK: exchange code for tokens ─────────────────────────────────
router.get('/api/integrations/quickbooks/callback', requireRole(QBO_MANAGE_ROLES), async (req, res) => {
  const { code, state, realmId, error: qboError } = req.query;
  if (qboError) return res.status(400).send(`QuickBooks authorization failed: ${qboError}`);
  if (!state || !pendingStates.has(state)) return res.status(400).send('Invalid or expired OAuth state — start the connect flow again.');
  pendingStates.delete(state);
  if (!code || !realmId) return res.status(400).send('Missing code or realmId from QuickBooks callback.');

  try {
    const basicAuth = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
    const tokenResp = await axios.post(QBO_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.QBO_REDIRECT_URI,
      }).toString(),
      { headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
      }}
    );

    writeTokens({
      access_token: tokenResp.data.access_token,
      refresh_token: tokenResp.data.refresh_token,
      expires_at: Date.now() + (tokenResp.data.expires_in * 1000),
      realmId: String(realmId),
      connectedAt: new Date().toISOString(),
    });

    // Redirect back into the app UI rather than leaving the user on a bare
    // JSON response after a browser-based OAuth round trip.
    res.redirect('/integrations/quickbooks-financial-erp.html?connected=1');
  } catch (e) {
    const detail = e.response?.data || e.message;
    res.status(502).json({ ok: false, error: 'Token exchange with QuickBooks failed', detail });
  }
});

// ── DISCONNECT ──────────────────────────────────────────────────────────
router.post('/api/integrations/quickbooks/disconnect', requireRole(QBO_MANAGE_ROLES), (req, res) => {
  clearTokens();
  res.json({ ok: true });
});

// ── TOKEN REFRESH (internal helper, not a route) ───────────────────────
async function getValidAccessToken() {
  const tokens = readTokens();
  if (!tokens || !tokens.refresh_token) return null;

  // Refresh a bit early (60s buffer) rather than exactly at expiry.
  if (tokens.access_token && Date.now() < tokens.expires_at - 60000) {
    return tokens;
  }

  const basicAuth = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
  const resp = await axios.post(QBO_TOKEN_URL,
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }).toString(),
    { headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
    }}
  );

  const updated = {
    ...tokens,
    access_token: resp.data.access_token,
    // Intuit rotates the refresh token on every refresh — must persist the new one.
    refresh_token: resp.data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + (resp.data.expires_in * 1000),
  };
  writeTokens(updated);
  return updated;
}

// ── INVOICES (read-only) ────────────────────────────────────────────────
// Pulls open (unpaid) invoices via the Accounting API's SQL-like query
// language. No mock/sample fallback: if QuickBooks isn't connected or the
// call fails, this returns an explicit error, not invented data — same
// "no invented numbers, no invented errors" convention the rest of the
// platform's real-data endpoints follow.
router.get('/api/integrations/quickbooks/invoices', requireRole(QBO_MANAGE_ROLES), async (req, res) => {
  try {
    const tokens = await getValidAccessToken();
    if (!tokens) return res.status(409).json({ ok: false, error: 'QuickBooks is not connected. Visit /api/integrations/quickbooks/connect first.' });

    const query = "select * from Invoice where Balance > '0' orderby DueDate";
    const resp = await axios.get(`${QBO_API_BASE}/v3/company/${tokens.realmId}/query`, {
      params: { query },
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
      },
    });

    const rawInvoices = resp.data?.QueryResponse?.Invoice || [];
    const today = new Date();
    const invoices = rawInvoices.map(inv => {
      const dueDate = inv.DueDate ? new Date(inv.DueDate) : null;
      const daysOverdue = dueDate ? Math.floor((today - dueDate) / 86400000) : null;
      return {
        id: inv.Id,
        docNumber: inv.DocNumber || null,
        customer: inv.CustomerRef?.name || 'Unknown',
        balance: inv.Balance,
        totalAmt: inv.TotalAmt,
        dueDate: inv.DueDate || null,
        daysOverdue: daysOverdue && daysOverdue > 0 ? daysOverdue : 0,
        overdue: !!(daysOverdue && daysOverdue > 0),
      };
    });

    res.json({ ok: true, environment: QBO_ENV, realmId: tokens.realmId, invoices });
  } catch (e) {
    const detail = e.response?.data || e.message;
    res.status(502).json({ ok: false, error: 'Failed to fetch invoices from QuickBooks', detail });
  }
});

module.exports = router;
