// server/services/tsm-ledger-service.js
//
// Minimal Firestore-backed persistence layer for the property-accounting
// GL ledger + AP invoice workflow. Replaces the in-memory/session-only
// arrays currently used in property-accounting-revenue-cycle.html with
// real durable storage.
//
// Auth: uses GOOGLE_APPLICATION_CREDENTIALS from .env (already set to
// server/secrets/tsm-rcm-prod-firebase-adminsdk.json). applicationDefault()
// picks that env var up automatically.
//
// NOTE: firebase-admin v12+ dropped the old monolithic admin.apps /
// admin.credential.applicationDefault() / admin.firestore() namespace API
// in favor of modular imports. This file uses the current (v14) modular API.
//
// Collections used (created on first write, no manual setup needed):
//   gl_entries      — one doc per debit/credit line
//   ap_invoices     — one doc per AP invoice (seed + approve/reject state)
//   property_budget — one doc per property/period budget value

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

/**
 * Post a journal entry (one debit or credit line) to Firestore.
 * @param {Object} entry
 * @param {string} entry.propertyId
 * @param {string} entry.account       e.g. "Construction Expense", "Cash"
 * @param {"debit"|"credit"} entry.side
 * @param {number} entry.amount
 * @param {string} [entry.memo]
 * @returns {Promise<string>} the new document id
 */
async function postJournalEntry(entry) {
  if (!entry.propertyId || !entry.account || !entry.side || !entry.amount) {
    throw new Error('postJournalEntry: propertyId, account, side, amount are required');
  }
  if (entry.side !== 'debit' && entry.side !== 'credit') {
    throw new Error('postJournalEntry: side must be "debit" or "credit"');
  }
  const doc = await db.collection('gl_entries').add({
    ...entry,
    amount: Number(entry.amount),
    postedAt: FieldValue.serverTimestamp(),
  });
  return doc.id;
}

/**
 * Fetch all GL entries for a property, ordered oldest-first.
 * @param {string} propertyId
 */
async function getLedger(propertyId) {
  const snap = await db
    .collection('gl_entries')
    .where('propertyId', '==', propertyId)
    .orderBy('postedAt', 'asc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Check whether a property's ledger is balanced (total debits == total credits).
 * @param {string} propertyId
 */
async function isBalanced(propertyId) {
  const entries = await getLedger(propertyId);
  const totals = entries.reduce(
    (acc, e) => {
      acc[e.side] += e.amount;
      return acc;
    },
    { debit: 0, credit: 0 }
  );
  return Math.abs(totals.debit - totals.credit) < 0.01;
}

/**
 * Approve an AP invoice: marks it approved and posts the offsetting
 * journal entry (Debit Construction Expense / Credit Cash) atomically.
 * @param {string} invoiceId
 */
async function approveApInvoice(invoiceId) {
  const invoiceRef = db.collection('ap_invoices').doc(invoiceId);

  return db.runTransaction(async (tx) => {
    const invoiceSnap = await tx.get(invoiceRef);
    if (!invoiceSnap.exists) throw new Error(`AP invoice ${invoiceId} not found`);
    const invoice = invoiceSnap.data();
    if (invoice.status === 'approved') throw new Error('Invoice already approved');

    tx.update(invoiceRef, {
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
    });

    const debitRef = db.collection('gl_entries').doc();
    const creditRef = db.collection('gl_entries').doc();
    tx.set(debitRef, {
      propertyId: invoice.propertyId,
      account: 'Construction Expense',
      side: 'debit',
      amount: invoice.amount,
      memo: `AP invoice ${invoiceId} approved`,
      postedAt: FieldValue.serverTimestamp(),
    });
    tx.set(creditRef, {
      propertyId: invoice.propertyId,
      account: 'Cash',
      side: 'credit',
      amount: invoice.amount,
      memo: `AP invoice ${invoiceId} approved`,
      postedAt: FieldValue.serverTimestamp(),
    });

    return { debitId: debitRef.id, creditId: creditRef.id };
  });
}

/**
 * Reject an AP invoice: logs the decision, posts nothing.
 * @param {string} invoiceId
 * @param {string} [reason]
 */
async function rejectApInvoice(invoiceId, reason) {
  await db.collection('ap_invoices').doc(invoiceId).update({
    status: 'rejected',
    rejectedAt: FieldValue.serverTimestamp(),
    rejectReason: reason || null,
  });
}

/**
 * Update a property's budget for the current period.
 * @param {string} propertyId
 * @param {number} amount
 */
async function updateBudget(propertyId, amount) {
  if (!(amount > 0)) throw new Error('updateBudget: amount must be a positive number');
  await db.collection('property_budget').doc(propertyId).set(
    {
      amount: Number(amount),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

module.exports = {
  db,
  postJournalEntry,
  getLedger,
  isBalanced,
  approveApInvoice,
  rejectApInvoice,
  updateBudget,
};
