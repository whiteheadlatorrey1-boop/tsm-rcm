'use strict';
/**
 * SAP Business Accelerator Hub sandbox routes -- read-only.
 *
 * Wires server/enterprise/sap-sandbox-adapter.js into the existing
 * Enterprise surface under /api/enterprise/sap/*. Standalone router module
 * (no dependency on server.js's locals), same mounting convention as
 * routes/enterprise-capability-bridge.js.
 *
 * Gated behind SAP_INTEGRATION_ENABLED -- disabled by default, so this is a
 * pure addition with zero effect on any existing route until a deliberate
 * opt-in sets the flag (and a sandbox API key) in the environment. Even
 * then, every function this module calls is GET-only against SAP's public
 * sandbox gateway (canned sample data, not a real tenant) -- there is no
 * write path here at all.
 *
 * Any authenticated session (staff or client) may read these -- gated
 * behind requireAnyAuth rather than left open, since each successful call
 * makes a real outbound request using a real (sandbox) API key and an
 * unauthenticated public endpoint would be a free amplification/abuse
 * vector against that key's rate limit.
 */

const express = require('express');
const router = express.Router();
const { requireAnyAuth } = require('../middleware/require-auth');
const sap = require('../server/enterprise/sap-sandbox-adapter');

function clampTop(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(Math.floor(n), 50);
}

router.get('/api/enterprise/sap/status', requireAnyAuth, (req, res) => {
  res.json({ ok: true, enabled: sap.isConfigured() });
});

router.get('/api/enterprise/sap/business-partners', requireAnyAuth, async (req, res) => {
  try {
    const businessPartners = await sap.getBusinessPartners({ top: clampTop(req.query.top) });
    res.json({ ok: true, businessPartners });
  } catch (e) {
    if (e.code === 'SAP_NOT_CONFIGURED') return res.status(503).json({ ok: false, error: e.code, message: e.message });
    res.status(e.status && e.status < 500 ? 400 : 502).json({ ok: false, error: e.message });
  }
});

router.get('/api/enterprise/sap/sales-orders', requireAnyAuth, async (req, res) => {
  try {
    const salesOrders = await sap.getSalesOrders({ top: clampTop(req.query.top) });
    res.json({ ok: true, salesOrders });
  } catch (e) {
    if (e.code === 'SAP_NOT_CONFIGURED') return res.status(503).json({ ok: false, error: e.code, message: e.message });
    res.status(e.status && e.status < 500 ? 400 : 502).json({ ok: false, error: e.message });
  }
});

module.exports = router;
