// scripts/test-ledger-connection.js
require('dotenv').config();
const ledger = require('../server/services/tsm-ledger-service');

const TEST_PROPERTY_ID = '__connection_test__';

async function main() {
  console.log('1. Posting a debit entry...');
  const debitId = await ledger.postJournalEntry({
    propertyId: TEST_PROPERTY_ID,
    account: 'Construction Expense',
    side: 'debit',
    amount: 100,
    memo: 'connection test debit',
  });
  console.log('   OK, doc id:', debitId);

  console.log('2. Reading ledger back...');
  const entries = await ledger.getLedger(TEST_PROPERTY_ID);
  if (entries.length !== 1) throw new Error(`Expected 1 entry, got ${entries.length}`);
  console.log('   OK, entry:', entries[0]);

  console.log('3. Checking balance (should be false, only 1 debit posted)...');
  const balancedBefore = await ledger.isBalanced(TEST_PROPERTY_ID);
  if (balancedBefore !== false) throw new Error('Expected unbalanced, got balanced');
  console.log('   OK, unbalanced as expected');

  console.log('4. Posting matching credit...');
  await ledger.postJournalEntry({
    propertyId: TEST_PROPERTY_ID,
    account: 'Cash',
    side: 'credit',
    amount: 100,
    memo: 'connection test credit',
  });

  console.log('5. Checking balance again (should be true now)...');
  const balancedAfter = await ledger.isBalanced(TEST_PROPERTY_ID);
  if (balancedAfter !== true) throw new Error('Expected balanced, got unbalanced');
  console.log('   OK, balanced');

  console.log('6. Cleaning up test data...');
  const db = await ledger.getDb();
  const result = await db.collection('gl_entries').deleteMany({ propertyId: TEST_PROPERTY_ID });
  console.log('   OK, cleaned up', result.deletedCount, 'test docs');

  console.log('\nALL CHECKS PASSED — MongoDB-compatible Firestore read/write confirmed working.');
  await ledger.closeConnection();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\nCONNECTION TEST FAILED:', err.message);
  console.error(err);
  await ledger.closeConnection();
  process.exit(1);
});
