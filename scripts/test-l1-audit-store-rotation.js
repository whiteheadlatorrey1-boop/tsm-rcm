'use strict';
// Regression test for server/l1-copilot/audit-store.js's rotation scheme:
// audit records are kept FOREVER, rotated into one file per calendar day
// (l1-copilot-audit-YYYY-MM-DD.json) instead of the old single
// l1-copilot-audit.json capped at MAX_RECORDS=5000 (oldest records
// silently dropped once the cap was hit -- unacceptable for audit
// evidence, see docs/l1-pilot-integration-user.md and the module's own
// header comment).
//
// Isolates itself from any real data in data/ by moving aside every file
// matching the audit-store's naming pattern (legacy + dated) before
// running, and restoring them afterward.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const auditStore = require('../server/l1-copilot/audit-store');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

const DATA_DIR = path.dirname(auditStore.FILE_PATH);
const BACKUP_SUFFIX = '.rotation-test-backup';

function auditFilesOnDisk() {
  const names = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [];
  return names
    .filter(f => (f.startsWith('l1-copilot-audit-') || f === 'l1-copilot-audit.json') && f.endsWith('.json') && !f.endsWith(BACKUP_SUFFIX))
    .map(f => path.join(DATA_DIR, f));
}

function stashRealFiles() {
  const moved = [];
  auditFilesOnDisk().forEach(f => {
    const backup = f + BACKUP_SUFFIX;
    fs.renameSync(f, backup);
    moved.push([f, backup]);
  });
  return moved;
}

function restoreRealFiles(moved) {
  auditFilesOnDisk().forEach(f => fs.unlinkSync(f)); // remove whatever this test created
  moved.forEach(([original, backup]) => fs.renameSync(backup, original));
}

function makeRecord(overrides = {}) {
  return Object.assign({
    id: 'SYNTH-' + Math.random().toString(36).slice(2),
    type: 'L1_COPILOT_AUDIT',
    eventType: 'ACTION_EXECUTED',
    actionType: 'TEST',
    sourceIncident: 'INC-SYNTH',
    technician: { id: 'TECH-SYNTH', label: null },
    createdAt: new Date().toISOString()
  }, overrides);
}

function yesterdayPath() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return auditStore.datedFilePath(d);
}

(async () => {
  const stashed = stashRealFiles();
  let errored = null;

  try {
    // --- never drops old records past what used to be the 5000 cap ---
    // Pre-seed today's file with 5005 synthetic records directly (fast --
    // avoids 5005 real recordAudit() round-trips) to prove the NEW write
    // below doesn't trigger any slice/drop behavior.
    const preSeeded = Array.from({ length: 5005 }, (_, i) => makeRecord({ id: 'SEED-' + i }));
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(auditStore.FILE_PATH, JSON.stringify(preSeeded, null, 2), 'utf8');

    const newRecord = auditStore.recordAudit({
      eventType: 'ACTION_EXECUTED',
      actionType: 'ROTATION_TEST',
      sourceIncident: 'INC-ROTATION-1',
      technician: { id: 'TECH-ROTATION' }
    });

    const onDiskAfter = JSON.parse(fs.readFileSync(auditStore.FILE_PATH, 'utf8'));
    ok(onDiskAfter.length === 5006, 'writing past the old 5000-record cap keeps every record instead of dropping the oldest (got ' + onDiskAfter.length + ')');
    ok(onDiskAfter[0].id === 'SEED-0', 'the oldest pre-seeded record (SEED-0) is still present, not dropped');
    ok(onDiskAfter[onDiskAfter.length - 1].id === newRecord.id, 'the newly recorded entry is appended at the end');
    ok(auditStore.countAudit() === 5006, 'countAudit() agrees: nothing was dropped (got ' + auditStore.countAudit() + ')');

    // reset today's file to something small for the remaining assertions
    fs.unlinkSync(auditStore.FILE_PATH);

    // --- rotation: yesterday's and today's records are both visible ---
    const yesterdayFile = yesterdayPath();
    ok(yesterdayFile !== auditStore.FILE_PATH, 'datedFilePath() for yesterday differs from today\'s FILE_PATH');
    const yesterdayRecord = makeRecord({ id: 'YESTERDAY-1', sourceIncident: 'INC-YESTERDAY' });
    fs.writeFileSync(yesterdayFile, JSON.stringify([yesterdayRecord], null, 2), 'utf8');

    const todayRecord = auditStore.recordAudit({
      eventType: 'ACTION_EXECUTED',
      actionType: 'TODAY_TEST',
      sourceIncident: 'INC-TODAY',
      technician: { id: 'TECH-TODAY' }
    });

    ok(fs.existsSync(yesterdayFile) && fs.existsSync(auditStore.FILE_PATH), 'yesterday\'s and today\'s dated files coexist as two separate files');
    ok(auditStore.countAudit() === 2, 'countAudit() aggregates across both dated files (got ' + auditStore.countAudit() + ')');
    ok(auditStore.getAudit('YESTERDAY-1') !== null, 'getAudit() finds a record that lives in yesterday\'s file, not just today\'s');
    ok(auditStore.getAudit(todayRecord.id) !== null, 'getAudit() still finds a record written today');
    const bySourceYesterday = auditStore.listAudit({ sourceIncident: 'INC-YESTERDAY' });
    ok(bySourceYesterday.length === 1 && bySourceYesterday[0].id === 'YESTERDAY-1', 'listAudit() filters correctly across a cross-day aggregate');

    // --- backward compatibility: a pre-rotation legacy single file is
    //     still read (never orphaned), but never written to again ---
    fs.writeFileSync(auditStore.LEGACY_FILE_PATH, JSON.stringify([makeRecord({ id: 'LEGACY-1', sourceIncident: 'INC-LEGACY' })], null, 2), 'utf8');

    ok(auditStore.countAudit() === 3, 'countAudit() also includes the legacy pre-rotation file (got ' + auditStore.countAudit() + ')');
    ok(auditStore.getAudit('LEGACY-1') !== null, 'getAudit() finds a record that lives only in the legacy file');

    const anotherToday = auditStore.recordAudit({
      eventType: 'ACTION_EXECUTED',
      actionType: 'AFTER_LEGACY_SEEN',
      sourceIncident: 'INC-TODAY-2',
      technician: { id: 'TECH-TODAY' }
    });
    const legacyContents = JSON.parse(fs.readFileSync(auditStore.LEGACY_FILE_PATH, 'utf8'));
    ok(legacyContents.length === 1 && legacyContents[0].id === 'LEGACY-1', 'a new write never lands in the legacy file -- it only ever grows today\'s dated file');
    ok(auditStore.getAudit(anotherToday.id) !== null, 'the new write is still findable via the aggregate');

    ok(auditStore.allAuditFilePaths().length === 3, 'allAuditFilePaths() reports exactly the legacy file + 2 dated files in play (got ' + auditStore.allAuditFilePaths().length + ')');
  } catch (err) {
    errored = err;
  }

  // Restore real data BEFORE exiting -- process.exit() would skip a
  // finally block entered from inside the try above, so the restore has
  // to happen out here instead.
  restoreRealFiles(stashed);

  if (errored) {
    console.error('ERROR', errored.stack || errored.message);
    process.exit(1);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
