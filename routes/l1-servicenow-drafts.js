'use strict';
const express = require('express');
const { requireRole } = require('../middleware/require-auth');
const svc = require('../l1-servicenow/service');

const router = express.Router();
router.use(express.json({ limit: '64kb' }));

const who = req => {
  const s = req.tsmSession || {};
  return s.staffId || s.clientId || s.role || 'unknown';
};
const wrap = fn => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) {
    if (e instanceof svc.DraftError) return res.status(e.status).json({ error: e.code, message: e.message });
    console.error('[l1-servicenow]', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
const reviewer = requireRole(['admin', 'manager']);
const staff = requireRole(['admin', 'manager', 'analyst']);
// Approve/send must be attributable to a person; the shared admin login has no staffId.
const named = (req, res, next) => {
  const s = req.tsmSession || {};
  if (!s.staffId) return res.status(403).json({ error: 'named_reviewer_required', message: 'Approve and send require a personal staff login, not the shared admin login.' });
  next();
};

router.get('/templates', staff, wrap(() => svc.listTemplates()));
router.post('/drafts', staff, wrap(req => svc.createDraft(req.body || {}, who(req))));
router.get('/drafts/:id', staff, wrap(req => svc.getDraft(req.params.id)));
router.patch('/drafts/:id', reviewer, wrap(req => svc.editDraft(req.params.id, (req.body || {}).body, who(req))));
router.post('/drafts/:id/approve', reviewer, named, wrap(req => svc.approveDraft(req.params.id, who(req))));
router.post('/drafts/:id/reject', reviewer, wrap(req => svc.rejectDraft(req.params.id, (req.body || {}).reason, who(req))));
router.post('/drafts/:id/send', reviewer, named, wrap(req => svc.sendDraft(req.params.id, who(req))));

module.exports = router;
