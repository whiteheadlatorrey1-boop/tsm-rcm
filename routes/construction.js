'use strict';
const express = require('express');
const router  = express.Router();
const { groqChat, SP } = require('./_shared');


router.post('/api/construction/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.construction, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/api/construction/report', async (req,res) => {
  const workflow = req.body?.workflow || 'Job Cost Report';
  const content = (req.body?.content || '').trim();

  // Only attempt a real, content-grounded analysis when there's actually
  // enough submitted text to analyze. A handful of words isn't a document.
  const hasRealContent = content.length >= 40;

  if (hasRealContent && process.env.GROQ_API_KEY) {
    try {
      const userMessage = `Workflow: ${workflow}

Document content:
${content.slice(0, 6000)}

Analyze this specific content. Return JSON only, no markdown fences:
{
  "risk_level": "LOW|MEDIUM|HIGH",
  "summary": "1-2 sentences grounded in the actual content above",
  "findings": ["specific findings drawn from the content, not generic boilerplate"],
  "actions": ["specific next actions grounded in the findings"],
  "project_note": "...",
  "confidence": 0-100
}`;
      const raw = await groqChat(SP.construction, userMessage, 700);
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      return res.json({
        ok: true,
        report: {
          workflow,
          risk_level: parsed.risk_level || 'MEDIUM',
          summary: parsed.summary || 'Document reviewed.',
          findings: parsed.findings || [],
          actions: parsed.actions || [],
          project_note: parsed.project_note || '',
          business_outcome: 'Construction document converted into project-ready actions.',
          confidence: parsed.confidence ?? 70,
          grounded: true
        },
        ts: new Date().toISOString()
      });
    } catch (e) {
      console.error('[construction report] Groq analysis failed, using generic fallback:', e.message);
      // fall through to generic template below
    }
  }

  // Generic fallback — used when there's no real content to analyze, or the
  // AI call failed. Explicitly labeled `grounded: false` so callers/UI can
  // show "generic template" rather than presenting this as document analysis.
  res.json({
    ok:true,
    report:{
      workflow,
      risk_level: hasRealContent ? 'MEDIUM' : 'UNKNOWN',
      summary: hasRealContent
        ? 'Document content was submitted but could not be analyzed automatically; manual PM/controller review recommended.'
        : 'No document content was submitted — this is a generic checklist, not an analysis of a specific document.',
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
      confidence: hasRealContent ? 50 : 0,
      grounded: false
    },
    ts:new Date().toISOString()
  });
});

module.exports = router;