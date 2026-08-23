const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// GET /api/inphusionsys/scenarios
router.get('/scenarios', (req, res) => {
  const baseDir = path.join(__dirname, '../../test/inphusionsys-pack');
  
  const scenarios = [
    {
      id: "SCEN-CN-01",
      vertical: "CONSTRUCTION",
      title: "Drywall CO #088 - Cost Overrun & Expired COI",
      assignee: "USER-CN-02 (Maria Gomez)",
      file: "construction/CN_CO_Poisoned_Variance.txt"
    },
    {
      id: "SCEN-HC-01",
      vertical: "HEALTHCARE",
      title: "Claim Denial CLM-88201 - CO-197 Missing Auth",
      assignee: "USER-HC-02 (Karen Brooks)",
      file: "healthcare/HC_Claim_Denial_CO197.txt"
    },
    {
      id: "SCEN-FO-01",
      vertical: "FINOPS",
      title: "Split Purchase Order - Threshold Evasion",
      assignee: "USER-FO-03 (Elena Rostova)",
      file: "finops/FO_Split_PO_Fraud.txt"
    },
    {
      id: "SCEN-RE-01",
      vertical: "REAL_ESTATE",
      title: "Unit U-103 Vacancy & Maintenance SLA Breach",
      assignee: "USER-RE-01 (David Miller)",
      file: "real-estate/RE_SLA_Breach_U103.txt"
    },
    {
      id: "SCEN-LG-01",
      vertical: "LEGAL",
      title: "MSA Review - Unlimited Liability & Foreign Venue",
      assignee: "USER-LG-01 (Victoria Vance)",
      file: "legal/LG_MSA_Poisoned_Indemnity.txt"
    }
  ];

  res.json({ success: true, scenarios });
});

// POST /api/inphusionsys/run-live
router.post('/run-live', (req, res) => {
  const { relativePath, vertical } = req.body;
  const filePath = path.join(__dirname, '../../test/inphusionsys-pack', relativePath);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "Test file not found" });
  }

  const payloadText = fs.readFileSync(filePath, 'utf8');
  const auditHash = `AUD-INPH-${Math.floor(100000 + Math.random() * 900000)}`;

  // Example output contract response structure
  res.json({
    success: true,
    is_compliant: true,
    audit_hash: auditHash,
    vertical: vertical,
    raw_payload: payloadText,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;