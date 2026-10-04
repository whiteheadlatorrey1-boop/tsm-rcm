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
  try {
    fs.unlinkSync(auditFile);
  } catch (_) {}

  try {
    fs.unlinkSync(`${auditFile}.tmp`);
  } catch (_) {}
}

function makeAction({
  actionType,
  sourceIncident,
  technician,
  references = null
}) {
  let action = actionGate.generateAction({
    actionType,
    payload: { test: true },
    technician,
    sourceIncident,
    references
  });

  action = actionGate.previewAction(action);
  action = actionGate.confirmAction(action);

  return action;
}

async function executeAction(action, result) {
  return actionGate.executeAction(
    action,
    async () => result
  );
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

  try {
    // ------------------------------------------------------------
    // 1 — ASSET ACTION AUDIT
    // ------------------------------------------------------------
    {
      const action = await executeAction(
        makeAction({
          actionType: 'RETURN_TO_INVENTORY',
          sourceIncident: 'INC-AUDIT-ASSET-105',
          technician: {
            id: 'TECH-105',
            label: 'Phase 10.5 Technician'
          },
          references: {
            incident: {
              number: 'INC-AUDIT-ASSET-105',
              sysId: 'inc-sys-105'
            },
            asset: {
              assetTag: 'HW-AUDIT-105',
              sysId: 'asset-sys-105'
            }
          }
        }),
        {
          authorized: true,
          serviceNowStateWrite: false,
          ticketStateChanged: false,
          ticketClosureRequested: false
        }
      );

      const record = auditStore.recordAudit({
        eventType: 'ACTION_EXECUTED',
        actionType: action.actionType,
        sourceIncident: action.sourceIncident,
        technician: action.technician,
        state: action.state,
        confirmed: action.confirmed === true,
        executed: action.state === actionGate.STATES.EXECUTED,
        references: action.references || null,
        executionResult: action.executionResult,
        governed: {
          serviceNowStateWrite: false,
          ticketStateChanged: false,
          ticketClosureRequested: false,
          autonomousExecutionAllowed: false
        },
        metadata: {
          surface: 'asset-action',
          templateId: 'RETURN_TO_INVENTORY',
          technicianConfirmed: true
        }
      });

      assert.strictEqual(record.eventType, 'ACTION_EXECUTED');
      assert.strictEqual(record.actionType, 'RETURN_TO_INVENTORY');
      assert.strictEqual(record.sourceIncident, 'INC-AUDIT-ASSET-105');
      assert.strictEqual(record.technician.id, 'TECH-105');
      assert.strictEqual(record.state, 'EXECUTED');
      assert.strictEqual(record.confirmed, true);
      assert.strictEqual(record.executed, true);
      assert.strictEqual(record.metadata.surface, 'asset-action');
      assert.strictEqual(record.metadata.technicianConfirmed, true);
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

      pass('asset-action audit contains governed execution record');
    }
  } catch (e) {
    fail('asset-action audit contains governed execution record', e);
  }

  try {
    // ------------------------------------------------------------
    // 2 — RESOLUTION AUDIT
    // ------------------------------------------------------------
    {
      const action = await executeAction(
        makeAction({
          actionType: 'RESOLUTION_WRITE',
          sourceIncident: 'INC-AUDIT-RES-105',
          technician: {
            id: 'TECH-RES-105',
            label: 'Resolution Technician'
          }
        }),
        {
          authorized: true,
          serviceNowStateWrite: true,
          ticketStateChanged: false,
          ticketClosureRequested: false
        }
      );

      const record = auditStore.recordAudit({
        eventType: 'ACTION_EXECUTED',
        actionType: action.actionType,
        sourceIncident: action.sourceIncident,
        technician: action.technician,
        state: action.state,
        confirmed: action.confirmed === true,
        executed: action.state === actionGate.STATES.EXECUTED,
        references: action.references || null,
        executionResult: action.executionResult,
        governed: {
          serviceNowStateWrite: true,
          ticketStateChanged: false,
          ticketClosureRequested: false,
          autonomousExecutionAllowed: false
        },
        metadata: {
          surface: 'resolution',
          technicianConfirmed: true,
          exactDraftWritten: true
        }
      });

      assert.strictEqual(record.eventType, 'ACTION_EXECUTED');
      assert.strictEqual(record.actionType, 'RESOLUTION_WRITE');
      assert.strictEqual(record.sourceIncident, 'INC-AUDIT-RES-105');
      assert.strictEqual(record.technician.id, 'TECH-RES-105');
      assert.strictEqual(record.state, 'EXECUTED');
      assert.strictEqual(record.executed, true);
      assert.strictEqual(record.metadata.surface, 'resolution');
      assert.strictEqual(record.metadata.exactDraftWritten, true);
      assert.strictEqual(
        record.governed.serviceNowStateWrite,
        true
      );
      assert.strictEqual(
        record.governed.autonomousExecutionAllowed,
        false
      );

      pass('resolution audit records exact governed write metadata');
    }
  } catch (e) {
    fail('resolution audit records exact governed write metadata', e);
  }

  try {
    // ------------------------------------------------------------
    // 3 — ESCALATION / TIER-2 AUDIT
    // ------------------------------------------------------------
    {
      const references = {
        incident: {
          number: 'INC-AUDIT-ESC-105',
          sysId: 'inc-sys-esc-105'
        },
        ritm: {
          number: 'RITM-AUDIT-105',
          sysId: 'ritm-sys-105'
        },
        sctask: {
          number: 'SCTASK-AUDIT-105',
          sysId: 'task-sys-105'
        },
        asset: {
          assetTag: 'HW-ESC-105',
          sysId: 'asset-sys-esc-105'
        }
      };

      const action = await executeAction(
        makeAction({
          actionType: 'CLOUD_OPS_HANDOFF',
          sourceIncident: 'INC-AUDIT-ESC-105',
          technician: {
            id: 'TECH-ESC-105',
            label: 'Escalation Technician'
          },
          references
        }),
        {
          authorized: true,
          serviceNowStateWrite: false,
          ticketStateChanged: false,
          ticketClosureRequested: false
        }
      );

      const record = auditStore.recordAudit({
        eventType: 'ACTION_EXECUTED',
        actionType: action.actionType,
        sourceIncident: action.sourceIncident,
        technician: action.technician,
        state: action.state,
        confirmed: action.confirmed === true,
        executed: action.state === actionGate.STATES.EXECUTED,
        references: action.references || null,
        executionResult: action.executionResult,
        governed: {
          serviceNowStateWrite: false,
          ticketStateChanged: false,
          ticketClosureRequested: false,
          autonomousExecutionAllowed: false
        },
        metadata: {
          surface: 'escalation-execute',
          destinationTeam: 'Cloud Operations',
          technicianConfirmed: true,
          ticketClosureRequested: false,
          ticketStateChanged: false
        }
      });

      assert.strictEqual(record.eventType, 'ACTION_EXECUTED');
      assert.strictEqual(record.actionType, 'CLOUD_OPS_HANDOFF');
      assert.strictEqual(record.sourceIncident, 'INC-AUDIT-ESC-105');
      assert.strictEqual(record.technician.id, 'TECH-ESC-105');
      assert.strictEqual(record.state, 'EXECUTED');
      assert.strictEqual(record.executed, true);

      assert.deepStrictEqual(
        record.references,
        references
      );

      assert.strictEqual(
        record.metadata.surface,
        'escalation-execute'
      );

      assert.strictEqual(
        record.metadata.destinationTeam,
        'Cloud Operations'
      );

      assert.strictEqual(
        record.metadata.technicianConfirmed,
        true
      );

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

      pass('Tier-2 handoff audit preserves references and governance');
    }
  } catch (e) {
    fail('Tier-2 handoff audit preserves references and governance', e);
  }

  try {
    // ------------------------------------------------------------
    // 4 — AUDIT QUERY COVERAGE
    // ------------------------------------------------------------
    {
      const all = auditStore.listAudit();
      assert.strictEqual(all.length, 3);

      const asset = auditStore.listAudit({
        sourceIncident: 'INC-AUDIT-ASSET-105'
      });

      const resolution = auditStore.listAudit({
        technicianId: 'TECH-RES-105'
      });

      const escalation = auditStore.listAudit({
        eventType: 'ACTION_EXECUTED'
      });

      assert.strictEqual(asset.length, 1);
      assert.strictEqual(asset[0].actionType, 'RETURN_TO_INVENTORY');

      assert.strictEqual(resolution.length, 1);
      assert.strictEqual(
        resolution[0].actionType,
        'RESOLUTION_WRITE'
      );

      assert.strictEqual(escalation.length, 3);

      pass('audit query filters return the expected execution records');
    }
  } catch (e) {
    fail('audit query filters return the expected execution records', e);
  }

  try {
    // ------------------------------------------------------------
    // 5 — DURABLE JSON SHAPE
    // ------------------------------------------------------------
    {
      assert.strictEqual(fs.existsSync(auditFile), true);

      const raw = JSON.parse(
        fs.readFileSync(auditFile, 'utf8')
      );

      assert.ok(Array.isArray(raw));
      assert.strictEqual(raw.length, 3);

      for (const record of raw) {
        assert.ok(record.id);
        assert.strictEqual(
          record.type,
          'L1_COPILOT_AUDIT'
        );
        assert.ok(record.createdAt);
        assert.ok(record.technician);
        assert.ok(record.technician.id);
        assert.ok(record.sourceIncident);
        assert.ok(record.actionType);
        assert.ok(record.eventType);
        assert.ok(record.governed);
      }

      pass('audit JSON contains durable governed records with required identity');
    }
  } catch (e) {
    fail(
      'audit JSON contains durable governed records with required identity',
      e
    );
  }

  cleanup();

  console.log('');
  console.log('==========================================');
  console.log(`PHASE 10.5 — ${passed} passed, ${failed} failed`);
  console.log('==========================================');

  process.exitCode = failed ? 1 : 0;
})().catch(error => {
  cleanup();
  console.error(error);
  process.exitCode = 1;
});
