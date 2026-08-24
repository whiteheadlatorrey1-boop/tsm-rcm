require('dotenv').config();
const tsmLedger = require('./server/tsm-ledger-service.js');

function withTimeout(promise, label, ms = 8000) {
  return Promise.race([
    promise.then(r => ({ ok: true, label, count: Array.isArray(r) ? r.length : 'n/a' })),
    new Promise(resolve => setTimeout(() => resolve({ ok: false, label, error: 'TIMED OUT after ' + ms + 'ms' }), ms)),
  ]);
}

(async () => {
  console.log('--- 1. bpoListWorkItems (baseline, known working) ---');
  console.log(await withTimeout(tsmLedger.bpoListWorkItems({ limit: 5 }), 'bpoListWorkItems'));

  console.log('\n--- 2. bpoListSlaEvents (hangs via HTTP) ---');
  console.log(await withTimeout(tsmLedger.bpoListSlaEvents({ limit: 5 }), 'bpoListSlaEvents'));

  console.log('\nDone.');
  process.exit(0);
})().catch(e => {
  console.error('Script-level error:', e);
  process.exit(1);
});
