'use strict';
const express = require('express');
const router = express.Router();

const ledger = require('../server/tsm-ledger-service');

const EXPENSE_ACCOUNTS = ['Construction Expense'];

// Seed data used only the first time a given missionId is seen — matches
// the fixture values the page used to hardcode client-side.
const DEFAULT_SEED = {
  title: 'Month-End Property Close Exception',
  property: 'Desert Ridge Commercial Center',
  period: 'July 2026',
  budget: 482000,
  actual: 517400,
  retainageHeld: 24100,
};

const DEFAULT_AP_INVOICES = [
  { id: 'INV-4821', vendor: 'Summit Steel & Supply', amount: 18400, status: 'pending' },
  { id: 'INV-4822', vendor: 'Desert Ridge Electrical', amount: 9250, status: 'pending' },
  { id: 'INV-4823', vendor: 'Apex Concrete Co.', amount: 12600, status: 'pending' },
];

// GET /api/property-accounting/:missionId/state
// Returns { mission, glEntries, apInvoices }, seeding fixture data on
// first access for a missionId that's never been seen before.
router.get('/api/property-accounting/:missionId/state', async (req, res) => {
  try {
    const { missionId } = req.params;
    const mission = await ledger.paEnsureMission(missionId, DEFAULT_SEED);
    await ledger.paEnsureApInvoices(missionId, DEFAULT_AP_INVOICES);
    const [glEntries, apInvoices] = await Promise.all([
      ledger.paListGlEntries(missionId),
      ledger.paListApInvoices(missionId),
    ]);
    res.json({ ok: true, mission, glEntries, apInvoices });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/property-accounting/:missionId/journal-entry
// body: { account, type: 'debit'|'credit', amount, description }
router.post('/api/property-accounting/:missionId/journal-entry', async (req, res) => {
  try {
    const { missionId } = req.params;
    const { account, type, amount, description } = req.body || {};
    const numAmount = Number(amount);

    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'amount must be a positive number' });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ ok: false, error: 'description is required' });
    }
    if (type !== 'debit' && type !== 'credit') {
      return res.status(400).json({ ok: false, error: "type must be 'debit' or 'credit'" });
    }

    const entry = {
      date: new Date().toISOString().slice(0, 10),
      account,
      type,
      amount: Math.round(numAmount * 100) / 100,
      description: String(description).trim(),
    };

    const posted = await ledger.paPostGlEntry(missionId, entry);

    // Same rule the client used to apply locally: a debit to an expense
    // account is real spend hitting Actual; a credit reverses it.
    if (EXPENSE_ACCOUNTS.indexOf(account) !== -1) {
      const delta = type === 'debit' ? entry.amount : -entry.amount;
      await ledger.paAdjustActual(missionId, delta);
    }

    const mission = await ledger.paGetMission(missionId);
    res.json({ ok: true, entry: posted, mission });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/property-accounting/:missionId/ap/:invoiceId/approve
router.post('/api/property-accounting/:missionId/ap/:invoiceId/approve', async (req, res) => {
  try {
    const { missionId, invoiceId } = req.params;
    const updated = await ledger.paSetApInvoiceStatus(missionId, invoiceId, 'approved');
    if (!updated) {
      return res.status(409).json({ ok: false, error: 'invoice not found or not pending' });
    }

    // Approving payment is a real offsetting entry: debit expense, credit cash.
    const entry = {
      date: new Date().toISOString().slice(0, 10),
      account: 'Construction Expense',
      type: 'debit',
      amount: updated.amount,
      description: 'AP approved — ' + updated.vendor + ' (' + updated.id + ')',
    };
    const posted = await ledger.paPostGlEntry(missionId, entry);
    await ledger.paAdjustActual(missionId, updated.amount);

    const mission = await ledger.paGetMission(missionId);
    res.json({ ok: true, invoice: updated, entry: posted, mission });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/property-accounting/:missionId/ap/:invoiceId/reject
router.post('/api/property-accounting/:missionId/ap/:invoiceId/reject', async (req, res) => {
  try {
    const { missionId, invoiceId } = req.params;
    const updated = await ledger.paSetApInvoiceStatus(missionId, invoiceId, 'rejected');
    if (!updated) {
      return res.status(409).json({ ok: false, error: 'invoice not found or not pending' });
    }
    res.json({ ok: true, invoice: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/property-accounting/:missionId/budget
// body: { budget }
router.post('/api/property-accounting/:missionId/budget', async (req, res) => {
  try {
    const { missionId } = req.params;
    const numBudget = Number(req.body && req.body.budget);
    if (!Number.isFinite(numBudget) || numBudget <= 0) {
      return res.status(400).json({ ok: false, error: 'budget must be a positive number' });
    }
    const mission = await ledger.paUpdateBudget(missionId, numBudget);
    res.json({ ok: true, mission });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
