'use strict';
// L1 -> tech review -> approved -> ServiceNow. Draft store, gates, guarded writeback.
// Writeback is OFF unless SN_WRITEBACK_ENABLED=true. Credentials come from env only.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const TEMPLATES = require('./templates.json');

const dir = () => process.env.L1_DRAFT_DIR || path.join(__dirname, '..', 'data', 'l1-servicenow');
const ID_RE = /^[0-9a-f-]{36}$/;
const SYS_ID_RE = /^[0-9a-f]{32}$/;

class DraftError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

function ensureDir() { fs.mkdirSync(dir(), { recursive: true }); }
function file(id) {
  if (!ID_RE.test(id)) throw new DraftError(400, 'bad_id');
  return path.join(dir(), id + '.json');
}
function save(d) {
  ensureDir();
  const f = file(d.id), tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, f);
}
// Local append-only log for the draft store, plus an optional sink (server.js wires it to the
// platform's L1 governance audit). The sink gets the incident and body LENGTH, never the text,
// and can never break a draft operation.
let auditSink = null;
function setAuditSink(fn) { auditSink = typeof fn === 'function' ? fn : null; }
function audit(event, id, actor, extra) {
  ensureDir();
  const ts = new Date().toISOString();
  fs.appendFileSync(path.join(dir(), 'audit.jsonl'),
    JSON.stringify({ ts, event, id, actor, ...(extra || {}) }) + '\n');
  if (!auditSink) return;
  try {
    let d = null;
    try { d = JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch (e) { d = null; }
    const r = auditSink({ ts, event, id, actor, ...(extra || {}),
      draft: d ? { incident: d.incident || null, field: d.field || null, visibility: d.visibility || null, body_length: typeof d.body === 'string' ? d.body.length : 0 } : null });
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch (e) { /* platform audit must never break a draft operation */ }
}
const hash = s => crypto.createHash('sha256').update(s).digest('hex');

function displayName(first, last) {
  const f = String(first || '').trim(), l = String(last || '').trim();
  if (!l) return '';
  return f ? f[0].toUpperCase() + '. ' + l : l;
}

function unresolved(body) {
  return [...new Set((body.match(/\{\{\s*[\w.]+\s*\}\}/g) || []).map(s => s.replace(/[{}\s]/g, '')))];
}

function render(template, vars) {
  return template.body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
    const v = vars[k];
    return v === undefined || v === null || String(v).trim() === '' ? m : String(v);
  });
}

function listTemplates() { return TEMPLATES; }

function createDraft({ template_id, incident, caller, vars }, actor) {
  const t = TEMPLATES.find(x => x.id === template_id);
  if (!t) throw new DraftError(400, 'unknown_template');
  if (!incident || !incident.number) throw new DraftError(400, 'incident_number_required');
  if (incident.sys_id && !SYS_ID_RE.test(incident.sys_id)) throw new DraftError(400, 'bad_sys_id');
  const c = caller || {};
  const all = Object.assign({}, vars, {
    inc_number: incident.number,
    user_display: displayName(c.first_name, c.last_name),
    user_eid: c.eid || ''
  });
  const body = render(t, all);
  const d = {
    id: crypto.randomUUID(),
    status: 'draft',
    template_id: t.id,
    visibility: t.visibility,                       // from template only; never from the request
    field: t.visibility === 'comments' ? 'comments' : 'work_notes',
    incident: { number: incident.number, sys_id: incident.sys_id || null },
    caller_eid: c.eid || null,
    vars: all,
    body,
    unresolved: unresolved(body),
    created_by: actor, created_at: new Date().toISOString(),
    approval: null, send: null
  };
  save(d); audit('created', d.id, actor, { template: t.id, visibility: d.visibility });
  return d;
}

function getDraft(id) {
  try { return JSON.parse(fs.readFileSync(file(id), 'utf8')); }
  catch (e) { if (e instanceof DraftError) throw e; throw new DraftError(404, 'not_found'); }
}

function editDraft(id, body, actor) {
  const d = getDraft(id);
  if (d.status !== 'draft') throw new DraftError(409, 'not_editable', 'Only drafts can be edited; create a new draft instead.');
  if (typeof body !== 'string' || !body.trim()) throw new DraftError(400, 'empty_body');
  d.body = body; d.unresolved = unresolved(body);
  d.edited_by = actor; d.edited_at = new Date().toISOString();
  save(d); audit('edited', id, actor);
  return d;
}

function approveDraft(id, actor) {
  const d = getDraft(id);
  if (d.status !== 'draft') throw new DraftError(409, 'not_approvable');
  if (d.created_by === actor && process.env.L1_ALLOW_SELF_APPROVE !== 'true')
    throw new DraftError(403, 'self_approval_blocked', 'A different reviewer must approve this draft.');
  d.unresolved = unresolved(d.body);
  if (d.unresolved.length) throw new DraftError(422, 'unresolved_variables', 'Unfilled: ' + d.unresolved.join(', '));
  d.status = 'approved';
  d.approval = { by: actor, at: new Date().toISOString(), body_sha256: hash(d.body) };
  save(d); audit('approved', id, actor, { field: d.field });
  return d;
}

function rejectDraft(id, reason, actor) {
  const d = getDraft(id);
  if (d.status !== 'draft') throw new DraftError(409, 'not_rejectable');
  d.status = 'rejected';
  d.rejection = { by: actor, at: new Date().toISOString(), reason: String(reason || '') };
  save(d); audit('rejected', id, actor, { reason: d.rejection.reason });
  return d;
}

async function sendDraft(id, actor, opts) {
  const adapter = (opts && opts.adapter) || require('../server/l1-copilot/servicenow-adapter');
  const d = getDraft(id);
  if (d.status === 'sent') return { draft: d, already_sent: true };
  if (d.status === 'sending') throw new DraftError(409, 'send_in_doubt', 'A previous send did not finish. Check the incident in ServiceNow before retrying.');
  if (d.status !== 'approved' && d.status !== 'send_failed') throw new DraftError(409, 'not_approved');
  if (!d.approval || d.approval.body_sha256 !== hash(d.body)) throw new DraftError(409, 'body_changed_after_approval');
  if (process.env.SN_WRITEBACK_ENABLED !== 'true') throw new DraftError(403, 'writeback_disabled');
  if (!adapter.isConfigured()) throw new DraftError(500, 'servicenow_not_configured', 'ServiceNow integration is not configured (SERVICENOW_INTEGRATION_ENABLED, SERVICENOW_INSTANCE_URL and credentials).');

  const target = d.incident.sys_id || d.incident.number;
  const write = d.field === 'comments' ? adapter.writeComment : adapter.writeWorkNote;
  if (typeof write !== 'function') throw new DraftError(500, 'servicenow_not_configured', 'ServiceNow adapter has no writer for ' + d.field + '.');

  // A prior attempt that failed unclearly may still have posted. Read the incident back
  // before writing again so a retry can never double-post (customer-visible comments especially).
  if (d.status === 'send_failed') {
    if (typeof adapter.getTicket !== 'function') throw new DraftError(409, 'retry_unverifiable', 'Cannot confirm whether the earlier send posted. Check the incident in ServiceNow before retrying.');
    let seen;
    try { seen = await adapter.getTicket(target); }
    catch (e) { throw new DraftError(409, 'retry_unverifiable', 'Could not read the incident to confirm the earlier send did not post. Check the incident in ServiceNow, then retry.'); }
    if (!seen) throw new DraftError(404, 'incident_not_found', 'No such incident in ServiceNow.');
    const cur = seen.raw && seen.raw[d.field];
    const curText = cur == null ? '' : (typeof cur === 'object' ? (cur.display_value != null ? cur.display_value : (cur.value != null ? cur.value : '')) : cur);
    if (String(curText).includes(d.body)) {
      d.status = 'sent';
      d.send = { by: actor, at: new Date().toISOString(), number: d.incident.number, sys_id: d.incident.sys_id, verified: true, recovered: true };
      save(d); audit('sent_recovered', id, actor, { field: d.field, number: d.incident.number });
      return { draft: d, already_sent: true, recovered: true };
    }
    // Another request may have started a send while we were reading; stay single-flight.
    if (getDraft(id).status !== 'send_failed') throw new DraftError(409, 'send_in_doubt', 'Another send is in progress for this draft. Check the incident in ServiceNow before retrying.');
  }
  d.status = 'sending'; d.send = { started_by: actor, started_at: new Date().toISOString() };
  save(d); audit('send_started', id, actor, { field: d.field });

  try {
    await write(target, d.body);
    d.status = 'sent';
    d.send = { by: actor, at: new Date().toISOString(), number: d.incident.number, sys_id: d.incident.sys_id, verified: true };
    save(d); audit('sent', id, actor, { field: d.field, number: d.incident.number });
    return { draft: d, already_sent: false };
  } catch (e) {
    d.status = 'send_failed';
    d.send.error = String((e && (e.code || e.name)) || 'error');
    if (e && typeof e.status === 'number') d.send.http = e.status;
    d.send.at = new Date().toISOString();
    save(d); audit('send_failed', id, actor, { error: d.send.error, http: d.send.http });
    if (e && /_WRITE_UNVERIFIED$/.test(String(e.code || ''))) {
      throw new DraftError(502, 'servicenow_unverified', 'ServiceNow accepted the write but it was not found on read-back (often a blocked ACL or a closed incident). Check the incident before retrying.');
    }
    if (e && /No incident found/.test(String(e.message || ''))) {
      throw new DraftError(404, 'incident_not_found', 'No such incident in ServiceNow.');
    }
    if (e && typeof e.status === 'number') {
      throw new DraftError(502, 'servicenow_rejected', 'ServiceNow returned HTTP ' + e.status);
    }
    throw new DraftError(502, 'servicenow_unreachable', 'Send failed; it may or may not have posted. Check the incident before retrying.');
  }
}

module.exports = { DraftError, displayName, listTemplates, createDraft, getDraft, editDraft,
                   approveDraft, rejectDraft, sendDraft, setAuditSink };
