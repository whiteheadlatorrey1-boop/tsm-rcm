'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const auditStore = require('../server/l1-copilot/audit-store');
const actionGate = require('../server/l1-copilot/action-gate');

const auditFile = path.join(
  __dirname,
  '..',
  'data',
  'l1-copilot-audit.json'
);

function cleanup() {
  for (const file of [auditFile, `${auditFile}.tmp`]) {
    try {
      fs.unlinkSync(file);
    } catch (_) {}
  }
}

function makeAction(state) {
  let action = actionGate.generateAction({
    actionType: 'RETURN_TO_INVENTORY',
    payload: {
      draft: '[TEST NEGATIVE PATH]'
    },
    technician: {
      id: 'TECH-106',
      label: 'Phase 10.6 Technician'
    },
    sourceIncident: 'INC-AUDIT-NEG-106',
    references: {
      incident: {
        number: 'INC-AUDIT-NEG-106',
        sysId: 'inc-neg-106'
      }
    }
  });

  if (state === 'PREVIEWED' || state === 'CONFIRMED') {
    action = actionGate.previewAction(action);
  }

  if (state === 'CONFIRMED') {
    action = actionGate.confirmAction(action);
  }

  return action;
}

function recordSuccessfulExecution(action) {
  return auditStore.recordAudit({
    eventType: 'ACTION_EXECUTED',
    actionType: action.actionType,
    sourceIncident: action.sourceIncident,
    technician: action.technician,
    state: action.state,
    confirmed: action.confirmed === true,
    executed: action.state === actionGate.STATES.EXECUTED,
    references: action.references || null,
    executionResult: action.executionResult || null,
    governed: {
      serviceNowStateWrite: false,
      ticketStateChanged: false,
      ticketClosureRequested: false,
      autonomousExecutionAllowed: false
    },
    metadata: {
      surface: 'negative-path-test'
    }
  });
}

(async () => {
  cleanup();

  let passed = 0;
  let failed = 0;

  function pass(name) {
    passed++;
    console.log(`PASS: ${name}`);
  }

  function fail(name, error) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }

  // ------------------------------------------------------------
  // 1 — GENERATED ACTION CANNOT BE EXECUTED
  // ------------------------------------------------------------
  try {
    const action = makeAction('GENERATED');

    await assert.rejects(
      () => actionGate.executeAction(
        action,
        async () => ({ authorized: true })
      ),
      err => err && err.code === 'INVALID_STATE_TRANSITION'
    );

    assert.strictEqual(
      auditStore.countAudit(),
      0
    );

    pass('generated action cannot execute and creates no audit record');
  } catch (e) {
    fail(
      'generated action cannot execute and creates no audit record',
      e
    );
  }

  // ------------------------------------------------------------
  // 2 — PREVIEWED ACTION CANNOT BE EXECUTED
  // ------------------------------------------------------------
  try {
    const action = makeAction('PREVIEWED');

    await assert.rejects(
      () => actionGate.executeAction(
        action,
        async () => ({ authorized: true })
      ),
      err => err && err.code === 'INVALID_STATE_TRANSITION'
    );

    assert.strictEqual(
      auditStore.countAudit(),
      0
    );

    pass('previewed action cannot execute and creates no audit record');
  } catch (e) {
    fail(
      'previewed action cannot execute and creates no audit record',
      e
    );
  }

  // ------------------------------------------------------------
  // 3 — FAILED EXECUTOR DOES NOT REACH EXECUTED STATE
  // ------------------------------------------------------------
  try {
    const action = makeAction('CONFIRMED');

    await assert.rejects(
      () => actionGate.executeAction(
        action,
        async () => {
          throw new Error('simulated execution failure');
        }
      ),
      err => err && err.message === 'simulated execution failure'
    );

    assert.strictEqual(
      action.state,
      actionGate.STATES.CONFIRMED
    );

    assert.strictEqual(
      action.confirmed,
      true
    );

    assert.strictEqual(
      auditStore.countAudit(),
      0
    );

    pass('failed executor does not produce an EXECUTED audit record');
  } catch (e) {
    fail(
      'failed executor does not produce an EXECUTED audit record',
      e
    );
  }

  // ------------------------------------------------------------
  // 4 — AUDIT STORE RECORDS EXPLICIT EVENT STATE
  // ------------------------------------------------------------
  try {
    const action = makeAction('CONFIRMED');

    const record = auditStore.recordAudit({
      eventType: 'ACTION_REJECTED',
      actionType: action.actionType,
      sourceIncident: action.sourceIncident,
      technician: action.technician,
      state: action.state,
      confirmed: action.confirmed === true,
      executed: false,
      references: action.references,
      executionResult: null,
      governed: {
        serviceNowStateWrite: false,
        ticketStateChanged: false,
        ticketClosureRequested: false,
        autonomousExecutionAllowed: false
      },
      metadata: {
        surface: 'negative-path-test',
        reason: 'technician confirmation or execution prerequisite not satisfied'
      }
    });

    assert.strictEqual(record.eventType, 'ACTION_REJECTED');
    assert.strictEqual(record.executed, false);
    assert.strictEqual(record.state, 'CONFIRMED');

    pass('audit store preserves explicit rejected/non-executed event state');
  } catch (e) {
    fail(
      'audit store preserves explicit rejected/non-executed event state',
      e
    );
  }

  // ------------------------------------------------------------
  // 5 — MISSING TECHNICIAN CANNOT BE AUDITED
  // ------------------------------------------------------------
  try {
    assert.throws(
      () => auditStore.recordAudit({
        eventType: 'ACTION_EXECUTED',
        actionType: 'RETURN_TO_INVENTORY',
        sourceIncident: 'INC-AUDIT-NOTECH-106',
        technician: null,
        state: 'EXECUTED',
        confirmed: true,
        executed: true,
        executionResult: {
          authorized: true
        }
      }),
      err => err && /technician/i.test(err.message)
    );

    assert.strictEqual(
      auditStore.countAudit(),
      1
    );

    pass('audit store rejects execution audit without technician identity');
  } catch (e) {
    fail(
      'audit store rejects execution audit without technician identity',
      e
    );
  }

  // ------------------------------------------------------------
  // 6 — MISSING INCIDENT CANNOT BE AUDITED
  // ------------------------------------------------------------
  try {
    assert.throws(
      () => auditStore.recordAudit({
        eventType: 'ACTION_EXECUTED',
        actionType: 'RETURN_TO_INVENTORY',
        sourceIncident: '',
        technician: {
          id: 'TECH-106'
        },
        state: 'EXECUTED',
        confirmed: true,
        executed: true,
        executionResult: {
          authorized: true
        }
      }),
      err => err && /sourceIncident/i.test(err.message)
    );

    assert.strictEqual(
      auditStore.countAudit(),
      1
    );

    pass('audit store rejects execution audit without source incident');
  } catch (e) {
    fail(
      'audit store rejects execution audit without source incident',
      e
    );
  }

  // ------------------------------------------------------------
  // 7 — CONFIRMED ACTION CAN EXECUTE
  // ------------------------------------------------------------
  try {
    const confirmed = makeAction('CONFIRMED');

    const executed = await actionGate.executeAction(
      confirmed,
      async () => ({
        authorized: true,
        serviceNowStateWrite: false,
        ticketStateChanged: false,
        ticketClosureRequested: false
      })
    );

    assert.strictEqual(
      executed.state,
      actionGate.STATES.EXECUTED
    );

    assert.strictEqual(
      executed.confirmed,
      true
    );

    assert.ok(executed.executedAt);

    pass('confirmed action reaches EXECUTED state');
  } catch (e) {
    fail(
      'confirmed action reaches EXECUTED state',
      e
    );
  }

  // ------------------------------------------------------------
  // 8 — ONLY SUCCESSFUL EXECUTION IS AUDITED
  // ------------------------------------------------------------
  try {
    const confirmed = makeAction('CONFIRMED');

    const executed = await actionGate.executeAction(
      confirmed,
      async () => ({
        authorized: true,
        serviceNowStateWrite: false,
        ticketStateChanged: false,
        ticketClosureRequested: false
      })
    );

    const record = recordSuccessfulExecution(executed);

    assert.strictEqual(
      record.state,
      'EXECUTED'
    );

    assert.strictEqual(
      record.confirmed,
      true
    );

    assert.strictEqual(
      record.executed,
      true
    );

    assert.strictEqual(
      record.eventType,
      'ACTION_EXECUTED'
    );

    assert.strictEqual(
      auditStore.countAudit(),
      2
    );

    pass('successful execution creates exactly one EXECUTED audit record');
  } catch (e) {
    fail(
      'successful execution creates exactly one EXECUTED audit record',
      e
    );
  }

  // ------------------------------------------------------------
  // 9 — AUDIT RECORD RETAINS GOVERNANCE PROTECTIONS
  // ------------------------------------------------------------
  try {
    const records = auditStore.listAudit();

    assert.strictEqual(records.length, 2);

    const record = records.find(
      item => item.eventType === 'ACTION_EXECUTED'
    );

    assert.ok(record);

    assert.strictEqual(
      record.governed.serviceNowStateWrite,
      false
    );

    assert.strictEqual(
      record.governed.ticketStateChanged,
      false
    );

    assert.strictEqual(
      record.governed.ticketClosureRequested,
      false
    );

    assert.strictEqual(
      record.governed.autonomousExecutionAllowed,
      false
    );

    pass('successful audit record retains governance protections');
  } catch (e) {
    fail(
      'successful audit record retains governance protections',
      e
    );
  }

  // ------------------------------------------------------------
  // 10 — DURABLE STORE CONTAINS ONLY THE SUCCESSFUL RECORD
  // ------------------------------------------------------------
  try {
    assert.strictEqual(
      fs.existsSync(auditFile),
      true
    );

    const raw = JSON.parse(
      fs.readFileSync(auditFile, 'utf8')
    );

    assert.strictEqual(
      raw.length,
      2
    );

    const executedRecord = raw.find(
      item => item.eventType === 'ACTION_EXECUTED'
    );

    const rejectedRecord = raw.find(
      item => item.eventType === 'ACTION_REJECTED'
    );

    assert.ok(executedRecord);
    assert.ok(rejectedRecord);

    assert.strictEqual(
      executedRecord.state,
      'EXECUTED'
    );

    assert.strictEqual(
      executedRecord.executed,
      true
    );

    assert.strictEqual(
      executedRecord.sourceIncident,
      'INC-AUDIT-NEG-106'
    );

    assert.strictEqual(
      rejectedRecord.executed,
      false
    );

    assert.strictEqual(
      rejectedRecord.state,
      'CONFIRMED'
    );

    pass('durable audit file contains only the legitimate execution');
  } catch (e) {
    fail(
      'durable audit file contains only the legitimate execution',
      e
    );
  }

  cleanup();

  console.log('');
  console.log('==========================================');
  console.log(`PHASE 10.6 — ${passed} passed, ${failed} failed`);
  console.log('==========================================');

  process.exitCode = failed ? 1 : 0;
})().catch(error => {
  cleanup();
  console.error(error);
  process.exitCode = 1;
});
