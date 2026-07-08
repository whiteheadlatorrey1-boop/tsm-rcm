const express = require("express");

const router = express.Router();

const mdmStore = require("./mdm-store");
const mdmEngine = require("./mdm-engine");
const mdmPlaybooks = require("./mdm-playbooks");


// Health check
router.get("/health", (req, res) => {

  res.json({
    status: "healthy",
    domain: "MDM",
    timestamp: new Date().toISOString()
  });

});


// Enterprise data catalog
router.get("/catalog", (req, res) => {

  res.json(
    mdmStore.getCatalog()
  );

});


// Data quality anomalies
router.get("/anomalies", (req, res) => {

  res.json(
    mdmEngine.detectAnomalies()
  );

});


// Mission queue
router.get("/missions", (req, res) => {

  res.json(
    mdmStore.getMissions()
  );

});


// Remediation execution
router.post("/remediate", (req, res) => {

  const result = mdmPlaybooks.execute(
    req.body || {}
  );

  res.json(result);

});


module.exports = router;