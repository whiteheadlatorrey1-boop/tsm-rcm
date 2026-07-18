/**
 * Twins Router
 * Mounts VMware and Network digital-twin endpoints under /api/twins.
 *
 * Usage in server.js:
 *   const twinsRouter = require('./server/enterprise-lab/twins-router');
 *   app.use('/api/twins', twinsRouter);
 */

'use strict';

const express = require('express');
const { VMwareTwin, FAULT_TYPES: VMWARE_FAULTS } = require('./vmware-twin');
const { NetworkTwin, FAULT_TYPES: NETWORK_FAULTS } = require('./network-twin');
const { ADTwin, FAULT_TYPES: AD_FAULTS } = require('./ad-twin');
const { M365Twin, FAULT_TYPES: M365_FAULTS } = require('./m365-twin');
const { KnowledgeCopilot } = require('./knowledge-copilot');
const { VendorOpsTwin, FAULT_TYPES: VENDOR_FAULTS } = require('./vendor-ops-twin');
const { ChaosEngine } = require('./chaos-engine');
const { SLAEngine } = require('./sla-engine');

const router = express.Router();

// Singleton twin instances shared across all requests (in-memory demo state).
const vmwareTwin = new VMwareTwin();
const networkTwin = new NetworkTwin();
const adTwin = new ADTwin();
const m365Twin = new M365Twin();
const knowledgeCopilot = new KnowledgeCopilot();
const vendorOpsTwin = new VendorOpsTwin();
const chaosEngine = new ChaosEngine({
  ad: { twin: adTwin, faultTypes: AD_FAULTS },
  m365: { twin: m365Twin, faultTypes: M365_FAULTS },
  network: { twin: networkTwin, faultTypes: NETWORK_FAULTS },
  vendor: { twin: vendorOpsTwin, faultTypes: VENDOR_FAULTS },
});
const slaEngine = new SLAEngine({ ad: adTwin, m365: m365Twin }, vendorOpsTwin);

// ---- VMware twin ----

router.get('/vmware/state', (req, res) => {
  res.json(vmwareTwin.getState());
});

router.get('/vmware/fault-types', (req, res) => {
  res.json({ faultTypes: VMWARE_FAULTS });
});

router.post('/vmware/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = vmwareTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/vmware/reset', (req, res) => {
  res.json(vmwareTwin.reset());
});

// ---- Network twin ----

router.get('/network/state', (req, res) => {
  res.json(networkTwin.getState());
});

router.get('/network/fault-types', (req, res) => {
  res.json({ faultTypes: NETWORK_FAULTS });
});

router.post('/network/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = networkTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/network/reset', (req, res) => {
  res.json(networkTwin.reset());
});

// ---- AD twin ----

router.get('/ad/state', (req, res) => {
  res.json(adTwin.getState());
});

router.get('/ad/fault-types', (req, res) => {
  res.json({ faultTypes: AD_FAULTS });
});

router.post('/ad/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = adTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/ad/reset', (req, res) => {
  res.json(adTwin.reset());
});

// ---- M365 twin ----

router.get('/m365/state', (req, res) => {
  res.json(m365Twin.getState());
});

router.get('/m365/fault-types', (req, res) => {
  res.json({ faultTypes: M365_FAULTS });
});

router.post('/m365/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = m365Twin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/m365/reset', (req, res) => {
  res.json(m365Twin.reset());
});

// ---- Knowledge Copilot ----

router.get('/knowledge/entries', (req, res) => {
  res.json(knowledgeCopilot.getState());
});

router.get('/knowledge/lookup/:twinType/:faultType', (req, res) => {
  const entry = knowledgeCopilot.lookup(req.params.twinType, req.params.faultType);
  if (!entry) return res.status(404).json({ error: 'No knowledge entry found' });
  res.json(entry);
});

router.post('/knowledge/entry', (req, res) => {
  const { twinType, faultType, entry } = req.body || {};
  try {
    const saved = knowledgeCopilot.upsertEntry(twinType, faultType, entry);
    res.json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/knowledge/reset', (req, res) => {
  res.json(knowledgeCopilot.reset());
});

// ---- Vendor Operations ----

router.get('/vendor/state', (req, res) => {
  res.json(vendorOpsTwin.getState());
});

router.get('/vendor/fault-types', (req, res) => {
  res.json({ faultTypes: VENDOR_FAULTS });
});

router.post('/vendor/ticket', (req, res) => {
  const { vendorId, subject, priority } = req.body || {};
  try {
    const ticket = vendorOpsTwin.openTicket(vendorId, subject, priority);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/vendor/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = vendorOpsTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/vendor/reset', (req, res) => {
  res.json(vendorOpsTwin.reset());
});

// ---- Chaos Engine ----

router.get('/chaos/status', (req, res) => {
  res.json(chaosEngine.getStatus());
});

router.post('/chaos/start', (req, res) => {
  const { intervalMs } = req.body || {};
  res.json(chaosEngine.start(intervalMs));
});

router.post('/chaos/stop', (req, res) => {
  res.json(chaosEngine.stop());
});

router.post('/chaos/trigger', (req, res) => {
  const { module: moduleName } = req.body || {};
  try {
    const result = moduleName ? chaosEngine.triggerOnce(moduleName) : chaosEngine.triggerRandom();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- SLA Intelligence ----

router.get('/sla/status', (req, res) => {
  res.json(slaEngine.evaluate());
});

router.get('/sla/summary', (req, res) => {
  res.json(slaEngine.summary());
});

module.exports = router;
