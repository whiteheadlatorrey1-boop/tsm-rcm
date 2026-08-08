// One-off smoke test for server/tsm-ledger-service.js.
// Run from repo root: node scripts/test-tsm-ledger.js
//
// Writes one test entry, reads it back, and reports pass/fail.
// Does not print MONGODB_URI or any credential — only the ledger
// document itself (no secrets in it).

require('dotenv').config();
const ledger = require('../server/tsm-ledger-service');

async function main() {
  console.log('[test-tsm-ledger] connecting...');
  await ledger.connect();
  console.log('[test-tsm-ledger] connected.');

  const marker = `smoke-test-${Date.now()}`;
  console.log('[test-tsm-ledger] writing test entry:', marker);
  const written = await ledger.writeEntry({
    type: 'connection-smoke-test',
    marker,
  });
  console.log('[test-tsm-ledger] write OK, _id:', String(written._id));

  console.log('[test-tsm-ledger] reading back recent entries...');
  const recent = await ledger.readRecentEntries(5);
  const found = recent.some((e) => e.marker === marker);

  if (!found) {
    console.error('[test-tsm-ledger] FAIL: wrote entry but did not find it on read-back.');
    process.exitCode = 1;
  } else {
    console.log('[test-tsm-ledger] PASS: wrote and read back', recent.length, 'recent entries, including the marker.');
  }

  await ledger.close();
}

main().catch((err) => {
  console.error('[test-tsm-ledger] FAIL:', err.message);
  process.exitCode = 1;
});
