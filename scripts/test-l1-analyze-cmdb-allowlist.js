'use strict';
// Regression test for server/l1-copilot/analyze-cmdb-allowlist.js -- the
// allowlist that keeps the L1 analyze prompt from embedding an entire raw
// ServiceNow record (getAsset()/getTicket()'s `.raw` field: every table
// column, as {value, display_value} pairs) when all the prompt/output
// actually use is a handful of named fields.
//
// Runs fully offline -- pure function, no server, no credentials.

const { allowlistCmdbContext, ASSET_FIELDS, INCIDENT_FIELDS } = require('../server/l1-copilot/analyze-cmdb-allowlist');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

// Shape matching snAdapter.getAsset()'s real return value.
const sampleAssetRec = {
  assetTag: 'LAPTOP-001',
  manufacturer: 'Dell',
  model: 'Latitude 5420',
  warrantyStatus: '2027-01-01',
  owner: 'Jane Tech',
  department: 'IT',
  purchaseDate: '2024-01-01',
  status: 'In use',
  location: 'HQ Floor 3',
  raw: { sys_id: { value: 'abc123' }, u_internal_cost_center: { value: '9999', display_value: 'Cost Center 9999' }, /* ...dozens more columns in reality... */ }
};

// Shape matching snAdapter.getTicket()'s real return value.
const sampleTicketRec = {
  number: 'INC0000123',
  priority: '3 - Medium',
  requester: 'Jane Caller',
  description: 'VPN keeps dropping',
  assignmentGroup: 'Network',
  state: 'In Progress',
  asset: 'LAPTOP-001',
  impact: '2 - Medium',
  urgency: '2 - Medium',
  category: 'Network',
  subcategory: 'VPN',
  sysId: 'def456',
  raw: { sys_id: { value: 'def456' }, u_custom_field_17: { value: 'x', display_value: 'X' } }
};

// --- asset-only context ---
let result = allowlistCmdbContext({ asset: sampleAssetRec, ticket: null });
ok(result !== null, 'allowlistCmdbContext returns a non-null result when only an asset record is present');
ok(result.ticket === null, 'ticket stays null when no ticket record was passed');
ok(result.asset.assetTag === 'LAPTOP-001' && result.asset.manufacturer === 'Dell' && result.asset.model === 'Latitude 5420' && result.asset.warrantyStatus === '2027-01-01' && result.asset.department === 'IT' && result.asset.status === 'In use', 'all allowlisted asset fields are kept');
ok(result.asset.raw === undefined, 'the asset record\'s .raw (full ServiceNow row) is stripped');
ok(result.asset.owner === undefined && result.asset.purchaseDate === undefined && result.asset.location === undefined, 'non-allowlisted asset fields (owner, purchaseDate, location) are stripped');

// --- ticket-only context ---
result = allowlistCmdbContext({ asset: null, ticket: sampleTicketRec });
ok(result !== null, 'allowlistCmdbContext returns a non-null result when only a ticket record is present');
ok(result.asset === null, 'asset stays null when no asset record was passed');
ok(result.ticket.number === 'INC0000123' && result.ticket.priority === '3 - Medium' && result.ticket.requester === 'Jane Caller' && result.ticket.assignmentGroup === 'Network' && result.ticket.state === 'In Progress' && result.ticket.asset === 'LAPTOP-001', 'all allowlisted incident fields are kept');
ok(result.ticket.impact === '2 - Medium' && result.ticket.urgency === '2 - Medium' && result.ticket.category === 'Network' && result.ticket.subcategory === 'VPN', 'impact/urgency/category/subcategory are kept -- what ServiceNow actually derives priority from');
ok(result.ticket.short_description === 'VPN keeps dropping', 'the ticket\'s real ServiceNow short_description is kept, re-keyed to "short_description"');
ok(!('description' in result.ticket), 'the output never uses the bare key "description" -- that ambiguity (vs. the agent-typed ticket.description already elsewhere in the prompt) is exactly what caused the quality regression this allowlist once had');
ok(result.ticket.raw === undefined, 'the ticket record\'s .raw (full ServiceNow row) is stripped');
ok(result.ticket.sysId === undefined, 'non-allowlisted ticket fields (sysId) are stripped');

// --- both present ---
result = allowlistCmdbContext({ asset: sampleAssetRec, ticket: sampleTicketRec });
ok(result.asset !== null && result.ticket !== null, 'both asset and ticket are kept when both are present');
ok(JSON.stringify(result).indexOf('u_internal_cost_center') === -1 && JSON.stringify(result).indexOf('u_custom_field_17') === -1, 'no raw/custom ServiceNow column name leaks into the allowlisted output');

// --- neither present ---
ok(allowlistCmdbContext({ asset: null, ticket: null }) === null, 'both records absent yields null (same "nothing to embed" signal as before)');
ok(allowlistCmdbContext(null) === null, 'a null cmdbContext itself yields null without throwing');

// --- a record with only non-allowlisted fields set yields null for that side ---
const sparseAsset = { owner: 'Someone', purchaseDate: '2020-01-01', raw: {} };
result = allowlistCmdbContext({ asset: sparseAsset, ticket: null });
ok(result === null, 'a record with nothing in the allowlist populated yields an overall null, not an empty object');

// --- null/undefined field values inside an otherwise-populated record are omitted, not kept as null ---
const assetWithGaps = { assetTag: 'TAG-1', manufacturer: null, model: undefined, warrantyStatus: '2026-01-01' };
result = allowlistCmdbContext({ asset: assetWithGaps, ticket: null });
ok(result.asset.assetTag === 'TAG-1' && result.asset.warrantyStatus === '2026-01-01', 'present allowlisted fields are kept even when siblings are missing');
ok(!('manufacturer' in result.asset) && !('model' in result.asset), 'null/undefined values for allowlisted fields are omitted rather than passed through as null');

// --- a ticket record with no description at all is not force-fed a
//     short_description key, and nothing crashes ---
const ticketNoDescription = { number: 'INC0000999', priority: '1 - Critical', impact: '1 - High', urgency: '1 - High' };
result = allowlistCmdbContext({ asset: null, ticket: ticketNoDescription });
ok(result.ticket.impact === '1 - High' && result.ticket.urgency === '1 - High', 'impact/urgency are kept even with no description present');
ok(!('short_description' in result.ticket) && !('description' in result.ticket), 'no description/short_description key is invented when the source record has none');

// --- the allowlists themselves match what the prompt template and its
//     extracted_fields output actually reference (incident/priority/
//     requester/department/assignmentGroup/asset/manufacturer/model/
//     warranty), plus impact/urgency/category/subcategory (what ServiceNow
//     derives priority from) and the two small status signals ---
ok(ASSET_FIELDS.includes('manufacturer') && ASSET_FIELDS.includes('model') && ASSET_FIELDS.includes('warrantyStatus'), 'asset allowlist covers manufacturer/model/warranty (extracted_fields keys)');
ok(INCIDENT_FIELDS.includes('priority') && INCIDENT_FIELDS.includes('requester') && INCIDENT_FIELDS.includes('assignmentGroup') && INCIDENT_FIELDS.includes('asset'), 'incident allowlist covers priority/requester/assignmentGroup/asset (extracted_fields keys)');
ok(INCIDENT_FIELDS.includes('impact') && INCIDENT_FIELDS.includes('urgency') && INCIDENT_FIELDS.includes('category') && INCIDENT_FIELDS.includes('subcategory'), 'incident allowlist covers impact/urgency/category/subcategory');
ok(!ASSET_FIELDS.includes('raw') && !INCIDENT_FIELDS.includes('raw'), 'neither allowlist can ever include "raw"');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
