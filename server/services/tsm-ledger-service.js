// server/services/tsm-ledger-service.js
//
// Firestore MongoDB-compatible-mode persistence layer for the
// property-accounting GL ledger + AP invoice workflow.
//
// WHY MONGODB DRIVER INSTEAD OF firebase-admin:
// The existing database (Database ID: tsm-consultz) was created in
// Firestore's "Enterprise Edition" / MongoDB-compatibility mode, not
// Native mode. That access mode is locked in at creation and cannot be
// changed. firebase-admin's Firestore client only works with Native mode,
// so this file talks to the same database via the standard `mongodb`
// npm driver instead, using SCRAM username/password auth.
//
// Requires in .env:
//   MONGODB_URI=mongodb://<user>:<pass>@89da3c40-cf0e-4a06-ae72-e98579dc55cd.nam5.firestore.goog:443/tsm-consultz?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false
//
// Collections used (created on first write, no manual setup needed):
//   gl_entries      — one doc per debit/credit line
//   ap_invoices     — one doc per AP invoice (seed + approve/reject state)
//   property_budget — one doc per property/period budget value

const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    'tsm-ledger-service: MONGODB_URI is not set in .env. See file header comment for the expected format.'
  );
}

let clientPromise = null;

function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClient();
  return client.db();
}

async function closeConnection() {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    clientPromise = null;
  }
}

async function postJournalEntry(entry) {
  if (!entry.propertyId || !entry.account || !entry.side || !entry.amount) {
    throw new Error('postJournalEntry: propertyId, account, side, amount are required');
  }
  if (entry.side !== 'debit' && entry.side !== 'credit') {
    throw new Error('postJournalEntry: side must be "debit" or "credit"');
  }
  const db = await getDb();
  const result = await db.collection('gl_entries').insertOne({
    ...entry,
    amount: Number(entry.amount),
    postedAt: new Date(),
  });
  return result.insertedId.toString();
}

async function getLedger(propertyId) {
  const db = await getDb();
  const docs = await db
    .collection('gl_entries')
    .find({ propertyId })
    .sort({ postedAt: 1 })
    .toArray();
  return docs.map((d) => ({ ...d, id: d._id.toString(), _id: undefined }));
}

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

async function approveApInvoice(invoiceId) {
  const db = await getDb();
  const client = await getClient();
  const invoicesCol = db.collection('ap_invoices');
  const glCol = db.collection('gl_entries');
  const _id = new ObjectId(invoiceId);

  const invoice = await invoicesCol.findOne({ _id });
  if (!invoice) throw new Error(`AP invoice ${invoiceId} not found`);
  if (invoice.status === 'approved') throw new Error('Invoice already approved');

  const now = new Date();
  const debitDoc = {
    propertyId: invoice.propertyId,
    account: 'Construction Expense',
    side: 'debit',
    amount: invoice.amount,
    memo: `AP invoice ${invoiceId} approved`,
    postedAt: now,
  };
  const creditDoc = {
    propertyId: invoice.propertyId,
    account: 'Cash',
    side: 'credit',
    amount: invoice.amount,
    memo: `AP invoice ${invoiceId} approved`,
    postedAt: now,
  };

  const session = client.startSession();
  try {
    let debitId, creditId;
    await session.withTransaction(async () => {
      await invoicesCol.updateOne(
        { _id },
        { $set: { status: 'approved', approvedAt: now } },
        { session }
      );
      const debitResult = await glCol.insertOne(debitDoc, { session });
      const creditResult = await glCol.insertOne(creditDoc, { session });
      debitId = debitResult.insertedId.toString();
      creditId = creditResult.insertedId.toString();
    });
    return { debitId, creditId };
  } catch (err) {
    console.warn(
      '[tsm-ledger-service] Transaction failed, falling back to sequential writes:',
      err.message
    );
    await invoicesCol.updateOne({ _id }, { $set: { status: 'approved', approvedAt: now } });
    const debitResult = await glCol.insertOne(debitDoc);
    const creditResult = await glCol.insertOne(creditDoc);
    return {
      debitId: debitResult.insertedId.toString(),
      creditId: creditResult.insertedId.toString(),
    };
  } finally {
    await session.endSession();
  }
}

async function rejectApInvoice(invoiceId, reason) {
  const db = await getDb();
  await db.collection('ap_invoices').updateOne(
    { _id: new ObjectId(invoiceId) },
    {
      $set: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectReason: reason || null,
      },
    }
  );
}

async function updateBudget(propertyId, amount) {
  if (!(amount > 0)) throw new Error('updateBudget: amount must be a positive number');
  const db = await getDb();
  await db.collection('property_budget').updateOne(
    { propertyId },
    { $set: { propertyId, amount: Number(amount), updatedAt: new Date() } },
    { upsert: true }
  );
}

module.exports = {
  getDb,
  closeConnection,
  postJournalEntry,
  getLedger,
  isBalanced,
  approveApInvoice,
  rejectApInvoice,
  updateBudget,
};
