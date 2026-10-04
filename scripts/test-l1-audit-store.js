'use strict';

const assert = require('assert');
const fs = require('fs');

const auditStore = require('../server/l1-copilot/audit-store');

const file = auditStore.FILE_PATH;

function cleanup() {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

function pass(message) {
  console.log(`PASS — ${message}`);
}

(async () => {
  cleanup();

  try {
    assert.throws(
      () => auditStore.recordAudit({
        actionType: 'RESOLUTION_WRITE',
        sourceIncident: 'INC0010001',
        technician: { id: 'TECH-100' }
      }),
      /eventType required/
    );
    pass('eventType is required');

    assert.throws(
      () => auditStore.recordAudit({
        eventType: 'ACTION_GENERATED',
        sourceIncident: 'INC0010001',
        technician: { id: 'TECH-100' }
      }),
      /actionType required/
    );
    pass('actionType is required');

    assert.throws(
      () => auditStore.recordAudit({
        eventType: 'ACTION_GENERATED',
        actionType: 'RESOLUTION_WRITE',
        technician: { id: 'TECH-100' }
      }),
      /sourceIncident required/
    );
    pass('sourceIncident is required');

    assert.throws(
      () => auditStore.recordAudit({
        eventType: 'ACTION_GENERATED',
        actionType: 'RESOLUTION_WRITE',
        sourceIncident: 'INC0010001'
      }),
      /technician.id required/
    );
    pass('technician identity is required');

    const generated = auditStore.recordAudit({
      eventType: 'ACTION_GENERATED',
      actionType: 'RESOLUTION_WRITE',
      sourceIncident: 'INC0010001',
      technician: {
        id: 'TECH-100',
        label: 'Test Technician'
      },
      state: 'GENERATED',
      confirmed: false,
      executed: false,
      references: {
        incident: {
          number: 'INC0010001',
          sysId: 'incident-sys-1'
        }
      },
      governed: {
        serviceNowStateWrite: false,
        ticketStateChanged: false,
        ticketClosureRequested: false,
        autonomousExecutionAllowed: false
      }
    });

    assert.ok(generated.id);
    assert.strictEqual(
      generated.type,
      'L1_COPILOT_AUDIT'
    );
    assert.strictEqual(
      generated.technician.id,
      'TECH-100'
    );
    assert.strictEqual(
      generated.confirmed,
      false
    );
    pass('generated action audit record created');

    const confirmed = auditStore.recordAudit({
      eventType: 'TECHNICIAN_CONFIRMED',
      actionType: 'RESOLUTION_WRITE',
      sourceIncident: 'INC0010001',
      technician: {
        id: 'TECH-100',
        label: 'Test Technician'
      },
      state: 'CONFIRMED',
      confirmed: true,
      executed: false
    });

    assert.strictEqual(
      confirmed.confirmed,
      true
    );
    assert.strictEqual(
      confirmed.executed,
      false
    );
    pass('technician confirmation is recorded separately');

    const executed = auditStore.recordAudit({
      eventType: 'ACTION_EXECUTED',
      actionType: 'RESOLUTION_WRITE',
      sourceIncident: 'INC0010001',
      technician: {
        id: 'TECH-100',
        label: 'Test Technician'
      },
      state: 'EXECUTED',
      confirmed: true,
      executed: true,
      executionResult: {
        authorized: true,
        verified: true
      },
      governed: {
        serviceNowStateWrite: false,
        ticketStateChanged: false,
        ticketClosureRequested: false,
        autonomousExecutionAllowed: false
      }
    });

    assert.strictEqual(
      executed.executed,
      true
    );
    assert.strictEqual(
      executed.executionResult.verified,
      true
    );
    pass('execution result is recorded');

    const fetched = auditStore.getAudit(executed.id);

    assert.ok(fetched);
    assert.strictEqual(
      fetched.id,
      executed.id
    );
    pass('audit record can be retrieved');

    const incidentRecords =
      auditStore.listAudit({
        sourceIncident: 'INC0010001'
      });

    assert.strictEqual(
      incidentRecords.length,
      3
    );
    pass('audit records filter by incident');

    const technicianRecords =
      auditStore.listAudit({
        technicianId: 'TECH-100'
      });

    assert.strictEqual(
      technicianRecords.length,
      3
    );
    pass('audit records filter by technician');

    const executionRecords =
      auditStore.listAudit({
        eventType: 'ACTION_EXECUTED'
      });

    assert.strictEqual(
      executionRecords.length,
      1
    );
    pass('audit records filter by event type');

    assert.strictEqual(
      auditStore.countAudit(),
      3
    );
    pass('audit count is correct');

    assert.strictEqual(
      executed.governed.serviceNowStateWrite,
      false
    );
    assert.strictEqual(
      executed.governed.ticketStateChanged,
      false
    );
    assert.strictEqual(
      executed.governed.ticketClosureRequested,
      false
    );
    assert.strictEqual(
      executed.governed.autonomousExecutionAllowed,
      false
    );
    pass('governance protections are preserved');

    assert.ok(fs.existsSync(file));
    pass('audit store persists to durable JSON');

    console.log('');
    console.log('==========================================');
    console.log('PHASE 10.2 — ALL TESTS PASSED');
    console.log('==========================================');

  } finally {
    cleanup();
  }
})().catch(err => {
  console.error('');
  console.error('FAIL:', err.message);
  cleanup();
  process.exit(1);
});
