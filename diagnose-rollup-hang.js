require('dotenv').config();
const tsmLedger = require('./server/tsm-ledger-service.js');

function withTimeout(promise, label, ms = 8000) {
  return Promise.race([
    promise.then(r => ({ ok: true, label, result: r })),
    new Promise(resolve => setTimeout(() => resolve({ ok: false, label, error: 'TIMED OUT after ' + ms + 'ms' }), ms)),
  ]);
}

(async () => {
  console.log('--- bpoBuildClientRollup("inphusionsys") ---');
  const r = await withTimeout(tsmLedger.bpoBuildClientRollup('inphusionsys'), 'bpoBuildClientRollup');
  console.log(JSON.stringify(r, null, 2));
  console.log('\nDone.');
  process.exit(0);
})().catch(e => {
  console.error('Script-level error:', e);
  process.exit(1);
});
