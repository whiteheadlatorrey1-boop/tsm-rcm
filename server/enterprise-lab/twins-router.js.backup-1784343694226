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

const router = express.Router();

// Singleton twin instances shared across all requests (in-memory demo state).
const vmwareTwin = new VMwareTwin();
const networkTwin = new NetworkTwin();

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

module.exports = router;
