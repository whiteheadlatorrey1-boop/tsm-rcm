'use strict';

// The analyze prompt used to embed the ENTIRE normalized CMDB/incident
// record returned by snAdapter.getAsset()/getTicket() -- including their
// `.raw` field, the full, unfiltered ServiceNow table row (every column,
// as {value, display_value} pairs). That's thousands of tokens of columns
// the model never looks at, on every single ticket.
//
// This allowlists just the fields the prompt template and its output
// actually use:
//   - everything the "Ticket metadata" block/extracted_fields output asks
//     for (incident, priority, requester, department, assignmentGroup,
//     asset, manufacturer, model, warranty)
//   - the incident's real ServiceNow short_description (getTicket()'s
//     `description` field) -- NOT the same thing as the agent-typed
//     ticket.description already in the prompt. The two can legitimately
//     differ (a pre-existing incident may carry its own logged
//     short_description independent of whatever the agent typed this
//     session), and dropping it was tried and reverted: it measurably
//     degraded analysis quality in a live comparison against 5 real PDI
//     incidents -- the model fell back to "no description provided"
//     instead of reasoning about the incident's actual logged issue.
//   - two small scalar status signals (incident state, asset install
//     status) that genuinely inform severity/business-impact reasoning
//     and cost almost nothing since they're short strings, not objects
//
// Never includes `.raw` or any other field from getAsset()/getTicket()'s
// output shape.

const ASSET_FIELDS = ['assetTag', 'manufacturer', 'model', 'warrantyStatus', 'department', 'status'];
const INCIDENT_FIELDS = ['number', 'priority', 'requester', 'assignmentGroup', 'state', 'asset', 'description'];

function pick(record, fields) {
  if (!record || typeof record !== 'object') return null;

  const out = {};
  let hasAny = false;
  fields.forEach(f => {
    if (record[f] !== undefined && record[f] !== null) {
      out[f] = record[f];
      hasAny = true;
    }
  });

  return hasAny ? out : null;
}

// cmdbContext: { asset: <getAsset() result or null>, ticket: <getTicket() result or null> }
// Returns null if there's nothing allowlisted to show (same "nothing to
// embed" signal the caller used before -- an empty/absent cmdbBlock).
function allowlistCmdbContext(cmdbContext) {
  if (!cmdbContext) return null;

  const asset = pick(cmdbContext.asset, ASSET_FIELDS);
  const ticket = pick(cmdbContext.ticket, INCIDENT_FIELDS);

  if (!asset && !ticket) return null;

  return { asset, ticket };
}

module.exports = { allowlistCmdbContext, ASSET_FIELDS, INCIDENT_FIELDS };
