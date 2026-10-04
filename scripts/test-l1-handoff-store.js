'use strict';

const fs = require('fs');
const path = require('path');

const store = require('../server/l1-copilot/handoff-store');

const handoffFile = store.HANDOFF_FILE;
const backupFile = `${handoffFile}.phase8-test-backup`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function cleanTestFile() {
  if (fs.existsSync(handoffFile)) {
    fs.copyFileSync(handoffFile, backupFile);
  }

  if (fs.existsSync(handoffFile)) {
    fs.unlinkSync(handoffFile);
  }
}

function restoreTestFile() {
  if (fs.existsSync(handoffFile)) {
    fs.unlinkSync(handoffFile);
  }

  if (fs.existsSync(backupFile)) {
    fs.renameSync(backupFile, handoffFile);
  }
}

(async () => {
  console.log('==========================================');
  console.log('PHASE 8.10 — L1 HANDOFF STORE REGRESSION');
  console.log('==========================================');

  cleanTestFile();

  try {
    console.log('\n=== 1. REJECT UNEXECUTED ACTION ===');

    let rejected = false;

    try {
      store.createHandoff({
        action: {
          actionType: 'CLOUD_OPS_HANDOFF',
          state: 'CONFIRMED',
          confirmedAt: new Date().toISOString()
        },
        sourceIncident: 'INC0010001',
        destinationTeam: 'Cloud Ops',
        technician: { id: 'tech-001', label: 'Technician One' }
      });
    } catch (err) {
      rejected = err.code === 'HANDOFF_REQUIRES_EXECUTED_ACTION';
      console.log('Rejected as expected:', err.code);
    }

    assert(
      rejected,
      'unexecuted Action Gate action must not create a handoff'
    );

    console.log('PASS');

    console.log('\n=== 2. REQUIRE TECHNICIAN ===');

    let technicianRejected = false;

    try {
      store.createHandoff({
        action: {
          actionType: 'CLOUD_OPS_HANDOFF',
          state: 'EXECUTED',
          executedAt: new Date().toISOString()
        },
        sourceIncident: 'INC0010001',
        destinationTeam: 'Cloud Ops'
      });
    } catch (err) {
      technicianRejected = err.code === 'MISSING_TECHNICIAN';
      console.log('Rejected as expected:', err.code);
    }

    assert(
      technicianRejected,
      'technician identity must be required'
    );

    console.log('PASS');

    console.log('\n=== 3. REQUIRE DESTINATION TEAM ===');

    let teamRejected = false;

    try {
      store.createHandoff({
        action: {
          actionType: 'CLOUD_OPS_HANDOFF',
          state: 'EXECUTED'
        },
        sourceIncident: 'INC0010001',
        technician: { id: 'tech-001' }
      });
    } catch (err) {
      teamRejected = err.code === 'MISSING_DESTINATION_TEAM';
      console.log('Rejected as expected:', err.code);
    }

    assert(
      teamRejected,
      'destination team must be required'
    );

    console.log('PASS');

    console.log('\n=== 4. REQUIRE SOURCE INCIDENT ===');

    let incidentRejected = false;

    try {
      store.createHandoff({
        action: {
          actionType: 'CLOUD_OPS_HANDOFF',
          state: 'EXECUTED'
        },
        destinationTeam: 'Cloud Ops',
        technician: { id: 'tech-001' }
      });
    } catch (err) {
      incidentRejected = err.code === 'MISSING_SOURCE_INCIDENT';
      console.log('Rejected as expected:', err.code);
    }

    assert(
      incidentRejected,
      'source incident must be required'
    );

    console.log('PASS');

    console.log('\n=== 5. CREATE GOVERNED HANDOFF ===');

    const references = {
      incident: {
        number: 'INC0010001',
        sysId: 'incident-sys-1'
      },
      ritm: {
        number: 'RITM0010001',
        sysId: 'ritm-sys-1'
      },
      sctask: {
        number: 'SCTASK0010001',
        sysId: 'sctask-sys-1'
      },
      asset: {
        assetTag: 'HW0001',
        sysId: 'asset-sys-1'
      }
    };

    const executedAt = new Date().toISOString();

    const handoff = store.createHandoff({
      action: {
        actionType: 'CLOUD_OPS_HANDOFF',
        state: 'EXECUTED',
        confirmedAt: '2026-09-25T18:00:00.000Z',
        executedAt
      },

      sourceIncident: 'INC0010001',

      destinationTeam: 'Cloud Ops',

      references,

      workPerformed:
        'Reviewed incident, checked asset context, and completed documented L1 diagnostics.',

      validation:
        'Technician verified the observed behavior after L1 troubleshooting.',

      blocker:
        'Required cloud-side access or infrastructure visibility is outside L1 scope.',

      requestedTier2Action:
        'Review cloud resource health and continue infrastructure-level diagnosis.',

      technician: {
        id: 'tech-001',
        label: 'Technician One'
      }
    });

    assert(
      handoff.id,
      'handoff must receive an ID'
    );

    assert(
      handoff.type === 'L1_TIER2_HANDOFF',
      'handoff type must be L1_TIER2_HANDOFF'
    );

    assert(
      handoff.status === 'COMMITTED',
      'handoff must be committed'
    );

    assert(
      handoff.sourceIncident === 'INC0010001',
      'incident must be preserved'
    );

    assert(
      handoff.destinationTeam === 'Cloud Ops',
      'destination team must be preserved'
    );

    assert(
      handoff.technician.id === 'tech-001',
      'technician ID must be preserved'
    );

    assert(
      handoff.technicianConfirmed === true,
      'technician confirmation must be recorded'
    );

    assert(
      handoff.action.actionType === 'CLOUD_OPS_HANDOFF',
      'Action Gate type must be preserved'
    );

    assert(
      handoff.action.state === 'EXECUTED',
      'executed Action Gate state must be preserved'
    );

    console.log('Handoff ID:', handoff.id);
    console.log('PASS');

    console.log('\n=== 6. PRESERVE RECONCILIATION REFERENCES ===');

    assert(
      handoff.references.incident.number === 'INC0010001',
      'incident reference missing'
    );

    assert(
      handoff.references.ritm.number === 'RITM0010001',
      'RITM reference missing'
    );

    assert(
      handoff.references.sctask.number === 'SCTASK0010001',
      'SC Task reference missing'
    );

    assert(
      handoff.references.asset.assetTag === 'HW0001',
      'asset reference missing'
    );

    console.log('Incident: PASS');
    console.log('RITM: PASS');
    console.log('SC Task: PASS');
    console.log('Asset: PASS');

    console.log('\n=== 7. VERIFY GOVERNANCE FLAGS ===');

    assert(
      handoff.ticketClosureRequested === false,
      'handoff must not request ticket closure'
    );

    assert(
      handoff.ticketStateChanged === false,
      'handoff must not change ticket state'
    );

    console.log('Closure requested: false');
    console.log('Ticket state changed: false');
    console.log('PASS');

    console.log('\n=== 8. VERIFY PERSISTENCE ===');

    assert(
      fs.existsSync(handoffFile),
      'handoff JSON file must exist after commit'
    );

    const persisted = JSON.parse(
      fs.readFileSync(handoffFile, 'utf8')
    );

    assert(
      Array.isArray(persisted.handoffs),
      'persisted handoffs must be an array'
    );

    assert(
      persisted.handoffs.length === 1,
      'exactly one test handoff should persist'
    );

    assert(
      persisted.handoffs[0].id === handoff.id,
      'persisted handoff ID must match'
    );

    console.log('Persistence file: PASS');

    console.log('\n=== 9. GET HANDOFF ===');

    const retrieved = store.getHandoff(handoff.id);

    assert(
      retrieved,
      'getHandoff must retrieve committed handoff'
    );

    assert(
      retrieved.id === handoff.id,
      'retrieved handoff ID must match'
    );

    console.log('Retrieved:', retrieved.id);
    console.log('PASS');

    console.log('\n=== 10. LIST / FILTER ===');

    const byIncident = store.listHandoffs({
      incident: 'INC0010001'
    });

    assert(
      byIncident.length === 1,
      'incident filter must return the handoff'
    );

    const byOtherIncident = store.listHandoffs({
      incident: 'INC9999999'
    });

    assert(
      byOtherIncident.length === 0,
      'unrelated incident filter must return zero results'
    );

    console.log('Incident filter: PASS');

    console.log('\n==========================================');
    console.log('PHASE 8.10 RESULT: ALL TESTS PASSED');
    console.log('==========================================');
  } finally {
    restoreTestFile();
  }
})().catch(err => {
  console.error('\nPHASE 8.10 FAILED');
  console.error(err.stack || err.message);
  process.exit(1);
});
