'use strict';

const {
  orchestrate,
  buildTechnicianEvidence
} = require('../../../server/l1-copilot/governed-orchestrator');

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label}`);
    failed++;
  }
}

console.log('=== GOVERNED L1 ORCHESTRATOR TEST ===');

const reconciledContext = {
  number: 'SCTASK0010001',
  shortDescription: 'Prepare replacement laptop',
  description: 'Configure and test replacement device.',
  state: '2',
  assetTag: 'HW0001',
  requestedFor: 'Jane Doe',
  location: 'Phoenix'
};

const incomplete = orchestrate({
  state: 'IN PROGRESS',
  taskType: 'HARDWARE',
  context: reconciledContext,
  evidence: {}
});

check(
  'workflow remains blocked without technician evidence',
  incomplete.workflow.readyForClosure === false
);

check(
  'closure remains blocked without technician evidence',
  incomplete.closure.readyForClosure === false
);

check(
  'ServiceNow context does not become evidence',
  Object.values(incomplete.evidence.values)
    .every(value => value === false)
);

check(
  'evidence source is technician-confirmed input',
  incomplete.evidence.source === 'technician-confirmed-input'
);

check(
  'reconciliation facts cannot authorize closure',
  incomplete.evidence.derivedFromServiceNow === false
);

const complete = orchestrate({
  state: 'IN PROGRESS',
  taskType: 'HARDWARE',
  context: reconciledContext,
  evidence: {
    userVerified: true,
    assetVerified: true,
    workConfirmed: true,
    tested: true,
    finalWorkNoteConfirmed: true
  }
});

check(
  'complete technician evidence reaches workflow',
  complete.workflow.readyForClosure === true
);

check(
  'complete technician evidence reaches closure gate',
  complete.closure.readyForClosure === true
);

check(
  'technician remains authoritative',
  complete.closure.technicianAuthority === true
);

check(
  'autonomous close remains disabled',
  complete.governed.autonomousCloseAllowed === false
);

check(
  'state changes remain disabled',
  complete.governed.canChangeState === false
);

check(
  'work-note automation remains disabled',
  complete.governed.autonomousWorkNoteWriteAllowed === false
);

const footMoveEvidence = buildTechnicianEvidence({
  evidence: {
    userVerified: true,
    assetVerified: true,
    workConfirmed: true,
    tested: true,
    locationVerified: true,
    finalWorkNoteConfirmed: true
  }
});

check(
  'location evidence requires explicit technician confirmation',
  footMoveEvidence.locationVerified === true
);

const serviceNowOnlyAttempt = buildTechnicianEvidence({
  context: {
    userVerified: true,
    assetVerified: true,
    workConfirmed: true,
    tested: true,
    locationVerified: true,
    finalWorkNoteConfirmed: true
  },
  evidence: {}
});

check(
  'ServiceNow context cannot impersonate technician evidence',
  Object.values(serviceNowOnlyAttempt)
    .every(value => value === false)
);

console.log('');
console.log(`RESULT: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
