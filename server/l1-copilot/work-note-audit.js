'use strict';
// Builds the recordL1AuditEvent() argument for a direct (non-gated) work-note write.
// Records WHO wrote and how verifiable that identity was, and only the note LENGTH.
function buildWorkNoteAuditEvent({ incidentId, noteLength, session, user, result }) {
  const s = session || {};
  const u = user || {};
  let id = 'unknown';
  let source = 'none';
  if (s.staffId) { id = s.staffId; source = 'staffId'; }
  else if (s.clientId) { id = s.clientId; source = 'clientId'; }
  else if (u.actor) { id = u.actor; source = 'actor'; }
  else if (s.role) { id = s.role; source = 'role'; }
  return {
    eventType: 'WORK_NOTE_WRITTEN',
    action: {
      actionType: 'DIRECT_WORK_NOTE',
      sourceIncident: String(incidentId),
      technician: { id: String(id), label: s.label ? String(s.label) : null, identitySource: source },
      state: 'EXECUTED',
      confirmed: true,
      references: null
    },
    executionResult: {
      success: !!(result && result.success === true),
      appendOnlyWorkNote: true,
      serviceNowStateWrite: false,
      ticketStateChanged: false,
      ticketClosureRequested: false
    },
    metadata: { surface: 'direct-work-note', noteLength: Number(noteLength) || 0, technicianConfirmed: true }
  };
}
module.exports = { buildWorkNoteAuditEvent };
