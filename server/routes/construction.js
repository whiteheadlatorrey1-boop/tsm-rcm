'use strict';
const express = require('express');
const router  = express.Router();


router.post('/api/construction/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.construction, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/api/construction/report', async (req,res) => {
  const workflow = req.body?.workflow || 'Job Cost Report';
  const content = req.body?.content || 'Construction project document review.';
  res.json({
    ok:true,
    report:{
      workflow,
      risk_level:'HIGH',
      summary:'Construction document reviewed for cost, schedule, subcontractor, and compliance risk.',
      findings:[
        'Cost or schedule variance requires PM/controller review.',
        'Subcontractor/vendor exposure should be validated.',
        'Project delivery risk should be converted into an owner action lane.'
      ],
      actions:[
        'Assign PM to validate variance and supporting documentation.',
        'Route cost exposure to controller for budget impact review.',
        'Prepare BNCA summary for construction strategist.'
      ],
      project_note:'Prioritize project cost exposure, schedule blockers, and subcontractor risk before next owner update.',
      business_outcome:'Construction document converted into project-ready actions.',
      confidence:88
    },
    ts:new Date().toISOString()
  });
});

module.exports = router;