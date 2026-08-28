'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// EHR INTEGRATION (FHIR) — PUBLIC SYNTHETIC SANDBOX ONLY, read-only
// ═══════════════════════════════════════════════════════════════════════════
// This is deliberately NOT wired to a real EHR (Epic, Cerner, athenahealth,
// etc.) and should not be pointed at one as-is. Reasoning:
//
//   1. Real patient data is PHI. Touching a real EHR generally requires a
//      signed BAA with the vendor and with whoever hosts this app, plus a
//      real security review — that's an organizational decision, not
//      something to back into via a code change.
//   2. Real EHRs authenticate via SMART on FHIR (OAuth2 + a
//      .well-known/smart-configuration discovery step + launch context +
//      scoped patient/*.read permissions). That's a materially bigger
//      implementation than what's here, and isn't attempted in this file —
//      building it out is an explicit, separate follow-up.
//
// What IS here: FHIR_BASE_URL defaults to a public HAPI FHIR R4 test
// server (https://hapi.fhir.org/baseR4) — synthetic test patients, no
// real PHI, no auth required for reads. This proves the read pattern
// (query FHIR resources, surface them, flag simple anomalies) safely.
// An optional static bearer token is supported for FHIR test servers that
// require one, but that is NOT the same thing as real SMART on FHIR OAuth
// and should not be treated as sufficient for a production EHR connection.
//
// Requires (see .env.example): none, by default.
// Optional: FHIR_BASE_URL, FHIR_BEARER_TOKEN
//
// NOT LIVE-TESTED: this sandbox's network allowlist can't reach
// hapi.fhir.org, so the queries below have been written against HAPI's
// documented public test server and the FHIR R4 spec, but not executed
// end-to-end. Verify from an environment with real network access.

const express = require('express');
const axios = require('axios');
const { requireRole } = require('../middleware/require-auth');

const router = express.Router();

const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4';
const IS_PUBLIC_SANDBOX = FHIR_BASE_URL.includes('hapi.fhir.org');

// Same access reasoning as the other integrations, tightened further given
// this touches (synthetic, for now) clinical data.
const EHR_VIEW_ROLES = ['admin', 'manager'];

function fhirHeaders() {
  const headers = { Accept: 'application/fhir+json' };
  if (process.env.FHIR_BEARER_TOKEN) headers.Authorization = `Bearer ${process.env.FHIR_BEARER_TOKEN}`;
  return headers;
}

function patientName(p) {
  const n = (p.name || [])[0];
  if (!n) return 'Unknown';
  return [...(n.given || []), n.family].filter(Boolean).join(' ') || 'Unknown';
}

// ── STATUS ──────────────────────────────────────────────────────────────
router.get('/api/integrations/fhir/status', requireRole(EHR_VIEW_ROLES), (req, res) => {
  res.json({
    ok: true,
    baseUrl: FHIR_BASE_URL,
    isPublicSandbox: IS_PUBLIC_SANDBOX,
    // Not a real connection state the way OAuth-based integrations have
    // one — this just reflects config. Deliberately not called "connected"
    // to avoid implying an auth handshake that doesn't exist here.
    configured: true,
    warning: IS_PUBLIC_SANDBOX
      ? 'Using the public HAPI FHIR test sandbox — synthetic patients only, no real PHI.'
      : 'FHIR_BASE_URL has been overridden away from the public sandbox. Confirm a BAA and proper SMART-on-FHIR auth are in place before pointing this at any system holding real PHI — this file does not implement that auth.',
  });
});

// ── PATIENTS (read-only) ─────────────────────────────────────────────────
// No mock/sample fallback: if the FHIR server is unreachable or errors,
// this returns an explicit error, not invented patient data.
router.get('/api/integrations/fhir/patients', requireRole(EHR_VIEW_ROLES), async (req, res) => {
  try {
    const resp = await axios.get(`${FHIR_BASE_URL}/Patient`, {
      params: { _count: 15, _sort: '-_lastUpdated' },
      headers: fhirHeaders(),
    });

    const entries = resp.data?.entry || [];
    const patients = entries.map(e => {
      const p = e.resource || {};
      return {
        id: p.id,
        name: patientName(p),
        gender: p.gender || null,
        birthDate: p.birthDate || null,
      };
    });

    res.json({ ok: true, baseUrl: FHIR_BASE_URL, isPublicSandbox: IS_PUBLIC_SANDBOX, patients });
  } catch (e) {
    const detail = e.response?.data || e.message;
    res.status(502).json({ ok: false, error: 'Failed to fetch patients from FHIR server', detail });
  }
});

// ── CONDITIONS FOR A PATIENT (read-only) ─────────────────────────────────
router.get('/api/integrations/fhir/patients/:id/conditions', requireRole(EHR_VIEW_ROLES), async (req, res) => {
  try {
    const resp = await axios.get(`${FHIR_BASE_URL}/Condition`, {
      params: { patient: req.params.id, 'clinical-status': 'active' },
      headers: fhirHeaders(),
    });

    const entries = resp.data?.entry || [];
    const conditions = entries.map(e => {
      const c = e.resource || {};
      return {
        id: c.id,
        text: c.code?.text || c.code?.coding?.[0]?.display || 'Unspecified condition',
        clinicalStatus: c.clinicalStatus?.coding?.[0]?.code || null,
        severity: c.severity?.coding?.[0]?.display || c.severity?.text || null,
        onsetDateTime: c.onsetDateTime || null,
      };
    });

    res.json({ ok: true, patientId: req.params.id, conditions });
  } catch (e) {
    const detail = e.response?.data || e.message;
    res.status(502).json({ ok: false, error: 'Failed to fetch conditions from FHIR server', detail });
  }
});

module.exports = router;
