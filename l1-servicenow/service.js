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
function audit(event, id, actor, extra) {
  ensureDir();
  fs.appendFileSync(path.join(dir(), 'audit.jsonl'),
    JSON.stringify({ ts: new Date().toISOString(), event, id, actor, ...(extra || {}) }) + '\n');
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
  const fetchImpl = (opts && opts.fetchImpl) || globalThis.fetch;
  const d = getDraft(id);
  if (d.status === 'sent') return { draft: d, already_sent: true };
  if (d.status === 'sending') throw new DraftError(409, 'send_in_doubt', 'A previous send did not finish. Check the incident in ServiceNow before retrying.');
  if (d.status !== 'approved' && d.status !== 'send_failed') throw new DraftError(409, 'not_approved');
  if (!d.approval || d.approval.body_sha256 !== hash(d.body)) throw new DraftError(409, 'body_changed_after_approval');
  if (process.env.SN_WRITEBACK_ENABLED !== 'true') throw new DraftError(403, 'writeback_disabled');
  const base = process.env.SN_INSTANCE_URL, user = process.env.SN_USER, pass = process.env.SN_PASSWORD;
  if (!base || !/^https:\/\//.test(base) || !user || !pass) throw new DraftError(500, 'servicenow_not_configured');
  if (!d.incident.sys_id) throw new DraftError(422, 'incident_sys_id_required');

  d.status = 'sending'; d.send = { started_by: actor, started_at: new Date().toISOString() };
  save(d); audit('send_started', id, actor, { field: d.field });

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetchImpl(base.replace(/\/$/, '') + '/api/now/table/incident/' + d.incident.sys_id, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json', Accept: 'application/json',
        Authorization: 'Basic ' + Buffer.from(user + ':' + pass).toString('base64')
      },
      body: JSON.stringify({ [d.field]: d.body }),
      signal: ctl.signal
    });
    if (!res.ok) {
      d.status = 'send_failed'; d.send.error = 'HTTP ' + res.status; d.send.at = new Date().toISOString();
      save(d); audit('send_failed', id, actor, { http: res.status });
      throw new DraftError(502, 'servicenow_rejected', 'ServiceNow returned HTTP ' + res.status);
    }
    const j = await res.json().catch(() => ({}));
    d.status = 'sent';
    d.send = { by: actor, at: new Date().toISOString(), sys_id: (j.result && j.result.sys_id) || d.incident.sys_id,
               number: (j.result && j.result.number) || d.incident.number };
    save(d); audit('sent', id, actor, { field: d.field, sys_id: d.send.sys_id });
    return { draft: d, already_sent: false };
  } catch (e) {
    if (e instanceof DraftError) throw e;
    d.status = 'send_failed'; d.send.error = String(e.name || 'error'); d.send.at = new Date().toISOString();
    save(d); audit('send_failed', id, actor, { error: d.send.error });
    throw new DraftError(502, 'servicenow_unreachable', 'Send failed; it may or may not have posted. Check the incident before retrying.');
  } finally { clearTimeout(timer); }
}

module.exports = { DraftError, displayName, listTemplates, createDraft, getDraft, editDraft,
                   approveDraft, rejectDraft, sendDraft };
