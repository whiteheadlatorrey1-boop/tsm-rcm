#!/usr/bin/env node
// scripts/generate-bpo-client-monthly-reports.js
//
// Generates and persists this month's client-facing BPO report snapshot
// for every active client, via tsm-ledger-service's bpoBuildClientRollup
// / bpoSaveClientMonthlyReport (the same rollup logic the on-demand
// GET /api/bpo/reports/client-rollup route uses, so a client's monthly
// snapshot and their live on-demand view never disagree in how they're
// computed -- only in when they were taken).
//
// This script does NOT set up its own scheduling -- there's no cron
// infra in this repo (Fly.io deploy is push-to-deploy, not a scheduled
// task runner) and adding one is an infra decision, not a code change.
// Run manually, or wire into whatever scheduler you set up (a Fly
// Machines scheduled run, a GitHub Actions cron, etc).
//
// Usage:
//   node scripts/generate-bpo-client-monthly-reports.js
//   node scripts/generate-bpo-client-monthly-reports.js --period=2026-07   # backfill a specific month
//   node scripts/generate-bpo-client-monthly-reports.js --client-id=acme-co # single client only

require('dotenv').config();
const ledger = require('../server/tsm-ledger-service');

const args = process.argv.slice(2);
const periodArg = args.find(a => a.startsWith('--period='));
const clientIdArg = args.find(a => a.startsWith('--client-id='));
const period = periodArg ? periodArg.split('=')[1] : undefined;
const onlyClientId = clientIdArg ? clientIdArg.split('=')[1] : null;

async function main() {
  const clients = onlyClientId
    ? [{ id: onlyClientId }]
    : await ledger.bpoListClients({ status: 'active' });

  if (!clients.length) {
    console.log('No active clients found -- nothing to generate.');
    return;
  }

  console.log(`Generating monthly report${period ? ` for period ${period}` : ' (current period)'} for ${clients.length} client(s)...\n`);

  let succeeded = 0;
  let failed = 0;
  for (const client of clients) {
    const clientId = client.id || client.clientId;
    try {
      const rollup = await ledger.bpoBuildClientRollup(clientId);
      const saved = period
        ? await ledger.bpoSaveClientMonthlyReport(clientId, rollup, period)
        : await ledger.bpoSaveClientMonthlyReport(clientId, rollup);
      console.log(`  OK   ${clientId} — period ${saved.periodLabel}, ${rollup.totalWorkItems} work item(s), avg open age ${rollup.avgOpenAgeHours ?? 'n/a'}h`);
      succeeded++;
    } catch (e) {
      console.log(`  FAIL ${clientId} — ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${succeeded} succeeded, ${failed} failed.`);
  await ledger.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Report generation failed:', err.message);
  console.error(err);
  try { await ledger.close(); } catch (_) { /* already closed or never connected */ }
  process.exit(1);
});
