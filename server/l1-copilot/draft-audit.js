'use strict';
// Maps an l1-servicenow draft event to the recordL1AuditEvent() argument, so draft
// activity lands in the same governance audit as direct work-note writes.
// Records WHO did what and the body LENGTH, never the draft text.
const STATE = {
  created: 'GENERATED', edited: 'GENERATED', rejected: 'GENERATED',
  approved: 'CONFIRMED', send_started: 'CONFIRMED', send_failed: 'CONFIRMED',
  sent: 'EXECUTED', sent_recovered: 'EXECUTED'
};
const CONFIRMED = new Set(['approved', 'send_started', 'send_failed', 'sent', 'sent_recovered']);

function buildDraftAuditEvent(evt) {
  const e = evt || {};
  const draft = e.draft || {};
  const inc = draft.incident || {};
  const ev = String(e.event || 'unknown');
  const field = draft.field || null;
  const sent = ev === 'sent' || ev === 'sent_recovered';
  const failed = ev === 'send_failed';
  const actionType = field === 'comments' ? 'SN_DRAFT_CUSTOMER_COMMENT'
    : field === 'work_notes' ? 'SN_DRAFT_WORK_NOTE' : 'SN_DRAFT';

  const metadata = {
    surface: 'sn-draft',
    draftId: String(e.id || ''),
    field,
    visibility: draft.visibility || null,
    bodyLength: Number(draft.body_length) || 0
  };
  if (e.template) metadata.template = String(e.template);
  if (ev === 'sent_recovered') metadata.recovered = true;
  if (failed) {
    metadata.error = e.error ? String(e.error) : null;
    if (typeof e.http === 'number') metadata.http = e.http;
  }
  if (ev === 'rejected') metadata.reason = String(e.reason || '').slice(0, 200);

  return {
    eventType: 'SN_DRAFT_' + ev.toUpperCase(),
    action: {
      actionType,
      sourceIncident: String(inc.number || 'UNKNOWN'),
      technician: { id: String(e.actor || 'unknown'), label: null },
      state: STATE[ev] || 'GENERATED',
      confirmed: CONFIRMED.has(ev),
      references: { draftId: String(e.id || '') }
    },
    executionResult: (sent || failed) ? {
      success: sent,
      appendOnlyWorkNote: field === 'work_notes',
      customerVisibleComment: field === 'comments',
      recovered: ev === 'sent_recovered',
      serviceNowStateWrite: false,
      ticketStateChanged: false,
      ticketClosureRequested: false
    } : null,
    metadata
  };
}
module.exports = { buildDraftAuditEvent };
