'use strict';

/**
 * L1 request fulfillment (SOFTWARE / REQUEST FULFILLMENT) regression.
 *
 * Proves:
 *   - classification: software/license/access tickets no longer fall into
 *     HARDWARE or OTHER; failed installs are INCIDENTs; hardware installs
 *     stay HARDWARE; every pre-existing task type still classifies as before
 *   - closure evidence: SOFTWARE and REQUEST FULFILLMENT require
 *     `fulfillmentVerified` instead of `assetVerified`; every other task
 *     type is unchanged; the asset checkbox cannot stand in for it
 *   - state tables are inferred from RITM / SCTASK numbers
 *   - the evaluator enforces every required field, rejects a mismatched
 *     catalog record, blocks a RITM with open SC Tasks, and fails safe on
 *     unrecognized task states
 *   - the evaluator is pure (no network capability)
 *   - routes, demo fixtures and the UI panel are wired
 *
 * Run:
 *   node scripts/test-l1-request-fulfillment.js
 */

const fs = require('fs');
const path = require('path');
const {
  TASK_TYPES,
  FULFILLMENT_TASK_TYPES,
  normalizeTaskType,
  classifyTask,
  getRequiredEvidence,
  evaluateWorkflow,
  inferStateTable,
  resolveStateTable
} = require('../server/l1-copilot/workflow-engine');
const { evaluateClosure } = require('../server/l1-copilot/closure-gate');
const {
  evaluateRequestFulfillment,
  isRequestFulfillmentTask,
  FULFILLMENT_OUTCOMES
} = require('../server/l1-copilot/request-fulfillment');
const demoData = require('../server/l1-copilot/demo-data');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed++;
    console.log('PASS: ' + message);
  } else {
    failed++;
    console.error('FAIL: ' + message);
  }
}

function typeOf(shortDescription, description) {
  return classifyTask({ shortDescription, description: description || '' }).taskType;
}

function keys(taskType) {
  return getRequiredEvidence(taskType).map(r => r.key);
}

console.log('\n=== L1 REQUEST FULFILLMENT ===');

/* ---------------------------------------------------------------- */
/* Task types + classification                                        */
/* ---------------------------------------------------------------- */

ok(TASK_TYPES.includes('SOFTWARE') && TASK_TYPES.includes('REQUEST FULFILLMENT'), 'SOFTWARE and REQUEST FULFILLMENT are task types');
ok(normalizeTaskType('requestfulfillment') === 'REQUEST FULFILLMENT', 'REQUESTFULFILLMENT (no space) normalizes');
ok(normalizeTaskType('software') === 'SOFTWARE', 'software normalizes to SOFTWARE');
ok(FULFILLMENT_TASK_TYPES.length === 2, 'exactly two fulfillment task types');

ok(typeOf('RITM: Install Adobe Acrobat Pro on user laptop', 'Requested software: Adobe Acrobat Pro') === 'SOFTWARE', 'installing software on a laptop is SOFTWARE, not HARDWARE');
ok(typeOf('Install Adobe Acrobat Pro on user laptop') === 'SOFTWARE', 'install-on-laptop with no other cue is SOFTWARE');
ok(typeOf('Request: Microsoft Visio license', 'Please assign a Visio license to jdoe') === 'SOFTWARE', 'a license request is SOFTWARE');
ok(typeOf('Software install request - Zoom', 'Install Zoom on workstation') === 'SOFTWARE', 'a software install request is SOFTWARE');
ok(typeOf('VPN client install', 'Needs Cisco AnyConnect installed on new dock station') === 'SOFTWARE', 'a client install mentioning a dock is SOFTWARE');
ok(typeOf('Grant access to shared drive', 'Request fulfillment: add user to AD group') === 'REQUEST FULFILLMENT', 'access / group request is REQUEST FULFILLMENT');
ok(typeOf('Update user permissions') === 'REQUEST FULFILLMENT', 'a permissions request is REQUEST FULFILLMENT');
ok(typeOf('Install failed - error 1603', 'Office install error on desktop') === 'INCIDENT', 'a failed install on a desktop is an INCIDENT, not HARDWARE');
ok(typeOf('Install new dock station', 'at desk 4B') === 'HARDWARE', 'installing a dock is still HARDWARE');
ok(typeOf('Laptop will not boot', 'past the Dell logo') === 'HARDWARE', 'laptop symptom ticket is still HARDWARE');
ok(typeOf('New hire setup', 'install software for onboarding') === 'ONBOARDING', 'ONBOARDING still wins over software wording');
ok(typeOf('Offboarding', 'departing employee, remove licenses') === 'OFFBOARDING', 'OFFBOARDING still wins over license wording');
ok(typeOf('Replacement device swap', 'laptop') === 'HARDWARE SWAP', 'HARDWARE SWAP unchanged');
ok(typeOf('Desk move', 'seat move to floor 3') === 'FOOT MOVE', 'FOOT MOVE unchanged');
ok(typeOf('Printer is broken') === 'INCIDENT', 'generic incident unchanged');
ok(typeOf('Question about parking') === 'OTHER', 'unrelated ticket is still OTHER');
ok(classifyTask({ taskType: 'SOFTWARE', shortDescription: 'laptop outage' }).source === 'explicit', 'an explicit SOFTWARE task type is honored');

/* ---------------------------------------------------------------- */
/* Closure evidence                                                   */
/* ---------------------------------------------------------------- */

ok(keys('SOFTWARE').includes('fulfillmentVerified') && !keys('SOFTWARE').includes('assetVerified'), 'SOFTWARE requires fulfillmentVerified, not assetVerified');
ok(keys('REQUEST FULFILLMENT').includes('fulfillmentVerified') && !keys('REQUEST FULFILLMENT').includes('assetVerified'), 'REQUEST FULFILLMENT requires fulfillmentVerified, not assetVerified');
ok(!keys('SOFTWARE').includes('locationVerified'), 'SOFTWARE does not require location verification');
for (const t of ['ONBOARDING', 'OFFBOARDING', 'FOOT MOVE', 'HARDWARE', 'HARDWARE SWAP', 'INCIDENT', 'OTHER']) {
  ok(keys(t).includes('assetVerified') && !keys(t).includes('fulfillmentVerified'), t + ' still requires assetVerified and not fulfillmentVerified');
}

const baseEvidence = { userVerified: true, workConfirmed: true, tested: true, finalWorkNoteConfirmed: true };

const ready = evaluateClosure({ state: '2', taskType: 'SOFTWARE', evidence: { ...baseEvidence, fulfillmentVerified: true } });
ok(ready.readyForClosure === true, 'SOFTWARE closes when fulfillmentVerified and the rest are confirmed');

const assetOnly = evaluateClosure({ state: '2', taskType: 'SOFTWARE', evidence: { ...baseEvidence, assetVerified: true } });
ok(assetOnly.readyForClosure === false && assetOnly.missingEvidence.some(m => m.key === 'fulfillmentVerified'), 'the asset checkbox cannot stand in for fulfillmentVerified');

const wf = evaluateWorkflow({ state: '2', taskType: 'REQUEST FULFILLMENT', evidence: { userVerified: true } });
ok(wf.nextAction === 'REQUEST FULFILLMENT VALIDATION' && wf.missingEvidence[0] === 'fulfillmentVerified', 'workflow engine asks for request fulfillment validation next');

/* ---------------------------------------------------------------- */
/* State tables                                                       */
/* ---------------------------------------------------------------- */

ok(inferStateTable('RITM0010001') === 'sc_req_item', 'RITM number implies sc_req_item');
ok(inferStateTable(' sctask0010002 ') === 'sc_task', 'SCTASK number implies sc_task (case/space insensitive)');
ok(inferStateTable('INC0010042') === undefined, 'incident number implies no catalog table');
ok(resolveStateTable({ stateTable: 'sc_task', incident: 'INC1' }) === 'sc_task', 'an explicit stateTable wins');

const scClosed = evaluateWorkflow({ state: '3', incident: 'SCTASK0010001' });
ok(scClosed.state === 'CLOSED' && scClosed.reason === 'Ticket is already resolved or closed.', 'an SC Task reporting code 3 is Closed Complete, not On Hold');
const incHold = evaluateWorkflow({ state: '3', incident: 'INC0010001' });
ok(incHold.state === 'ON HOLD', 'an incident reporting code 3 is still On Hold');
ok(evaluateWorkflow({ state: '-5', incident: 'RITM0010001' }).state === 'PENDING', 'a RITM reporting code -5 is Pending');
ok(evaluateClosure({ state: '3', incident: 'SCTASK0010001', taskType: 'SOFTWARE', evidence: {} }).state === 'CLOSED', 'closure gate infers the state table too');

/* ---------------------------------------------------------------- */
/* Evaluator                                                          */
/* ---------------------------------------------------------------- */

ok(isRequestFulfillmentTask('SOFTWARE') && isRequestFulfillmentTask('REQUEST FULFILLMENT'), 'both fulfillment types are in scope');
ok(!isRequestFulfillmentTask('OFFBOARDING') && !isRequestFulfillmentTask('INCIDENT') && !isRequestFulfillmentTask('HARDWARE'), 'other task types are out of scope');

const outOfScope = evaluateRequestFulfillment({ taskType: 'OFFBOARDING' });
ok(outOfScope.applies === false && outOfScope.fulfillmentVerified === null, 'out-of-scope task type returns applies: false / null');

const ritmRecord = { number: 'RITM0010001', state: 'Work in Progress' };
const sctaskRecord = { number: 'SCTASK0010001', state: 'Work in Progress' };
const closedTasks = [{ number: 'SCTASK0010001', state: 'Closed Complete' }];

function base(extra) {
  return Object.assign({
    taskType: 'REQUEST FULFILLMENT',
    requestNumber: 'RITM0010001',
    catalogRecord: ritmRecord,
    catalogTasks: closedTasks,
    fulfillmentOutcome: 'FULFILLED',
    technicianConfirmed: true
  }, extra);
}

const empty = evaluateRequestFulfillment({ taskType: 'REQUEST FULFILLMENT' });
ok(empty.applies === true && empty.fulfillmentVerified === false, 'an empty in-scope input is not verified');
ok(['requestNumber', 'catalogRecord', 'fulfillmentOutcome', 'technicianConfirmed'].every(k => empty.missing.includes(k)), 'empty input reports every required field');

ok(evaluateRequestFulfillment(base()).fulfillmentVerified === true, 'a fully evidenced RITM resolves to fulfillmentVerified: true');
ok(evaluateRequestFulfillment(base({ requestNumber: ' ritm0010001 ' })).fulfillmentVerified === true, 'request number is normalized (case/whitespace)');

ok(evaluateRequestFulfillment(base({ requestNumber: '' })).missing.includes('requestNumber'), 'requestNumber is required');
ok(evaluateRequestFulfillment(base({ requestNumber: 'INC0010001' })).missing.includes('requestNumber'), 'an incident number is not a valid request number');
ok(evaluateRequestFulfillment(base({ catalogRecord: null })).missing.includes('catalogRecord'), 'a catalog lookup is required');
ok(evaluateRequestFulfillment(base({ fulfillmentOutcome: '' })).missing.includes('fulfillmentOutcome'), 'an outcome is required');
ok(evaluateRequestFulfillment(base({ fulfillmentOutcome: 'DONE' })).missing.includes('fulfillmentOutcome'), 'an unnamed outcome ("DONE") is rejected');
ok(evaluateRequestFulfillment(base({ technicianConfirmed: 'true' })).missing.includes('technicianConfirmed'), 'technicianConfirmed must be exactly true');
ok(evaluateRequestFulfillment(base({ technicianConfirmed: false })).fulfillmentVerified === false, 'no technician confirmation, no verification');

for (const outcome of ['CANCELED_BY_REQUESTER', 'EXCEPTION_NOT_FULFILLED']) {
  ok(evaluateRequestFulfillment(base({ fulfillmentOutcome: outcome })).missing.includes('outcomeReason'), outcome + ' requires a reason');
  ok(evaluateRequestFulfillment(base({ fulfillmentOutcome: outcome, outcomeReason: '   ' })).missing.includes('outcomeReason'), outcome + ' rejects a blank reason');
  ok(evaluateRequestFulfillment(base({ fulfillmentOutcome: outcome, outcomeReason: 'Requester withdrew approval.' })).fulfillmentVerified === true, outcome + ' with a documented reason verifies');
}
ok(FULFILLMENT_OUTCOMES.length === 4, 'four named fulfillment outcomes');

const mismatch = evaluateRequestFulfillment(base({ catalogRecord: { number: 'RITM0099999', state: 'Open' } }));
ok(mismatch.fulfillmentVerified === false && mismatch.missing.includes('requestNumberMismatch'), 'a catalog record for a different request is never accepted');

// RITM parent / SC Task child rules
const openTask = evaluateRequestFulfillment(base({ catalogTasks: [{ number: 'SCTASK0010001', state: 'Work in Progress' }] }));
ok(openTask.fulfillmentVerified === false && openTask.missing.includes('openCatalogTasks') && openTask.openTasks[0] === 'SCTASK0010001', 'a RITM with an open SC Task is blocked and names the task');
ok(/SCTASK0010001/.test(openTask.reason), 'the reason names the open SC Task');
ok(evaluateRequestFulfillment(base({ catalogTasks: [{ number: 'SCTASK0010002', state: 'Mystery State' }] })).missing.includes('openCatalogTasks'), 'an unrecognized SC Task state counts as open (fails safe)');
ok(evaluateRequestFulfillment(base({ catalogTasks: [{ number: 'SCTASK0010003', state: '1' }] })).missing.includes('openCatalogTasks'), 'a raw SC Task state code of 1 (Open) counts as open');
ok(evaluateRequestFulfillment(base({ catalogTasks: [{ number: 'SCTASK0010003', state: '4' }] })).fulfillmentVerified === true, 'a raw SC Task state code of 4 (Closed Incomplete) counts as finished');
ok(evaluateRequestFulfillment(base({ catalogTasks: [{ number: 'A', state: 'Closed Complete' }, { number: 'B', state: 'Work in Progress' }] })).openTasks.join() === 'B', 'only the open SC Task is reported when some are closed');
ok(evaluateRequestFulfillment(base({ catalogTasks: undefined })).missing.includes('catalogTasks'), 'a RITM without its SC Task lookup cannot be verified');
ok(evaluateRequestFulfillment(base({ catalogTasks: [] })).fulfillmentVerified === true, 'a RITM whose task lookup ran and returned none verifies');

// SCTASK needs no parent task lookup
const sctask = evaluateRequestFulfillment(base({ requestNumber: 'SCTASK0010001', catalogRecord: sctaskRecord, catalogTasks: undefined }));
ok(sctask.fulfillmentVerified === true, 'an SCTASK verifies without a child task lookup');

// SOFTWARE-specific confirmation
const sw = (extra) => evaluateRequestFulfillment(base(Object.assign({ taskType: 'SOFTWARE' }, extra)));
ok(sw({}).missing.includes('softwareConfirmed'), 'SOFTWARE fulfilled outright requires softwareConfirmed');
ok(sw({ fulfillmentOutcome: 'ALREADY_PROVISIONED' }).missing.includes('softwareConfirmed'), 'SOFTWARE already-provisioned requires softwareConfirmed');
ok(sw({ softwareConfirmed: 'yes' }).missing.includes('softwareConfirmed'), 'softwareConfirmed must be exactly true');
ok(sw({ softwareConfirmed: true }).fulfillmentVerified === true, 'SOFTWARE with softwareConfirmed verifies');
ok(!sw({ fulfillmentOutcome: 'EXCEPTION_NOT_FULFILLED', outcomeReason: 'License pool exhausted.' }).missing.includes('softwareConfirmed'), 'SOFTWARE exception does not require an install confirmation');
ok(!evaluateRequestFulfillment(base({ taskType: 'REQUEST FULFILLMENT' })).missing.includes('softwareConfirmed'), 'REQUEST FULFILLMENT never requires softwareConfirmed');

/* ---------------------------------------------------------------- */
/* Demo fixtures drive the evaluator end to end                       */
/* ---------------------------------------------------------------- */

const demoRitm = demoData.demoRequestRecord('ritm0010001');
ok(demoRitm.kind === 'RITM' && demoRitm.record.number === 'RITM0010001' && demoRitm.demo === true, 'demo RITM fixture is labeled and normalized');
ok(evaluateRequestFulfillment({
  taskType: 'SOFTWARE',
  requestNumber: demoRitm.record.number,
  catalogRecord: demoRitm.record,
  catalogTasks: demoRitm.catalogTasks,
  fulfillmentOutcome: 'FULFILLED',
  softwareConfirmed: true,
  technicianConfirmed: true
}).fulfillmentVerified === true, 'the demo RITM + tasks verify end to end');
const demoTask = demoData.demoRequestRecord('SCTASK0010009');
ok(demoTask.kind === 'SCTASK' && demoTask.record.number === 'SCTASK0010009' && demoTask.catalogTasks.length === 0, 'demo SCTASK fixture is a single task');

/* ---------------------------------------------------------------- */
/* Wiring + purity                                                    */
/* ---------------------------------------------------------------- */

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
ok(/app\.post\('\/api\/l1-copilot\/request-fulfillment\/evaluate'/.test(server), 'server registers the request-fulfillment evaluate route');
ok(/app\.get\('\/api\/l1-copilot\/servicenow\/request\/:number'/.test(server), 'server registers the read-only catalog lookup route');
ok(/require\('\.\/server\/l1-copilot\/request-fulfillment'\)/.test(server), 'server requires the evaluator');

const html = fs.readFileSync(path.join(root, 'html/l1-copilot/l1-ticket-copilot.html'), 'utf8');
ok(['l1RequestFulfillmentPanel', 'l1EvidenceFulfillmentVerified', 'btnLookupRequestFulfillment', 'btnVerifyRequestFulfillment'].every(id => html.includes('id="' + id + '"')), 'UI has the request fulfillment panel and managed checkbox');
ok(/fulfillmentVerified:\s*checked\('l1EvidenceFulfillmentVerified'\)/.test(html), 'UI sends fulfillmentVerified with the workflow evidence');
ok(/setRequestFulfillmentPanelActive\(workflow\.taskType\)/.test(html), 'UI activates the panel from the evaluated task type');
ok(/<input type="checkbox" id="l1EvidenceFulfillmentVerified" disabled>/.test(html), 'the fulfillment checkbox is locked (panel-managed only)');

const src = fs.readFileSync(path.join(root, 'server/l1-copilot/request-fulfillment.js'), 'utf8');
ok(
  !/require\(['"](http|https|net|dgram)['"]\)/.test(src) && !/fetch\s*\(/.test(src),
  'request-fulfillment.js contains no network-capable requires or fetch calls (pure evaluator)'
);

console.log('');
console.log('PASSED: ' + passed);
console.log('FAILED: ' + failed);

if (failed > 0) {
  process.exit(1);
}

console.log('');
console.log('L1 REQUEST FULFILLMENT: PASS');
