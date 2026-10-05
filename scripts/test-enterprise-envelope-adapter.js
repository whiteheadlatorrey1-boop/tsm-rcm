'use strict';

const { validateEnvelope, CONTROL_PLANE_VERSION } = require('../server/vertical-control-plane/contract');
const { fromOrchestration } = require('../server/vertical-control-plane/adapters/enterprise-adapter');
const orchestrator = require('../server/enterprise/enterprise-orchestrator');
const engine = require('../server/enterprise/enterprise-engine');

let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) { console.log(`PASS: ${label}`); passed++; } else { console.log(`FAIL: ${label}`); failed++; }
}
function valid(env) { try { validateEnvelope(env); return true; } catch (e) { console.log(e.message); return false; } }

(async () => {
  console.log('=== ENTERPRISE -> CANONICAL ENVELOPE ADAPTER TEST ===');

  // 1. Real orchestrator, empty context: no signals, runs offline.
  const emptyRes = await orchestrator.execute({});
  const emptyEnv = fromOrchestration({}, emptyRes);
  check('empty case: passes validateEnvelope()', valid(emptyEnv));
  check('empty case: schemaVersion matches contract', emptyEnv.schemaVersion === CONTROL_PLANE_VERSION);
  check('empty case: vertical is enterprise', emptyEnv.vertical === 'enterprise');
  check('empty case: no findings', emptyEnv.findings.length === 0);
  check('empty case: no action to execute', emptyEnv.actions.length === 0);
  check('empty case: approval required, not approved',
    emptyEnv.governance.approvalRequired === true && emptyEnv.governance.approved === false);

  // 2. Real orchestrator + real BNCA + real explainability; only enrichment is injected (no live data).
  const input = {
    vertical: 'healthcare',
    entity: 'Banner Health',
    objective: 'Claims leakage analysis',
    customer: { id: 'BAN-001' },
    supplier: { id: 'SUP-8832' },
    invoice: { id: 'INV-5001' }
  };
  const injected = {
    ok: true,
    vertical: 'healthcare',
    entity: 'Banner Health',
    capabilities: [
      { id: 'mdm', title: 'Master Data Management', score: 92 },
      { id: 'governance', title: 'Governance', score: 88 },
      { id: 'wip', title: 'Work in Progress', score: 60 }
    ],
    totalCapabilities: 11,
    summary: { relevantCapabilities: 3, highestScore: 92 }
  };
  check('engine.enrich is a function (injection point)', typeof engine.enrich === 'function');
  const hadOwn = Object.prototype.hasOwnProperty.call(engine, 'enrich');
  const ownOrig = engine.enrich;
  let res;
  engine.enrich = async () => injected;
  try { res = await orchestrator.execute(input); }
  finally { if (hadOwn) engine.enrich = ownOrig; else delete engine.enrich; }

  const inBefore = JSON.stringify(input);
  const resBefore = JSON.stringify(res);
  const env = fromOrchestration(input, res);

  check('pipeline sanity: top capability mdm -> REMEDIATE_MASTER_DATA', res.decision.action === 'REMEDIATE_MASTER_DATA');
  check('pipeline sanity: top score 92 -> HIGH priority', res.decision.priority === 'HIGH');
  check('populated: passes validateEnvelope()', valid(env));
  check('populated: entity and context entities present',
    ['ENTITY', 'CUSTOMER', 'SUPPLIER', 'INVOICE'].every((t) => env.entities.some((e) => e.type === t)));
  check('populated: one finding per capability, scores preserved',
    env.findings.length === 3 && env.findings[0].id === 'mdm' && env.findings[0].score === 92);
  check('populated: recommendation carried faithfully',
    env.actions.length === 1 && env.actions[0].action === res.decision.action &&
    env.actions[0].priority === res.decision.priority && env.actions[0].confidence === res.decision.confidence);
  check('populated: recommendation not allowed or executed',
    env.actions[0].allowed === false && env.actions[0].executed === false);
  check('populated: approval required, not approved',
    env.governance.approvalRequired === true && env.governance.approved === false);
  check('populated: writeback blocked', env.writeback.allowed === false && env.writeback.executed === false);
  check('populated: evidence carried into verification',
    JSON.stringify(env.verification.evidence) ===
    JSON.stringify(Array.isArray(res.explainability.evidence) ? res.explainability.evidence : []));
  check('populated: explanation carried into audit', env.audit.explainability.why === (res.explainability.why ?? null));
  check('populated: source pipeline marked as having no human gate', env.metadata.humanGateInSourcePipeline === false);
  check('adapter did not mutate input', JSON.stringify(input) === inBefore);
  check('adapter did not mutate orchestrator result', JSON.stringify(res) === resBefore);

  // 3. A confident recommendation must never self-approve.
  const synth = fromOrchestration({}, {
    ok: true, enrichment: { capabilities: [] }, explainability: {},
    decision: { action: 'EXECUTIVE_REVIEW', priority: 'HIGH', confidence: 99 }
  });
  check('synthetic high-confidence result: still not approved', synth.governance.approved === false);
  check('synthetic high-confidence result: recommendation not executable',
    synth.actions.length === 1 && synth.actions[0].allowed === false && synth.actions[0].executed === false);
  check('synthetic high-confidence result: writeback blocked', synth.writeback.allowed === false);
  let noArgOk = true;
  try { validateEnvelope(fromOrchestration()); } catch (e) { noArgOk = false; }
  check('no-arg call still yields a valid envelope', noArgOk);

  console.log('NOTE: exposures is empty. The Enterprise pipeline emits no exposure concept (same as L1).');
  console.log(`NOTE: envelope ${'decision' in env ? 'kept' : 'has no'} decision field; recommendation is also carried in actions.`);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
